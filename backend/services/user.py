import logging
from datetime import datetime
from typing import Optional, Dict, Any
from firebase_admin import auth
from utils.database import get_users_collection

logger = logging.getLogger(__name__)


class UserService:
    """Service for user management operations."""

    @staticmethod
    async def is_username_available(username: str) -> bool:
        """
        Check if a username is available.
        Checks against reserved words and database for existing users.
        """
        # 1. Normalize
        username = str(username).lower().strip()
        
        # 2. Format validation: starts with letter, only a-z0-9_, no consecutive underscores
        import re
        if not re.match(r"^[a-z][a-z0-9_]*$", username) or "__" in username:
            logger.info("Username check failed: invalid format", extra={"username": username})
            return False
        
        # 3. Check reserved words
        reserved_words = {"admin", "api", "support", "settings", "login"}
        if username in reserved_words:
            logger.info("Username check failed: reserved word", extra={"username": username})
            return False
            
        # 3. Check database
        collection = await get_users_collection()
        existing_user = await collection.find_one({"profile.username": username})
        
        if existing_user:
            logger.info("Username check failed: already taken", extra={"username": username})
            return False
            
        return True

    @staticmethod
    async def provision_user_on_auth(
        uid: str,
        email: str,
        provider_id: str,
        encrypted_token: Optional[str] = None,
        provider_data: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Provision a new user or update existing user on authentication.
        
        Uses field-level updates to avoid overwriting existing profile or linked providers.
        """
        try:
            collection = await get_users_collection()
            
            # 1. Prepare fields that ALWAYS get updated
            set_ops: Dict[str, Any] = {
                "email": email,
                "updated_at": datetime.utcnow(),
            }

            # 2. Update specific provider info without wiping other providers
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

            # 3. Prepare fields for NEW users only
            profile = UserService._initialize_profile(provider_id, provider_data)
            insert_ops = {
                "created_at": datetime.utcnow(),
                "profile": profile,
                "profile_complete": UserService._is_profile_complete(profile),
                "stats": {
                    "posts_count": 0,
                    "peers_count": 0,
                    "collabs_count": 0,
                },
                "settings": {},
            }

            update_doc = {
                "$set": set_ops,
                "$setOnInsert": insert_ops,
            }

            result = await collection.update_one(
                {"_id": uid},
                update_doc,
                upsert=True,
            )

            is_new = result.upserted_id is not None
            logger.info(
                "User %s via %s (new=%s)",
                "created" if is_new else "updated",
                provider_id,
                is_new,
                extra={"uid": uid, "provider": provider_id},
            )

        except Exception as e:
            logger.error(
                "Failed to provision user",
                exc_info=True,
                extra={"uid": uid, "provider": provider_id},
            )
            raise


    @staticmethod
    def _initialize_profile(provider_id: str, provider_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Initialize user profile based on provider.
        
        For Google: Extract name, avatar_url, location from provider data.
        For others: Return empty profile (requires onboarding).
        """
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
        """
        Check if user profile is complete.
        
        Profile is complete when: name, username, bio, and skills are all filled. (Location and Avatar are optional)
        
        Args:
            profile: User profile dictionary
            
        Returns:
            True if profile is complete, False otherwise
        """
        required_fields = ["name", "username", "bio"]
        
        for field in required_fields:
            value = profile.get(field, "")
            if not value or (isinstance(value, str) and not value.strip()):
                return False
        
        # Check if skills is a non-empty list
        skills = profile.get("skills", [])
        if not skills or not isinstance(skills, list) or len(skills) == 0:
            return False
        
        return True

    @staticmethod
    def _extract_google_profile_data(decoded_token: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract Google profile data from Firebase decoded token.
        
        Args:
            decoded_token: Firebase decoded ID token
            
        Returns:
            Dictionary with name, picture, and location (if available)
        """
        return {
            "name": decoded_token.get("name", ""),
            "picture": decoded_token.get("picture", ""),
            "location": decoded_token.get("location", ""),
        }

    @staticmethod
    async def complete_user_onboarding(uid: str, onboarding_data: Dict[str, Any]) -> None:
        """
        Complete user onboarding by updating profile with user-provided data.
        
        Used for email/password signups to collect profile information.
        
        Args:
            uid: Firebase user ID
            onboarding_data: Dictionary containing name, username, bio, location, skills
            
        Raises:
            Exception: If database operation fails
        """
        try:
            collection = await get_users_collection()

            # Build profile from onboarding data
            profile_data = {
                "name": onboarding_data.get("name", ""),
                "username": str(onboarding_data.get("username", "")).lower().strip(),
                "bio": onboarding_data.get("bio", ""),
                "location": onboarding_data.get("location", ""),
                "avatar_url": onboarding_data.get("avatar_url", ""),
                "skills": onboarding_data.get("skills", []),
            }

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

            result = await collection.update_one(
                {"_id": uid},
                {"$set": update_ops},
            )

            if result.matched_count == 0:
                logger.warning("User not found for onboarding", extra={"uid": uid})
                raise Exception("User not found")

            logger.info(
                "User onboarding completed",
                extra={"uid": uid, "username": onboarding_data.get("username")},
            )

        except Exception as e:
            logger.error(
                "Failed to complete user onboarding",
                exc_info=True,
                extra={"uid": uid},
            )
            raise

    @staticmethod
    async def fetch_user_profile(uid: str) -> Optional[Dict[str, Any]]:
        """
        Fetch user profile by ID with sensitive data redacted.
        
        Args:
            uid: Firebase user ID
            
        Returns:
            User document or None if not found
        """
        try:
            collection = await get_users_collection()
            user = await collection.find_one({"_id": uid})

            if user:
                UserService._redact_sensitive_fields(user)
                logger.debug("User profile retrieved", extra={"uid": uid})
            else:
                logger.warning("User not found", extra={"uid": uid})

            return user

        except Exception as e:
            logger.error(
                "Failed to fetch user profile",
                exc_info=True,
                extra={"uid": uid},
            )
            raise

    @staticmethod
    async def fetch_user_by_username(username: str) -> Optional[Dict[str, Any]]:
        """
        Fetch user profile by username with sensitive data redacted.
        
        Args:
            username: The unique handle of the user
            
        Returns:
            User document or None if not found
        """
        try:
            collection = await get_users_collection()
            user = await collection.find_one({"profile.username": username.lower().strip()})

            if user:
                UserService._redact_sensitive_fields(user)
                logger.debug("User profile retrieved by username", extra={"username": username})
            else:
                logger.warning("User not found by username", extra={"username": username})

            return user

        except Exception as e:
            logger.error(
                "Failed to fetch user profile by username",
                exc_info=True,
                extra={"username": username},
            )
            raise

    @staticmethod
    async def update_user_profile_fields(uid: str, profile_updates: Dict[str, Any]) -> None:
        """
        Update specific user profile fields.
        
        Args:
            uid: Firebase user ID
            profile_updates: Dictionary of profile fields to update
            
        Raises:
            Exception: If database operation fails
        """
        try:
            collection = await get_users_collection()

            update_ops = {}
            for key, value in profile_updates.items():
                if key == "username":
                    value = str(value).lower().strip()
                update_ops[f"profile.{key}"] = value

            update_ops["updated_at"] = datetime.utcnow()

            result = await collection.update_one(
                {"_id": uid},
                {"$set": update_ops},
            )

            if result.matched_count == 0:
                logger.warning("User not found for profile update", extra={"uid": uid})
            else:
                logger.info(
                    "User profile updated",
                    extra={"uid": uid, "fields": list(profile_updates.keys())},
                )

            # 4. Re-calculate profile completion status
            # Fetch the updated profile to ensure current state
            user = await collection.find_one({"_id": uid})
            if user and "profile" in user:
                is_complete = UserService._is_profile_complete(user["profile"])
                await collection.update_one(
                    {"_id": uid},
                    {"$set": {"profile_complete": is_complete, "updated_at": datetime.utcnow()}}
                )
                logger.info("Profile completion status updated", extra={"uid": uid, "complete": is_complete})

        except Exception as e:
            logger.error(
                "Failed to update user profile",
                exc_info=True,
                extra={"uid": uid},
            )
            raise
 
    @staticmethod
    async def sync_user_stats(uid: str, stats_updates: Dict[str, Any]) -> None:
        """
        Update user statistics in the database.
        
        Args:
            uid: Firebase user ID
            stats_updates: Dictionary of stats to update (e.g., {"peers_count": 10})
        """
        try:
            collection = await get_users_collection()
            
            update_ops = {}
            for key, value in stats_updates.items():
                update_ops[f"stats.{key}"] = value
                
            update_ops["updated_at"] = datetime.utcnow()
            
            await collection.update_one(
                {"_id": uid},
                {"$set": update_ops}
            )
            
            logger.info("User stats synced", extra={"uid": uid, "stats": stats_updates})
            
        except Exception as e:
            logger.error("Failed to sync user stats", exc_info=True, extra={"uid": uid})
            raise
 
    @staticmethod
    def _redact_sensitive_fields(user: Dict[str, Any]) -> None:
        """Redact sensitive fields from user document in-place."""
        if user.get("providers", {}).get("github", {}).get("access_token"):
            user["providers"]["github"]["access_token"] = "[REDACTED]"
