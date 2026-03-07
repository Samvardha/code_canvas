from pydantic import BaseModel
from typing import Optional


class SessionRequest(BaseModel):
    id_token: str
    github_access_token: Optional[str] = None
    provider_id: str


class SessionResponse(BaseModel):
    uid: str
    status: str
