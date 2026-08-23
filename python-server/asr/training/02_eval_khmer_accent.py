"""Measure how well the current QuickVoice ASR handles Khmer-accented English.

Run this BEFORE building any fine-tuning pipeline. If WER here is already low,
training is not worth the effort -- same principle as the En/Ja findings doc:
measure before you build.

Usage:
    python asr/training/02_eval_khmer_accent.py
    python asr/training/02_eval_khmer_accent.py --model small
"""

import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "app"))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

DATA_DIR = Path(__file__).resolve().parent / "data" / "khmer_accent_eval"
MANIFEST = DATA_DIR / "manifest.csv"


def load_manifest() -> list[dict]:
    if not MANIFEST.exists():
        raise SystemExit(
            f"No manifest at {MANIFEST}. Run 01_fetch_khmer_accent_eval.py first."
        )
    with MANIFEST.open(encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))
    if not rows:
        raise SystemExit("Manifest is empty -- fetch step produced no speakers.")
    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default=None, help="Override WHISPER_MODEL, e.g. base, small")
    parser.add_argument("--backend", default=None, help="Override WHISPER_BACKEND, e.g. faster, mlx")
    args = parser.parse_args()

    import os

    if args.model:
        os.environ["WHISPER_MODEL"] = args.model
    if args.backend:
        os.environ["WHISPER_BACKEND"] = args.backend
    # This is a controlled accent test, not live conversation audio -- force
    # the English decoder so results measure accent robustness, not the
    # separate en/ja language-detection logic in whisper_service.py.
    os.environ.setdefault("WHISPER_BACKEND", "faster")

    from jiwer import cer, wer

    from whisper_service import WhisperASRService

    service = WhisperASRService()
    rows = load_manifest()

    results = []
    for row in rows:
        audio_path = Path(row["audio_path"])
        reference = row["transcript"]
        audio_bytes = audio_path.read_bytes()
        outcome = service.transcribe(audio_bytes, suffix=audio_path.suffix, language_hint="en")
        hypothesis = outcome.text
        speaker_wer = wer(reference, hypothesis) if hypothesis else 1.0
        speaker_cer = cer(reference, hypothesis) if hypothesis else 1.0
        results.append(
            {
                "speaker": row["speaker"],
                "wer": speaker_wer,
                "cer": speaker_cer,
                "hypothesis": hypothesis or "(nothing emitted)",
            }
        )
        print(f"{row['speaker']}: WER={speaker_wer:.2%} CER={speaker_cer:.2%}")
        print(f"  ref: {reference[:80]}...")
        print(f"  hyp: {hypothesis[:80] if hypothesis else '(nothing emitted)'}")

    if not results:
        return

    avg_wer = sum(r["wer"] for r in results) / len(results)
    avg_cer = sum(r["cer"] for r in results) / len(results)
    model_name = os.environ.get("WHISPER_MODEL", "base")
    print(f"\n=== {model_name} on {len(results)} Khmer-accented English speakers ===")
    print(f"Average WER: {avg_wer:.2%}")
    print(f"Average CER: {avg_cer:.2%}")
    print(
        "\nFor reference, the en/ja findings doc measured clean-audio English "
        "WER effectively near 0% and Japanese CER 0-1% on this same model family."
    )


if __name__ == "__main__":
    main()
