from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class Profile(BaseModel):
    """User profile information."""
    name: str = Field(default="", description="User's full name")
    username: str = Field(default="", pattern="^[a-z0-9_]+$", description="User's username")
    avatar_url: str = Field(default="", description="User's avatar URL")
    bio: str = Field(default="", max_length=200, description="User's bio")
    location: str = Field(default="", description="User's location")
    skills: List[str] = Field(default_factory=list, description="User's skills")


class ProviderInfo(BaseModel):
    """OAuth provider information."""
    linked: bool = Field(default=False, description="Whether provider is linked")
    access_token: Optional[str] = Field(default=None, description="Encrypted access token")
    username: Optional[str] = Field(default=None, description="Provider username (GitHub)")
    last_synced_at: Optional[datetime] = Field(default=None, description="Last sync timestamp")


class Providers(BaseModel):
    """User's connected providers."""
    email: Optional[ProviderInfo] = None
    google: Optional[ProviderInfo] = None
    github: Optional[ProviderInfo] = None


class Stats(BaseModel):
    """User statistics."""
    posts_count: int = Field(default=0, description="Number of posts")
    peers_count: int = Field(default=0, description="Number of peers")
    collabs_count: int = Field(default=0, description="Number of collaborations")


class Settings(BaseModel):
    """User settings."""
    pass


class UserResponse(BaseModel):
    """Complete user profile response."""
    id: str = Field(description="Firebase user ID")
    email: str = Field(description="User email")
    profile: Profile
    providers: Providers
    stats: Stats
    settings: Settings
    profile_complete: bool = Field(default=False, description="Whether user profile is complete")
    created_at: datetime
    updated_at: datetime

    class Config:
        json_schema_extra = {
            "example": {
                "_id": "firebase_uid_123",
                "email": "user@example.com",
                "profile": {
                    "name": "John Doe",
                    "username": "johndoe",
                    "avatar_url": "https://...",
                    "bio": "Developer",
                    "location": "San Francisco",
                    "skills": ["Python", "JavaScript"],
                },
                "providers": {
                    "email": {"linked": True},
                    "google": {"linked": True},
                    "github": {"linked": True, "access_token": "[REDACTED]"},
                },
                "stats": {
                    "posts_count": 5,
                    "peers_count": 30,
                    "collabs_count": 2,
                },
                "settings": {},
                "profile_complete": False,
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-15T12:30:00Z",
            }
        }


class OnboardingRequest(BaseModel):
    """User onboarding profile data."""
    name: str = Field(description="User's full name")
    username: str = Field(pattern="^[a-z0-9_]+$", description="User's username")
    bio: str = Field(default="", max_length=200, description="User's bio")
    location: Optional[str] = Field(default="", description="User's location")
    avatar_url: Optional[str] = Field(default="", description="User's avatar URL")
    skills: List[str] = Field(default_factory=list, description="User's skills")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "username": "johndoe",
                "bio": "Full-stack developer",
                "location": "San Francisco",
                "skills": ["Python", "JavaScript", "React"],
            }
        }
