import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from bson import ObjectId
from utils.database import get_posts_collection, get_users_collection, get_post_likes_collection, get_comments_collection, get_comment_likes_collection
from utils.cloudinary_utils import delete_media
from models.post import PostCreateRequest, Category
from utils.serialization import prepare_for_mongo
from services.notification import NotificationService

# [ CONFIGURATION ] ────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)


class PostService:
    """
    Service layer for broadcasting and managing post transmissions.
    
    Handles multi-media lifecycle (Cloudinary injection), feed aggregation
    with filtered pipelines, and atomic engagement metrics.
    """

    # [ POST CORE OPERATIONS ] ─────────────────────────────────────────────────

    @staticmethod
    async def create_post(author_id: str, post_data: PostCreateRequest, media_items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Broadcast a new post onto the network.
        
        Logic Flow:
        1. Serialization: Converts Pydantic models to Mongo-safe dictionaries.
        2. Media Injection: Attaches pre-signed Cloudinary metadata.
        3. Persistence: Inserts the post node into the distribution collection.
        4. Metrics: Increments the author's aggregate post count.
        """
        try:
            posts_collection = await get_posts_collection()
            users_collection = await get_users_collection()

            # 1. Mongo-safe schema preparation
            post_doc = prepare_for_mongo(post_data.model_dump())
            post_doc["author_id"] = author_id
            post_doc["stats"] = {"likes_count": 0, "comments_count": 0, "shares_count": 0}
            post_doc["created_at"] = datetime.utcnow()
            post_doc["updated_at"] = datetime.utcnow()
            post_doc["content"]["media"] = media_items

            # 2. Database insertion
            result = await posts_collection.insert_one(post_doc)
            post_doc["_id"] = str(result.inserted_id)
            post_doc["is_liked"] = False

            # 3. Synchronize author metrics
            await users_collection.update_one(
                {"_id": author_id},
                {"$inc": {"stats.posts_count": 1}, "$set": {"updated_at": datetime.utcnow()}}
            )

            logger.info(f"Post transmission successful: {post_doc['_id']} by {author_id}")
            return post_doc

        except Exception:
            logger.error("Failed to broadcast post", exc_info=True)
            raise


    @staticmethod
    async def update_post(post_id: str, author_id: str, update_data: Dict[str, Any], removed_media_ids: Optional[List[str]] = None) -> Optional[Dict[str, Any]]:
        """
        Modify an existing post. Only the authorized author may execute this.
        """
        try:
            posts_collection = await get_posts_collection()
            
            # 1. Authorization & Existence Check
            post = await posts_collection.find_one({"_id": ObjectId(post_id)})
            if not post:
                return None
            if post["author_id"] != author_id:
                raise Exception("Unauthorized: Author mismatch")
            
            # 2. Prepare atomic update
            update_doc = {
                "$set": {
                    **prepare_for_mongo(update_data),
                    "updated_at": datetime.utcnow()
                }
            }
            
            # 3. Cloudinary CDN cleanup for removed assets
            if removed_media_ids:
                for public_id in removed_media_ids:
                    delete_media(public_id)
            
            await posts_collection.update_one({"_id": ObjectId(post_id)}, update_doc)
            return await PostService.fetch_post(post_id, current_user_id=author_id)

        except Exception:
            logger.error(f"Post update failure: {post_id}", exc_info=True)
            raise


    @staticmethod
    async def delete_post(post_id: str, author_id: str) -> bool:
        """
        Decommission a post and purge associated CDN assets.
        """
        try:
            posts_collection = await get_posts_collection()
            users_collection = await get_users_collection()
            
            # 1. Internal validation
            post = await posts_collection.find_one({"_id": ObjectId(post_id)})
            if not post:
                return False
            if post["author_id"] != author_id:
                raise Exception("Unauthorized: Author mismatch")
            
            # 2. CDN purging: Cascade deletion to Cloudinary
            media_list = post.get("content", {}).get("media", [])
            for media in media_list:
                public_id = media.get("public_id")
                if public_id:
                    res_type = "video" if media.get("type") == "video" else "image"
                    delete_media(public_id, resource_type=res_type)
            
            # 3. Cascading Database Cleanup
            post_likes_collection = await get_post_likes_collection()
            comments_collection = await get_comments_collection()
            comment_likes_collection = await get_comment_likes_collection()

            # 3a. Delete all post likes
            await post_likes_collection.delete_many({"post_id": ObjectId(post_id)})

            # 3b. Find and delete all comments (and their likes)
            cursor = comments_collection.find({"post_id": ObjectId(post_id)}, {"_id": 1})
            comments = await cursor.to_list(length=None)
            if comments:
                comment_ids = [c["_id"] for c in comments]
                await comment_likes_collection.delete_many({"comment_id": {"$in": comment_ids}})
                await comments_collection.delete_many({"post_id": ObjectId(post_id)})

            # 3d. Purge all notifications tied to this post (comments, likes, etc)
            await NotificationService.delete_all_for_entity(post_id, "post")

            # 3e. Delete the core post node and synchronize metrics
            await posts_collection.delete_one({"_id": ObjectId(post_id)})
            await users_collection.update_one(
                {"_id": author_id},
                {"$inc": {"stats.posts_count": -1}, "$set": {"updated_at": datetime.utcnow()}}
            )
            
            return True

        except Exception:
            logger.error(f"Post decommission failure: {post_id}", exc_info=True)
            raise


    # [ FEED & RETRIEVAL OPERATIONS ] ──────────────────────────────────────────

    @staticmethod
    async def fetch_post(post_id: str, current_user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Fetch a singular post node with enriched author metadata and like status.
        """
        try:
            posts_collection = await get_posts_collection()
            post_likes = await get_post_likes_collection()
            
            # Aggregation Pipeline: Join with sanitize user profiles
            pipeline = [
                {"$match": {"_id": ObjectId(post_id)}},
                {
                    "$lookup": {
                        "from": "users",
                        "localField": "author_id",
                        "foreignField": "_id",
                        "as": "author"
                    }
                },
                {"$unwind": {"path": "$author", "preserveNullAndEmptyArrays": True}},
                {
                    "$project": {
                        "author.providers.github.access_token": 0,  # Redact PII
                        "author.settings": 0
                    }
                }
            ]
            
            cursor = posts_collection.aggregate(pipeline)
            posts = await cursor.to_list(length=1)
            
            if not posts:
                return None
            
            post = posts[0]
            post["_id"] = str(post["_id"])
            
            # Personalize for the requester
            if "author" in post and post["author"]:
                author = post["author"]
                post["author"] = {
                    "firebase_uid": author["_id"],
                    "username": author.get("profile", {}).get("username"),
                    "name": author.get("profile", {}).get("name"),
                    "avatar_url": author.get("profile", {}).get("avatar_url"),
                    "bio": author.get("profile", {}).get("bio")
                }
                
            post["is_liked"] = False
            if current_user_id:
                like = await post_likes.find_one({
                    "post_id": ObjectId(post_id),
                    "user_id": current_user_id
                })
                post["is_liked"] = bool(like)

            return post

        except Exception:
            logger.error(f"Failed to fetch post node: {post_id}", exc_info=True)
            return None


    @staticmethod
    async def fetch_feed(categories: Optional[List[Category]] = None, userId: Optional[str] = None, offset: int = 0, limit: int = 10, current_user_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Aggregate a feed based on global or user-specific filters.
        """
        try:
            posts_collection = await get_posts_collection()
            post_likes = await get_post_likes_collection()
            
            # 1. Build Query Filter
            query: Dict[str, Any] = {}
            if categories:
                category_values = [c.value if isinstance(c, Category) else c for c in categories]
                query["categories"] = {"$in": category_values}
            if userId:
                query["author_id"] = userId
                
            total = await posts_collection.count_documents(query)
            
            # 2. Sequential Discovery Pipeline
            pipeline = [
                {"$match": query},
                {"$sort": {"created_at": -1}},
                {"$skip": offset},
                {"$limit": limit},
                {
                    "$lookup": {
                        "from": "users",
                        "localField": "author_id",
                        "foreignField": "_id",
                        "as": "author"
                    }
                },
                {"$unwind": {"path": "$author", "preserveNullAndEmptyArrays": True}},
                {
                    "$project": {
                        "author.providers.github.access_token": 0,
                        "author.settings": 0
                    }
                }
            ]
            
            cursor = posts_collection.aggregate(pipeline)
            posts = []
            async for post in cursor:
                post["_id"] = str(post["_id"])
                
                # Sanitize author metadata
                if "author" in post and post["author"]:
                    author = post["author"]
                    post["author"] = {
                        "firebase_uid": author["_id"],
                        "username": author.get("profile", {}).get("username"),
                        "name": author.get("profile", {}).get("name"),
                        "avatar_url": author.get("profile", {}).get("avatar_url"),
                        "bio": author.get("profile", {}).get("bio")
                    }
                post["is_liked"] = False
                posts.append(post)

            # 3. Batch Identification of Liked Content
            if current_user_id and posts:
                post_ids = [ObjectId(p["_id"]) for p in posts]
                liked_docs = await post_likes.find({
                    "user_id": current_user_id,
                    "post_id": {"$in": post_ids}
                }).to_list(length=None)
                liked_set = {str(d["post_id"]) for d in liked_docs}
                
                for post in posts:
                    if post["_id"] in liked_set:
                        post["is_liked"] = True
                
            return {
                "posts": posts,
                "total": total,
                "has_more": offset + len(posts) < total
            }

        except Exception:
            logger.error("Global feed aggregation failure", exc_info=True)
            raise


    # [ ENGAGEMENT OPERATIONS ] ───────────────────────────────────────────────

    @staticmethod
    async def toggle_like(post_id: str, user_id: str) -> Dict[str, Any]:
        """
        Atomic toggle of a user's like status on a specific post.
        
        Triggers a notification to the post author when liked.
        """
        try:
            post_likes = await get_post_likes_collection()
            posts = await get_posts_collection()

            # 1. Existing Engagement Check
            existing = await post_likes.find_one({
                "post_id": ObjectId(post_id),
                "user_id": user_id
            })

            if existing:
                # UN-LIKE Logic
                await post_likes.delete_one({"_id": existing["_id"]})
                result = await posts.find_one_and_update(
                    {"_id": ObjectId(post_id)},
                    {"$inc": {"stats.likes_count": -1}},
                    return_document=True
                )
                
                # Cleanup Notification
                if result:
                    await NotificationService.delete_notification(
                        sender_id=user_id,
                        recipient_id=result.get("author_id", ""),
                        notif_type="like",
                        entity_id=post_id
                    )

                updated_count = result.get("stats", {}).get("likes_count", 0) if result else 0
                return {"liked": False, "likes_count": updated_count}
            else:
                # LIKE Logic
                await post_likes.insert_one({
                    "post_id": ObjectId(post_id),
                    "user_id": user_id,
                    "created_at": datetime.utcnow()
                })
                result = await posts.find_one_and_update(
                    {"_id": ObjectId(post_id)},
                    {"$inc": {"stats.likes_count": 1}},
                    return_document=True
                )
                updated_count = result.get("stats", {}).get("likes_count", 0) if result else 0

                # 2. Trigger notification for the post author
                if result:
                    await NotificationService.create_notification(
                        recipient_id=result.get("author_id", ""),
                        sender_id=user_id,
                        type="like",
                        entity={"id": post_id, "type": "post"}
                    )

                return {"liked": True, "likes_count": updated_count}

        except Exception:
            logger.error(f"Engagement toggle failure for post: {post_id}", exc_info=True)
            raise
