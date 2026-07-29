import os
import re
import tempfile
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class TranscriptionResult:
    text: str
    language: str


class WhisperASRService:
    """Lazy multilingual ASR for short QuickVoice conversation turns."""

    def __init__(self) -> None:
        self.model_name = os.getenv("WHISPER_MODEL", "base")
        self.device = os.getenv("WHISPER_DEVICE", "cpu")
        self.compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
        self._model = None

    def transcribe(
        self,
        audio: bytes,
        suffix: str = ".m4a",
        language_hint: str = "en-ja",
    ) -> TranscriptionResult:
        if not audio:
            return TranscriptionResult(text="", language="unknown")

        suffix = suffix if suffix.startswith(".") else f".{suffix}"

        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp:
            temp.write(audio)
            temp_path = Path(temp.name)

        try:
            language = self._resolve_language(temp_path, language_hint)
            result = self._transcribe_path(temp_path, language)

            # Very short Japanese greetings often get decoded by Whisper as
            # English romaji ("konnichiwa", "ohayo", etc.). When QuickVoice is
            # in EN/JA mode, retry those cues with the Japanese decoder so the
            # text appears in the Japanese box instead of the English side.
            if (
                language_hint.strip().lower() in {"auto", "en-ja"}
                and result.language == "en"
                and self._looks_like_japanese_romaji(result.text)
            ):
                japanese_result = self._transcribe_path(temp_path, "ja")
                if self._contains_japanese(japanese_result.text):
                    return japanese_result

            return result
        finally:
            temp_path.unlink(missing_ok=True)

    def _transcribe_path(self, audio_path: Path, language: str | None) -> TranscriptionResult:
        model = self._load_model()
        segments, info = model.transcribe(
            str(audio_path),
            beam_size=1,
            best_of=1,
            vad_filter=False,
            language=language,
            task="transcribe",
            temperature=0.0,
            without_timestamps=True,
            condition_on_previous_text=False,
        )
        text = " ".join(segment.text.strip() for segment in segments).strip()
        result_language = getattr(info, "language", None) or language or "unknown"
        return TranscriptionResult(text=text, language=result_language)

    def _contains_japanese(self, text: str) -> bool:
        return bool(re.search(r"[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]", text))

    def _looks_like_japanese_romaji(self, text: str) -> bool:
        normalized = re.sub(r"[^a-z\s]", " ", text.lower())
        normalized = re.sub(r"\s+", " ", normalized).strip()
        if not normalized:
            return False

        romaji_cues = {
            "arigato",
            "arigatou",
            "daijobu",
            "daijoubu",
            "desu",
            "genki",
            "gozaimasu",
            "hai",
            "hajimemashite",
            "konnichiwa",
            "konichiwa",
            "konijiwa",
            "konnejiva",
            "moshi",
            "nihon",
            "ohayo",
            "ohayou",
            "onegaishimasu",
            "sayonara",
            "sumimasen",
            "watashi",
        }
        return any(cue in normalized for cue in romaji_cues)

    def _resolve_language(self, audio_path: Path, language_hint: str) -> str | None:
        hint = language_hint.strip().lower()
        if hint in {"en", "english", "en-us"}:
            return "en"
        if hint in {"ja", "japanese", "ja-jp", "jp"}:
            return "ja"

        # QuickVoice conversation mode supports only English and Japanese.
        # Do not let Whisper pick from its full language list, because short
        # mobile recordings can be misdetected as Thai/Korean/etc.
        model = self._load_model()
        try:
            from faster_whisper.audio import decode_audio

            audio = decode_audio(str(audio_path), sampling_rate=16000)
            _language, _probability, all_probs = model.detect_language(
                audio=audio,
                vad_filter=False,
                language_detection_segments=1,
            )
            probabilities = {language: probability for language, probability in all_probs}
            japanese_probability = probabilities.get("ja", 0)
            english_probability = probabilities.get("en", 0)

            # Never force English speech through the Japanese decoder merely
            # because Japanese has a nearby score. Common Japanese romaji is
            # handled by the targeted retry above; general language selection
            # should use the model's stronger EN/JA probability.
            if japanese_probability > english_probability:
                return "ja"
            return "en"
        except Exception:
            return None

    def _load_model(self):
        if self._model is not None:
            return self._model

        try:
            from faster_whisper import WhisperModel
        except Exception as error:
            raise RuntimeError(
                "faster-whisper is not installed. Install python-server requirements again."
            ) from error

        self._model = WhisperModel(
            self.model_name,
            device=self.device,
            compute_type=self.compute_type,
        )
        return self._model
