"""LoRA fine-tune of whisper-small for Southeast Asian accented English.

ASR only. Does not touch translation or TTS.

Usage:
    python finetune_sea_accent.py
    python finetune_sea_accent.py --native-ratio 0.3 --epochs 3
"""

import argparse
import sys
from pathlib import Path

import torch


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-model", default="openai/whisper-small")
    parser.add_argument("--accented-dataset", default="KoelLabs/L2Arctic")
    parser.add_argument(
        "--accented-l1",
        nargs="+",
        default=["Vietnamese", "Korean", "Mandarin"],
        help="L1 values to keep from the accented dataset as SEA-accent proxies",
    )
    # mozilla-foundation/common_voice_17_0 is deprecated (README only, no
    # data files as of 2026-08). fsicoli mirrors still use a .py loading
    # script, which datasets>=4 refuses to run. fixie-ai re-published the
    # same data as plain parquet, but each shard is ~400-500MB -- too slow
    # to fetch on a weak connection just for a few hundred rows. Default to
    # a genuinely small real-audio set instead; override with
    # --native-dataset fixie-ai/common_voice_17_0 on a faster connection.
    parser.add_argument("--native-dataset", default="hf-internal-testing/librispeech_asr_dummy")
    parser.add_argument("--native-lang", default="en")
    parser.add_argument("--native-ratio", type=float, default=0.25)
    parser.add_argument("--lora-r", type=int, default=32)
    parser.add_argument("--lora-alpha", type=int, default=64)
    parser.add_argument("--lora-dropout", type=float, default=0.05)
    parser.add_argument("--epochs", type=int, default=4)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--grad-accum", type=int, default=2)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--test-fraction", type=float, default=0.10)
    parser.add_argument("--output-dir", default="models/whisper-sea/adapter")
    return parser.parse_args()


def pick_device() -> str:
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    sys.exit(
        "No GPU/accelerator available (no CUDA, no MPS). This script needs "
        "one of the two -- run it on a CUDA box or an Apple Silicon Mac."
    )


def find_column(columns: list[str], candidates: list[str]) -> str | None:
    lowered = {c.lower(): c for c in columns}
    for candidate in candidates:
        if candidate.lower() in lowered:
            return lowered[candidate.lower()]
    # Fallback: substring match, e.g. "speaker_native_language" for "native_language".
    for candidate in candidates:
        for col in columns:
            if candidate.lower() in col.lower():
                return col
    return None


def load_accented_dataset(args):
    from datasets import load_dataset

    # L2Arctic ships "scripted"/"spontaneous" splits, not "train" -- scripted
    # is the large one (3599 rows vs 22).
    try:
        ds = load_dataset(args.accented_dataset, split="train")
    except ValueError:
        ds = load_dataset(args.accented_dataset, split="scripted")
    columns = ds.column_names

    l1_col = find_column(columns, ["l1", "L1", "accent", "native_language", "speaker_l1"])
    text_col = find_column(columns, ["text", "sentence", "transcription", "transcript"])
    audio_col = find_column(columns, ["audio", "audio_path", "path"])

    if l1_col is None or text_col is None or audio_col is None:
        print(f"[finetune_sea_accent] {args.accented_dataset} columns: {columns}", file=sys.stderr)
        if columns:
            # Exclude the audio column -- decoding it here would need torchcodec,
            # which isn't a hard requirement just to print diagnostics.
            non_audio_cols = [c for c in columns if c != audio_col]
            sample = {k: ds[0][k] for k in non_audio_cols} if non_audio_cols else {}
            print(f"[finetune_sea_accent] sample row (non-audio fields): {sample}", file=sys.stderr)
        missing = [
            name
            for name, col in [("L1/accent", l1_col), ("text", text_col), ("audio", audio_col)]
            if col is None
        ]
        sys.exit(
            f"Could not find columns for {missing} in {args.accented_dataset}. "
            "Column names printed above -- update find_column() candidates to match."
        )

    print(f"[finetune_sea_accent] using columns: L1={l1_col!r} text={text_col!r} audio={audio_col!r}")
    observed_l1 = set(ds[l1_col]) if ds.num_rows < 50_000 else set(ds.select(range(5000))[l1_col])
    print(f"[finetune_sea_accent] observed L1 values (sample): {sorted(str(v) for v in observed_l1)}")

    keep = {v.lower() for v in args.accented_l1}
    filtered = ds.filter(lambda row: str(row[l1_col]).lower() in keep)

    if filtered.num_rows == 0:
        sys.exit(
            f"No rows matched L1 in {args.accented_l1} against column {l1_col!r}. "
            f"Observed values: {sorted(str(v) for v in observed_l1)}. "
            "Pass --accented-l1 with values that actually appear in the dataset."
        )

    filtered = filtered.rename_column(text_col, "sentence")
    if audio_col != "audio":
        filtered = filtered.rename_column(audio_col, "audio")
    print(f"[finetune_sea_accent] accented rows after L1 filter: {filtered.num_rows}")
    return filtered.select_columns(["audio", "sentence"])


