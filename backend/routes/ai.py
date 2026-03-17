import logging
from fastapi import APIRouter, Depends, HTTPException, status
from utils.auth import get_current_uid
from services.ai import AIService
from services.user import UserService
from models.ai import SuggestionRequest, SuggestionResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/suggest-caption", response_model=SuggestionResponse)
async def suggest_caption(
    request: SuggestionRequest, current_uid: str = Depends(get_current_uid)
):
    """
    Generate AI-powered caption suggestions for a post draft.
    Includes rate-limiting and context fetching.
    """
    try:
        # 1. Fetch User Context for better suggestions
        user_doc = await UserService.fetch_user_profile(current_uid)
        if not user_doc or "profile" not in user_doc:
            user_context = {}
        else:
            profile = user_doc["profile"]
            user_context = {
                "name": profile.get("name"),
                "skills": profile.get("skills", [])[:5],  # Limit skills to save tokens
            }

        # 2. Call AI Service
        suggestions = await AIService.suggest_captions(
            current_uid, request.draft, user_context
        )

        if not suggestions:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate suggestions. Please try again later.",
            )

        return SuggestionResponse(
            suggestions=suggestions, message="[ ANALYZED_AND_REFINED_BY_GEMINI_AI ]"
        )
    except Exception as e:
        if "Rate limit" in str(e):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(e)
            )

        logger.error(f"Error in suggest_caption route: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred.",
        )
