import os


def _edit_distance(a: str, b: str) -> int:
    if a == b:
        return 0
    previous = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        current = [i]
        for j, cb in enumerate(b, 1):
            current.append(min(
                previous[j] + 1,
                current[j - 1] + 1,
                previous[j - 1] + (ca != cb),
            ))
        previous = current
    return previous[-1]


_LANGUAGE_NAMES = {"en": "English", "ja": "Japanese"}

_SYSTEM_PROMPT = (
    "You fix speech-recognition transcription errors. You are given one short "
    "sentence transcribed from speech. Correct only clear transcription "
    "mistakes: misheard words, missing punctuation, obvious typos. Do not "
    "rephrase, translate, summarize, or add any words that were not implied "
    "by the input. If the sentence is already correct, or if you are not "
    "sure what the mistake is, return it completely unchanged. Reply with "
    "the corrected sentence only — no quotes, no explanation."
)


class TextCorrectionService:
    """Optional post-ASR cleanup: a small local LLM fixes clear transcription
    mistakes (misheard words, missing punctuation) without rephrasing.

    This runs after, and independently of, WhisperASRService's own confidence
    gates — those already decide whether a turn is worth reporting at all.
    This step only ever tightens wording within a turn that already passed,
    and it is guarded so it cannot turn one mistake into a bigger one: any
    correction that changes more than a small fraction of the characters is
    discarded in favor of the original transcript.
    """

    def __init__(self) -> None:
        self.enabled = os.getenv("TEXT_CORRECTION_ENABLED", "1").strip().lower() not in {
            "0", "false", "no",
        }
        self.model_repo = os.getenv(
            "TEXT_CORRECTION_MODEL", "mlx-community/Qwen2.5-1.5B-Instruct-4bit"
        )
        # Above this fraction of characters changed, the model has rewritten
        # rather than corrected — discard it and keep the ASR output.
        self.max_edit_ratio = float(os.getenv("TEXT_CORRECTION_MAX_EDIT_RATIO", "0.4"))
        self.max_tokens = int(os.getenv("TEXT_CORRECTION_MAX_TOKENS", "96"))
        self._model = None
        self._tokenizer = None

    def _load(self):
        if self._model is None:
            from mlx_lm import load

            self._model, self._tokenizer = load(self.model_repo)
        return self._model, self._tokenizer

    def correct(self, text: str, language: str) -> str:
        original = text.strip()
        if not self.enabled or not original:
            return original

        try:
            from mlx_lm import generate

            model, tokenizer = self._load()
            language_name = _LANGUAGE_NAMES.get(language, language)
            messages = [
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": f"Language: {language_name}\nTranscript: {original}"},
            ]
            prompt = tokenizer.apply_chat_template(
                messages, add_generation_prompt=True, tokenize=False
            )
            corrected = generate(
                model, tokenizer, prompt=prompt, max_tokens=self.max_tokens, verbose=False,
            ).strip().strip('"').strip()
        except Exception:
            # Correction is a filter, not a requirement — never fail the turn
            # over it.
            return original

        if not corrected:
            return original

        distance = _edit_distance(original, corrected)
        if distance / max(len(original), 1) > self.max_edit_ratio:
            return original

        return corrected
