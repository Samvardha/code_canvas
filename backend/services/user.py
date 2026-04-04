import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
import re
from firebase_admin import auth
from utils.database import get_users_collection

# [ CONFIGURATION ] ────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)


class UserService:
    """
    Service layer for orchestrating user identity and profile metadata.
    
    Handles multi-provider provisioning (Google, GitHub, Email), profile 
    onboarding flows, PII redaction, and aggregate stat synchronization.
    """

    # [ PROVISIONING & AUTHENTICATION ] ────────────────────────────────────────

    @staticmethod
    async def provision_user_on_auth(
        uid: str,
        email: str,
        provider_id: str,
        encrypted_token: Optional[str] = None,
        provider_data: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Synchronize a user node with the database following a Firebase auth event.
        
        Logic Flow:
        1. Always-Update: Refreshes timestamp and email.
        2. Provider-Specific: Updates link status and encrypted OAuth tokens.
        3. On-Insert: Initializes the rich profile and stats if the user is new.
        """
        try:
            collection = await get_users_collection()
            
            # 1. Update core session metadata
            set_ops: Dict[str, Any] = {
                "email": email,
                "updated_at": datetime.utcnow(),
            }

            # 2. Update provider-specific links
            if provider_id == "github.com":
                set_ops["providers.github.linked"] = True
                set_ops["providers.github.last_synced_at"] = datetime.utcnow()
                if encrypted_token:
                    set_ops["providers.github.access_token"] = encrypted_token
                if provider_data and provider_data.get("username"):
                    set_ops["providers.github.username"] = provider_data.get("username")
            elif provider_id == "google.com":
                set_ops["providers.google.linked"] = True
            elif provider_id == "password":
                set_ops["providers.email.linked"] = True

            # 3. Provisioning logic for first-time transmission
            profile = UserService._initialize_profile(provider_id, provider_data)
            insert_ops = {
                "created_at": datetime.utcnow(),
                "profile": profile,
                "profile_complete": UserService._is_profile_complete(profile),
                "stats": {"posts_count": 0, "peers_count": 0, "collabs_count": 0},
                "settings": {},
            }

            result = await collection.update_one(
                {"_id": uid},
                {"$set": set_ops, "$setOnInsert": insert_ops},
                upsert=True,
            )

            is_new = result.upserted_id is not None
            logger.info(f"User identity synchronized: {uid} (New: {is_new}) via {provider_id}")

        except Exception:
            logger.error(f"User provisioning failure for UID: {uid}", exc_info=True)
            raise


    @staticmethod
    async def is_username_available(username: str) -> bool:
        """ Verify if a handle conforms to network standards and is globally unique. """
        # 1. Normalization
        username = str(username).lower().strip()
        
        # 2. Format Enforcement (Starts with alpha, alphanumeric/underscore only)
        if not re.match(r"^[a-z][a-z0-9_]*$", username) or "__" in username:
            return False
        
        # 3. Reserved Namespace Protection
        reserved_words = {"admin", "api", "support", "settings", "login", "techconnect"}
        if username in reserved_words:
            return False
            
        # 4. Global Uniqueness Check
        collection = await get_users_collection()
        existing_user = await collection.find_one({"profile.username": username})
        return existing_user is None


    @staticmethod
    async def complete_user_onboarding(uid: str, onboarding_data: Dict[str, Any]) -> None:
        """ Finalize a user's profile metadata during the initial onboarding sequence. """
        try:
            collection = await get_users_collection()

            # 1. Sanitize user-provided fields
            profile_data = {
                "name": onboarding_data.get("name", ""),
                "username": str(onboarding_data.get("username", "")).lower().strip(),
                "bio": onboarding_data.get("bio", ""),
                "location": onboarding_data.get("location", ""),
                "avatar_url": onboarding_data.get("avatar_url", ""),
                "skills": onboarding_data.get("skills", []),
            }

            # 2. Update the profile node and re-evaluate completion status
            update_ops = {
                "profile.name": profile_data["name"],
                "profile.username": profile_data["username"],
                "profile.bio": profile_data["bio"],
                "profile.location": profile_data["location"],
                "profile.avatar_url": profile_data["avatar_url"],
                "profile.skills": profile_data["skills"],
                "profile_complete": UserService._is_profile_complete(profile_data),
                "updated_at": datetime.utcnow(),
            }

            result = await collection.update_one({"_id": uid}, {"$set": update_ops})

            if result.matched_count == 0:
                raise Exception(f"User Not Found: {uid}")

            logger.info(f"Onboarding flow finalized for {profile_data['username']}")

        except Exception:
            logger.error(f"Onboarding sequence failure for UID: {uid}", exc_info=True)
            raise


    # [ PROFILE RETRIEVAL ] ────────────────────────────────────────────────────

    @staticmethod
    async def fetch_user_profile(uid: str) -> Optional[Dict[str, Any]]:
        """ Fetch a user node by ID and automatically redact private PII (tokens). """
        try:
            collection = await get_users_collection()
            user = await collection.find_one({"_id": uid})

            if user:
                UserService._redact_sensitive_fields(user)
            return user

        except Exception:
            logger.error(f"Profile fetch failure: {uid}", exc_info=True)
            raise


    @staticmethod
    async def fetch_user_by_username(username: str) -> Optional[Dict[str, Any]]:
        """ Fetch a user node by unique handle and automatically redact PII. """
        try:
            collection = await get_users_collection()
            user = await collection.find_one({"profile.username": username.lower().strip()})

            if user:
                UserService._redact_sensitive_fields(user)
            return user

        except Exception:
            logger.error(f"Handle search failure: {username}", exc_info=True)
            raise


    @staticmethod
    async def fetch_chat_profiles(uids: List[str]) -> List[Dict[str, Any]]:
        """ Batch retrieve lightweight profile cards for chat UI list rendering. """
        try:
            collection = await get_users_collection()
            projection = {
                "_id": 1,
                "profile.name": 1,
                "profile.username": 1,
                "profile.avatar_url": 1,
            }
            cursor = collection.find({"_id": {"$in": uids}}, projection)
            users = await cursor.to_list(length=len(uids))

            return [
                {
                    "user_id": u["_id"],
                    "name": u.get("profile", {}).get("name", "Unknown"),
                    "username": u.get("profile", {}).get("username", "unknown"),
                    "avatar_url": u.get("profile", {}).get("avatar_url", ""),
                }
                for u in users
            ]
        except Exception:
            logger.error("Batch chat profile fetch failed", exc_info=True)
            return []


    # [ PROFILE MUTATIONS ] ────────────────────────────────────────────────────

    @staticmethod
    async def update_user_profile_fields(uid: str, profile_updates: Dict[str, Any]) -> None:
        """ Atomic update of specific profile fields with automatic completion re-sync. """
        try:
            collection = await get_users_collection()

            # 1. Format and prefix updates for the 'profile' sub-node
            update_ops = {}
            for key, value in profile_updates.items():
                if key == "username":
                    value = str(value).lower().strip()
                update_ops[f"profile.{key}"] = value

            update_ops["updated_at"] = datetime.utcnow()

            # 2. Execute primary update
            await collection.update_one({"_id": uid}, {"$set": update_ops})

            # 3. Synchronize 'profile_complete' status based on new state
            user = await collection.find_one({"_id": uid})
            if user and "profile" in user:
                is_complete = UserService._is_profile_complete(user["profile"])
                await collection.update_one(
                    {"_id": uid},
                    {"$set": {"profile_complete": is_complete, "updated_at": datetime.utcnow()}}
                )

        except Exception:
            logger.error(f"Profile update failure: {uid}", exc_info=True)
            raise


    @staticmethod
    async def sync_user_stats(uid: str, stats_updates: Dict[str, Any]) -> None:
        """ Update aggregate user metrics (post counts, peer counts). """
        try:
            collection = await get_users_collection()
            update_ops = {f"stats.{k}": v for k, v in stats_updates.items()}
            update_ops["updated_at"] = datetime.utcnow()
            
            await collection.update_one({"_id": uid}, {"$set": update_ops})

        except Exception:
            logger.error(f"Stats sync failure: {uid}", exc_info=True)
            raise


    # [ INTERNAL HELPERS & PRIVACY ] ───────────────────────────────────────────

    @staticmethod
    def _initialize_profile(provider_id: str, provider_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """ Identity bootstrapping for initial user node creation. """
        base_profile = {
            "name": "",
            "username": "",
            "avatar_url": "",
            "bio": "",
            "location": "",
            "skills": [],
        }

        if provider_id == "google.com" and provider_data:
            base_profile["name"] = provider_data.get("name", "")
            base_profile["avatar_url"] = provider_data.get("picture", "")
            base_profile["location"] = provider_data.get("location", "")

        return base_profile


    @staticmethod
    def _is_profile_complete(profile: Dict[str, Any]) -> bool:
        """ Enforce network completeness requirements (Bio, Skills, Handle). """
        required_fields = ["name", "username", "bio"]
        for field in required_fields:
            val = profile.get(field, "")
            if not val or (isinstance(val, str) and not val.strip()):
                return False
        
        skills = profile.get("skills", [])
        return bool(skills and isinstance(skills, list) and len(skills) > 0)


    @staticmethod
    def _extract_google_profile_data(decoded_token: Dict[str, Any]) -> Dict[str, Any]:
        """ Sanitize and extract incoming Google JWT claims. """
        return {
            "name": decoded_token.get("name", ""),
            "picture": decoded_token.get("picture", ""),
            "location": decoded_token.get("location", ""),
        }


    @staticmethod
    def _redact_sensitive_fields(user: Dict[str, Any]) -> None:
        """ In-place redaction of sensitive OAuth artifacts before network distribution. """
        if "providers" in user and "github" in user["providers"]:
            if "access_token" in user["providers"]["github"]:
                user["providers"]["github"]["access_token"] = "[REDACTED]"