def load_native_dataset(args, target_rows: int):
    from datasets import load_dataset
    from huggingface_hub import HfApi

    # Large repos (e.g. Common Voice mirrors) have thousands of files across
    # every language/split -- letting `datasets` glob the whole repo to find
    # the relevant subset is slow over a weak connection. List files directly
    # and pick a small number of matching parquet shards instead.
    api = HfApi()
    all_files = [f for f in api.list_repo_files(args.native_dataset, repo_type="dataset") if f.endswith(".parquet")]
    if not all_files:
        sys.exit(f"No parquet files found in {args.native_dataset}.")

    lang_train = sorted(f for f in all_files if f.startswith(f"{args.native_lang}/train"))
    picked = lang_train[: max(1, min(3, len(lang_train)))] if lang_train else all_files[:1]

    sizes = api.get_paths_info(args.native_dataset, picked, repo_type="dataset")
    total_mb = sum(getattr(s, "size", 0) or 0 for s in sizes) / 1e6
    print(f"[finetune_sea_accent] native shards ({total_mb:.1f} MB): {picked}")
    if total_mb > 200:
        print(
            f"[finetune_sea_accent] warning: {total_mb:.0f} MB is a lot for a slow "
            "connection -- this may take a long time.",
            file=sys.stderr,
        )

    # The repo's own dataset_info metadata declares real split names (e.g.
    # "validation" for librispeech_asr_dummy, "train" for Common Voice
    # mirrors) and errors if the data_files key doesn't match. Derive it from
    # the shard filename instead of assuming "train".
    split_name = Path(picked[0]).name.split("-")[0]

    # Not streamed: these files are small enough (by design of the default
    # dataset) to just download outright, which is far more reliable than
    # row-by-row HTTP range requests over a weak connection.
    ds = load_dataset(args.native_dataset, data_files={split_name: picked}, split=split_name)
    columns = ds.column_names
    text_col = find_column(columns, ["sentence", "text", "transcription", "transcript"])
    audio_col = find_column(columns, ["audio", "path"])

    if text_col is None or audio_col is None:
        print(f"[finetune_sea_accent] {args.native_dataset} columns: {columns}", file=sys.stderr)
        sys.exit(
            f"Could not find text/audio columns in {args.native_dataset}. "
            "Columns printed above -- update find_column() candidates to match."
        )

    ds = ds.select(range(min(target_rows, ds.num_rows)))
    ds = ds.rename_column(text_col, "sentence")
    if audio_col != "audio":
        ds = ds.rename_column(audio_col, "audio")
    print(f"[finetune_sea_accent] native rows collected: {ds.num_rows}")
    return ds.select_columns(["audio", "sentence"])


def build_mixed_dataset(args):
    from datasets import Audio, concatenate_datasets

    accented = load_accented_dataset(args)
    native_target = int(accented.num_rows * args.native_ratio / (1 - args.native_ratio))
    native = load_native_dataset(args, native_target)

    # The two sources declare different Audio feature schemas (one has a
    # fixed sampling_rate, the other doesn't) -- concatenate_datasets refuses
    # to merge mismatched feature types. Normalize both to 16kHz, which is
    # what the Whisper feature extractor expects anyway.
    accented = accented.cast_column("audio", Audio(sampling_rate=16000))
    native = native.cast_column("audio", Audio(sampling_rate=16000))

    mixed = concatenate_datasets([accented, native]).shuffle(seed=42)
    split = mixed.train_test_split(test_size=args.test_fraction, seed=42)
    print(
        f"[finetune_sea_accent] mixed dataset: {split['train'].num_rows} train / "
        f"{split['test'].num_rows} test "
        f"({accented.num_rows} accented + {len(native)} native, ratio target {args.native_ratio:.0%})"
    )
    return split


