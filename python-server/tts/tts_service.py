from __future__ import annotations

import io
import os
import threading
from pathlib import Path
from typing import Any, Literal


TTSLanguage = Literal["en", "ja"]


class TTSServiceError(RuntimeError):
    pass


class MeloTTSService:
    """Lazy, reusable English/Japanese MeloTTS inference service."""

    MODEL_CONFIG = {
        "en": {
            "melo_language": "EN",
            "speaker": "EN-US",
            "repository": "myshell-ai/MeloTTS-English",
            "directory": "english_model",
        },
        "ja": {
            "melo_language": "JP",
            "speaker": "JP",
            "repository": "myshell-ai/MeloTTS-Japanese",
            "directory": "japanese_model",
        },
    }

    def __init__(self, model_root: Path, device: str | None = None) -> None:
        self.model_root = model_root
        self.device = device or os.getenv("MELOTTS_DEVICE", "cpu")
        self._models: dict[TTSLanguage, tuple[Any, int]] = {}
        self._load_locks = {
            "en": threading.Lock(),
            "ja": threading.Lock(),
        }
        self._inference_lock = threading.Lock()

    def _download_model_files(
        self,
        language: TTSLanguage,
    ) -> tuple[Path, Path]:
        from huggingface_hub import hf_hub_download

        config = self.MODEL_CONFIG[language]
        model_directory = self.model_root / config["directory"]
        model_directory.mkdir(parents=True, exist_ok=True)

        config_path = Path(
            hf_hub_download(
                repo_id=config["repository"],
                filename="config.json",
                local_dir=model_directory,
            )
        )
        checkpoint_path = Path(
            hf_hub_download(
                repo_id=config["repository"],
                filename="checkpoint.pth",
                local_dir=model_directory,
            )
        )
        return config_path, checkpoint_path

    def _load_model(self, language: TTSLanguage) -> tuple[Any, int]:
        cached = self._models.get(language)
        if cached is not None:
            return cached

        with self._load_locks[language]:
            cached = self._models.get(language)
            if cached is not None:
                return cached

            try:
                from melo.api import TTS
            except ImportError as error:
                raise TTSServiceError(
                    "MeloTTS is not installed. Run this server with the provided Docker setup."
                ) from error

            config = self.MODEL_CONFIG[language]
            config_path, checkpoint_path = self._download_model_files(language)
            try:
                model = TTS(
                    language=config["melo_language"],
                    device=self.device,
                    use_hf=False,
                    config_path=str(config_path),
                    ckpt_path=str(checkpoint_path),
                )
                speaker_id = model.hps.data.spk2id[config["speaker"]]
            except Exception as error:
                raise TTSServiceError(
                    f"Could not load the {language} MeloTTS model."
                ) from error

            loaded = (model, speaker_id)
            self._models[language] = loaded
            return loaded

    def synthesize(
        self,
        text: str,
        language: TTSLanguage,
        speed: float = 1.0,
    ) -> bytes:
        normalized_text = text.strip()
        if not normalized_text:
            raise TTSServiceError("Text cannot be blank.")
        if language not in self.MODEL_CONFIG:
            raise TTSServiceError("Only English and Japanese are supported.")

        model, speaker_id = self._load_model(language)

        try:
            import soundfile

            with self._inference_lock:
                audio = model.tts_to_file(
                    normalized_text,
                    speaker_id,
                    output_path=None,
                    speed=speed,
                    quiet=True,
                )
            wav_buffer = io.BytesIO()
            soundfile.write(
                wav_buffer,
                audio,
                model.hps.data.sampling_rate,
                format="WAV",
            )
            return wav_buffer.getvalue()
        except Exception as error:
            raise TTSServiceError("MeloTTS audio generation failed.") from error
