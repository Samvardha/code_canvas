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

def upload_image(file_path_or_blob: any, folder: str = "avatars") -> Optional[str]:
    """
    Upload an image to Cloudinary and return the secure URL.
    
    Args:
        file_path_or_blob: Path to local file or the file object/bytes
        folder: Cloudinary folder to store the image
        
    Returns:
        Secure URL of the uploaded image or None if upload fails
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
