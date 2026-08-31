"""Protected terms — names and organisations that must survive translation.

NLLB handles most proper nouns correctly on its own ("John" becomes ジョン,
"Toyota" becomes トヨタ). The failures are words that are *also* ordinary
nouns: "Nana" is a real English word for grandmother, so "Hello, Nana" came
back as こんにちは おばあちゃん. No amount of model quality fixes that — the
sentence is genuinely ambiguous — so the speaker has to be able to say "Nana
is a name here".

The mechanism is a placeholder swap. Each protected term is replaced with a
bare token before translation and put back afterwards. The token shape
matters and was measured against this NLLB build:

    "Hello, NAME0"       ->  こんにちは,NAME0     (survives)
    "Hello, __NAME0__"   ->  こんにちは,名字      (translated!)

Underscores get treated as text, so the bare form is the one to use.
"""

from __future__ import annotations

import json
import re
import threading
from pathlib import Path

# Terms live next to the server so they survive a restart without a database.
STORE_PATH = Path(__file__).resolve().parent.parent / "protected_terms.json"

# Bare alphanumeric token; see the module docstring for why not __NAME0__.
_PLACEHOLDER = "NAME{}"
# The model occasionally re-spaces or re-cases a placeholder ("NAME 0",
# "name0"), so restoration is deliberately more tolerant than emission.
_PLACEHOLDER_RE = "NAME\\s*{}"

_MAX_TERMS = 200
_MAX_TERM_LENGTH = 60

_lock = threading.Lock()


def load_terms() -> list[str]:
    """Every protected term, newest last. Missing or corrupt store reads empty."""
    try:
        with _lock:
            raw = json.loads(STORE_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    if not isinstance(raw, list):
        return []
    return [t for t in raw if isinstance(t, str) and t.strip()]


def save_terms(terms: list[str]) -> list[str]:
    """Normalise, de-duplicate and persist. Returns what was actually stored."""
    cleaned: list[str] = []
    seen: set[str] = set()
    for term in terms:
        if not isinstance(term, str):
            continue
        value = " ".join(term.split())[:_MAX_TERM_LENGTH]
        if not value:
            continue
        key = value.casefold()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(value)
        if len(cleaned) >= _MAX_TERMS:
            break

    with _lock:
        STORE_PATH.write_text(
            json.dumps(cleaned, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    return cleaned


def protect(text: str, terms: list[str] | None = None) -> tuple[str, dict[str, str]]:
    """Swap protected terms for placeholders.

    Returns the masked text and the mapping needed to undo it. Longest terms
    match first so "Nana Tanaka" wins over a separately registered "Nana".
    """
    if terms is None:
        terms = load_terms()
    if not terms or not text:
        return text, {}

    mapping: dict[str, str] = {}
    masked = text
    for term in sorted(terms, key=len, reverse=True):
        # Word boundaries only work for terms that start/end with word
        # characters; a term like "R&D" has to match literally.
        escaped = re.escape(term)
        prefix = r"\b" if term[:1].isalnum() else ""
        suffix = r"\b" if term[-1:].isalnum() else ""
        pattern = re.compile(f"{prefix}{escaped}{suffix}", re.IGNORECASE)
        if not pattern.search(masked):
            continue
        token = _PLACEHOLDER.format(len(mapping))
        # Keep the spelling the speaker actually used, not the stored casing.
        found = pattern.search(masked)
        mapping[token] = found.group(0) if found else term
        masked = pattern.sub(token, masked)

    return masked, mapping


def restore(text: str, mapping: dict[str, str]) -> str:
    """Put the original terms back where their placeholders landed."""
    if not mapping:
        return text
    restored = text
    for token, original in mapping.items():
        index = token[len("NAME"):]
        restored = re.sub(
            _PLACEHOLDER_RE.format(re.escape(index)),
            original.replace("\\", r"\\"),
            restored,
            flags=re.IGNORECASE,
        )
    return restored
