import asyncio
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
from firebase_admin import messaging
from utils.database import get_user_devices_collection

# [ CONFIGURATION ] ────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)

# Module-level reference to Socket.IO server for presence checks
_sio = None

def set_push_sio(sio):
    """Inject the Socket.IO server instance for presence-aware push delivery."""
    global _sio
    _sio = sio


class DeviceService:
    """
    Manages the lifecycle of user device registrations for push notifications.
    
    Handles token upserts, device removal, and cleanup of stale tokens.
    """

    # [ DEVICE REGISTRATION ] ──────────────────────────────────────────────────

    @staticmethod
    async def register_device(user_id: str, device_id: str, token: str) -> Dict[str, Any]:
        """
        Register or update a device for push notifications.
        
        Logic Flow:
        1. Upsert by device_id: If the device already exists, update the token.
        2. If new, insert a fresh document with platform defaults.
        """
        devices_col = await get_user_devices_collection()

        now = datetime.utcnow()
        result = await devices_col.update_one(
            {"device_id": device_id},
            {
                "$set": {
                    "user_id": user_id,
                    "token": token,
                    "platform": "web",
                    "last_used_at": now,
                },
                "$setOnInsert": {
                    "created_at": now,
                },
            },
            upsert=True,
        )

        action = "updated" if result.matched_count > 0 else "registered"
        logger.info(f"Device {action}: user={user_id} device={device_id[:8]}...")
        return {"status": action}


    @staticmethod
    async def remove_device(user_id: str, device_id: str) -> bool:
        """
        Remove a specific device record for a user (e.g. on logout).
        
        Validates ownership: device_id must belong to user_id.
        """
        devices_col = await get_user_devices_collection()
        result = await devices_col.delete_one({
            "device_id": device_id,
            "user_id": user_id,
        })
        if result.deleted_count > 0:
            logger.info(f"Device removed: user={user_id} device={device_id[:8]}...")
            return True
        return False


    @staticmethod
    async def remove_invalid_token(token: str) -> None:
        """Purge a device record whose FCM token has been invalidated."""
        devices_col = await get_user_devices_collection()
        result = await devices_col.delete_one({"token": token})
        if result.deleted_count > 0:
            logger.info("Removed device with invalid FCM token")


    @staticmethod
    async def get_devices_for_user(user_id: str) -> List[Dict[str, Any]]:
        """Fetch all registered devices for a given user."""
        devices_col = await get_user_devices_collection()
        docs = await devices_col.find({"user_id": user_id}).to_list(length=50)
        return docs


class PushNotificationService:
    """
    Orchestrates push notification delivery via Firebase Cloud Messaging.
    
    Supports presence-aware delivery: skips devices that are actively
    viewing the relevant screen (chat conversation, post, etc).
    """

    @staticmethod
    async def send_push_notification(
        user_id: str,
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None,
        skip_screen: Optional[str] = None,
        skip_entity_id: Optional[str] = None,
    ) -> int:
        """
        Send push notifications to all of a user's registered devices.
        
        Logic Flow:
        1. Fetch all devices for the target user.
        2. For each device, check socket presence to decide if push is needed.
        3. Send FCM message to each eligible device.
        4. Clean up devices with invalid tokens.
        
        Returns the count of successfully delivered push notifications.
        """
        devices = await DeviceService.get_devices_for_user(user_id)
        if not devices:
            return 0

        # Build the set of device_ids that are actively viewing the relevant screen
        active_device_ids = set()
        if _sio and (skip_screen or skip_entity_id):
            active_device_ids = await _get_active_devices(
                user_id, skip_screen, skip_entity_id
            )

        sent_count = 0
        for device in devices:
            device_id = device.get("device_id", "")
            token = device.get("token")
            if not token:
                continue

            # Skip devices that are actively on the relevant screen
            if device_id in active_device_ids:
                logger.debug(f"Skipping push for active device: {device_id[:8]}...")
                continue

            # Attempt FCM delivery
            success = await _send_single_push(token, title, body, data)
            if success:
                sent_count += 1

        return sent_count


# [ INTERNAL HELPERS ] ─────────────────────────────────────────────────────────

async def _get_active_devices(
    user_id: str,
    skip_screen: Optional[str],
    skip_entity_id: Optional[str],
) -> set:
    """
    Query Socket.IO sessions to find devices actively viewing the target screen.
    
    Checks all sockets in the user's room for matching presence metadata.
    """
    active = set()
    if not _sio:
        return active

    try:
        # Get all socket IDs in the user's private room
        room_sids = _sio.manager.get_participants("/", user_id)
        
        for sid, _ in room_sids:
            session = await _sio.get_session(sid)
            if not session:
                continue

            device_id = session.get("device_id")
            if not device_id:
                continue

            active_screen = session.get("active_screen")
            entity_id = session.get("entity_id")

            # Match: user is on the exact screen and entity (e.g. Chat #1, Post #2)
            if (skip_screen and skip_entity_id
                    and active_screen == skip_screen
                    and entity_id == skip_entity_id):
                active.add(device_id)
            # Match: user is on the specific screen universally (e.g. notifications panel)
            elif skip_screen and not skip_entity_id and active_screen == skip_screen:
                active.add(device_id)

    except Exception:
        logger.debug("Presence check failed, sending push to all devices", exc_info=True)

    return active


async def _send_single_push(
    token: str,
    title: str,
    body: str,
    data: Optional[Dict[str, str]] = None,
) -> bool:
    """
    Send a single FCM push notification.
    
    Uses a data-only payload so the service worker controls display and
    deep-link routing consistently across foreground/background on web.
    
    Returns True on success, False on failure. Auto-cleans invalid tokens.
    """
    payload_data: Dict[str, str] = {
        "title": title,
        "body": body,
        "route": (data or {}).get("route", "/explore-feed"),
    }
    if data:
        for key, value in data.items():
            if key not in payload_data:
                payload_data[key] = str(value)

    message = messaging.Message(
        token=token,
        data=payload_data,
        webpush=messaging.WebpushConfig(
            headers={"Urgency": "high"},
        ),
    )

    try:
        await asyncio.to_thread(messaging.send, message)
        return True
    except messaging.UnregisteredError:
        logger.info("FCM token unregistered, removing device")
        await DeviceService.remove_invalid_token(token)
        return False
    except messaging.InvalidArgumentError as e:
        logger.warning(f"Invalid FCM payload format (token preserved): {str(e)}")
        return False
    except Exception:
        logger.error("FCM send failed", exc_info=True)
        return False
