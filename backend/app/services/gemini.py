import base64
import mimetypes

from google import genai

from app.config import GEMINI_API_KEY

client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None


async def transcribe_audio(audio_data: bytes, filename: str, language: str) -> str:
    if not client:
        return ""

    mime_type, _ = mimetypes.guess_type(filename)
    if not mime_type:
        mime_type = "audio/wav"

    prompt = (
        f"Transcribe the speech in this audio file to plain text. "
        f"The spoken language is {language}. "
        f"Return only the transcribed text, no explanations."
    )

    try:
        resp = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[prompt, genai.types.Part.from_bytes(data=audio_data, mime_type=mime_type)],
        )
        return resp.text.strip() if resp.text else ""
    except Exception:
        return ""


async def translate_text(text: str, source: str, target: str) -> str:
    if not client:
        return ""

    prompt = (
        f"Translate the following text from {source} to {target}. "
        f"Return only the translated text, no explanations.\n\n{text}"
    )

    try:
        resp = client.models.generate_content(model="gemini-2.0-flash", contents=[prompt])
        return resp.text.strip() if resp.text else ""
    except Exception:
        return ""
