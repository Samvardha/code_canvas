import logging
import httpx
from typing import Dict, Any, Optional

# [ CONFIGURATION ] ────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)
GITHUB_API_BASE = "https://api.github.com"


class GitHubService:
    """
    Service for orchestrating communications with the GitHub REST API.
    
    Handles OAuth token verification, profile synchronization, and repository 
    meta-data retrieval for both authenticated and public users.
    """


    # [ PUBLIC INTERFACE ] ─────────────────────────────────────────────────────

    @staticmethod
    async def extract_github_username(access_token: str) -> Optional[str]:
        """
        Verify an OAuth token's validity and extract the associated username.
        """
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{GITHUB_API_BASE}/user", headers=headers)
                response.raise_for_status()
                profile = response.json()
                return profile.get("login")
        except Exception:
            logger.warning("Token verification failed: Cannot extract GitHub username", exc_info=True)
            return None


    @staticmethod
    async def fetch_user_profile(
        access_token: str, 
        page: int = 1, 
        per_page: int = 9,
        repos_only: bool = False
    ) -> Dict[str, Any]:
        """
        Fetch a comprehensive profile for the authenticated token holder.
        
        Logic Flow:
        1. Repos-Only check: Optimized path for repo selectors.
        2. Full Profile: Aggregates identity, emails (private), repos, and activity.
        """
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # 1. Specialized Repo Extraction
                if repos_only:
                    repo_data = await GitHubService._fetch_user_repositories(client, headers, page=page, per_page=per_page)
                    raw_repos = repo_data.get("repositories", [])
                    
                    repos = []
                    for repo in raw_repos:
                        full_name = repo.get("full_name", "")
                        repos.append({
                            "repo_url": repo.get("html_url"),
                            "repo_name": repo.get("name"),
                            "repo_owner": full_name.split("/")[0] if "/" in full_name else None,
                        })
                    
                    return {
                        "repos": repos,
                        "has_more": len(raw_repos) == per_page
                    }

                # 2. Aggregated Profile Data
                profile_data = await GitHubService._fetch_user_identity(client, headers)
                profile_data["emails"] = await GitHubService._fetch_user_emails(client, headers)
                profile_data["repositories"] = await GitHubService._fetch_user_repositories(client, headers, page=page, per_page=per_page)
                profile_data["activity"] = await GitHubService._fetch_user_activity(client, headers, profile_data["identity"]["username"])
                
                return profile_data

        except Exception:
            logger.error(f"GitHub Sync Error: {'repos' if repos_only else 'profile'}", exc_info=True)
            raise


    @staticmethod
    async def fetch_public_profile(username: str, page: int = 1, per_page: int = 9, access_token: Optional[str] = None) -> Dict[str, Any]:
        """
        Fetch public GitHub data for a specific user handle.
        
        Includes an optional access_token from the *requester* to bypass 
        stricter public rate limits.
        """
        headers = {"Accept": "application/vnd.github+json"}
        if access_token:
            headers["Authorization"] = f"Bearer {access_token}"

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # 1. Fetch cross-referenced data
                profile_data = await GitHubService._fetch_user_identity(client, headers, username)
                profile_data["emails"] = [] # Public profiles do not expose emails
                profile_data["repositories"] = await GitHubService._fetch_user_repositories(client, headers, username, page=page, per_page=per_page)
                profile_data["activity"] = await GitHubService._fetch_user_activity(client, headers, username)

                logger.info(f"Public profile synced: {username} (Auth: {bool(access_token)})")
                return profile_data

        except Exception:
            logger.error(f"Failed to sync public profile: {username}", exc_info=True)
            raise


    # [ INTERNAL FETCHERS ] ────────────────────────────────────────────────────

    @staticmethod
    async def _fetch_user_identity(client: httpx.AsyncClient, headers: Dict[str, str], username: Optional[str] = None) -> Dict[str, Any]:
        """Fetch core identity metrics from /user or /users/{username}."""
        try:
            url = f"{GITHUB_API_BASE}/users/{username}" if username else f"{GITHUB_API_BASE}/user"
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            profile = response.json()

            return {
                "identity": {
                    "username": profile.get("login", ""),
                    "name": profile.get("name"),
                    "company": profile.get("company"),
                    "website": profile.get("blog"),
                    "html_url": profile.get("html_url"),
                    "public_repos": profile.get("public_repos", 0),
                    "public_gists": profile.get("public_gists", 0),
                    "created_at": profile.get("created_at"),
                }
            }
        except Exception:
            logger.error("Identity fetch failed", exc_info=True)
            raise


    @staticmethod
    async def _fetch_user_emails(client: httpx.AsyncClient, headers: Dict[str, str]) -> list:
        """Fetch private email scope (Requires user:email permission)."""
        try:
            response = await client.get(f"{GITHUB_API_BASE}/user/emails", headers=headers)
            if response.status_code == 200:
                return [
                    {
                        "email": e.get("email"),
                        "primary": e.get("primary"),
                        "verified": e.get("verified"),
                    }
                    for e in response.json()
                ]
            return []
        except Exception:
            logger.warning("Email scope fetch failed", exc_info=True)
            return []


    @staticmethod
    async def _fetch_user_repositories(
        client: httpx.AsyncClient, 
        headers: Dict[str, str], 
        username: Optional[str] = None,
        page: int = 1,
        per_page: int = 9
    ) -> Dict[str, Any]:
        """Fetch star-sorted repositories for a user."""
        try:
            if username:
                url = f"{GITHUB_API_BASE}/users/{username}/repos?type=owner&sort=stars&page={page}&per_page={per_page}"
            else:
                url = f"{GITHUB_API_BASE}/user/repos?affiliation=owner&sort=stars&page={page}&per_page={per_page}"
            
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            raw_repos = response.json()

            repos = []
            for repo in raw_repos:
                primary_lang = repo.get("language")
                repos.append({
                    "name": repo.get("name"),
                    "full_name": repo.get("full_name"),
                    "description": repo.get("description"),
                    "html_url": repo.get("html_url"),
                    "languages": [primary_lang] if primary_lang else [],
                    "stars": repo.get("stargazers_count", 0),
                    "forks": repo.get("forks_count", 0),
                })

            return {
                "repositories": repos,
                "repo_stats": {"page": page, "per_page": per_page},
            }
        except Exception:
            logger.warning("Repository fetch failed", exc_info=True)
            return {"repositories": [], "repo_stats": {}}


    @staticmethod
    async def _fetch_user_activity(client: httpx.AsyncClient, headers: Dict[str, str], username: str) -> list:
        """Fetch the last 5 public activity events."""
        if not username:
            return []

        try:
            response = await client.get(
                f"{GITHUB_API_BASE}/users/{username}/events/public?per_page=10",
                headers=headers,
            )
            if response.status_code == 200:
                events = response.json()
                return [
                    {
                        "type": e.get("type"),
                        "repo": e.get("repo", {}).get("name"),
                        "created_at": e.get("created_at"),
                        "action": e.get("payload", {}).get("action"),
                    }
                    for e in events[:5]
                ]
            return []
        except Exception:
            logger.warning("Activity event fetch failed", exc_info=True)
            return []
