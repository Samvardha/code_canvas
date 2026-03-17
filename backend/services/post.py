import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from bson import ObjectId
from utils.database import get_posts_collection, get_users_collection, get_post_likes_collection
from utils.cloudinary_utils import delete_media
from models.post import PostCreateRequest, Category

from utils.serialization import prepare_for_mongo

logger = logging.getLogger(__name__)

class PostService:
    """Service for post management operations."""

    @staticmethod
    async def create_post(author_id: str, post_data: PostCreateRequest, media_items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Create a new post.
        """
        try:
            posts_collection = await get_posts_collection()
            users_collection = await get_users_collection()

            # Prepare post document - convert to dict and handle Enums/Dates
            post_doc = prepare_for_mongo(post_data.model_dump())
            
            post_doc["author_id"] = author_id
            post_doc["stats"] = {
                "likes_count": 0,
                "comments_count": 0,
                "shares_count": 0
            }
            post_doc["created_at"] = datetime.utcnow()
            post_doc["updated_at"] = datetime.utcnow()
            
            # Media items already contain Cloudinary metadata
            post_doc["content"]["media"] = media_items

            result = await posts_collection.insert_one(post_doc)
            post_doc["_id"] = str(result.inserted_id)
            post_doc["is_liked"] = False

            # Increment user's posts_count
            await users_collection.update_one(
                {"_id": author_id},
                {"$inc": {"stats.posts_count": 1}, "$set": {"updated_at": datetime.utcnow()}}
            )

            logger.info("Post created successfully", extra={"post_id": post_doc["_id"], "author_id": author_id})
            return post_doc

        except Exception:
            logger.error("Failed to create post", exc_info=True, extra={"author_id": author_id})
            raise

    @staticmethod
    async def fetch_post(post_id: str, current_user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Fetch a single post by ID with author info and like status.
        """
        try:
            posts_collection = await get_posts_collection()
            post_likes = await get_post_likes_collection()
            
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
                        "author.providers.github.access_token": 0,  # Redact sensitive info
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
            
            # Format author object like in users.py if possible
            if "author" in post and post["author"]:
                author = post["author"]
                # Simplify author for response
                post["author"] = {
                    "firebase_uid": author["_id"],
                    "username": author.get("profile", {}).get("username"),
                    "name": author.get("profile", {}).get("name"),
                    "avatar_url": author.get("profile", {}).get("avatar_url"),
                    "bio": author.get("profile", {}).get("bio")
                }
                
            # Check if current user liked the post
            post["is_liked"] = False
            if current_user_id:
                like = await post_likes.find_one({
                    "post_id": ObjectId(post_id),
                    "user_id": current_user_id
                })
                post["is_liked"] = bool(like)

            return post

        except Exception:
            logger.error("Failed to fetch post", exc_info=True, extra={"post_id": post_id})
            return None

    @staticmethod
    async def fetch_feed(categories: Optional[List[Category]] = None, userId: Optional[str] = None, offset: int = 0, limit: int = 10, current_user_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Fetch posts feed with pagination and optional filters.
        """
        try:
            posts_collection = await get_posts_collection()
            post_likes = await get_post_likes_collection()
            
            query = {}
            if categories:
                # Convert Enum members to their string values for MongoDB query
                category_values = [c.value if isinstance(c, Category) else c for c in categories]
                query["categories"] = {"$in": category_values}
            if userId:
                query["author_id"] = userId
                
            total = await posts_collection.count_documents(query)
            
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
                if "author" in post and post["author"]:
                    author = post["author"]
                    post["author"] = {
                        "firebase_uid": author["_id"],
                        "username": author.get("profile", {}).get("username"),
                        "name": author.get("profile", {}).get("name"),
                        "avatar_url": author.get("profile", {}).get("avatar_url"),
                        "bio": author.get("profile", {}).get("bio")
                    }
                
                # Check if current user liked this post
                post["is_liked"] = False
                if current_user_id:
                    like = await post_likes.find_one({
                        "post_id": ObjectId(post["_id"]),
                        "user_id": current_user_id
                    })
                    post["is_liked"] = bool(like)
                    
                posts.append(post)
                
            return {
                "posts": posts,
                "total": total,
                "has_more": offset + len(posts) < total
            }

        except Exception:
            logger.error("Failed to fetch feed", exc_info=True)
            raise

    @staticmethod
    async def update_post(post_id: str, author_id: str, update_data: Dict[str, Any], removed_media_ids: List[str] = None) -> Optional[Dict[str, Any]]:
        """
        Update a post. Only author can update.
        """
        try:
            posts_collection = await get_posts_collection()
            
            # Check ownership
            post = await posts_collection.find_one({"_id": ObjectId(post_id)})
            if not post:
                return None
            if post["author_id"] != author_id:
                raise Exception("Unauthorized")
            
            update_doc = {
                "$set": {
                    **prepare_for_mongo(update_data),
                    "updated_at": datetime.utcnow()
                }
            }
            
            # Handle media removal if public_ids are provided
            if removed_media_ids:
                for public_id in removed_media_ids:
                    # Determine resource type (naively or by checking existing media)
                    # For now just try image
                    delete_media(public_id)
            
            await posts_collection.update_one({"_id": ObjectId(post_id)}, update_doc)
            
            return await PostService.fetch_post(post_id, current_user_id=author_id)

        except Exception:
            logger.error("Failed to update post", exc_info=True, extra={"post_id": post_id})
            raise

    @staticmethod
    async def delete_post(post_id: str, author_id: str) -> bool:
        """
        Delete a post. Only author can delete.
        """
        try:
            posts_collection = await get_posts_collection()
            users_collection = await get_users_collection()
            
            post = await posts_collection.find_one({"_id": ObjectId(post_id)})
            if not post:
                return False
            if post["author_id"] != author_id:
                raise Exception("Unauthorized")
            
            # Delete media from Cloudinary
            media_list = post.get("content", {}).get("media", [])
            for media in media_list:
                public_id = media.get("public_id")
                if public_id:
                    res_type = "video" if media.get("type") == "video" else "image"
                    delete_media(public_id, resource_type=res_type)
            
            # Delete from DB
            await posts_collection.delete_one({"_id": ObjectId(post_id)})
            
            # Decrement user's posts_count
            await users_collection.update_one(
                {"_id": author_id},
                {"$inc": {"stats.posts_count": -1}, "$set": {"updated_at": datetime.utcnow()}}
            )
            
            return True

        except Exception:
            logger.error("Failed to delete post", exc_info=True, extra={"post_id": post_id})
            raise

    @staticmethod
    async def toggle_like(post_id: str, user_id: str) -> Dict[str, Any]:
        """
        Toggle like on a post.
        """
        try:
            post_likes = await get_post_likes_collection()
            posts = await get_posts_collection()

            # Check if already liked
            existing = await post_likes.find_one({
                "post_id": ObjectId(post_id),
                "user_id": user_id
            })

            if existing:
                # UNLIKE
                await post_likes.delete_one({"_id": existing["_id"]})
                
                # Decrement likes count
                result = await posts.find_one_and_update(
                    {"_id": ObjectId(post_id)},
                    {"$inc": {"stats.likes_count": -1}},
                    return_document=True
                )
                
                updated_count = result.get("stats", {}).get("likes_count", 0) if result else 0
                return {
                    "liked": False,
                    "likes_count": updated_count
                }
            else:
                # LIKE
                await post_likes.insert_one({
                    "post_id": ObjectId(post_id),
                    "user_id": user_id,
                    "created_at": datetime.utcnow()
                })

                # Increment likes count
                result = await posts.find_one_and_update(
                    {"_id": ObjectId(post_id)},
                    {"$inc": {"stats.likes_count": 1}},
                    return_document=True
                )

                updated_count = result.get("stats", {}).get("likes_count", 0) if result else 0
                return {
                    "liked": True,
                    "likes_count": updated_count
                }

        except Exception:
            logger.error("Failed to toggle like", exc_info=True, extra={"post_id": post_id, "user_id": user_id})
            raise
