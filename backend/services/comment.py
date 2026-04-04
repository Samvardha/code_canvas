import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from bson import ObjectId
from utils.database import get_comments_collection, get_comment_likes_collection, get_posts_collection
from models.comment import CommentCreateRequest

# [ CONFIGURATION ] ────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)


class CommentService:
    """
    Service for managing threaded post comments and engagement.
    
    Provides functionality for tree-based comment retrieval, cascading deletions,
    and atomic engagement tracking (likes/counts).
    """

    # [ COMMENT WRITES ] ───────────────────────────────────────────────────────

    @staticmethod
    async def add_comment(post_id: str, author_id: str, data: CommentCreateRequest, parent_comment_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Append a new comment or nested reply to a post thread.
        
        Triggers a notification to the post author on creation.
        """
        try:
            comments = await get_comments_collection()
            posts = await get_posts_collection()

            # 1. Prepare the comment document
            comment_doc = {
                "post_id": ObjectId(post_id),
                "author_id": author_id,
                "content": {"text": data.text},
                "parent_comment_id": ObjectId(parent_comment_id) if parent_comment_id else None,
                "stats": {"likes_count": 0},
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }

            # 2. Persist to database
            result = await comments.insert_one(comment_doc)
            
            # 3. Stringify for API response consistency
            comment_doc["_id"] = str(result.inserted_id)
            comment_doc["post_id"] = str(comment_doc["post_id"])
            if comment_doc["parent_comment_id"]:
                comment_doc["parent_comment_id"] = str(comment_doc["parent_comment_id"])

            # 4. Atomically increment the parent post's comment metric
            await posts.update_one(
                {"_id": ObjectId(post_id)},
                {"$inc": {"stats.comments_count": 1}}
            )

            # 5. Trigger notification for the post author
            post = await posts.find_one({"_id": ObjectId(post_id)}, {"author_id": 1})
            if post:
                from services.notification import NotificationService
                await NotificationService.create_notification(
                    recipient_id=post.get("author_id", ""),
                    sender_id=author_id,
                    type="comment",
                    entity={"id": post_id, "type": "post"}
                )

            return comment_doc

        except Exception:
            logger.error("Failed to add comment to database", exc_info=True)
            raise


    @staticmethod
    async def delete_comment(comment_id: str, author_id: str) -> bool:
        """
        Remove a comment and cascade deletion to all its child replies.
        """
        try:
            comments_col = await get_comments_collection()
            posts_col = await get_posts_collection()

            # 1. Verify existence and authorization
            comment = await comments_col.find_one({"_id": ObjectId(comment_id)})
            if not comment:
                return False
            
            if comment["author_id"] != author_id:
                raise Exception("Unauthorized")

            # 2. Count children for accurate post-stat decrement
            reply_count = await comments_col.count_documents({"parent_comment_id": ObjectId(comment_id)})
            
            # 3. Perform cascading removal
            await comments_col.delete_many({
                "$or": [
                    {"_id": ObjectId(comment_id)},
                    {"parent_comment_id": ObjectId(comment_id)}
                ]
            })

            # 4. Synchronize the parent post's aggregate counts
            await posts_col.update_one(
                {"_id": comment["post_id"]},
                {"$inc": {"stats.comments_count": -(1 + reply_count)}}
            )

            return True

        except Exception:
            logger.error("Failed to execute cascading comment deletion", exc_info=True)
            raise


    # [ COMMENT READS ] ───────────────────────────────────────────────────────

    @staticmethod
    async def fetch_comments(post_id: str, current_user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Retrieve all comments for a post and reconstruct the nested tree structure.
        """
        try:
            comments_col = await get_comments_collection()
            likes_col = await get_comment_likes_collection()

            # 1. Aggregation Pipeline: Join with user profiles
            pipeline = [
                {"$match": {"post_id": ObjectId(post_id)}},
                {"$sort": {"created_at": 1}}, # Chronological order is required for tree building
                {
                    "$lookup": {
                        "from": "users",
                        "localField": "author_id",
                        "foreignField": "_id",
                        "as": "author"
                    }
                },
                {"$unwind": {"path": "$author", "preserveNullAndEmptyArrays": True}}
            ]
            
            cursor = comments_col.aggregate(pipeline)
            all_comments = []
            async for c in cursor:
                c["_id"] = str(c["_id"])
                c["post_id"] = str(c["post_id"])
                if c.get("parent_comment_id"):
                    c["parent_comment_id"] = str(c["parent_comment_id"])
                c["is_liked"] = False
                c["replies"] = []
                
                # Sanitize author metadata
                if c.get("author"):
                    author = c["author"]
                    c["author"] = {
                        "firebase_uid": author["_id"],
                        "username": author.get("profile", {}).get("username"),
                        "name": author.get("profile", {}).get("name"),
                        "avatar_url": author.get("profile", {}).get("avatar_url")
                    }
                all_comments.append(c)

            if not all_comments:
                return []

            # 2. Identification of Liked Content (Batch check)
            if current_user_id:
                all_ids = [ObjectId(c["_id"]) for c in all_comments]
                liked_likes = await likes_col.find({
                    "user_id": current_user_id,
                    "comment_id": {"$in": all_ids}
                }).to_list(length=None)
                liked_ids = {str(item["comment_id"]) for item in liked_likes}

                for comment in all_comments:
                    if comment["_id"] in liked_ids:
                        comment["is_liked"] = True

            # 3. Tree Reconstruction Algorithm
            comment_map = {c["_id"]: c for c in all_comments}
            root_comments = []

            for c in all_comments:
                parent_id = c.get("parent_comment_id")
                if parent_id and parent_id in comment_map:
                    # Append child to parent sub-tree
                    comment_map[parent_id]["replies"].append(c)
                else:
                    # Top-level node identified
                    root_comments.append(c)

            # 4. Final sort for the UI (Newest Roots First)
            root_comments.sort(key=lambda x: x["created_at"], reverse=True)
            
            return root_comments

        except Exception:
            logger.error("Failed to reconstruct comment tree", exc_info=True)
            raise


    # [ SOCIAL ENGAGEMENT ] ───────────────────────────────────────────────────

    @staticmethod
    async def toggle_like(comment_id: str, user_id: str) -> Dict[str, Any]:
        """
        Atomic toggle of a user's like status on a specific comment.
        """
        try:
            comments_col = await get_comments_collection()
            likes_col = await get_comment_likes_collection()

            existing = await likes_col.find_one({
                "comment_id": ObjectId(comment_id),
                "user_id": user_id
            })

            if existing:
                # 1. Un-like Logic
                await likes_col.delete_one({"_id": existing["_id"]})
                result = await comments_col.find_one_and_update(
                    {"_id": ObjectId(comment_id)},
                    {"$inc": {"stats.likes_count": -1}},
                    return_document=True
                )
                return {
                    "liked": False,
                    "likes_count": result.get("stats", {}).get("likes_count", 0) if result else 0
                }
            else:
                # 2. Like Logic
                await likes_col.insert_one({
                    "comment_id": ObjectId(comment_id),
                    "user_id": user_id,
                    "created_at": datetime.utcnow()
                })
                result = await comments_col.find_one_and_update(
                    {"_id": ObjectId(comment_id)},
                    {"$inc": {"stats.likes_count": 1}},
                    return_document=True
                )
                return {
                    "liked": True,
                    "likes_count": result.get("stats", {}).get("likes_count", 0) if result else 0
                }

        except Exception:
            logger.error("Engagement toggle failed for comment", exc_info=True)
            raise
