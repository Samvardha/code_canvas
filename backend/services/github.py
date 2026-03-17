import logging
import httpx
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

GITHUB_API_BASE = "https://api.github.com"


class GitHubService:
    """Service for GitHub API interactions."""

    @staticmethod
    async def extract_github_username(access_token: str) -> Optional[str]:
        """
        Extract GitHub username from access token.
        
        Args:
            access_token: GitHub OAuth access token
            
        Returns:
            GitHub username or None if fetch fails
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
            logger.warning("Failed to extract GitHub username", exc_info=True)
            return None

    @staticmethod
    async def fetch_user_profile(
        access_token: str, 
        page: int = 1, 
        per_page: int = 9,
        repos_only: bool = False
    ) -> Dict[str, Any]:
        """
        Fetch GitHub user profile or just repositories.
        """
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                if repos_only:
                    # Optimized path for repo selection
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
                    
                    logger.info(f"GitHub repositories fetched (page {page})", extra={"count": len(repos)})
                    return {
                        "repos": repos,
                        "has_more": len(raw_repos) == per_page
                    }

                # Full profile path
                profile_data = await GitHubService._fetch_user_identity(client, headers)
                profile_data["emails"] = await GitHubService._fetch_user_emails(client, headers)
                profile_data["repositories"] = await GitHubService._fetch_user_repositories(client, headers, page=page, per_page=per_page)
                profile_data["activity"] = await GitHubService._fetch_user_activity(client, headers, profile_data["identity"]["username"])
                logger.info("GitHub profile fetched successfully", extra={"username": profile_data["identity"]["username"]})
                return profile_data

        except Exception:
            logger.error(f"Failed to fetch GitHub {'repos' if repos_only else 'profile'}", exc_info=True)
            raise

    @staticmethod
    async def fetch_public_profile(username: str, page: int = 1, per_page: int = 9, access_token: Optional[str] = None) -> Dict[str, Any]:
        """
        Fetch public GitHub user profile data.
        
        Args:
            username: GitHub username
            page: Results page
            per_page: Results per page
            access_token: Optional GitHub OAuth token from the requester to increase rate limits
            
        Returns:
            Dictionary containing public user profile data
        """
        headers = {
            "Accept": "application/vnd.github+json",
        }
        
        if access_token:
            headers["Authorization"] = f"Bearer {access_token}"

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                profile_data = await GitHubService._fetch_user_identity(client, headers, username)
                profile_data["emails"] = []
                profile_data["repositories"] = await GitHubService._fetch_user_repositories(client, headers, username, page=page, per_page=per_page)
                profile_data["activity"] = await GitHubService._fetch_user_activity(client, headers, username)

                logger.info(
                    "Public GitHub profile fetched successfully",
                    extra={"username": username, "authenticated": bool(access_token)},
                )
                return profile_data

        except Exception:
            logger.error("Failed to fetch public GitHub profile", exc_info=True, extra={"username": username})
            raise

    @staticmethod
    async def _fetch_user_identity(client: httpx.AsyncClient, headers: Dict[str, str], username: Optional[str] = None) -> Dict[str, Any]:
        """Fetch GitHub user identity and profile information."""
        try:
            url = f"{GITHUB_API_BASE}/users/{username}" if username else f"{GITHUB_API_BASE}/user"
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            profile = response.json()
            username = profile.get("login", "")

            return {
                "identity": {
                    "username": username,
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
            logger.error("Failed to fetch GitHub user identity", exc_info=True)
            raise

    @staticmethod
    async def _fetch_user_emails(client: httpx.AsyncClient, headers: Dict[str, str]) -> list:
        """Fetch GitHub user email addresses."""
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
            logger.warning("Failed to fetch GitHub emails", exc_info=True)
            return []


    @staticmethod
    async def _fetch_user_repositories(
        client: httpx.AsyncClient, 
        headers: Dict[str, str], 
        username: Optional[str] = None,
        page: int = 1,
        per_page: int = 9
    ) -> Dict[str, Any]:
        """Fetch GitHub user repositories and statistics."""
        try:
            if username:
                url = f"{GITHUB_API_BASE}/users/{username}/repos?type=owner&sort=stars&page={page}&per_page={per_page}"
            else:
                url = f"{GITHUB_API_BASE}/user/repos?affiliation=owner&sort=stars&page={page}&per_page={per_page}"
            response = await client.get(
                url,
                headers=headers,
            )
            response.raise_for_status()
            raw_repos = response.json()

            repos = []

            for repo in raw_repos:
                stars = repo.get("stargazers_count", 0)
                forks = repo.get("forks_count", 0)
                
                primary_lang = repo.get("language")
                langs = [primary_lang] if primary_lang else []
                
                repos.append({
                    "name": repo.get("name"),
                    "full_name": repo.get("full_name"),
                    "description": repo.get("description"),
                    "html_url": repo.get("html_url"),
                    "languages": langs,
                    "stars": stars,
                    "forks": forks,
                })

            return {
                "repositories": repos,
                "repo_stats": {
                    "page": page,
                    "per_page": per_page,
                },
            }
        except Exception:
            logger.warning("Failed to fetch GitHub repositories", exc_info=True)
            return {"repositories": [], "repo_stats": {}}


    @staticmethod
    async def _fetch_user_activity(client: httpx.AsyncClient, headers: Dict[str, str], username: str) -> list:
        """Fetch GitHub user public activity events."""
        if not username:
            return []

        try:
            response = await client.get(
                f"{GITHUB_API_BASE}/users/{username}/events/public?per_page=10",
                headers=headers,
            )
            if response.status_code == 200:
                return [
                    {
                        "type": e.get("type"),
                        "repo": e.get("repo", {}).get("name"),
                        "created_at": e.get("created_at"),
                        "action": e.get("payload", {}).get("action"),
                    }
                    for e in response.json()[:5]
                ]
            return []
        except Exception:
            logger.warning("Failed to fetch GitHub activity", exc_info=True)
            return []
