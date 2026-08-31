import asyncio
import base64
import io
import os
import secrets
import threading
import time
import traceback
import wave
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from functools import lru_cache
from pathlib import Path
from typing import Literal

import torch
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

from app import glossary
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
# Whisper runs on Metal through MLX, which keeps per-thread state. Handing
# each request to a different worker out of asyncio's default pool made
# every call re-warm that state; pinning ASR to one thread keeps it hot.
# Inference is serialised by the service's own lock anyway, so a single
# worker costs no concurrency.
_asr_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix='asr')


class TranslationRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5_000)
    source: str
    target: str


class TranslationResponse(BaseModel):
    ok: bool
    text: str
    source: str
    target: str


class GlossaryRequest(BaseModel):
    terms: list[str] = Field(default_factory=list, max_length=200)


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
    # Both models are lazy. Load Whisper first on its dedicated worker, then
    # finish with NLLB so neither model makes the user's first turn pay its
    # initialization/Metal graph cost.
    warm_audio_path = SERVER_ROOT / "tts" / "kokoro_models" / "sample-en.wav"
    if warm_audio_path.exists():
        asr_started = time.perf_counter()
        await asyncio.get_running_loop().run_in_executor(
            _asr_executor,
            asr_service.transcribe,
            warm_audio_path.read_bytes(),
            ".wav",
            "en-ja",
            "en",
        )
        print(f"[asr-warmup] ready in {time.perf_counter() - asr_started:.2f}s", flush=True)
    # PyTorch/MPS pays a large graph-compilation cost the first time it sees a
    # new tensor shape. Warm the fixed live-translation shape last, after MLX.
    await asyncio.to_thread(warm_translation_model)
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
# The companion Chrome extension calls this API from a chrome-extension://
# origin, which can never appear in a fixed allow-list because the id changes
# per install. Without a regex the browser rejects the preflight and every
# extension request fails, even though the server itself answers fine.
_cors_origin_regex = os.getenv(
    "QUICKVOICE_CORS_ORIGIN_REGEX",
    r"chrome-extension://.*",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=_cors_origin_regex,
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


@app.get("/glossary", dependencies=[Depends(require_api_key)])
async def read_glossary() -> dict[str, object]:
    """Names and organisations held intact through translation."""
    return {"ok": True, "terms": glossary.load_terms()}


@app.put("/glossary", dependencies=[Depends(require_api_key)])
async def write_glossary(payload: GlossaryRequest) -> dict[str, object]:
    stored = await asyncio.to_thread(glossary.save_terms, payload.terms)
    return {"ok": True, "terms": stored}


def pcm16_to_wav(pcm: bytes, sample_rate: int = 16_000) -> bytes:
    """Wrap browser-streamed mono PCM16 in a WAV container for Whisper."""
    output = io.BytesIO()
    with wave.open(output, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(pcm)
    return output.getvalue()


@app.websocket("/ws/live")
async def live_interpretation(websocket: WebSocket) -> None:
    """Live browser interpretation using QuickVoice's own local models.

    The web client sends short PCM16 chunks. Each chunk is transcribed by the
    same multilingual Whisper service as mobile, translated by the same local
    NLLB model, and returned as one utterance. No Gemini/OpenAI service is used.
    """
    await websocket.accept()
    configured_source = "en"
    configured_target = "ja"

    try:
        while True:
            # A single unparseable frame used to fall through to the handler's
            # outer `except Exception`, which sends one generic error and then
            # *returns* — ending the whole interpretation session while the
            # client still believed it was connected, so every later turn went
            # nowhere. One bad frame should cost one turn, not the conversation.
            try:
                message = await websocket.receive_json()
            except WebSocketDisconnect:
                raise
            except Exception:
                await websocket.send_json({
                    "type": "error",
                    "text": "A malformed message was ignored.",
                })
                continue

            if not isinstance(message, dict):
                await websocket.send_json({
                    "type": "error",
                    "text": "A malformed message was ignored.",
                })
                continue

            message_type = message.get("type")

            if message_type == "config":
                source = str(message.get("sourceLang") or "en").lower()
                target = str(message.get("targetLang") or "ja").lower()
                if source not in {"en", "ja"} or target not in {"en", "ja"}:
                    await websocket.send_json({
                        "type": "error",
                        "text": "QuickVoice currently supports English and Japanese.",
                    })
                    continue
                configured_source = source
                configured_target = target if target != source else ("ja" if source == "en" else "en")
                await websocket.send_json({"type": "ready"})
                continue

            if message_type == "stop":
                await websocket.send_json({"type": "stopped"})
                continue

            if message_type != "audio" or not message.get("data"):
                continue

            try:
                pcm = base64.b64decode(message["data"], validate=True)
            except (ValueError, TypeError):
                await websocket.send_json({"type": "error", "text": "Invalid audio data."})
                continue

            if len(pcm) < 3_200:  # Less than 100ms at 16kHz PCM16.
                continue

            wav_audio = pcm16_to_wav(pcm)
            result = await asyncio.get_running_loop().run_in_executor(
                _asr_executor,
                asr_service.transcribe,
                wav_audio,
                ".wav",
                "en-ja",
                # Break ja/en ties toward the language the speaker selected.
                # Without this the web client had no tie-breaker at all, so
                # short or ambiguous Japanese decoded as English gibberish
                # ("124" coming back as "is she young?"). Mobile has always
                # passed an expected language; this brings web to parity.
                # Detection still wins outright whenever it is confident, so
                # two-way conversation keeps working.
                configured_source,
            )
            original = result.text.strip()
            if not original:
                # Whisper heard nothing usable. Say so, rather than going
                # silent: the client was left showing the previous turn's
                # transcript forever, which looks like a frozen app.
                await websocket.send_json({"type": "no_speech"})
                continue

            detected_source = "ja" if result.language == "ja" else "en"
            destination = (
                configured_target
                if detected_source != configured_target
                else configured_source
            )
            if destination == detected_source:
                destination = "ja" if detected_source == "en" else "en"

            corrected = await asyncio.to_thread(
                correction_service.correct, original, detected_source
            )
            transcript_ready_at = time.perf_counter()
            # Do not hold the fast Whisper result hostage while NLLB runs.
            # The UI can show what it heard immediately and fill translation
            # into the other panel as soon as generation completes.
            await websocket.send_json({
                "type": "transcript",
                "text": corrected,
                "language": detected_source,
                "final": True,
            })
            translated = await asyncio.to_thread(
                run_protected_translation,
                corrected,
                normalize_language(detected_source),
                normalize_language(destination),
            )
            translation_ready_at = time.perf_counter()
            await websocket.send_json({
                "type": "translation",
                "text": translated,
                "language": destination,
                "final": True,
            })
            await websocket.send_json({
                "type": "utterance",
                "original": corrected,
                "translation": translated,
                "sourceLang": detected_source,
                "targetLang": destination,
            })
            print(
                "[live-timing] "
                f"translation={translation_ready_at - transcript_ready_at:.3f}s "
                f"text={corrected[:80]!r}",
                flush=True,
            )
    except WebSocketDisconnect:
        return
    except Exception:
        traceback.print_exc()
        try:
            await websocket.send_json({
                "type": "error",
                "text": "Local live interpretation failed. Please try again.",
            })
        except Exception:
            pass


def run_protected_translation(text: str, source: str, target: str) -> str:
    """Translate, holding registered names and organisations intact.

    See app/glossary.py — "Hello, Nana" was coming back as こんにちは
    おばあちゃん because "nana" is also an English word for grandmother.
    """
    masked, mapping = glossary.protect(text)
    return glossary.restore(run_translation(masked, source, target), mapping)


@lru_cache(maxsize=256)
def run_translation(text: str, source: str, target: str) -> str:
    tokenizer = app.state.tokenizer
    with inference_lock:
        tokenizer.src_lang = source
        token_count = len(tokenizer(text, truncation=True, max_length=160)["input_ids"])
    # Most live turns fit in 64 tokens. Fixed buckets prevent MPS from
    # recompiling a graph for every slightly different sentence length.
    pad_length = 64 if token_count <= 64 else 160
    return _generate_translation(text, source, target, pad_length)


def _generate_translation(text: str, source: str, target: str, pad_length: int) -> str:
    tokenizer = app.state.tokenizer
    model = app.state.model
    device = app.state.device
    with inference_lock, torch.inference_mode():
        tokenizer.src_lang = source
        inputs = tokenizer(
            text,
            return_tensors="pt",
            max_length=pad_length,
            padding="max_length",
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


def warm_translation_model() -> None:
    started = time.perf_counter()
    for source, target, text in (
        ("eng_Latn", "jpn_Jpan", "QuickVoice is ready."),
        ("jpn_Jpan", "eng_Latn", "クイックボイスの準備ができました。"),
    ):
        _generate_translation(text, source, target, 64)
    print(f"[translation-warmup] ready in {time.perf_counter() - started:.2f}s", flush=True)


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
        translated = await asyncio.to_thread(run_protected_translation, text, source, target)
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
        result = await asyncio.get_running_loop().run_in_executor(
            _asr_executor,
            asr_service.transcribe, audio, suffix, language, expected.strip().lower() or None
        )
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except Exception as error:
        # A file the decoder cannot read is a bad *request*, not a server
        # failure: uploading a truncated recording or a non-audio file used to
        # answer 500 and log a full traceback, which hides real outages in the
        # noise and tells the client to retry something that will never work.
        # Matched by name so this does not depend on importing PyAV here.
        if type(error).__name__ in {"InvalidDataError", "FFmpegError"}:
            raise HTTPException(
                status_code=422,
                detail="That audio file could not be read. Please send a valid recording.",
            ) from error
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="The local speech recognition model could not transcribe this audio.",
        ) from error

    text = result.text.strip()
    print(f"[asr-result] bytes={len(audio)} lang={result.language} text={text!r}", flush=True)
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
