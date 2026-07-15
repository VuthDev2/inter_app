from fastapi import APIRouter, UploadFile, File, Form

from app.services.gemini import transcribe_audio

router = APIRouter(prefix="/transcribe", tags=["transcribe"])


@router.post("")
async def transcribe(
    file: UploadFile = File(...),
    language: str = Form("en"),
):
    audio_data = await file.read()
    text = await transcribe_audio(audio_data, file.filename or "audio.wav", language)
    if not text:
        return {"ok": False, "text": "", "error": "Transcription failed or Gemini key not configured"}
    return {"ok": True, "text": text}
