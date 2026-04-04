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

# [ CONFIGURATION ] ────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)


class ConnectionService:
    """
    Service for managing the bi-directional user peer network.
    
    Handles the lifecycle of peer requests from initiation to acceptance/rejection,
    and manages the finalized peer-to-peer connection records.
    """

    # [ REQUEST MANAGEMENT ] ───────────────────────────────────────────────────

    @staticmethod
    async def send_request(sender_id: str, receiver_id: str) -> Tuple[bool, str, Optional[ConnectionStatus], Optional[str]]:
        """
        Initiate or identify the state of a connection request between two users.
        
        Logic Flow:
        1. Self-Check: Cannot connect to yourself.
        2. Connectivity: Checks if users are already established peers.
        3. Outgoing Check: Prevents duplicate requests if one is already pending.
        4. Reciprocity: If receiver already sent a request, suggests 'accept' UI state.
        5. Creation: Generates a new PeerRequest record if no prior state exists.
        """
        # 1. Block self-connection
        if sender_id == receiver_id:
            return False, "You cannot send a connection request to yourself", None, None

        peer_req_col = await get_peer_requests_collection()
        peer_col = await get_peers_collection()

        # 2. Check for existing connection
        users_sorted = sorted([sender_id, receiver_id])
        existing_peering = await peer_col.find_one({"users": users_sorted})
        if existing_peering:
            return True, "Already connected", ConnectionStatus.CONNECTED, None

        # 3. Check for existing outgoing request
        outgoing_req = await peer_req_col.find_one({
            "sender_id": sender_id, 
            "receiver_id": receiver_id
        })
        if outgoing_req:
            return True, "Request already sent", ConnectionStatus.PENDING, str(outgoing_req["_id"])

        # 4. Check for existing incoming request (Auto-accept scenario)
        incoming_req = await peer_req_col.find_one({
            "sender_id": receiver_id, 
            "receiver_id": sender_id
        })
        if incoming_req:
            return True, "This user has already sent you a request", ConnectionStatus.ACCEPT, str(incoming_req["_id"])

        # 5. Provision new request
        new_request = PeerRequest(
            sender_id=sender_id,
            receiver_id=receiver_id
        )
        
        try:
            result = await peer_req_col.insert_one(new_request.dict())
            logger.info(f"Peer request generated: {sender_id} -> {receiver_id}")
            return True, "Connection request sent", ConnectionStatus.PENDING, str(result.inserted_id)
        except Exception as e:
            logger.error(f"Failed to generate peer request: {e}")
            raise


    @staticmethod
    async def accept_request(request_id: str, receiver_id: str) -> Tuple[bool, str]:
        """
        Finalize a peer connection and clean up pending requests.
        
        Uses a MongoDB session transaction to ensure:
        1. The connection record is created.
        2. The request record is deleted.
        3. Both users' peer counts are incremented atomically.
        """
        peer_req_col = await get_peer_requests_collection()
        peer_col = await get_peers_collection()
        users_col = await get_users_collection()

        try:
            req_id_obj = ObjectId(request_id)
        except Exception:
            return False, "Invalid request ID format"

        # 1. Fetch and validate the request
        request_doc = await peer_req_col.find_one({"_id": req_id_obj})
        if not request_doc:
            return False, "Connection request not found"
        
        request = PeerRequest(**request_doc)
        if request.receiver_id != receiver_id:
            return False, "Unauthorized: Receiver ID mismatch"

        # 2. Execute Atomic Peering Transaction
        users_sorted = sorted([request.sender_id, request.receiver_id])
        new_connection = Peer(users=users_sorted)
        
        async with await client.start_session() as session:
            async with session.start_transaction():
                try:
                    # Create the peering record
                    await peer_col.update_one(
                        {"users": users_sorted},
                        {"$set": new_connection.dict()},
                        upsert=True,
                        session=session
                    )
                    
                    # Remove the pending request
                    await peer_req_col.delete_one({"_id": req_id_obj}, session=session)
                    
                    # Increment peer metrics for both nodes
                    await users_col.update_many(
                        {"_id": {"$in": users_sorted}},
                        {"$inc": {"stats.peers_count": 1}, "$set": {"updated_at": datetime.utcnow()}},
                        session=session
                    )
                    
                    logger.info(f"Network link established: {users_sorted}")
                    return True, "Connection accepted"
                except Exception as e:
                    logger.error(f"Peering transaction failed: {e}")
                    raise


    @staticmethod
    async def reject_request(request_id: str, receiver_id: str) -> bool:
        """Discard a pending connection request without creating a peer link."""
        peer_req_col = await get_peer_requests_collection()
        try:
            req_id_obj = ObjectId(request_id)
        except Exception:
            return False

        result = await peer_req_col.delete_one({
            "_id": req_id_obj,
            "receiver_id": receiver_id
        })
        return result.deleted_count > 0


    @staticmethod
    async def cancel_request(sender_id: str, target_user_id: str) -> bool:
        """Revoke a connection request previously sent by the user."""
        peer_req_col = await get_peer_requests_collection()
        result = await peer_req_col.delete_one({
            "sender_id": sender_id,
            "receiver_id": target_user_id
        })
        return result.deleted_count > 0


    # [ RETRIEVAL & STATUS ] ───────────────────────────────────────────────────

    @staticmethod
    async def get_status(user_a: str, user_b: str) -> Tuple[ConnectionStatus, Optional[str]]:
        """
        Determine the current networking status between two unique user IDs.
        """
        if user_a == user_b:
            return ConnectionStatus.SELF, None

        peer_col = await get_peers_collection()
        peer_req_col = await get_peer_requests_collection()

        # 1. Established connection check
        users_sorted = sorted([user_a, user_b])
        connected = await peer_col.find_one({"users": users_sorted})
        if connected:
            return ConnectionStatus.CONNECTED, None

        # 2. Outgoing request check
        sent_req = await peer_req_col.find_one({
            "sender_id": user_a,
            "receiver_id": user_b
        })
        if sent_req:
            return ConnectionStatus.PENDING, str(sent_req["_id"])

        # 3. Incoming request check
        received_req = await peer_req_col.find_one({
            "sender_id": user_b,
            "receiver_id": user_a
        })
        if received_req:
            return ConnectionStatus.ACCEPT, str(received_req["_id"])

        return ConnectionStatus.ADD, None


    @staticmethod
    async def get_connections(user_id: str) -> List[str]:
        """Fetch all connected peer UIDs for a specific user node."""
        peer_col = await get_peers_collection()
        cursor = peer_col.find({"users": user_id})
        
        connections = []
        async for doc in cursor:
            users = doc["users"]
            other_user = users[0] if users[1] == user_id else users[1]
            connections.append(other_user)
            
        return connections


    # [ TERMINATION ] ─────────────────────────────────────────────────────────

    @staticmethod
    async def remove_peer(user_id: str, target_user_id: str) -> bool:
        """
        Sever an established peer connection record.
        
        Uses a transaction to ensure:
        1. Peering record is deleted.
        2. Both users' peer counts are decremented correctly.
        """
        peer_col = await get_peers_collection()
        users_col = await get_users_collection()
        users_sorted = sorted([user_id, target_user_id])
        
        async with await client.start_session() as session:
            async with session.start_transaction():
                try:
                    # 1. Delete connection record
                    result = await peer_col.delete_one({"users": users_sorted}, session=session)
                    if result.deleted_count == 0:
                        return False

                    # 2. Decrement peer counters with zero-safety guard
                    await users_col.update_many(
                        {
                            "_id": {"$in": users_sorted},
                            "stats.peers_count": {"$gt": 0} 
                        },
                        {"$inc": {"stats.peers_count": -1}, "$set": {"updated_at": datetime.utcnow()}},
                        session=session
                    )
                    
                    logger.info(f"Network link severed: {user_id} and {target_user_id}")
                    return True
                except Exception as e:
                    logger.error(f"Termination transaction failure: {e}")
                    raise
