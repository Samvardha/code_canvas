from typing import Dict, Any

def build_push_body(sender_name: str, notif_type: str, entity: Dict[str, Any]) -> str:
    """Build a human-readable push notification body string."""
    templates = {
        "like": f"{sender_name} liked your post",
        "comment": f"{sender_name} commented on your post",
        "comment_like": f"{sender_name} liked your comment",
        "comment_reply": f"{sender_name} replied to your comment",
        "peer_request": f"{sender_name} sent you a connection request",
        "peer_accept": f"{sender_name} accepted your connection request",
    }
    return templates.get(notif_type, f"{sender_name} sent you a notification")

def build_push_route(
    notif_type: str,
    entity: Dict[str, Any],
    sender_username: str,
) -> str:
    """Build a deep-link route string for the push notification payload."""
    entity_id = str(entity.get("id", ""))
    entity_type = entity.get("type", "")

    if notif_type in ("like", "comment", "comment_like", "comment_reply") and entity_type == "post":
        return f"/posts/{entity_id}"
    elif notif_type in ("peer_request", "peer_accept") and entity_type == "user":
        return f"/profile/{sender_username}"
    return "/explore-feed?notifications=true"

def build_message_push_body(text: str) -> str:
    """Build a preview body for a chat message push notification."""
    return text[:100]

def build_message_push_route(sender_id: str) -> str:
    """Build a deep-link route string for a chat message push notification."""
    return f"/explore-feed?chat=true&uid={sender_id}"
