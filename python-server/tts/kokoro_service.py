from __future__ import annotations

import io
import os
import threading
from pathlib import Path
from typing import Any, Literal


TTSLanguage = Literal["en", "ja"]


class TTSServiceError(RuntimeError):
    pass


class KokoroTTSService:
    """Lazy, reusable Kokoro inference for English and Japanese."""

    LANGUAGE_CONFIG = {
        "en": {"lang_code": "a", "voice": "af_heart"},
        "ja": {"lang_code": "j", "voice": "jf_alpha"},
    }

    def __init__(self, model_root: Path) -> None:
        self.model_root = model_root
        self.model_root.mkdir(parents=True, exist_ok=True)
        os.environ.setdefault("HF_HOME", str(self.model_root))
        homebrew_espeak = Path("/opt/homebrew/lib/libespeak-ng.dylib")
        homebrew_espeak_data = Path("/opt/homebrew/share/espeak-ng-data")
        if homebrew_espeak.exists():
            os.environ.setdefault("PHONEMIZER_ESPEAK_LIBRARY", str(homebrew_espeak))
        if homebrew_espeak_data.exists():
            os.environ.setdefault("ESPEAK_DATA_PATH", str(homebrew_espeak_data))
        self._pipelines: dict[TTSLanguage, Any] = {}
        self._load_locks = {
            "en": threading.Lock(),
            "ja": threading.Lock(),
        }
        self._inference_lock = threading.Lock()
        self._audio_cache: dict[tuple[str, TTSLanguage, float], bytes] = {}
        self._audio_cache_lock = threading.Lock()

    def _load_pipeline(self, language: TTSLanguage) -> Any:
        cached = self._pipelines.get(language)
        if cached is not None:
            return cached

        with self._load_locks[language]:
            cached = self._pipelines.get(language)
            if cached is not None:
                return cached

            try:
                from kokoro import KPipeline

                config = self.LANGUAGE_CONFIG[language]
                pipeline = KPipeline(lang_code=config["lang_code"])
            except Exception as error:
                raise TTSServiceError(
                    f"Could not load the {language} Kokoro voice model."
                ) from error

            self._pipelines[language] = pipeline
            return pipeline

    def synthesize(
        self,
        text: str,
        language: TTSLanguage,
        speed: float = 1.0,
    ) -> bytes:
        normalized_text = text.strip()
        if not normalized_text:
            raise TTSServiceError("Text cannot be blank.")
        if language not in self.LANGUAGE_CONFIG:
            raise TTSServiceError("Only English and Japanese are supported.")

        cache_key = (normalized_text, language, round(speed, 2))
        with self._audio_cache_lock:
            cached_audio = self._audio_cache.get(cache_key)
        if cached_audio is not None:
            return cached_audio

        pipeline = self._load_pipeline(language)
        config = self.LANGUAGE_CONFIG[language]

        try:
            import numpy
            import soundfile

            with self._inference_lock:
                chunks = [
                    audio.cpu().numpy() if hasattr(audio, "cpu") else audio
                    for _, _, audio in pipeline(
                        normalized_text,
                        voice=config["voice"],
                        speed=speed,
                        split_pattern=r"\n+",
                    )
                ]

            if not chunks:
                raise TTSServiceError("Kokoro returned no audio.")

            audio = chunks[0] if len(chunks) == 1 else numpy.concatenate(chunks)
            wav_buffer = io.BytesIO()
            soundfile.write(wav_buffer, audio, 24_000, format="WAV")
            audio_bytes = wav_buffer.getvalue()
            with self._audio_cache_lock:
                if len(self._audio_cache) >= 128:
                    self._audio_cache.pop(next(iter(self._audio_cache)))
                self._audio_cache[cache_key] = audio_bytes
            return audio_bytes
        except TTSServiceError:
            raise
        except Exception as error:
            raise TTSServiceError("Kokoro audio generation failed.") from error
