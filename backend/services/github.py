from datetime import datetime
import logging
import httpx

from utils.database import get_users_collection

logger = logging.getLogger(__name__)

GRAPHQL_PINNED_QUERY = """
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


async def _fetch_github_data(plain_token: str) -> dict:
    """Fetches comprehensive GitHub profile data using REST + GraphQL APIs."""
    headers = {"Authorization": f"Bearer {plain_token}", "Accept": "application/vnd.github+json"}
    data = {}

    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. User Identity & Profile
        profile_res = await client.get("https://api.github.com/user", headers=headers)
        profile = profile_res.json() if profile_res.status_code == 200 else {}
        username = profile.get("login", "")

        data["identity"] = {
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

        # 2. Email Addresses
        emails_res = await client.get("https://api.github.com/user/emails", headers=headers)
        if emails_res.status_code == 200:
            data["emails"] = [
                {"email": e.get("email"), "primary": e.get("primary"), "verified": e.get("verified")}
                for e in emails_res.json()
            ]
        else:
            data["emails"] = []

        # 3. Public Repositories (up to 100)
        repos_res = await client.get(
            "https://api.github.com/user/repos?type=public&sort=updated&per_page=100",
            headers=headers
        )
        raw_repos = repos_res.json() if repos_res.status_code == 200 else []

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

        data["repositories"] = repos
        data["repo_stats"] = {
            "total_stars": total_stars,
            "total_forks": total_forks,
            "total_repos": len(repos),
        }
        data["aggregate_languages"] = aggregate_languages

        # 4. Language Stats Per Repo (top 10 repos by stars)
        top_repos = sorted(repos, key=lambda r: r["stars"], reverse=True)[:10]
        repo_languages = {}
        for repo in top_repos:
            if not username:
                break
            try:
                lang_res = await client.get(
                    f"https://api.github.com/repos/{repo['full_name']}/languages",
                    headers=headers
                )
                if lang_res.status_code == 200:
                    repo_languages[repo["name"]] = lang_res.json()
            except Exception:
                pass
        data["repo_language_details"] = repo_languages

        # 5. User Activity Events (last 30)
        if username:
            events_res = await client.get(
                f"https://api.github.com/users/{username}/events/public?per_page=30",
                headers=headers
            )
            if events_res.status_code == 200:
                raw_events = events_res.json()
                data["activity"] = [
                    {
                        "type": e.get("type"),
                        "repo": e.get("repo", {}).get("name"),
                        "created_at": e.get("created_at"),
                        "action": e.get("payload", {}).get("action"),
                    }
                    for e in raw_events
                ]
            else:
                data["activity"] = []
        else:
            data["activity"] = []

        # 6. Organizations
        orgs_res = await client.get("https://api.github.com/user/orgs", headers=headers)
        if orgs_res.status_code == 200:
            data["organizations"] = [
                {
                    "login": o.get("login"),
                    "avatar_url": o.get("avatar_url"),
                    "description": o.get("description"),
                }
                for o in orgs_res.json()
            ]
        else:
            data["organizations"] = []

        # 7. Pinned Repositories (GraphQL)
        if username:
            try:
                gql_res = await client.post(
                    "https://api.github.com/graphql",
                    headers=headers,
                    json={"query": GRAPHQL_PINNED_QUERY, "variables": {"login": username}}
                )
                if gql_res.status_code == 200:
                    gql_data = gql_res.json()
                    pinned_nodes = (
                        gql_data.get("data", {})
                        .get("user", {})
                        .get("pinnedItems", {})
                        .get("nodes", [])
                    )
                    data["pinned_repos"] = [
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
                else:
                    data["pinned_repos"] = []
            except Exception:
                data["pinned_repos"] = []
        else:
            data["pinned_repos"] = []

    return data


async def sync_github_profile(uid: str, email: str, provider_id: str, encrypted_token: str, plain_token: str):
    """Background task to fetch GitHub user data and upsert to MongoDB."""
    collection = await get_users_collection()

    # Base fields that are ALWAYS updated on any login
    base_doc = {
        "firebase_uid": uid,
        "email": email,
        "last_login_provider": provider_id,
        "last_synced_at": datetime.utcnow(),
    }

    # Track all providers the user has ever logged in with
    add_to_set_ops = {"linked_providers": provider_id}

    if provider_id != "github.com" or not plain_token:
        # Non-GitHub login: update base fields only, DO NOT touch github_access_token
        await collection.update_one(
            {"_id": uid},
            {
                "$set": base_doc,
                "$addToSet": add_to_set_ops,
                "$setOnInsert": {"created_at": datetime.utcnow()},
            },
            upsert=True,
        )
        logger.info("✨ Upserted user without GitHub enrichment for uid=%s (no plain token)", uid)
        return

    # GitHub login: store token + fetch comprehensive data
    try:
        github_data = await _fetch_github_data(plain_token)

        # Resolve email from GitHub if Firebase didn't have one
        if not email and github_data.get("emails"):
            primary = next((e for e in github_data["emails"] if e.get("primary")), None)
            email = primary["email"] if primary else (github_data["emails"][0]["email"] if github_data["emails"] else "")
            base_doc["email"] = email

        github_doc = {
            **base_doc,
            "github_access_token": encrypted_token,
            "github": github_data,
        }

        await collection.update_one(
            {"_id": uid},
            {
                "$set": github_doc,
                "$addToSet": add_to_set_ops,
                "$setOnInsert": {"created_at": datetime.utcnow()},
            },
            upsert=True,
        )

        logger.info(
            "✅ Synced GitHub profile for uid=%s (repos=%d, stars=%d, forks=%d)",
            uid,
            len(github_data.get("repositories", [])),
            github_data.get("repo_stats", {}).get("total_stars", 0),
            github_data.get("repo_stats", {}).get("total_forks", 0),
        )

    except Exception as e:
        logger.exception("❌ Error syncing GitHub profile for uid=%s", uid)
        # Still save base data + token even if GitHub API calls fail
        await collection.update_one(
            {"_id": uid},
            {
                "$set": {**base_doc, "github_access_token": encrypted_token},
                "$addToSet": add_to_set_ops,
                "$setOnInsert": {"created_at": datetime.utcnow()},
            },
            upsert=True,
        )
