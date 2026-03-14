"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  getConnectionStatus, 
  sendConnectionRequest, 
  acceptConnectionRequest, 
  rejectConnectionRequest, 
  cancelConnectionRequest,
  removePeer,
  ConnectionStatus
} from "@/lib/api/connections";
import { UserPlus, UserCheck, UserX, Loader2, Clock, Check, X } from "lucide-react";
import { 
  CONNECTION_SEND_ERROR, 
  CONNECTION_ACCEPT_ERROR, 
  CONNECTION_REJECT_ERROR, 
  CONNECTION_CANCEL_ERROR,
  CONNECTION_REMOVE_ERROR,
  mapConnectionError 
} from "@/lib/messages";

interface ConnectionButtonProps {
  targetUserId: string;
  className?: string;
  onStatusChange?: (newStatus: ConnectionStatus) => void;
}

export default function ConnectionButton({ targetUserId, className = "", onStatusChange }: ConnectionButtonProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>("add");
  const [requestId, setRequestId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!user || !targetUserId) return;
    
    try {
      const token = await user.getIdToken();
      const data = await getConnectionStatus(targetUserId, token);
      setStatus(data.status);
      setRequestId(data.requestId);
      if (onStatusChange) onStatusChange(data.status);
    } catch (err) {
      console.error("Failed to fetch connection status:", err);
    } finally {
      setLoading(false);
    }
  }, [user, targetUserId, onStatusChange]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSendRequest = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const token = await user.getIdToken();
      await sendConnectionRequest(targetUserId, token);
      await fetchStatus();
    } catch (err) {
      console.error(mapConnectionError(err, CONNECTION_SEND_ERROR));
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!user || !requestId) return;
    setActionLoading(true);
    try {
      const token = await user.getIdToken();
      await acceptConnectionRequest(requestId, token);
      await fetchStatus();
    } catch (err) {
      console.error(mapConnectionError(err, CONNECTION_ACCEPT_ERROR));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!user || !requestId) return;
    setActionLoading(true);
    try {
      const token = await user.getIdToken();
      await rejectConnectionRequest(requestId, token);
      await fetchStatus();
    } catch (err) {
      console.error(mapConnectionError(err, CONNECTION_REJECT_ERROR));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      const token = await user.getIdToken();
      await cancelConnectionRequest(targetUserId, token);
      await fetchStatus();
    } catch (err) {
      console.error(mapConnectionError(err, CONNECTION_CANCEL_ERROR));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemovePeer = async () => {
    if (!user) return;
    if (!confirm("ARE YOU SURE YOU WANT TO REMOVE THIS PEER?")) return;
    
    setActionLoading(true);
    try {
      const token = await user.getIdToken();
      await removePeer(targetUserId, token);
      await fetchStatus();
    } catch (err) {
      console.error(mapConnectionError(err, CONNECTION_REMOVE_ERROR));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`h-10 w-32 border border-border bg-surface/50 animate-pulse ${className}`} />
    );
  }

  if (status === "self") return null;

  if (status === "connected") {
    return (
      <div className="flex gap-2">
        <div className={`flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/30 text-accent font-mono text-[10px] font-bold uppercase tracking-widest ${className}`}>
          <UserCheck className="w-3 h-3" />
          CONNECTED
        </div>
        <button
          onClick={handleRemovePeer}
          disabled={actionLoading}
          className="flex items-center justify-center px-3 py-2 border border-border bg-surface text-text-secondary transition-all cursor-pointer hover:bg-white/5"
          title="Remove Peer"
        >
          {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
        </button>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="flex gap-2">
        <div className={`flex items-center px-4 py-2 bg-surface border border-border text-text-secondary font-mono text-[10px] font-bold uppercase tracking-widest ${className}`}>
          REQUEST SENT
        </div>
        <button
          onClick={handleCancelRequest}
          disabled={actionLoading}
          className="flex items-center justify-center px-3 py-2 border border-red-500/30 bg-red-500/5 text-red-500 transition-all cursor-pointer hover:bg-red-500/10"
          title="Cancel Request"
        >
          {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
        </button>
      </div>
    );
  }

  if (status === "accept") {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleAcceptRequest}
          disabled={actionLoading}
          className={`flex items-center gap-2 px-4 py-2 bg-accent text-black hover:bg-white transition-all font-mono text-[10px] font-bold uppercase tracking-widest ${className}`}
        >
          {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          ACCEPT
        </button>
        <button
          onClick={handleRejectRequest}
          disabled={actionLoading}
          className={`flex items-center gap-2 px-4 py-2 bg-surface border border-border text-text-secondary hover:text-red-500 hover:border-red-500/30 transition-all font-mono text-[10px] font-bold uppercase tracking-widest ${className}`}
        >
          {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserX className="w-3 h-3" />}
          REJECT
        </button>
      </div>
    );
  }

  // Default: status === "add"
  return (
    <button
      onClick={handleSendRequest}
      disabled={actionLoading}
      className={`flex items-center gap-2 px-6 py-2 bg-accent text-black hover:bg-white transition-all font-mono text-[10px] uppercase tracking-widest font-black ${className} cursor-pointer`}
    >
      {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
      ADD PEER  
    </button>
  );
}
