"""Download the Khmer-speaker subset of the Speech Accent Archive.

Only 9 speakers exist for Khmer natives (accent.gmu.edu, checked 2026-08-11),
each reading the same fixed elicitation paragraph once (~20-30s). That is an
eval set, not a training set -- see docs/khmer-accent-findings.md for why.

Source: George Mason University Speech Accent Archive.
Licence: CC BY-NC-SA 2.0 (non-commercial) -- do not use for anything that
ships in a paid product; this is for measurement only.
"""

import csv
import subprocess
import sys
import time
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parent / "data" / "khmer_accent_eval"
BASE = "https://accent.gmu.edu"

# speaker_id -> archive numeric id, from browse_language.php?function=find&language=khmer
SPEAKERS = {
    "khmer1": 230,
    "khmer2": 231,
    "khmer3": 232,
    "khmer4": 1087,
    "khmer5": 1609,
    "khmer6": 1669,
    "khmer7": 1911,
    "khmer8": 2695,
    "khmer9": 2736,
}

# Every speaker reads this exact paragraph -- the fixed elicitation text
# published on accent.gmu.edu/about.php. Same transcript for every clip.
TRANSCRIPT = (
    "Please call Stella. Ask her to bring these things with her from the "
    "store: Six spoons of fresh snow peas, five thick slabs of blue cheese, "
    "and maybe a snack for her brother Bob. We also need a small plastic "
    "snake and a big toy frog for the kids. She can scoop these things into "
    "three red bags, and we will go meet her Wednesday at the train station."
)


def fetch(speaker: str, attempts: int = 3) -> Path:
    dest = OUT_DIR / f"{speaker}.mp3"
    if dest.exists():
        return dest
    url = f"{BASE}/soundtracks/{speaker}.mp3"
    # curl instead of urllib: this machine's Python has no local CA bundle
    # configured for SSL, while system curl already trusts the OS store.
    last_error = ""
    for attempt in range(1, attempts + 1):
        result = subprocess.run(
            ["curl", "-sf", "--max-time", "60", "-A", "Mozilla/5.0", "-o", str(dest), url],
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            return dest
        last_error = f"curl exited {result.returncode}: {result.stderr.strip()}"
        dest.unlink(missing_ok=True)
        time.sleep(2 * attempt)
    raise RuntimeError(f"{last_error} (after {attempts} attempts)")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest_path = OUT_DIR / "manifest.csv"
    rows = []

    for speaker in SPEAKERS:
        try:
            path = fetch(speaker)
        except Exception as error:
            print(f"[skip] {speaker}: {error}", file=sys.stderr)
            continue
        rows.append({"speaker": speaker, "audio_path": str(path), "transcript": TRANSCRIPT})
        print(f"[ok] {speaker} -> {path}")
        time.sleep(0.5)  # be polite to a university server, not an API

    with manifest_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["speaker", "audio_path", "transcript"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"\n{len(rows)}/{len(SPEAKERS)} speakers fetched -> {manifest_path}")
    if len(rows) < len(SPEAKERS):
        print("Some downloads failed -- check the archive is still reachable.", file=sys.stderr)


if __name__ == "__main__":
    main()
