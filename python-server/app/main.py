import asyncio
import os
import secrets
import threading
import traceback
from contextlib import asynccontextmanager
from functools import lru_cache
from pathlib import Path
from typing import Literal

import torch
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

from asr import TextCorrectionService, WhisperASRService
from tts import KokoroTTSService, TTSServiceError


SERVER_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(SERVER_ROOT / ".env")

MODEL_NAME = os.getenv("NLLB_MODEL", "facebook/nllb-200-distilled-600M")
LANGUAGE_CODES = {
    "en": "eng_Latn",
    "en-us": "eng_Latn",
    "english": "eng_Latn",
    "ja": "jpn_Jpan",
    "ja-jp": "jpn_Jpan",
    "japanese": "jpn_Jpan",
}
inference_lock = threading.Lock()


class TranslationRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5_000)
    source: str
    target: str


class TranslationResponse(BaseModel):
    ok: bool
    text: str
    source: str
    target: str


class TTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2_000)
    language: Literal["en", "ja"]
    speed: float = Field(default=1.0, ge=0.5, le=2.0)


class TranscriptionResponse(BaseModel):
    ok: bool
    text: str
    language: str


asr_service = WhisperASRService()
correction_service = TextCorrectionService()
tts_service = KokoroTTSService(SERVER_ROOT / "tts" / "kokoro_models")


@asynccontextmanager
async def lifespan(app: FastAPI):
    device_name = os.getenv("NLLB_DEVICE", "cpu")
    if device_name == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("NLLB_DEVICE=cuda was requested, but CUDA is unavailable.")
    if device_name == "mps" and not torch.backends.mps.is_available():
        raise RuntimeError("NLLB_DEVICE=mps was requested, but Apple MPS is unavailable.")

    app.state.device = torch.device(device_name)
    app.state.tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    # The checkpoint publishes PyTorch weights. Explicitly select them to avoid
    # Transformers starting an unnecessary background safetensors conversion.
    app.state.model = AutoModelForSeq2SeqLM.from_pretrained(
        MODEL_NAME,
        use_safetensors=False,
    )
    app.state.model.to(app.state.device)
    app.state.model.eval()
    yield


app = FastAPI(title="QuickVoice Translation API", version="1.0.0", lifespan=lifespan)

# Browser clients (the web app) call this API directly from a different
# origin/port — without CORS headers every request is silently blocked by the
# browser before it even reaches a route. Native clients (mobile) are
# unaffected either way, since CORS is a browser-only restriction.
_cors_origins = [
    origin.strip()
    for origin in os.getenv("QUICKVOICE_CORS_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


def normalize_language(language: str) -> str:
    normalized = LANGUAGE_CODES.get(language.strip().lower())
    if normalized is None:
        raise HTTPException(
            status_code=422,
            detail="QuickVoice currently supports only English and Japanese.",
        )
    return normalized


# ─── Access control ──────────────────────────────────────────────────────────
# The server holds GPU models and accepts file uploads, so once it is reachable
# from the internet an open endpoint is someone else's free compute. When
# QUICKVOICE_API_KEY is set, every route except /health requires it. Unset (the
# default) leaves local development exactly as it was.
API_KEY = os.getenv("QUICKVOICE_API_KEY", "").strip()


async def require_api_key(request: Request) -> None:
    if not API_KEY:
        return
    supplied = request.headers.get("x-api-key", "").strip()
    if not supplied:
        auth = request.headers.get("authorization", "")
        if auth.lower().startswith("bearer "):
            supplied = auth[7:].strip()
    if not secrets.compare_digest(supplied, API_KEY):
        raise HTTPException(status_code=401, detail="Missing or invalid API key.")


@app.get("/health")
async def health() -> dict[str, object]:
    return {
        "ok": True,
        "service": "quickvoice-translation",
        "model": MODEL_NAME,
        "device": str(app.state.device),
    }


@lru_cache(maxsize=256)
def run_translation(text: str, source: str, target: str) -> str:
    tokenizer = app.state.tokenizer
    model = app.state.model
    device = app.state.device

    # NLLB's tokenizer source language is mutable, so serialize inference to
    # prevent concurrent requests from using the wrong source language.
    with inference_lock, torch.inference_mode():
        tokenizer.src_lang = source
        inputs = tokenizer(
            text,
            return_tensors="pt",
            max_length=160,
            truncation=True,
        ).to(device)
        translated_tokens = model.generate(
            **inputs,
            forced_bos_token_id=tokenizer.convert_tokens_to_ids(target),
            max_new_tokens=64,
            num_beams=1,
            do_sample=False,
        )
        return tokenizer.batch_decode(
            translated_tokens,
            skip_special_tokens=True,
        )[0].strip()


@app.post("/translate", response_model=TranslationResponse, dependencies=[Depends(require_api_key)])
async def translate(payload: TranslationRequest) -> TranslationResponse:
    text = payload.text.strip()
    source = normalize_language(payload.source)
    target = normalize_language(payload.target)

    if not text:
        raise HTTPException(status_code=422, detail="Text cannot be blank.")

    if source == target:
        return TranslationResponse(
            ok=True,
            text=text,
            source=payload.source,
            target=payload.target,
        )

    try:
        translated = await asyncio.to_thread(run_translation, text, source, target)
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail="The local translation model could not translate this text.",
        ) from error

    if not translated:
        raise HTTPException(status_code=500, detail="No translation was returned.")

    return TranslationResponse(
        ok=True,
        text=translated,
        source=payload.source,
        target=payload.target,
    )


@app.post("/transcribe", response_model=TranscriptionResponse, dependencies=[Depends(require_api_key)])
async def transcribe(
    file: UploadFile = File(...),
    language: str = Form(default="auto"),
    expected: str = Form(default=""),
) -> TranscriptionResponse:
    audio = await file.read()
    if not audio:
        raise HTTPException(status_code=422, detail="Audio file cannot be blank.")

    suffix = Path(file.filename or "recording.m4a").suffix or ".m4a"

    try:
        result = await asyncio.to_thread(
            asr_service.transcribe, audio, suffix, language, expected.strip().lower() or None
        )
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except Exception as error:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="The local speech recognition model could not transcribe this audio.",
        ) from error

    text = result.text.strip()
    if not text:
        return TranscriptionResponse(ok=True, text="", language="unknown")

    detected_language = "ja" if result.language == "ja" else "en"
    text = await asyncio.to_thread(correction_service.correct, text, detected_language)
    return TranscriptionResponse(ok=True, text=text, language=detected_language)


@app.post(
    "/tts",
    dependencies=[Depends(require_api_key)],
    response_class=Response,
    responses={
        200: {
            "content": {"audio/wav": {}},
            "description": "Playable WAV audio",
        }
    },
)
async def text_to_speech(payload: TTSRequest) -> Response:
    try:
        audio = await asyncio.to_thread(
            tts_service.synthesize,
            payload.text,
            payload.language,
            payload.speed,
        )
    except TTSServiceError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    filename = f"quickvoice-{payload.language}.wav"
    return Response(
        content=audio,
        media_type="audio/wav",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )
