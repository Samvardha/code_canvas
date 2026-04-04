import os
import logging
import cloudinary
import cloudinary.uploader
from typing import Optional

# [ CDN CONFIGURATION ] ────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)

# Primary storage node configuration for the Global Asset Delivery Network
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)


# [ ASSET MANAGEMENT ] ────────────────────────────────────────────────────────

def upload_media(file_content: bytes, resource_type: str = "auto", folder: str = "posts") -> Optional[dict]:
    """
    Transmit media bytes to the CDN and retrieve structural metadata.
    
    Logic Flow:
    1. Transmission: Uploads binary data to specific environment folders.
    2. Transcription: For videos, triggers eager thumbnail generation.
    3. Normalization: Standardizes the response format for database persistence.
    """
    try:
        # 1. Execute upload with context-aware folder structure
        response = cloudinary.uploader.upload(
            file_content,
            folder=f"TechConnect/{folder}",
            resource_type=resource_type,
            # Generate fallback visuals for video streams
            eager=[{"width": 400, "height": 300, "crop": "pad", "format": "jpg"}] if resource_type == "video" else []
        )
        
        # 2. Extract and format cross-platform metadata
        result = {
            "url": response.get("secure_url"),
            "public_id": response.get("public_id"),
            "mime_type": f"{response.get('resource_type')}/{response.get('format')}",
            "width": response.get("width"),
            "height": response.get("height"),
            "bytes": response.get("bytes"),
            "type": response.get("resource_type")
        }
        
        # 3. Handle stream-specific attributes
        if resource_type == "video" or response.get("resource_type") == "video":
            result["duration_sec"] = response.get("duration")
            if response.get("eager"):
                result["thumbnail_url"] = response["eager"][0].get("secure_url")
        
        return result
    except Exception:
        logger.error("CDN Transmission Failure: Multi-media upload failed", exc_info=True)
        return None


def delete_media(public_id: str, resource_type: str = "image") -> bool:
    """ Purge a specific asset node from the Global Delivery Network. """
    try:
        cloudinary.uploader.destroy(public_id, resource_type=resource_type)
        return True
    except Exception:
        logger.error(f"CDN Purification Failure: Asset {public_id} remains logic-bound", exc_info=True)
        return False


def upload_image(file_path_or_blob: any, folder: str = "avatars") -> Optional[str]:
    """ Optimized ingestion for profile-level iconography (Avatars). """
    try:
        response = cloudinary.uploader.upload(
            file_path_or_blob,
            folder=f"TechConnect/{folder}",
            resource_type="image"
        )
        return response.get("secure_url")
    except Exception:
        logger.error("CDN Iconography Failure: Avatar ingestion failed", exc_info=True)
        return None
