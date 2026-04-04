"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { 
  Heart, 
  Trash2, 
  Reply, 
  Clock, 
  MoreHorizontal
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Comment, toggleCommentLike, deleteComment, addReply } from "@/lib/api/comments";
import { CommentForm } from "./CommentForm";
import { MenuDropdown } from "./MenuDropdown";
import Toast from "./Toast";
import { useAuth } from "@/contexts/AuthContext";

interface CommentItemProps {
  comment: Comment;
  currentUserId?: string | null;
  getToken?: () => Promise<string | null>;
  postId: string;
  onCommentUpdate: (updatedComment: Comment) => void;
  onCommentDelete: (commentId: string) => void;
}

export function CommentItem({ 
  comment, 
  currentUserId, 
  getToken, 
  postId,
  onCommentUpdate, 
  onCommentDelete 
}: CommentItemProps) {
  const [isLiking, setIsLiking] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [direction, setDirection] = useState(1);
  const [errorToast, setErrorToast] = useState({ isVisible: false, message: "" });

  const isOwner = currentUserId === comment.author_id;
  const hasReplies = comment.replies && comment.replies.length > 0;

  const handleLike = async () => {
    if (!getToken || isLiking) return;

    const previousLikes = comment.stats.likes_count;
    const previousIsLiked = comment.is_liked;

    setDirection(previousIsLiked ? -1 : 1);
    
    // Optimistic update
    onCommentUpdate({
      ...comment,
      is_liked: !previousIsLiked,
      stats: {
        ...comment.stats,
        likes_count: previousIsLiked ? previousLikes - 1 : previousLikes + 1
      }
    });

    try {
      setIsLiking(true);
      const idToken = await getToken();
      if (!idToken) throw new Error("AUTH_REQUIRED");
      const res = await toggleCommentLike(comment._id, idToken);
      onCommentUpdate({
        ...comment,
        is_liked: res.liked,
        stats: {
          ...comment.stats,
          likes_count: res.likes_count
        }
      });
    } catch (err) {
      console.error("Failed to toggle comment like:", err);
      // Rollback
      onCommentUpdate({
        ...comment,
        is_liked: previousIsLiked,
        stats: {
          ...comment.stats,
          likes_count: previousLikes
        }
      });
      setErrorToast({ isVisible: true, message: "SYNC_ERROR_ROLLBACK" });
    } finally {
      setIsLiking(false);
    }
  };

  const { user, userProfile } = useAuth();

  const handleReplySubmit = async (text: string) => {
    if (!getToken || !user || !userProfile?.profile) return;
    try {
      const idToken = await getToken();
      if (!idToken) throw new Error("AUTH_REQUIRED");
      const serverReply = await addReply(comment._id, text, idToken);

      const newReply: Comment = {
        ...serverReply,
        author: {
          firebase_uid: user.uid,
          username: userProfile.profile.username || "identity",
          name: userProfile.profile.name || "ANONYMOUS",
          avatar_url: userProfile.profile.avatar_url || "",
        },
        replies: [],
        is_liked: false
      };

      onCommentUpdate({
        ...comment,
        replies: [...(comment.replies || []), newReply]
      });
      setIsReplying(false);
    } catch (err) {
      console.error("Failed to send reply:", err);
      setErrorToast({ isVisible: true, message: "TRANSMISSION_FAILED" });
    }
  };

  const handleDelete = async () => {
    if (!getToken || isDeleting) return;
    try {
      setIsDeleting(true);
      const idToken = await getToken();
      if (!idToken) throw new Error("AUTH_REQUIRED");
      await deleteComment(comment._id, idToken);
      onCommentDelete(comment._id);
    } catch (err) {
      console.error("Failed to delete comment:", err);
      setErrorToast({ isVisible: true, message: "DELETION_FAILED" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={`relative flex flex-col group/comment ${comment.parent_comment_id ? "ml-2 sm:ml-3 md:ml-4" : ""}`}>
      {/* Individual Comment Container with bottom separator */}
      <div className="py-3 sm:py-4 border-b border-white/20 last:border-b-0 space-y-1.5 sm:space-y-2">
        {/* Header: Auth/Time and Menu */}
        <div className="flex items-start justify-between">
          <div className="flex items-end gap-3">
            <Link href={`/profile/${comment.author?.username || comment.author_id}`}>
              <div className="w-8 h-8 rounded-none border border-white/10 bg-black overflow-hidden shrink-0 hover:border-accent transition-colors relative">
                {comment.author?.avatar_url ? (
                  <Image 
                    src={comment.author.avatar_url} 
                    alt={comment.author.username} 
                    fill
                    sizes="32px"
                    className="object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-accent/50 font-black text-[10px] font-mono">
                    {(comment.author?.name || "?")[0].toUpperCase()}
                  </div>
                )}
              </div>
            </Link>

            <div className="flex flex-col">
              <Link href={`/profile/${comment.author?.username || comment.author_id}`}>
                <span className="text-[10px] sm:text-[11px] font-mono font-black text-white uppercase tracking-wider hover:text-accent transition-colors">
                  {comment.author?.username || "ANONYMOUS_ENTITY"}
                </span>
              </Link>
              <span className="text-[7px] sm:text-[8px] font-mono text-text-secondary/30 font-bold uppercase tracking-widest">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true }).replace('about ', '')}
              </span>
            </div>
          </div>

          {/* Menu Dots */}
          {isOwner && (
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 opacity-40 hover:opacity-100 text-text-secondary hover:text-white transition-all cursor-pointer"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <MenuDropdown 
                    isOpen={showMenu}
                    items={[
                      { 
                        label: "TERMINATE_STRING", 
                        icon: Trash2, 
                        onClick: handleDelete,
                        variant: "danger"
                      }
                    ]} 
                    onClose={() => setShowMenu(false)}
                    className="top-full mt-1 right-0 z-50"
                  />
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Message Content */}
        <p className="text-[12px] sm:text-[13px] text-text-secondary/80 leading-relaxed font-mono selection:bg-accent selection:text-black wrap-break-word">
          {comment.content.text}
        </p>

        {/* Action Matrix: Below Content */}
        <div className="flex items-center gap-4 sm:gap-6 pt-1">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 sm:gap-2 transition-all active:scale-90 cursor-pointer ${comment.is_liked ? "text-accent" : "text-text-secondary/40 hover:text-accent"}`}
          >
            <Heart className={`w-3 sm:w-3.5 h-3 sm:h-3.5 ${comment.is_liked ? "fill-accent" : ""}`} />
            <span className="text-[9px] sm:text-[10px] font-mono font-black">{comment.stats.likes_count}</span>
          </button>

          <button 
            onClick={() => setIsReplying(!isReplying)}
            className={`flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-mono font-black transition-all cursor-pointer ${isReplying ? "text-white" : "text-text-secondary/40 hover:text-white"}`}
          >
            <Reply className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            <span className="uppercase">REPLY</span>
          </button>
        </div>

        {/* Reply Input Area */}
        <AnimatePresence initial={false}>
          {isReplying && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-3 sm:mt-4"
            >
              <div className="pl-2 sm:pl-3 border-l border-white/20 pt-1.5 pb-2 sm:pb-3">
                <CommentForm 
                  onSubmit={handleReplySubmit} 
                  placeholder={`REPLY TO @${comment.author?.username}...`}
                  autoFocus
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Child Propagation */}
      {hasReplies && (
        <div className="space-y-0 relative border-l border-white/20">
          {comment.replies.map((reply) => (
            <CommentItem 
              key={reply._id}
              comment={reply}
              postId={postId}
              currentUserId={currentUserId}
              getToken={getToken}
              onCommentUpdate={(updatedReply) => {
                const newReplies = comment.replies.map(r => r._id === updatedReply._id ? updatedReply : r);
                onCommentUpdate({ ...comment, replies: newReplies });
              }}
              onCommentDelete={(replyId) => {
                const newReplies = comment.replies.filter(r => r._id !== replyId);
                onCommentUpdate({ ...comment, replies: newReplies });
              }}
            />
          ))}
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
