from fastapi import APIRouter
from pydantic import BaseModel

from app.services.mymemory import translate as mymemory_translate
from app.services.gemini import translate_text as gemini_translate

router = APIRouter(prefix="/translate", tags=["translate"])


class TranslateRequest(BaseModel):
    text: str
    source: str
    target: str


class TranslateResponse(BaseModel):
    ok: bool
    text: str
    source: str
    target: str


@router.post("", response_model=TranslateResponse)
async def translate(req: TranslateRequest):
    text = await mymemory_translate(req.text, req.source, req.target)
    if text:
        return TranslateResponse(ok=True, text=text, source=req.source, target=req.target)

    text = await gemini_translate(req.text, req.source, req.target)
    if text:
        return TranslateResponse(ok=True, text=text, source=req.source, target=req.target)

    return TranslateResponse(ok=False, text=f"[{req.source}->{req.target}] {req.text}", source=req.source, target=req.target)
