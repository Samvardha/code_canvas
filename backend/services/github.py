import logging
import httpx
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

GITHUB_API_BASE = "https://api.github.com"
GITHUB_GRAPHQL_ENDPOINT = f"{GITHUB_API_BASE}/graphql"

GRAPHQL_PINNED_REPOSITORIES_QUERY = """
query($login: String!) {
  user(login: $login) {
    pinnedItems(first: 6, types: REPOSITORY) {
      nodes {
        ... on Repository {
          name
          description
          url
          stargazerCount
          forkCount
          primaryLanguage { name color }
        }
      }
    }
  }
}
"""


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
        except Exception as e:
            logger.warning("Failed to extract GitHub username", exc_info=True)
            return None

    @staticmethod
    async def fetch_user_profile(access_token: str) -> Dict[str, Any]:
        """
        Fetch comprehensive GitHub user profile data.
        
        Args:
            access_token: GitHub OAuth access token
            
        Returns:
            Dictionary containing user profile data
            
        Raises:
            Exception: If GitHub API calls fail
        """
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                profile_data = await GitHubService._fetch_user_identity(client, headers)
                profile_data["emails"] = await GitHubService._fetch_user_emails(client, headers)
                profile_data["repositories"] = await GitHubService._fetch_user_repositories(client, headers)
                profile_data["organizations"] = await GitHubService._fetch_user_organizations(client, headers)
                profile_data["activity"] = await GitHubService._fetch_user_activity(client, headers, profile_data["identity"]["username"])
                profile_data["pinned_repos"] = await GitHubService._fetch_pinned_repositories(client, headers, profile_data["identity"]["username"])

                logger.info(
                    "GitHub profile fetched successfully",
                    extra={"username": profile_data["identity"]["username"]},
                )
                return profile_data

        except Exception as e:
            logger.error("Failed to fetch GitHub profile", exc_info=True)
            raise

    @staticmethod
    async def _fetch_user_identity(client: httpx.AsyncClient, headers: Dict[str, str]) -> Dict[str, Any]:
        """Fetch GitHub user identity and profile information."""
        try:
            response = await client.get(f"{GITHUB_API_BASE}/user", headers=headers)
            response.raise_for_status()
            profile = response.json()
            username = profile.get("login", "")

            return {
                "identity": {
                    "username": username,
                    "name": profile.get("name"),
                    "bio": profile.get("bio"),
                    "location": profile.get("location"),
                    "company": profile.get("company"),
                    "website": profile.get("blog"),
                    "avatar_url": profile.get("avatar_url"),
                    "html_url": profile.get("html_url"),
                    "followers": profile.get("followers", 0),
                    "following": profile.get("following", 0),
                    "public_repos": profile.get("public_repos", 0),
                    "public_gists": profile.get("public_gists", 0),
                    "created_at": profile.get("created_at"),
                }
            }
        except Exception as e:
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
        except Exception as e:
            logger.warning("Failed to fetch GitHub emails", exc_info=True)
            return []

    @staticmethod
    async def _fetch_user_repositories(client: httpx.AsyncClient, headers: Dict[str, str]) -> Dict[str, Any]:
        """Fetch GitHub user repositories and statistics."""
        try:
            response = await client.get(
                f"{GITHUB_API_BASE}/user/repos?type=public&sort=updated&per_page=100",
                headers=headers,
            )
            response.raise_for_status()
            raw_repos = response.json()

            repos = []
            total_stars = 0
            total_forks = 0
            aggregate_languages = {}

            for repo in raw_repos:
                stars = repo.get("stargazers_count", 0)
                forks = repo.get("forks_count", 0)
                total_stars += stars
                total_forks += forks
                lang = repo.get("language")

                if lang:
                    aggregate_languages[lang] = aggregate_languages.get(lang, 0) + 1

                repos.append({
                    "name": repo.get("name"),
                    "full_name": repo.get("full_name"),
                    "description": repo.get("description"),
                    "html_url": repo.get("html_url"),
                    "language": lang,
                    "stars": stars,
                    "forks": forks,
                    "watchers": repo.get("watchers_count", 0),
                    "open_issues": repo.get("open_issues_count", 0),
                    "is_fork": repo.get("fork", False),
                    "created_at": repo.get("created_at"),
                    "updated_at": repo.get("updated_at"),
                    "pushed_at": repo.get("pushed_at"),
                })

            return {
                "repositories": repos,
                "repo_stats": {
                    "total_stars": total_stars,
                    "total_forks": total_forks,
                    "total_repos": len(repos),
                },
                "aggregate_languages": aggregate_languages,
            }
        except Exception as e:
            logger.warning("Failed to fetch GitHub repositories", exc_info=True)
            return {"repositories": [], "repo_stats": {}, "aggregate_languages": {}}

    @staticmethod
    async def _fetch_user_organizations(client: httpx.AsyncClient, headers: Dict[str, str]) -> list:
        """Fetch GitHub user organizations."""
        try:
            response = await client.get(f"{GITHUB_API_BASE}/user/orgs", headers=headers)
            if response.status_code == 200:
                return [
                    {
                        "login": o.get("login"),
                        "avatar_url": o.get("avatar_url"),
                        "description": o.get("description"),
                    }
                    for o in response.json()
                ]
            return []
        except Exception as e:
            logger.warning("Failed to fetch GitHub organizations", exc_info=True)
            return []

    @staticmethod
    async def _fetch_user_activity(client: httpx.AsyncClient, headers: Dict[str, str], username: str) -> list:
        """Fetch GitHub user public activity events."""
        if not username:
            return []

        try:
            response = await client.get(
                f"{GITHUB_API_BASE}/users/{username}/events/public?per_page=30",
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
                    for e in response.json()
                ]
            return []
        except Exception as e:
            logger.warning("Failed to fetch GitHub activity", exc_info=True)
            return []

    @staticmethod
    async def _fetch_pinned_repositories(client: httpx.AsyncClient, headers: Dict[str, str], username: str) -> list:
        """Fetch GitHub user pinned repositories via GraphQL."""
        if not username:
            return []

        try:
            response = await client.post(
                GITHUB_GRAPHQL_ENDPOINT,
                headers=headers,
                json={
                    "query": GRAPHQL_PINNED_REPOSITORIES_QUERY,
                    "variables": {"login": username},
                },
            )
            response.raise_for_status()
            gql_data = response.json()

            if "errors" in gql_data:
                logger.warning("GraphQL errors fetching pinned repos", extra={"errors": gql_data["errors"]})
                return []

            pinned_nodes = (
                gql_data.get("data", {})
                .get("user", {})
                .get("pinnedItems", {})
                .get("nodes", [])
            )

            return [
                {
                    "name": p.get("name"),
                    "description": p.get("description"),
                    "url": p.get("url"),
                    "stars": p.get("stargazerCount", 0),
                    "forks": p.get("forkCount", 0),
                    "language": (p.get("primaryLanguage") or {}).get("name"),
                    "language_color": (p.get("primaryLanguage") or {}).get("color"),
                }
                for p in pinned_nodes
            ]
        except Exception as e:
            logger.warning("Failed to fetch pinned repositories", exc_info=True)
            return []
