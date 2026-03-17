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
  ExternalLink,
  X,
  Github,
  Link as LinkIcon
} from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { deletePost } from "@/lib/api/posts";
import Popup from "@/components/Popup";
import Toast from "@/components/Toast";
import { createPortal } from "react-dom";

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
  links?: { url: string; title?: string }[];
  media?: { type: string; url: string }[];
  github?: { repo_url: string | null; repo_name: string | null; repo_owner: string | null } | null;
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
  links = [],
  media = [],
  github,
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
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: string } | null>(null);
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

  useEffect(() => {
    if (selectedMedia) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [selectedMedia]);

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
    router.push(`/posts/create?edit=${postId}`);
  };

  const handleShare = async () => {
    const postUrl = `${window.location.origin}${window.location.pathname}#post-ID-${postId}`;
    const shareTitle = collabMeta?.title || eventMeta?.title || "New Signal";
    const shareText = content || `Check out this signal from ${username} on Tech Connect`;
    
    const shareData = {
      title: `${shareTitle} | Tech Connect`,
      text: shareText,
      url: postUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(postUrl);
        setErrorToast({ isVisible: true, message: "SIGNAL_LINK_COPIED" });
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Error sharing:", err);
      }
    }
  };

  return (
    <motion.div
      id={`post-ID-${postId}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full bg-surface border border-border overflow-hidden transition-all duration-500 relative ${isDeleting ? "opacity-50 grayscale pointer-events-none" : ""}`}
    >
      <div className="p-4 sm:p-6 flex items-start justify-between relative z-10">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 border border-border bg-background overflow-hidden relative transition-colors duration-500">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={username}
                className="w-full h-full object-cover transition-all duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-accent/5 text-accent font-mono text-sm font-bold">
                {username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm font-black text-white uppercase tracking-tight leading-none mb-1.5 transition-colors">
              {username}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-text-secondary uppercase tracking-widest leading-none">
                @{userHandle}
              </span>
              <span className="w-0.5 h-0.5 bg-border rounded-full" />
              <div className="flex items-center gap-1.5 text-[9px] font-mono text-text-secondary/60 uppercase">
                <div className="flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {timestamp}
                </div>
                <span className="w-0.5 h-0.5 bg-border rounded-full" />
                <span className="tracking-widest">{date}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isOwner && (
            <div className="relative" ref={menuRef}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
                className={`text-text-secondary hover:text-white transition-colors cursor-pointer p-1.5 border border-transparent hover:border-border ${isMenuOpen ? "text-white bg-white/5 border-border" : ""}`}
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>

              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 mt-2 w-48 bg-black border border-border overflow-hidden"
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
      </div>

    {/* Content */}
    <div className="px-4 sm:px-6 pb-6 space-y-6 relative z-10">
        {content && (
          <p className="text-[15px] text-text-primary leading-relaxed tracking-wide font-normal pl-0.5 border-l-2 border-transparent transition-all duration-700">
            {content}
          </p>
        )}

        {/* Links & Github */}
        {(links.length > 0 || (github && github.repo_url)) && (
          <div className="flex flex-col gap-2">
            {github?.repo_url && (
              <a 
                href={github.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 hover:bg-white/10 transition-all group/repo"
              >
                <div className="p-2 bg-black/20 rounded-sm">
                  <Github size={16} className="text-white/70" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest leading-none mb-1">REPOSITORY_SOURCE</span>
                  <span className="text-[11px] font-mono font-bold text-white uppercase truncate">
                    {github.repo_owner}/{github.repo_name}
                  </span>
                </div>
                <ExternalLink size={12} className="ml-auto text-white/20 group-hover/repo:text-white transition-colors" />
              </a>
            )}
            
            {links.map((link, i) => (
              <a 
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 hover:bg-white/10 transition-all group/link"
              >
                <div className="p-2 bg-black/20 rounded-sm">
                  <LinkIcon size={16} className="text-white/70" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest leading-none mb-1">EXTERNAL_LINK</span>
                  <span className="text-[11px] font-mono font-bold text-white uppercase truncate">
                    {link.title || link.url}
                  </span>
                </div>
                <ExternalLink size={12} className="ml-auto text-white/20 group-hover/link:text-white transition-colors" />
              </a>
            ))}
          </div>
        )}

        {isCollab && collabMeta && (
          <div className="bg-linear-to-br from-accent/7 to-transparent border border-accent/20 p-5 space-y-4 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-1 h-1/2 bg-accent/40" />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-black text-accent uppercase tracking-widest">COLLAB_SPEC</span>
              </div>
            </div>
            
            <h4 className="text-md font-black text-white uppercase tracking-tight">{collabMeta.title}</h4>
            
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                {collabMeta.looking_for?.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-mono text-accent/50 uppercase tracking-widest">LOOKING_FOR</span>
                    <div className="flex flex-wrap gap-2">
                      {collabMeta.looking_for.map((item: string, i: number) => (
                        <span key={i} className="text-[11px] font-mono bg-accent/10 text-accent px-2.5 py-1 border border-accent/20 uppercase tracking-tighter">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {collabMeta.requirements?.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-mono text-accent/50 uppercase tracking-widest">REQUIREMENTS</span>
                    <div className="flex flex-wrap gap-2">
                      {collabMeta.requirements.map((item: string, i: number) => (
                        <span key={i} className="text-[11px] font-mono bg-white/5 text-white/70 px-2.5 py-1 border border-white/10 uppercase tracking-tighter">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {collabMeta.duration && (
                <div className="flex items-center gap-2 text-[10px] font-mono text-text-secondary uppercase pt-2 border-t border-accent/5">
                  <span className="text-accent opacity-50">&gt;&gt;</span> 
                  EXPECTED_DURATION: <span className="text-white font-bold text-[12px]">{collabMeta.duration} {Number(collabMeta.duration) === 1 ? "MONTH" : "MONTHS"}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {isEvent && eventMeta && (
          <div className="bg-linear-to-br from-blue-500/7 to-transparent border border-blue-500/20 p-5 space-y-4 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-1 h-1/2 bg-blue-400/40" />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-black text-blue-400 uppercase tracking-widest">EVENT_SPEC</span>
              </div>
            </div>
            
            <h4 className="text-md font-black text-white uppercase tracking-tight">{eventMeta.title}</h4>
            
            <div className="grid grid-cols-2 gap-x-8 gap-y-6 text-[11px] font-mono pt-2">
              <div className="flex flex-col gap-1">
                <span className="text-blue-400/40 font-bold uppercase text-[10px] tracking-[0.2em]">EXPECTED_START</span>
                <span className="text-white font-bold text-[13px] uppercase">
                  {new Date(eventMeta.start_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              
              {eventMeta.end_at && (
                <div className="flex flex-col gap-1">
                  <span className="text-blue-400/40 font-bold uppercase text-[10px] tracking-[0.2em]">EXPECTED_END</span>
                  <span className="text-white font-bold text-[13px] uppercase">
                    {new Date(eventMeta.end_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <span className="text-blue-400/40 font-bold uppercase text-[10px] tracking-[0.2em]">MODE</span>
                <span className="text-white uppercase font-bold text-[13px]">{eventMeta.mode}</span>
              </div>

              {eventMeta.mode === "offline" && eventMeta.venue && (
                <div className="flex flex-col gap-1 col-span-2">
                  <span className="text-blue-400/40 font-bold uppercase text-[10px] tracking-[0.2em]">LOCATION_DATA</span>
                  <div className="text-white uppercase text-[12px] font-bold truncate">
                    {[eventMeta.venue.address, eventMeta.venue.city, eventMeta.venue.state, eventMeta.venue.pincode]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                </div>
              )}

              {eventMeta.description && eventMeta.description !== content && (
                <div className="flex flex-col gap-1 col-span-2 pt-2 border-t border-blue-500/5">
                  <span className="text-blue-400/40 font-bold uppercase text-[10px] tracking-[0.2em]">OBJECTIVE</span>
                  <p className="text-white/70 text-[12px] leading-relaxed uppercase">{eventMeta.description}</p>
                </div>
              )}
            </div>

            {eventMeta.rsvp_url && (
              <div className="flex justify-end pt-4 border-t border-blue-500/10">
                <a 
                  href={eventMeta.rsvp_url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center justify-center bg-blue-500/10 border border-blue-500/30 py-1.5 px-8 text-[10px] font-mono font-black text-blue-400 hover:bg-blue-500 hover:text-black transition-all uppercase tracking-[0.3em]"
                >
                  RSVP
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Media if available */}
      {media && media.length > 0 && (
        <div className={`grid gap-1 mx-4 sm:mx-6 border border-border overflow-hidden ${
          media.length === 1 ? "grid-cols-1" : 
          media.length === 2 ? "grid-cols-2" : 
          "grid-cols-2"
        }`}>
          {media.slice(0, 4).map((m, idx) => (
            <div 
              key={idx} 
              onClick={() => setSelectedMedia(m)}
              className={`relative overflow-hidden cursor-pointer bg-background ${
                media.length === 1 ? "aspect-3/1" : 
                "aspect-16/10"
              }`}
            >
              {m.type === "image" ? (
                <img
                  src={m.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-black flex items-center justify-center relative">
                   <img
                    src={m.url} 
                    alt=""
                    className="w-full h-full object-cover opacity-50"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                      <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-8 border-l-white border-b-[5px] border-b-transparent translate-x-0.5" />
                    </div>
                  </div>
                </div>
              )}
              {idx === 3 && media.length > 4 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-[10px] font-mono font-bold text-white">+{media.length - 4}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer / Stats */}
      <div className="p-4 sm:p-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-8">
          <button className="flex items-center gap-2 text-text-secondary hover:text-accent transition-all duration-300 cursor-pointer group/stat active:scale-95">
            <div className="p-2 hover:bg-accent/5 rounded-full transition-colors">
              <Heart className="w-4 h-4 group-hover/stat:fill-accent" />
            </div>
            <span className="text-[11px] font-mono font-black group-hover/stat:text-accent">{likes}</span>
          </button>
          <button className="flex items-center gap-2 text-text-secondary hover:text-white transition-all duration-300 cursor-pointer group/stat active:scale-95">
            <div className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <MessageCircle className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-mono font-black group-hover/stat:text-white">{comments}</span>
          </button>
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 text-text-secondary hover:text-white transition-all duration-300 cursor-pointer group active:scale-95"
          >
            <div className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <Share2 className="w-4 h-4" />
            </div>
          </button>
        </div>
        
        <div className="flex-1" />
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

      {/* Media Modal Portal */}
      {selectedMedia && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-999 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/95 backdrop-blur-xl cursor-zoom-out"
            onClick={() => setSelectedMedia(null)}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative max-w-7xl max-h-screen z-10 flex items-center justify-center"
          >
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute -top-12 right-0 text-white/50 hover:text-white transition-colors cursor-pointer p-2"
            >
              <X size={24} />
            </button>
            
            {selectedMedia.type === 'image' ? (
              <img
                src={selectedMedia.url}
                className="max-w-full max-h-[85vh] object-contain border border-white/10 shadow-2xl"
                alt="Enlarged signal media"
              />
            ) : (
              <video
                src={selectedMedia.url}
                className="max-w-full max-h-[85vh] border border-white/10 shadow-2xl"
                controls
                autoPlay
              />
            )}
          </motion.div>
        </div>,
        document.body
      )}
    </motion.div>
  );
}
