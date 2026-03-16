"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal, 
  Clock, 
  Edit3, 
  Trash2,
  ExternalLink
} from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { deletePost } from "@/lib/api/posts";
import Popup from "@/components/Popup";
import Toast from "@/components/Toast";

interface PostCardProps {
  postId: string;
  authorId: string;
  currentUserId?: string | null;
  token?: string | null;
  onDelete?: (postId: string) => void;
  username: string;
  userHandle: string;
  avatarUrl?: string;
  timestamp: string;
  date: string;
  content: string;
  imageUrl?: string;
  likes: number;
  comments: number;
  categories?: string[];
  collabMeta?: any;
  eventMeta?: any;
}

export function PostCard({
  postId,
  authorId,
  currentUserId,
  token,
  onDelete,
  username,
  userHandle,
  avatarUrl,
  timestamp,
  date,
  content,
  imageUrl,
  likes,
  comments,
  categories = [],
  collabMeta,
  eventMeta,
}: PostCardProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [errorToast, setErrorToast] = useState({ isVisible: false, message: "" });
  const menuRef = useRef<HTMLDivElement>(null);
  
  const isCollab = categories.includes("collab");
  const isEvent = categories.includes("event");
  const isOwner = currentUserId === authorId;

  // Handle click outside to close menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const confirmDelete = async () => {
    if (!token || isDeleting) return;

    try {
      setIsDeleting(true);
      await deletePost(postId, token);
      if (onDelete) onDelete(postId);
      setIsMenuOpen(false);
    } catch (err) {
      console.error("Failed to delete post:", err);
      setErrorToast({ isVisible: true, message: "SIGNAL_TERMINATION_FAILED" });
    } finally {
      setIsDeleting(false);
      setShowDeletePopup(false);
    }
  };

  const handleDelete = () => {
    setIsMenuOpen(false);
    setShowDeletePopup(true);
  };

  const handleEdit = () => {
    // Redirect to edit page
    router.push(`/posts/create?edit=${postId}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full bg-surface border border-border overflow-hidden group transition-all duration-300 relative ${isDeleting ? "opacity-50 grayscale pointer-events-none" : ""}`}
    >
      <div className="p-4 sm:p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border border-border bg-background overflow-hidden relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={username}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-accent/5 text-accent font-mono text-xs font-bold">
                {username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-white uppercase tracking-tight leading-none mb-1">
              {username}
            </h3>
            <span className="text-[10px] font-mono text-text-secondary uppercase tracking-widest flex items-center gap-2">
              @{userHandle}
              <span className="w-1 h-1 bg-border rounded-full" />
              <Clock className="w-3 h-3" />
              {timestamp}
            </span>
          </div>
        </div>
        
        {isOwner && (
          <div className="relative" ref={menuRef}>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
              }}
              className={`text-text-secondary hover:text-white transition-colors cursor-pointer p-1 ${isMenuOpen ? "text-white bg-white/5" : ""}`}
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 mt-2 w-48 bg-[#0A0A0A] border border-border shadow-2xl z-50 overflow-hidden"
                >
                  <div className="flex flex-col p-1">
                    <button
                      onClick={handleEdit}
                      className="flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-accent hover:text-black transition-all text-left"
                    >
                      <Edit3 size={14} />
                      Update_Signal
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-all text-left border-t border-border/50"
                    >
                      <Trash2 size={14} />
                      {isDeleting ? "TERMINATING..." : "Terminate_Signal"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 sm:px-5 pb-4 space-y-4">
        {content && (
          <p className="text-sm text-text-primary leading-relaxed font-medium">
            {content}
          </p>
        )}

        {isCollab && collabMeta && (
          <div className="bg-accent/5 border border-accent/20 p-4 space-y-3 relative overflow-hidden group/collab">
            <div className="absolute top-0 right-0 w-12 h-12 bg-accent/5 rotate-45 translate-x-6 -translate-y-6 border-l border-b border-accent/10" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-black text-accent uppercase tracking-widest">COLLAB_SPEC</span>
              <span className="text-[9px] font-mono text-accent/60 uppercase">{collabMeta.status}</span>
            </div>
            <h4 className="text-sm font-bold text-white uppercase">{collabMeta.title}</h4>
            {collabMeta.looking_for?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {collabMeta.looking_for.map((item: string, i: number) => (
                  <span key={i} className="text-[9px] font-mono bg-accent/10 text-accent px-2 py-0.5 border border-accent/20">
                    {item}
                  </span>
                ))}
              </div>
            )}
            {collabMeta.duration && (
              <div className="text-[10px] font-mono text-text-secondary uppercase">
                &gt; DURATION: {collabMeta.duration} {Number(collabMeta.duration) === 1 ? "MONTH" : "MONTHS"}
              </div>
            )}
          </div>
        )}

        {isEvent && eventMeta && (
          <div className="bg-blue-500/5 border border-blue-500/20 p-4 space-y-3 relative overflow-hidden group/event">
            <div className="absolute top-0 right-0 w-12 h-12 bg-blue-500/5 rotate-45 translate-x-6 -translate-y-6 border-l border-b border-blue-500/10" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-black text-blue-400 uppercase tracking-widest">EVENT_SPEC</span>
              <span className="text-[9px] font-mono text-blue-400/60 uppercase">{eventMeta.status}</span>
            </div>
            <h4 className="text-sm font-bold text-white uppercase">{eventMeta.title}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="text-text-secondary">
                <span className="text-blue-400/60 font-bold">MODE:</span> {eventMeta.mode}
              </div>
              {eventMeta.venue?.city && (
                <div className="text-text-secondary">
                  <span className="text-blue-400/60 font-bold">CITY:</span> {eventMeta.venue.city}
                </div>
              )}
              <div className="text-text-secondary">
                <span className="text-blue-400/60 font-bold">START:</span> {new Date(eventMeta.start_at).toLocaleDateString()}
              </div>
              {eventMeta.rsvp_url && (
                <div className="text-blue-400 flex items-center gap-1 group/link">
                  <a href={eventMeta.rsvp_url} target="_blank" rel="noopener noreferrer" className="underline truncate">RSVP_LINK</a>
                  <ExternalLink size={10} className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Image if available */}
      {imageUrl && (
        <div className="relative aspect-video overflow-hidden border-y border-border transition-colors">
          <div className="absolute inset-0 bg-accent/5 opacity-0 transition-opacity pointer-events-none z-10" />
          <img
            src={imageUrl}
            alt="Post content"
            className="w-full h-full object-cover transition-transform duration-700"
          />
        </div>
      )}

      {/* Footer / Stats */}
      <div className="p-4 sm:p-5 flex items-center justify-between border-t border-border bg-background/50">
        <div className="flex items-center gap-6">
          <button className="flex items-center gap-2 text-text-secondary hover:text-accent transition-colors cursor-pointer group/stat">
            <Heart className="w-4 h-4 group-hover/stat:fill-accent" />
            <span className="text-[10px] font-mono font-bold">{likes}</span>
          </button>
          <button className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors cursor-pointer group/stat">
            <MessageCircle className="w-4 h-4" />
            <span className="text-[10px] font-mono font-bold">{comments}</span>
          </button>
          <button className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors cursor-pointer group/stat">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
        <span className="text-[9px] font-mono text-text-secondary uppercase tracking-[0.2em] font-bold">
          {date}
        </span>
      </div>

      <Popup
        isOpen={showDeletePopup}
        onClose={() => setShowDeletePopup(false)}
        title="TERMINATE_BROADCAST_CONFIRMATION"
        description="Are you sure you want to delete this post? This action cannot be reversed in this sector."
        primaryButton={{
          label: "TERMINATE_BROADCAST",
          onClick: confirmDelete,
          variant: "danger",
        }}
        secondaryButton={{
          label: "ABORT_MISSION",
          onClick: () => setShowDeletePopup(false),
        }}
      />

      <Toast
        isVisible={errorToast.isVisible}
        message={errorToast.message}
        onClose={() => setErrorToast({ isVisible: false, message: "" })}
      />
    </motion.div>
  );
}
