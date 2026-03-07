from fastapi import APIRouter

from utils.database import db

router = APIRouter()


@router.get("/health")
async def health():
    try:
        result = await db.command("ping")
        db_status = "connected" if result.get("ok") == 1.0 else "error"
    except Exception:
        db_status = "disconnected"

    return {"status": "ok", "database": db_status}
