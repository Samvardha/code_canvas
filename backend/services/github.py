from datetime import datetime
import logging

import httpx

from utils.database import get_users_collection

logger = logging.getLogger(__name__)


async def sync_github_profile(
    uid: str,
    email: str,
    provider_id: str,
    encrypted_token: str,
    plain_token: str,
):
    """Background task to fetch GitHub user data and upsert to MongoDB."""
    collection = await get_users_collection()

    user_doc = {
        "firebase_uid": uid,
        "email": email,
        "auth_provider": provider_id,
        "github_access_token": encrypted_token,
        "last_synced_at": datetime.utcnow(),
    }
    if not plain_token:
        await collection.update_one(
            {"_id": uid},
            {"$set": user_doc, "$setOnInsert": {"created_at": datetime.utcnow()}},
            upsert=True,
        )
        logger.info(
            "✨ Upserted user without GitHub enrichment for uid=%s (no plain token)",
            uid,
        )
        return

    try:
        async with httpx.AsyncClient() as client:
            profile_res = await client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"Bearer {plain_token}"},
            )
            profile_data = (
                profile_res.json() if profile_res.status_code == 200 else {}
            )

            # Fix: If Firebase didn't provide an email, get it from GitHub profile
            if not email:
                email = profile_data.get("email") or ""
            # If still empty (user has private email), try the /user/emails endpoint
            if not email:
                emails_res = await client.get(
                    "https://api.github.com/user/emails",
                    headers={"Authorization": f"Bearer {plain_token}"},
                )
                if emails_res.status_code == 200:
                    emails_list = emails_res.json()
                    primary = next(
                        (e for e in emails_list if e.get("primary")),
                        None,
                    )
                    email = (
                        primary["email"]
                        if primary
                        else (
                            emails_list[0]["email"]
                            if emails_list
                            else ""
                        )
                    )
            # Always update user_doc with the resolved email
            user_doc["email"] = email

            repos_res = await client.get(
                "https://api.github.com/user/repos?type=public&per_page=100",
                headers={"Authorization": f"Bearer {plain_token}"},
            )
            repos = repos_res.json() if repos_res.status_code == 200 else []

            total_stars = sum(repo.get("stargazers_count", 0) for repo in repos)
            total_forks = sum(repo.get("forks_count", 0) for repo in repos)

            language_stats = {}
            for repo in repos:
                lang = repo.get("language")
                if lang:
                    language_stats[lang] = language_stats.get(lang, 0) + 1

            enriched_user_doc = {
                **user_doc,
                "profile": {
                    "bio": profile_data.get("bio"),
                    "location": profile_data.get("location"),
                    "website": profile_data.get("blog"),
                    "company": profile_data.get("company"),
                    "avatar_url": profile_data.get("avatar_url"),
                },
                "github_reputation": {
                    "username": profile_data.get("login"),
                    "total_stars": total_stars,
                    "total_forks": total_forks,
                    "followers": profile_data.get("followers", 0),
                },
                "language_stats": language_stats,
            }

            await collection.update_one(
                {"_id": uid},
                {
                    "$set": enriched_user_doc,
                    "$setOnInsert": {"created_at": datetime.utcnow()},
                },
                upsert=True,
            )

            logger.info(
                "✅ Synced GitHub profile for uid=%s (repos=%d, stars=%d, forks=%d)",
                uid,
                len(repos),
                total_stars,
                total_forks,
            )

    except Exception:
        logger.exception("❌ Error syncing GitHub profile for uid=%s", uid)
