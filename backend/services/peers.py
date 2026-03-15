import logging
from datetime import datetime
from typing import List, Optional, Tuple
from bson import ObjectId

from utils.database import (
    client,
    get_peer_requests_collection,
    get_peers_collection,
    get_users_collection
)
from models.peers import (
    PeerRequest,
    Peer,
    ConnectionStatus
)

logger = logging.getLogger(__name__)

class ConnectionService:
    """Service for managing user peer connections and peer requests."""

    @staticmethod
    async def send_request(sender_id: str, receiver_id: str) -> Tuple[bool, str, Optional[ConnectionStatus], Optional[str]]:
        """
        Send a connection request from one user to another.
        Follows a smart decision flow:
        - If already connected -> ui_state: "connected"
        - If outgoing pending -> ui_state: "pending"
        - If incoming pending -> ui_state: "accept"
        - Otherwise create request -> ui_state: "pending"
        """
        if sender_id == receiver_id:
            return False, "You cannot send a connection request to yourself", None, None

        peer_req_col = await get_peer_requests_collection()
        peer_col = await get_peers_collection()

        # 1. Check if already connected
        users_sorted = sorted([sender_id, receiver_id])
        existing_peering = await peer_col.find_one({"users": users_sorted})
        if existing_peering:
            return True, "Already connected", ConnectionStatus.CONNECTED, None

        # 2. Check if outgoing request already exists
        outgoing_req = await peer_req_col.find_one({
            "sender_id": sender_id, 
            "receiver_id": receiver_id
        })
        if outgoing_req:
            return True, "Request already sent", ConnectionStatus.PENDING, str(outgoing_req["_id"])

        # 3. Check if incoming request already exists
        incoming_req = await peer_req_col.find_one({
            "sender_id": receiver_id, 
            "receiver_id": sender_id
        })
        if incoming_req:
            return True, "This user has already sent you a request", ConnectionStatus.ACCEPT, str(incoming_req["_id"])

        # 4. Create request
        new_request = PeerRequest(
            sender_id=sender_id,
            receiver_id=receiver_id
        )
        
        try:
            result = await peer_req_col.insert_one(new_request.dict())
            logger.info(f"Peer request sent from {sender_id} to {receiver_id}")
            return True, "Connection request sent", ConnectionStatus.PENDING, str(result.inserted_id)
        except Exception as e:
            logger.error(f"Failed to send connection request: {e}")
            raise

    @staticmethod
    async def accept_request(request_id: str, receiver_id: str) -> Tuple[bool, str]:
        """
        Accept a peer connection request.
        Uses a transaction for atomicity.
        """
        peer_req_col = await get_peer_requests_collection()
        peer_col = await get_peers_collection()
        users_col = await get_users_collection()

        try:
            req_id_obj = ObjectId(request_id)
        except:
            return False, "Invalid request ID format"

        # 1. Find request
        request_doc = await peer_req_col.find_one({"_id": req_id_obj})
        if not request_doc:
            return False, "Connection request not found"
        
        request = PeerRequest(**request_doc)

        if request.receiver_id != receiver_id:
            return False, "Unauthorized to accept this request"

        users_sorted = sorted([request.sender_id, request.receiver_id])
        new_connection = Peer(users=users_sorted)
        
        async with await client.start_session() as session:
            async with session.start_transaction():
                try:
                    # insert peering
                    await peer_col.update_one(
                        {"users": users_sorted},
                        {"$set": new_connection.dict()},
                        upsert=True,
                        session=session
                    )
                    
                    # delete request
                    await peer_req_col.delete_one({"_id": req_id_obj}, session=session)
                    
                    # increment both users counts
                    await users_col.update_many(
                        {"_id": {"$in": users_sorted}},
                        {"$inc": {"stats.peers_count": 1}, "$set": {"updated_at": datetime.utcnow()}},
                        session=session
                    )
                    
                    logger.info(f"Connection established between {users_sorted[0]} and {users_sorted[1]}")
                    return True, "Connection accepted"
                except Exception as e:
                    logger.error(f"Transaction failed in accept_request: {e}")
                    raise

    @staticmethod
    async def reject_request(request_id: str, receiver_id: str) -> bool:
        """
        Reject/Delete a connection request.
        """
        peer_req_col = await get_peer_requests_collection()

        try:
            req_id_obj = ObjectId(request_id)
        except:
            return False

        result = await peer_req_col.delete_one({
            "_id": req_id_obj,
            "receiver_id": receiver_id
        })

        return result.deleted_count > 0

    @staticmethod
    async def cancel_request(sender_id: str, target_user_id: str) -> bool:
        """
        Cancel a pending request sent by the user.
        """
        peer_req_col = await get_peer_requests_collection()

        result = await peer_req_col.delete_one({
            "sender_id": sender_id,
            "receiver_id": target_user_id
        })

        return result.deleted_count > 0

    @staticmethod
    async def get_status(user_a: str, user_b: str) -> Tuple[ConnectionStatus, Optional[str]]:
        """
        Get connection status between two users.
        Returns: (status, request_id)
        """
        if user_a == user_b:
            return ConnectionStatus.SELF, None

        peer_col = await get_peers_collection()
        peer_req_col = await get_peer_requests_collection()

        # 1. Check if already connected
        users_sorted = sorted([user_a, user_b])
        connected = await peer_col.find_one({"users": users_sorted})
        if connected:
            return ConnectionStatus.CONNECTED, None

        # 2. Check if user_a sent request
        sent_req = await peer_req_col.find_one({
            "sender_id": user_a,
            "receiver_id": user_b
        })
        if sent_req:
            return ConnectionStatus.PENDING, None
        # 3. Check if user_b sent request
        received_req = await peer_req_col.find_one({
            "sender_id": user_b,
            "receiver_id": user_a
        })
        if received_req:
            return ConnectionStatus.ACCEPT, str(received_req["_id"])

        return ConnectionStatus.ADD, None

    @staticmethod
    async def get_connections(user_id: str) -> List[str]:
        """
        Get list of user IDs connected to the given user.
        """
        peer_col = await get_peers_collection()
        
        cursor = peer_col.find({"users": user_id})
        
        connections = []
        async for doc in cursor:
            users = doc["users"]
            other_user = users[0] if users[1] == user_id else users[1]
            connections.append(other_user)
            
        return connections
    @staticmethod
    async def remove_peer(user_id: str, target_user_id: str) -> bool:
        """
        Remove an established peer connection.
        Uses a transaction for atomicity.
        """
        peer_col = await get_peers_collection()
        users_col = await get_users_collection()
        
        users_sorted = sorted([user_id, target_user_id])
        
        async with await client.start_session() as session:
            async with session.start_transaction():
                try:
                    # 1. Delete connection
                    result = await peer_col.delete_one({"users": users_sorted}, session=session)
                    if result.deleted_count == 0:
                        return False

                    # 2. Decrement both users counts (with guard)
                    await users_col.update_many(
                        {
                            "_id": {"$in": users_sorted},
                            "stats.peers_count": {"$gt": 0} # Safety guard
                        },
                        {"$inc": {"stats.peers_count": -1}, "$set": {"updated_at": datetime.utcnow()}},
                        session=session
                    )
                    
                    logger.info(f"Peer removed: {user_id} and {target_user_id}")
                    return True
                except Exception as e:
                    logger.error(f"Transaction failed in remove_peer: {e}")
                    raise
