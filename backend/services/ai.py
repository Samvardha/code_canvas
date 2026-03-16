import os
import logging
import json
import time
import asyncio
import re
from typing import List, Optional, Dict

from google import genai
from google.genai import types
from cachetools import TTLCache
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Initialize Gemini Client
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not configured")

client = genai.Client(api_key=GEMINI_API_KEY)


class AIService:
    """Service for handling AI-powered features using Gemini."""

    # Cache AI responses for 1 hour
    _suggestion_cache = TTLCache(maxsize=200, ttl=3600)

    # Rate limiter cache (auto cleans inactive users)
    _rate_limits = TTLCache(maxsize=5000, ttl=120)

    MAX_RPM_PER_USER = 3

    @staticmethod
    def _check_rate_limit(uid: str) -> bool:
        now = time.time()

        user_history = AIService._rate_limits.get(uid, [])
        user_history = [t for t in user_history if now - t < 60]

        if len(user_history) >= AIService.MAX_RPM_PER_USER:
            return False

        user_history.append(now)
        AIService._rate_limits[uid] = user_history
        return True

    @staticmethod
    async def suggest_captions(uid: str, draft: str, user_context: Dict) -> Optional[List[str]]:

        if not AIService._check_rate_limit(uid):
            raise Exception("Rate limit exceeded. Please wait a minute.")

        if not draft or len(draft.strip()) < 5:
            return ["Try providing a bit more detail for better suggestions!"]

        # Better cache key
        cache_key = f"{draft}:{json.dumps(user_context, sort_keys=True)}"

        if cache_key in AIService._suggestion_cache:
            return AIService._suggestion_cache[cache_key]

        try:

            prompt = prompt = f"""
                You are a passionate software developer posting on a professional developer community called "Tech Connect".

                Your goal is to rewrite the user's draft into engaging first-person posts that sound authentic, thoughtful, and developer-focused.

                USER DRAFT:
                {draft}

                USER CONTEXT:
                {user_context}

                TASK:
                Rewrite the draft into exactly 3 improved posts.

                RULES:
                - Each post must be 50–60 words.
                - Write in first person ("I", "my", "we").
                - Make the tone enthusiastic, reflective, and developer-centric.
                - Do NOT cut sentences mid-way.
                - Each post must end with a complete sentence.
                - Avoid repeating the same phrasing across posts.
                - Do NOT include markdown, explanations, numbering, or extra text.

                OUTPUT FORMAT (STRICT):
                Return ONLY valid JSON.

                Example:
                [
                "Post 1 text here...",
                "Post 2 text here...",
                "Post 3 text here..."
                ]
            """

            # Run blocking SDK in thread
            response = await asyncio.to_thread(
                client.models.generate_content,
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    max_output_tokens=1024,
                    temperature=0.8,
                ),
            )

            text = (response.text or "").strip()

            # Extract JSON safely
            start = text.find("[")
            end = text.rfind("]")

            if start != -1 and end != -1:
                json_str = text[start : end + 1]

                try:
                    suggestions = json.loads(json_str)

                    if isinstance(suggestions, list):
                        suggestions = [
                            str(s).strip()
                            for s in suggestions
                            if len(str(s).strip()) > 5
                        ]

                        if suggestions:
                            suggestions = suggestions[:3]

                            AIService._suggestion_cache[cache_key] = suggestions
                            return suggestions

                except json.JSONDecodeError:
                    logger.warning("JSON parsing failed, attempting fallback")

            # Fallback extraction
            lines = re.findall(r'"([^"]+)"', text)

            if not lines:
                lines = [
                    line.strip(' "[]-')
                    for line in text.split("\n")
                    if len(line.strip()) > 10
                ]

            suggestions = lines[:3] if lines else None

            if suggestions:
                AIService._suggestion_cache[cache_key] = suggestions

            return suggestions

        except Exception as e:
            logger.error(f"AI Generation Error: {e}")
            raise