def main() -> None:
    args = parse_args()
    device = pick_device()
    print(f"[finetune_sea_accent] training on device: {device}")

    from peft import LoraConfig, get_peft_model
    from transformers import (
        Seq2SeqTrainer,
        Seq2SeqTrainingArguments,
        WhisperFeatureExtractor,
        WhisperForConditionalGeneration,
        WhisperProcessor,
        WhisperTokenizer,
    )
    import evaluate
    import numpy as np

    processor = WhisperProcessor.from_pretrained(args.base_model, language="en", task="transcribe")
    feature_extractor: WhisperFeatureExtractor = processor.feature_extractor
    tokenizer: WhisperTokenizer = processor.tokenizer

    dataset = build_mixed_dataset(args)

    def prepare(batch):
        audio = batch["audio"]
        batch["input_features"] = feature_extractor(
            audio["array"], sampling_rate=audio["sampling_rate"]
        ).input_features[0]
        batch["labels"] = tokenizer(batch["sentence"]).input_ids
        return batch

    dataset = dataset.map(prepare, remove_columns=dataset["train"].column_names, num_proc=1)

    model = WhisperForConditionalGeneration.from_pretrained(args.base_model)
    model.config.forced_decoder_ids = None
    model.config.suppress_tokens = []

    lora_config = LoraConfig(
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        target_modules=["q_proj", "v_proj", "k_proj", "out_proj"],
        lora_dropout=args.lora_dropout,
        bias="none",
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    wer_metric = evaluate.load("wer")

    def compute_metrics(pred):
        pred_ids = pred.predictions
        label_ids = pred.label_ids
        label_ids[label_ids == -100] = tokenizer.pad_token_id
        pred_str = tokenizer.batch_decode(pred_ids, skip_special_tokens=True)
        label_str = tokenizer.batch_decode(label_ids, skip_special_tokens=True)
        return {"wer": 100 * wer_metric.compute(predictions=pred_str, references=label_str)}

    def collate(features):
        input_features = [{"input_features": f["input_features"]} for f in features]
        batch = feature_extractor.pad(input_features, return_tensors="pt")

        label_features = [{"input_ids": f["labels"]} for f in features]
        labels_batch = tokenizer.pad(label_features, return_tensors="pt")
        labels = labels_batch["input_ids"].masked_fill(labels_batch.attention_mask.ne(1), -100)
        if (labels[:, 0] == tokenizer.bos_token_id).all().item():
            labels = labels[:, 1:]
        batch["labels"] = labels
        return batch

    output_dir = Path(args.output_dir)
    output_dir.parent.mkdir(parents=True, exist_ok=True)

    training_args = Seq2SeqTrainingArguments(
        output_dir=str(output_dir.parent / "checkpoints"),
        per_device_train_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,
        learning_rate=args.lr,
        num_train_epochs=args.epochs,
        # fp16 needs CUDA; MPS autocast support for training is unreliable,
        # so MPS runs in fp32 -- slower, but correct.
        fp16=(device == "cuda"),
        eval_strategy="epoch",
        save_strategy="epoch",
        predict_with_generate=True,
        generation_max_length=225,
        report_to=[],
        remove_unused_columns=False,
        label_names=["labels"],
    )

    trainer = Seq2SeqTrainer(
        args=training_args,
        model=model,
        train_dataset=dataset["train"],
        eval_dataset=dataset["test"],
        data_collator=collate,
        compute_metrics=compute_metrics,
        processing_class=processor.feature_extractor,
    )

    trainer.train()

    output_dir.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(str(output_dir))

    total_bytes = sum(f.stat().st_size for f in output_dir.rglob("*") if f.is_file())
    print(f"[finetune_sea_accent] adapter saved to {output_dir} ({total_bytes / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
