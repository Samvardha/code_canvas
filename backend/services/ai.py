import os
import logging
import json
import time
from typing import List, Optional, Dict
from google import genai
from google.genai import types
from cachetools import TTLCache
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Initialize Gemini Client
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

class AIService:
    """Service for handling AI-powered features using Gemini."""
    
    _suggestion_cache = TTLCache(maxsize=100, ttl=3600)
    _rate_limits = {} 
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
        if not client:
            raise Exception("Gemini API Key not configured.")

        if not AIService._check_rate_limit(uid):
            raise Exception("Rate limit exceeded. Please wait a minute.")

        if not draft or len(draft.strip()) < 5:
            return ["Try providing a bit more detail for better suggestions!"]

        cache_key = f"{uid}:{draft}"
        if cache_key in AIService._suggestion_cache:
            return AIService._suggestion_cache[cache_key]

        try:
            # 1. Generate Content. Increased tokens to 1024 to prevent truncation.
            response = client.models.generate_content(
                model='models/gemini-flash-latest',
                contents=f"You are a technical developer posting on 'Tech Connect'. Your draft: '{draft}'. Context: {user_context}. Task: Rewrite into 3 EPIC first-person posts (50-60 words each). Return STRICTLY a JSON list of 3 strings.",
                config=types.GenerateContentConfig(
                    max_output_tokens=1024, 
                    temperature=0.8,
                )
            )

            text = response.text.strip()
            
            # 2. Extract JSON from potential markdown/extraneous text
            start = text.find('[')
            end = text.rfind(']')
            
            if start != -1:
                # If we have both brackets, use the content between them
                if end != -1 and end > start:
                    json_str = text[start:end+1]
                else:
                    # Truncated or missing closing bracket
                    json_str = text[start:]
                    # Check if it ends in a middle of a string
                    if json_str.count('"') % 2 != 0:
                        # Append a quote and a bracket to attempt a fix
                        json_str += '"]'
                    elif not json_str.endswith(']'):
                        json_str += ']'
                
                try:
                    suggestions = json.loads(json_str)
                    if isinstance(suggestions, list):
                        suggestions = [str(s) for s in suggestions if len(str(s)) > 5]
                        if suggestions:
                            AIService._suggestion_cache[cache_key] = suggestions[:3]
                            return suggestions[:3]
                except json.JSONDecodeError:
                    logger.warning(f"Simple JSON repair failed for: {json_str[:50]}...")
            
            # Fallback: Extraction using regex or simple split if JSON is totally broken
            import re
            lines = re.findall(r'"([^"]*)"', text)
            if not lines:
                lines = [line.strip(' "[]-') for line in text.split('\n') if len(line.strip()) > 10]
            
            return lines[:3] if lines else None

        except Exception as e:
            logger.error(f"AI Generation Error: {e}")
            raise e
