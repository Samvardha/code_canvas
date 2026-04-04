import logging
import time
from datetime import datetime
from fastapi import APIRouter
from utils.database import db

# [ CONFIGURATION ] ────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)
router = APIRouter()

# Global start time for uptime tracking
START_TIME = time.time()


# [ SYSTEM DIAGNOSTICS ] ───────────────────────────────────────────────────────

@router.get("/health")
async def health():
    """
    Enhanced health check returning system status, uptime, and connectivity intel.
    
    - Pings the central database.
    - Tracks service uptime and versioning.
    - Used by load balancers and monitoring probes.
    """
    try:
        # 1. Probe database connectivity
        result = await db.command("ping")
        db_status = "connected" if result.get("ok") == 1.0 else "error"
    except Exception:
        logger.warning("⚠️ Database ping failed during health check", exc_info=False)
        db_status = "disconnected"

    # 2. Calculate service longevity
    uptime_seconds = int(time.time() - START_TIME)
    
    return {
        "status": "operational",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "uptime": f"{uptime_seconds}s",
        "api_intel": {
            "version": "1.0.0",
            "database": db_status,
            "os_environment": "monolith_active"
        }
    }
