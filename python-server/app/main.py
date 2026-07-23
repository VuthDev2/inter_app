import asyncio
import os
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

import torch
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

from tts import MeloTTSService, TTSServiceError


MODEL_NAME = "facebook/nllb-200-distilled-600M"
SERVER_ROOT = Path(__file__).resolve().parent.parent
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


tts_service = MeloTTSService(SERVER_ROOT / "tts")


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


def normalize_language(language: str) -> str:
    normalized = LANGUAGE_CODES.get(language.strip().lower())
    if normalized is None:
        raise HTTPException(
            status_code=422,
            detail="QuickVoice currently supports only English and Japanese.",
        )
    return normalized


@app.get("/health")
async def health() -> dict[str, object]:
    return {
        "ok": True,
        "service": "quickvoice-translation",
        "model": MODEL_NAME,
        "device": str(app.state.device),
    }


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
            max_length=512,
            truncation=True,
        ).to(device)
        translated_tokens = model.generate(
            **inputs,
            forced_bos_token_id=tokenizer.convert_tokens_to_ids(target),
            max_new_tokens=256,
        )
        return tokenizer.batch_decode(
            translated_tokens,
            skip_special_tokens=True,
        )[0].strip()


@app.post("/translate", response_model=TranslationResponse)
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


@app.post(
    "/tts",
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
