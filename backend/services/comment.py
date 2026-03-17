import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from bson import ObjectId
from utils.database import get_comments_collection, get_comment_likes_collection, get_posts_collection
from models.comment import CommentCreateRequest

logger = logging.getLogger(__name__)

class CommentService:
    """Service for comment management operations."""

    @staticmethod
    async def add_comment(post_id: str, author_id: str, data: CommentCreateRequest, parent_comment_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Add a comment or reply to a post.
        """
        try:
            comments = await get_comments_collection()
            posts = await get_posts_collection()

            comment_doc = {
                "post_id": ObjectId(post_id),
                "author_id": author_id,
                "content": {"text": data.text},
                "parent_comment_id": ObjectId(parent_comment_id) if parent_comment_id else None,
                "stats": {"likes_count": 0},
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }

            result = await comments.insert_one(comment_doc)
            
            # Stringify for response
            comment_doc["_id"] = str(result.inserted_id)
            comment_doc["post_id"] = str(comment_doc["post_id"])
            if comment_doc["parent_comment_id"]:
                comment_doc["parent_comment_id"] = str(comment_doc["parent_comment_id"])

            # Increment post's comments_count
            await posts.update_one(
                {"_id": ObjectId(post_id)},
                {"$inc": {"stats.comments_count": 1}}
            )

            return comment_doc

        except Exception:
            logger.error("Failed to add comment", exc_info=True)
            raise

    @staticmethod
    async def fetch_comments(post_id: str, current_user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Fetch all comments for a post and build a nested tree structure.
        """
        try:
            comments_col = await get_comments_collection()
            likes_col = await get_comment_likes_collection()

            # 1. Fetch ALL comments for this post with author info
            pipeline = [
                {"$match": {"post_id": ObjectId(post_id)}},
                {"$sort": {"created_at": 1}}, # Sort by chronologically for tree building
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

            # 2. Check likes if user is logged in
            if current_user_id:
                all_ids = [ObjectId(c["_id"]) for c in all_comments]
                liked_likes = await likes_col.find({
                    "user_id": current_user_id,
                    "comment_id": {"$in": all_ids}
                }).to_list(length=len(all_ids))
                liked_ids = {str(item["comment_id"]) for item in liked_likes}

                for comment in all_comments:
                    if comment["_id"] in liked_ids:
                        comment["is_liked"] = True

            # 3. Build the tree structure
            comment_map = {c["_id"]: c for c in all_comments}
            root_comments = []

            for c in all_comments:
                parent_id = c.get("parent_comment_id")
                if parent_id and parent_id in comment_map:
                    # This is a reply, add to parent's replies list
                    comment_map[parent_id]["replies"].append(c)
                else:
                    # This is a top-level comment
                    root_comments.append(c)

            # Sort roots by newest first (as per existing logic)
            root_comments.sort(key=lambda x: x["created_at"], reverse=True)
            
            return root_comments

        except Exception:
            logger.error("Failed to fetch comments", exc_info=True)
            raise

    @staticmethod
    async def delete_comment(comment_id: str, author_id: str) -> bool:
        """
        Delete a comment and its replies (cascade).
        """
        try:
            comments_col = await get_comments_collection()
            posts_col = await get_posts_collection()

            comment = await comments_col.find_one({"_id": ObjectId(comment_id)})
            if not comment:
                return False
            
            # Check ownership (only author can delete)
            if comment["author_id"] != author_id:
                raise Exception("Unauthorized")

            # Count replies for count adjustment
            reply_count = await comments_col.count_documents({"parent_comment_id": ObjectId(comment_id)})
            
            # Delete comment + replies
            await comments_col.delete_many({
                "$or": [
                    {"_id": ObjectId(comment_id)},
                    {"parent_comment_id": ObjectId(comment_id)}
                ]
            })

            # Update post count (comment + replies)
            await posts_col.update_one(
                {"_id": comment["post_id"]},
                {"$inc": {"stats.comments_count": -(1 + reply_count)}}
            )

            return True

        except Exception:
            logger.error("Failed to delete comment", exc_info=True)
            raise

    @staticmethod
    async def toggle_like(comment_id: str, user_id: str) -> Dict[str, Any]:
        """
        Toggle like on a comment.
        """
        try:
            comments_col = await get_comments_collection()
            likes_col = await get_comment_likes_collection()

            existing = await likes_col.find_one({
                "comment_id": ObjectId(comment_id),
                "user_id": user_id
            })

            if existing:
                # UNLIKE
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
                # LIKE
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
            logger.error("Failed to toggle comment like", exc_info=True)
            raise
