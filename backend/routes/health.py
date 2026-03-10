import logging

from fastapi import APIRouter

from utils.database import db

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health")
async def health():
    try:
        result = await db.command("ping")
        db_status = "connected" if result.get("ok") == 1.0 else "error"
    except Exception:
        logger.warning("⚠️ Database ping failed during health check", exc_info=True)
        db_status = "disconnected"

    return {"status": "ok", "database": db_status}
