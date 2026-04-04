"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  MessageCircle, 
  Loader2, 
  RefreshCcw,
  Zap,
  Terminal,
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Comment, getComments, addComment } from "@/lib/api/comments";
import { CommentItem } from "./CommentItem";
import { CommentForm } from "./CommentForm";
import Toast from "./Toast";
import { useAuth } from "@/contexts/AuthContext";

interface CommentSectionProps {
  postId: string;
  getToken?: () => Promise<string | null>;
  currentUserId?: string | null;
  isExpanded: boolean;
  onCommentsCountChange?: (delta: number) => void;
  onExpand?: () => void;
}

export function CommentSection({ 
  postId, 
  getToken, 
  currentUserId,
  isExpanded,
  onCommentsCountChange,
  onExpand
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorToast, setErrorToast] = useState({ isVisible: false, message: "" });
  const [isSyncing, setIsSyncing] = useState(false);
  const { user, userProfile } = useAuth();

  const fetchComments = useCallback(async () => {
    try {
      setIsSyncing(true);
      const idToken = getToken ? await getToken() : null;
      const data = await getComments(postId, idToken || undefined);
      setComments(data);
    } catch (err) {
      console.error("Failed to fetch comments:", err);
      setErrorToast({ isVisible: true, message: "SIGNAL_SYNC_ERROR" });
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, [postId, getToken]);


  useEffect(() => {
    if (isExpanded) {
      fetchComments();
    }
  }, [fetchComments, isExpanded]);

  const handleCreateComment = async (text: string) => {
    if (!getToken || !user || !userProfile?.profile) return;
    try {
      const idToken = await getToken();
      if (!idToken) throw new Error("AUTH_REQUIRED");
      const serverComment = await addComment(postId, text, idToken);

      
      // Inject local profile info for immediate display
      const newComment: Comment = {
        ...serverComment,
        author: {
          firebase_uid: user.uid,
          username: userProfile.profile.username || "identity",
          name: userProfile.profile.name || "ANONYMOUS",
          avatar_url: userProfile.profile.avatar_url || "",
        },
        replies: [],
        is_liked: false
      };

      setComments(prev => [newComment, ...prev]);
      if (onCommentsCountChange) onCommentsCountChange(1);
      if (!isExpanded && onExpand) onExpand();
      setErrorToast({ isVisible: true, message: "SIGNAL_TRANSMITTED" });
    } catch (err) {
      console.error("Failed to create comment:", err);
      setErrorToast({ isVisible: true, message: "SIGNAL_TRANSMISSION_ERROR" });
    }
  };

  const handleUpdate = (updated: Comment) => {
    setComments(prev => prev.map(c => c._id === updated._id ? updated : c));
  };

  const handleDelete = (id: string) => {
    const deleted = comments.find(c => c._id === id);
    const replyCount = deleted?.replies?.length || 0;
    setComments(prev => prev.filter(c => c._id !== id));
    if (onCommentsCountChange) onCommentsCountChange(-(1 + replyCount));
    setErrorToast({ isVisible: true, message: "SIGNAL_TERMINATED" });
  };

  return (
    <div className="flex flex-col gap-2 sm:gap-3">
      {/* Input Module - ALWAYS VISIBLE */}
      <div className="relative">
        <CommentForm onSubmit={handleCreateComment} placeholder="Add a comment..." />
      </div>

      {/* Comment Execution Stream - CONDITIONALLY VISIBLE */}
      {isExpanded && (
        <div className="relative">
          <div className="space-y-0 relative">

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-4">
              <div className="w-8 h-px bg-accent/20" />
              <span className="text-[9px] font-mono text-accent/60 uppercase tracking-[0.4em] font-black">
                LOADING_DATA...
              </span>
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-0 relative">
              {comments.map((comment) => (
                <CommentItem 
                  key={comment._id}
                  comment={comment}
                  postId={postId}
                  currentUserId={currentUserId}
                  getToken={getToken}
                  onCommentUpdate={handleUpdate}
                  onCommentDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 border border-dashed border-border/20 flex flex-col items-center justify-center gap-3 mt-4">
              <p className="text-[9px] font-mono text-text-secondary/40 uppercase tracking-[0.3em] font-black">
                [ EMPTY_STREAM ]
              </p>
            </div>
          )}
          </div>
        </div>
      )}

      <Toast 
        isVisible={errorToast.isVisible}
        message={errorToast.message}
        onClose={() => setErrorToast({ ...errorToast, isVisible: false })}
      />
    </div>
  );
}
