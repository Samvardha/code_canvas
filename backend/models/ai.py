from pydantic import BaseModel, Field
from typing import List, Optional

class SuggestionRequest(BaseModel):
    """Request model for AI caption suggestions."""
    draft: str = Field(..., description="The rough draft or topic for the post", min_length=5, max_length=500)

class SuggestionResponse(BaseModel):
    """Response model for AI caption suggestions."""
    suggestions: List[str]
    message: Optional[str] = "AI Suggestions generated successfully."
    cached: bool = False
    rate_limited: bool = False
