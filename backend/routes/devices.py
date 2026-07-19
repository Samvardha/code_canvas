import logging
from fastapi import APIRouter, HTTPException, Depends
from utils.auth import get_current_uid
from services.push_notifications import DeviceService
from models.device import DeviceRegisterRequest, DeviceRemoveRequest

# [ CONFIGURATION ] ────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/devices", tags=["devices"])


# [ DEVICE MANAGEMENT ] ───────────────────────────────────────────────────────

@router.post("/register")
async def register_device(
    payload: DeviceRegisterRequest,
    uid: str = Depends(get_current_uid)
):
    """
    Register or update a device for push notifications.
    
    - Upserts by device_id: creates a new record or refreshes the token.
    - Validates ownership implicitly via the auth token.
    """
    try:
        result = await DeviceService.register_device(
            user_id=uid,
            device_id=payload.device_id,
            token=payload.token,
        )
        return {"success": True, **result}
    except Exception:
        logger.error("Failed to register device", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to register device")


@router.post("/remove")
async def remove_device(
    payload: DeviceRemoveRequest,
    uid: str = Depends(get_current_uid)
):
    """
    Remove a device registration (e.g. on logout).
    
    - Validates that the device_id belongs to the authenticated user.
    """
    try:
        removed = await DeviceService.remove_device(
            user_id=uid,
            device_id=payload.device_id,
        )
        if not removed:
            raise HTTPException(status_code=404, detail="Device not found")
        return {"success": True, "message": "Device removed"}
    except HTTPException:
        raise
    except Exception:
        logger.error("Failed to remove device", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to remove device")
