#!/bin/bash
#
# Fetch and build every model QuickVoice needs. Run once after cloning:
#
#   cd python-server && ./setup-models.sh
#
# The weights are not in git: three of them are over GitHub's 100MB per-file
# limit and would be rejected, and Git LFS's free tier would run out of
# bandwidth after about one clone. Everything here is downloaded from its
# original source and converted locally, which is free and unlimited.
#
# Safe to re-run: anything already present is skipped.

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")" || exit 1

PY="./.venv312/bin/python"
[ -x "$PY" ] || PY="python3"

green() { printf "\033[32m%s\033[0m\n" "$1"; }
red()   { printf "\033[31m%s\033[0m\n" "$1"; }
info()  { printf "  %s\n" "$1"; }

echo
info "QuickVoice model setup — English/Japanese, about 750MB total."
echo

# ── 1. downloads ─────────────────────────────────────────────────────────────
info "downloading models (skips anything already cached)..."
$PY - <<'PY' || { red "download failed — check your internet connection"; exit 1; }
from huggingface_hub import snapshot_download
MODELS = [
    ("mlx-community/whisper-small-mlx-q4", "speech recognition"),
    ("staka/fugumt-en-ja",                 "English to Japanese"),
    ("staka/fugumt-ja-en",                 "Japanese to English"),
    ("mlx-community/Qwen2.5-0.5B-Instruct-4bit", "text correction"),
]
for repo, what in MODELS:
    snapshot_download(repo)
    print(f"    ok  {repo:46s} {what}")
PY

# Kokoro is kept inside the project because the library is pointed at this
# directory rather than the shared cache.
info "downloading the voice model..."
HF_HOME="$(pwd)/tts/kokoro_models" $PY - <<'PY' || { red "voice model download failed"; exit 1; }
from huggingface_hub import snapshot_download
snapshot_download("hexgrad/Kokoro-82M",
                  allow_patterns=["config.json", "kokoro-v1_0.pth",
                                  "voices/af_heart.pt", "voices/jf_alpha.pt"])
print("    ok  hexgrad/Kokoro-82M                          text to speech")
PY

# ── 2. shrink the voice model ────────────────────────────────────────────────
# Half precision on disk, upcast when loaded. 327MB -> 164MB, and the generated
# audio correlates 0.995 with the full-precision original.
info "converting the voice model to half precision..."
$PY - <<'PY' || red "  (skipped — the full-size voice model still works)"
import glob, os, torch
paths = glob.glob("tts/kokoro_models/**/kokoro-v1_0.pth", recursive=True)
if not paths:
    raise SystemExit("voice checkpoint not found")
p = os.path.realpath(paths[0])
sd = torch.load(p, map_location="cpu", weights_only=True)
def half(d):
    return {k: (half(v) if isinstance(v, dict)
                else v.half() if torch.is_tensor(v) and v.dtype == torch.float32
                else v) for k, v in d.items()}
if os.path.getsize(p) > 200_000_000:
    torch.save(half(sd), p)
    print(f"    ok  {os.path.getsize(p)/1e6:.0f}MB")
else:
    print("    already converted")
PY

# ── 3. build the int8 translators ────────────────────────────────────────────
# 59MB per direction instead of 233MB, and about twice as fast on CPU.
for d in en-ja ja-en; do
  if [ -f "models/ct2/fugumt-$d/model.bin" ]; then
    info "translator $d already built"
  else
    info "building the $d translator (int8)..."
    ./.venv312/bin/ct2-transformers-converter \
        --model "staka/fugumt-$d" --quantization int8 \
        --output_dir "models/ct2/fugumt-$d" --force >/dev/null 2>&1 \
      || { red "  conversion failed for $d"; exit 1; }
  fi
done

# ── 4. prove the models actually load and produce the right answer ───────────
echo
info "verifying..."
$PY - <<'PY'
import sys
ok = True

try:
    import ctranslate2
    from transformers import AutoTokenizer
    for d, text, expect in (("en-ja", "Where is the station?", "駅"),
                            ("ja-en", "猫が好きです", "cat")):
        tok = AutoTokenizer.from_pretrained(f"staka/fugumt-{d}")
        tr = ctranslate2.Translator(f"models/ct2/fugumt-{d}", device="cpu", compute_type="int8")
        r = tr.translate_batch([tok.convert_ids_to_tokens(tok.encode(text))],
                               max_decoding_length=64, beam_size=1)
        out = tok.decode(tok.convert_tokens_to_ids(r[0].hypotheses[0]), skip_special_tokens=True)
        good = expect in out.lower() or expect in out
        print(f"    {'ok  ' if good else 'BAD '} {d}: {text!r} -> {out!r}")
        ok &= good
except Exception as e:
    print(f"    BAD  translation: {e}"); ok = False

try:
    import mlx_whisper  # noqa: F401
    from huggingface_hub import snapshot_download
    snapshot_download("mlx-community/whisper-small-mlx-q4")
    print("    ok   speech recognition model present")
except Exception as e:
    print(f"    BAD  speech recognition: {e}"); ok = False

sys.exit(0 if ok else 1)
PY

echo
if [ $? -eq 0 ]; then
  green "All models ready."
  info "Start everything with:  ../../start-quickvoice.sh"
else
  red "Setup finished with problems — see the lines marked BAD above."
fi
