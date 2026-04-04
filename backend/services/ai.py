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

# [ CONFIGURATION & INITIALIZATION ] ───────────────────────────────────────────
logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not configured in environment variables")

client = genai.Client(api_key=GEMINI_API_KEY)


class AIService:
    """
    Service for orchestrating AI-powered features via Google Gemini.
    
    Includes built-in rate limiting and response caching to optimize
    API consumption and reduce latency.
    """

    # Cache AI responses for 1 hour to prevent redundant generation
    _suggestion_cache = TTLCache(maxsize=200, ttl=3600)

    # Rate limiter cache (Sliding window: 3 RPM per user)
    _rate_limits = TTLCache(maxsize=5000, ttl=120)
    MAX_RPM_PER_USER = 3


    # [ INTERNAL UTILITIES ] ───────────────────────────────────────────────────

    @staticmethod
    def _check_rate_limit(uid: str) -> bool:
        """
        Implements a sliding window rate limiter for a specific user ID.
        """
        now = time.time()
        user_history = AIService._rate_limits.get(uid, [])
        
        # 1. Purge old timestamps (older than 60 seconds)
        user_history = [t for t in user_history if now - t < 60]

        # 2. Check threshold
        if len(user_history) >= AIService.MAX_RPM_PER_USER:
            return False

        # 3. Update history
        user_history.append(now)
        AIService._rate_limits[uid] = user_history
        return True


    # [ GENERATIVE OPERATIONS ] ───────────────────────────────────────────────

    @staticmethod
    async def suggest_captions(uid: str, draft: str, user_context: Dict) -> Optional[List[str]]:
        """
        Generates three high-quality, professional post rewrites based on a user draft.
        
        - Checks per-user rate limits.
        - Leverages cached responses if the same draft/context is submitted.
        - Synchronously executes the blocking Gemini SDK in a thread pool.
        """
        
        # 1. Gatekeeping: Rate Limit & Input Validation
        if not AIService._check_rate_limit(uid):
            raise Exception("Rate limit exceeded. Please wait a minute.")

        if not draft or len(draft.strip()) < 5:
            return ["Refine your draft to at least 5 characters for better AI analysis!"]

        # 2. Cache Lookup
        cache_key = f"{draft}:{json.dumps(user_context, sort_keys=True)}"
        if cache_key in AIService._suggestion_cache:
            return AIService._suggestion_cache[cache_key]

        try:
            # 3. Construct the prompt with persona settings
            prompt = f"""
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
            """

            # 4. Proxy request to Gemini 2.5 Flash
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

            # 5. Extract and Validate JSON Result
            start = text.find("[")
            end = text.rfind("]")

            if start != -1 and end != -1:
                json_str = text[start : end + 1]
                try:
                    suggestions = json.loads(json_str)
                    if isinstance(suggestions, list):
                        suggestions = [str(s).strip() for s in suggestions if len(str(s).strip()) > 5]
                        if suggestions:
                            suggestions = suggestions[:3]
                            AIService._suggestion_cache[cache_key] = suggestions
                            return suggestions
                except json.JSONDecodeError:
                    logger.warning("AI JSON parsing failed, attempting fallback extraction")

            # 6. Fallback string-matching extraction if JSON fails
            lines = re.findall(r'"([^"]+)"', text)
            if not lines:
                lines = [line.strip(' "[]-') for line in text.split("\n") if len(line.strip()) > 10]

            suggestions = lines[:3] if lines else None
            if suggestions:
                AIService._suggestion_cache[cache_key] = suggestions

            return suggestions

        except Exception as e:
            logger.error(f"Gemini Generation Failure: {e}")
            raise
