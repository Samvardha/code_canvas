from pydantic import BaseModel
from typing import Optional


class SessionRequest(BaseModel):
    """Payload sent by the frontend after successful Firebase or OAuth authentication."""
    id_token: str
    github_access_token: Optional[str] = None
    provider_id: str
    email: Optional[str] = None


class SessionResponse(BaseModel):
    """Response returned after a session is successfully created or validated."""
    uid: str
    status: str
