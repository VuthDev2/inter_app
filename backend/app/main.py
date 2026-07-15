from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.health import router as health_router
from app.routes.transcribe import router as transcribe_router
from app.routes.translate import router as translate_router
from app.websocket.relay import router as ws_router

app = FastAPI(title="QuickVoice API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(transcribe_router)
app.include_router(translate_router)
app.include_router(ws_router)
