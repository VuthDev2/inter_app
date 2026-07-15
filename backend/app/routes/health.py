from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    return {"ok": True, "status": "running", "timestamp": __import__("datetime").datetime.utcnow().isoformat()}
