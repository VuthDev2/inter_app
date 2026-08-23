"""Build manifest.csv for the Khmer-accented English training set.

Pairs each <Speaker>.WAV with its <Speaker>.txt transcript across the
solo_speaker/interview/conversation subfolders. Unlike khmer_accent_eval
(one fixed elicitation paragraph, CC BY-NC-SA, eval-only), this is real
free-speech recordings collected for actual fine-tuning.

Usage:
    python build_manifest.py
"""

import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CATEGORIES = ["solo_speaker", "interview", "conversation"]


def main() -> None:
    rows = []
    for category in CATEGORIES:
        cat_dir = ROOT / category
        for wav_path in sorted(cat_dir.glob("*.WAV")):
            txt_path = wav_path.with_suffix(".txt")
            if not txt_path.exists():
                print(f"[build_manifest] skipping {wav_path.name}: no matching .txt")
                continue
            transcript = " ".join(txt_path.read_text(encoding="utf-8").split())
            if not transcript:
                print(f"[build_manifest] skipping {wav_path.name}: empty transcript")
                continue
            rows.append(
                {
                    "speaker": f"{category}_{wav_path.stem.lower()}",
                    "category": category,
                    "audio_path": str(wav_path),
                    "transcript": transcript,
                }
            )

    manifest_path = ROOT / "manifest.csv"
    with manifest_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["speaker", "category", "audio_path", "transcript"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"[build_manifest] wrote {len(rows)} rows to {manifest_path}")


if __name__ == "__main__":
    main()
