from pydantic import BaseModel, Field
from enum import Enum


class DevicePlatform(str, Enum):
    """Supported device platforms for push delivery."""
    WEB = "web"
    ANDROID = "android"
    IOS = "ios"


class DeviceRegisterRequest(BaseModel):
    """Input schema for registering a device for push notifications."""
    device_id: str = Field(..., min_length=1, max_length=128)
    token: str = Field(..., min_length=1, max_length=512)


class DeviceRemoveRequest(BaseModel):
    """Input schema for removing a device on logout."""
    device_id: str = Field(..., min_length=1, max_length=128)
