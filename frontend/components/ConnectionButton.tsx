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
} from "@/lib/api/peers";
import { UserPlus, UserCheck, UserX, Loader2, Clock, Check, X, MessageSquare } from "lucide-react";
import Popup from "@/components/Popup";
import Toast from "@/components/Toast";
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
  const [actionType, setActionType] = useState<"send" | "accept" | "reject" | "cancel" | "remove" | null>(null);
  
  const [popup, setPopup] = useState<{
    isOpen: boolean;
    title?: string;
    description: string;
    primaryButton?: { label: string; onClick: () => void; variant?: "primary" | "secondary" | "danger" };
    secondaryButton?: { label: string; onClick: () => void };
  }>({
    isOpen: false,
    description: "",
  });

  const [toast, setToast] = useState<{
    isVisible: boolean;
    message: string;
  }>({
    isVisible: false,
    message: "",
  });

  const closePopup = () => setPopup((prev) => ({ ...prev, isOpen: false }));
  const closeToast = () => setToast((prev) => ({ ...prev, isVisible: false }));

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
    setActionType("send");
    try {
      const token = await user.getIdToken();
      const data = await sendConnectionRequest(targetUserId, token);
      if (data.status) {
        setStatus(data.status);
        if (data.requestId) setRequestId(data.requestId);
        
        // If the backend detected an existing incoming request
        if (data.status === "accept") {
          setToast({
            isVisible: true,
            message: "THIS USER HAS ALREADY SENT YOU A REQUEST",
          });
        }
      } else {
        await fetchStatus();
      }
    } catch (err) {
      const msg = mapConnectionError(err, CONNECTION_SEND_ERROR);
      console.error(msg);
      setToast({ isVisible: true, message: msg });
    } finally {
      setActionType(null);
    }
  };

  const handleAcceptRequest = async () => {
    if (!user || !requestId) return;
    setActionType("accept");
    try {
      const token = await user.getIdToken();
      await acceptConnectionRequest(requestId, token);
      await fetchStatus();
    } catch (err) {
      const msg = mapConnectionError(err, CONNECTION_ACCEPT_ERROR);
      console.error(msg);
      setToast({ isVisible: true, message: msg });
      // Re-fetch to sync state in case the request was deleted/modified elsewhere
      await fetchStatus();
    } finally {
      setActionType(null);
    }
  };

  const handleRejectRequest = async () => {
    if (!user || !requestId) return;
    setActionType("reject");
    try {
      const token = await user.getIdToken();
      await rejectConnectionRequest(requestId, token);
      await fetchStatus();
    } catch (err) {
      const msg = mapConnectionError(err, CONNECTION_REJECT_ERROR);
      console.error(msg);
      setToast({ isVisible: true, message: msg });
      await fetchStatus();
    } finally {
      setActionType(null);
    }
  };

  const handleCancelRequest = async () => {
    if (!user) return;
    setActionType("cancel");
    try {
      const token = await user.getIdToken();
      await cancelConnectionRequest(targetUserId, token);
      await fetchStatus();
    } catch (err) {
      const msg = mapConnectionError(err, CONNECTION_CANCEL_ERROR);
      console.error(msg);
      setToast({ isVisible: true, message: msg });
      await fetchStatus();
    } finally {
      setActionType(null);
    }
  };

  const handleRemovePeer = async () => {
    if (!user) return;
    
    setPopup({
      isOpen: true,
      title: "CONFIRM UNPEER",
      description: "ARE YOU SURE YOU WANT TO REMOVE THIS PEER?",
      primaryButton: {
        label: "REMOVE",
        variant: "danger",
        onClick: async () => {
          setActionType("remove");
          try {
            const token = await user.getIdToken();
            await removePeer(targetUserId, token);
            await fetchStatus();
          } catch (err) {
            const msg = mapConnectionError(err, CONNECTION_REMOVE_ERROR);
            console.error(msg);
            setToast({ isVisible: true, message: msg });
            await fetchStatus();
          } finally {
            setActionType(null);
          }
        },
      },
      secondaryButton: {
        label: "CANCEL",
        onClick: () => {},
      },
    });
  };

  if (loading) {
    return (
      <div className={`h-10 w-32 border border-border bg-surface/50 animate-pulse ${className}`} />
    );
  }

  if (status === "self") return null;

  return (
    <>
    {status === "connected" && (
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (typeof window !== "undefined" && (window as any).__openChatWith) {
              (window as any).__openChatWith(targetUserId);
            }
          }}
          className="flex items-center justify-center px-3 py-2 border border-accent bg-accent text-black transition-all cursor-pointer hover:bg-transparent hover:text-accent duration-300"
          title="Send Message"
        >
          <MessageSquare className="w-3 h-3" />
        </button>
        <div className={`flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/30 text-accent font-mono text-[10px] font-bold uppercase tracking-widest ${className}`}>
          <UserCheck className="w-3 h-3" />
          CONNECTED
        </div>
        <button
          onClick={handleRemovePeer}
          disabled={actionType !== null}
          className="flex items-center justify-center px-3 py-2 border border-border bg-surface text-text-secondary transition-all cursor-pointer hover:bg-white/5"
          title="Remove Peer"
        >
          {actionType === "remove" ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
        </button>
      </div>
    )}

    {status === "pending" && (
      <div className="flex gap-2">
        <div className={`flex items-center px-4 py-2 bg-surface border border-border text-text-secondary font-mono text-[10px] font-bold uppercase tracking-widest ${className}`}>
          REQUEST SENT
        </div>
        <button
          onClick={handleCancelRequest}
          disabled={actionType !== null}
          className="flex items-center justify-center px-3 py-2 border border-red-500/30 bg-red-500/5 text-red-500 transition-all cursor-pointer hover:bg-red-500/10"
          title="Cancel Request"
        >
          {actionType === "cancel" ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
        </button>
      </div>
    )}

    {status === "accept" && (
      <div className="flex gap-2">
        <button
          onClick={handleAcceptRequest}
          disabled={actionType !== null}
          className={`flex items-center gap-2 px-4 py-2 bg-accent text-black hover:bg-white transition-all font-mono text-[10px] font-bold uppercase tracking-widest ${className}`}
        >
          {actionType === "accept" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          ACCEPT
        </button>
        <button
          onClick={handleRejectRequest}
          disabled={actionType !== null}
          className={`flex items-center gap-2 px-4 py-2 bg-surface border border-border text-text-secondary hover:text-red-500 hover:border-red-500/30 transition-all font-mono text-[10px] font-bold uppercase tracking-widest ${className}`}
        >
          {actionType === "reject" ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserX className="w-3 h-3" />}
          REJECT
        </button>
      </div>
    )}

    {status === "add" && (
      <button
        onClick={handleSendRequest}
        disabled={actionType !== null}
        className={`flex items-center gap-2 px-6 py-2 bg-accent text-black hover:bg-white transition-all font-mono text-[10px] uppercase tracking-widest font-black ${className} cursor-pointer`}
      >
        {actionType === "send" ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
        ADD PEER  
      </button>
    )}
    
    <Popup
      isOpen={popup.isOpen}
      onClose={closePopup}
      title={popup.title}
      description={popup.description}
      primaryButton={popup.primaryButton}
      secondaryButton={popup.secondaryButton}
    />

    <Toast
      isVisible={toast.isVisible}
      message={toast.message}
      onClose={closeToast}
      duration={2000}
    />
    </>
  );
}
