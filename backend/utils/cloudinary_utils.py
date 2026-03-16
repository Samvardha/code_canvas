import os
import cloudinary
import cloudinary.uploader
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

def upload_media(file_content: bytes, resource_type: str = "auto", folder: str = "posts") -> Optional[dict]:
    """
    Upload media (image/video) to Cloudinary and return full metadata.
    
    Args:
        file_content: The file bytes to upload
        resource_type: "image", "video", or "auto"
        folder: Cloudinary folder to store the media
        
    Returns:
        Dictionary with Cloudinary metadata or None if upload fails
    """
    try:
        response = cloudinary.uploader.upload(
            file_content,
            folder=f"Code Canvas/{folder}",
            resource_type=resource_type,
            # For videos, generate a thumbnail
            eager=[{"width": 400, "height": 300, "crop": "pad", "format": "jpg"}] if resource_type == "video" else []
        )
        
        # Normalize response
        result = {
            "url": response.get("secure_url"),
            "public_id": response.get("public_id"),
            "mime_type": f"{response.get('resource_type')}/{response.get('format')}",
            "width": response.get("width"),
            "height": response.get("height"),
            "bytes": response.get("bytes"),
            "type": response.get("resource_type")
        }
        
        if resource_type == "video" or response.get("resource_type") == "video":
            result["duration_sec"] = response.get("duration")
            # Get thumbnail from eager or dedicated transformation
            if response.get("eager"):
                result["thumbnail_url"] = response["eager"][0].get("secure_url")
        
        return result
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {str(e)}", exc_info=True)
        return None

def delete_media(public_id: str, resource_type: str = "image") -> bool:
    """
    Delete media from Cloudinary.
    """
    try:
        cloudinary.uploader.destroy(public_id, resource_type=resource_type)
        return True
    except Exception as e:
        logger.error(f"Cloudinary delete failed: {str(e)}", exc_info=True)
        return False

def upload_image(file_path_or_blob: any, folder: str = "avatars") -> Optional[str]:
    """
    Legacy helper for backward compatibility.
    """
    try:
        response = cloudinary.uploader.upload(
            file_path_or_blob,
            folder=f"Code Canvas/{folder}",
            resource_type="image"
        )
        return response.get("secure_url")
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {str(e)}", exc_info=True)
        return None
