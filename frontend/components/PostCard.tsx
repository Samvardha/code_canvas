"use client";

import Link from "next/link";
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
import Image from "next/image";
import { deletePost, toggleLike } from "@/lib/api/posts";
import Popup from "@/components/Popup";
import { MenuDropdown } from "./MenuDropdown";
import Toast from "@/components/Toast";
import { createPortal } from "react-dom";
import { CommentSection } from "./CommentSection";

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
  isLiked?: boolean;
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
  isLiked = false,
}: PostCardProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [errorToast, setErrorToast] = useState({ isVisible: false, message: "" });
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: string } | null>(null);
  
  const [currentLikes, setCurrentLikes] = useState(likes);
  const [currentCommentsCount, setCurrentCommentsCount] = useState(comments);
  const [isCommentsExpanded, setIsCommentsExpanded] = useState(false);
  const [isLikedInternal, setIsLikedInternal] = useState(isLiked);
  const [isLiking, setIsLiking] = useState(false);
  const [direction, setDirection] = useState(1);
  const [commentDirection, setCommentDirection] = useState(1);
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

  useEffect(() => {
    setCurrentLikes(likes);
  }, [likes]);

  useEffect(() => {
    setIsLikedInternal(isLiked);
  }, [isLiked]);

  useEffect(() => {
    setCurrentCommentsCount(comments);
  }, [comments]);

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

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token || isLiking) return;

    // Optimistic UI update
    const previousLikes = currentLikes;
    const previousIsLiked = isLikedInternal;
    
    setDirection(previousIsLiked ? -1 : 1);
    setIsLikedInternal(!previousIsLiked);
    setCurrentLikes(prev => previousIsLiked ? prev - 1 : prev + 1);
    setIsLiking(true);

    try {
      const result = await toggleLike(postId, token);
      if (result.success) {
        setIsLikedInternal(result.liked);
        setCurrentLikes(result.likes_count);
      }
    } catch (err) {
      console.error("Failed to toggle like:", err);
      setIsLikedInternal(previousIsLiked);
      setCurrentLikes(previousLikes);
      setErrorToast({ isVisible: true, message: "LIKE_ACTION_FAILED" });
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <motion.div
      id={`post-ID-${postId}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full bg-surface border border-border transition-all duration-500 relative ${isMenuOpen ? "z-50" : "z-10"} ${isDeleting ? "opacity-50 grayscale pointer-events-none" : ""}`}
    >
      <div className={`p-4 sm:p-6 flex items-start justify-between relative z-20`}>
        <div className="flex items-start gap-4">
          <Link 
            href={`/profile/${userHandle}`}
            className="w-12 h-12 border border-border bg-background overflow-hidden relative"
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={username}
                fill
                sizes="48px"
                className="object-cover transition-all duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-accent/5 text-accent font-mono text-sm font-bold">
                {username.charAt(0).toUpperCase()}
              </div>
            )}
          </Link>
          <div className="flex flex-col">
            <Link href={`/profile/${userHandle}`}>
              <h3 className="text-sm font-black text-white uppercase tracking-tight leading-none mb-1.5">
                {username}
              </h3>
            </Link>
            <div className="flex items-center gap-2">
              <Link href={`/profile/${userHandle}`} className="text-[10px] font-mono text-text-secondary uppercase tracking-widest leading-none">
                @{userHandle}
              </Link>

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

              <MenuDropdown
                isOpen={isMenuOpen}
                className="w-48"
                items={[
                  {
                    label: "Update Signal",
                    icon: Edit3,
                    onClick: (e) => {
                      e.stopPropagation();
                      handleEdit();
                    },
                  },
                  {
                    label: "Terminate Signal",
                    icon: Trash2,
                    onClick: (e) => {
                      e.stopPropagation();
                      handleDelete();
                    },
                    variant: "danger",
                    disabled: isDeleting,
                  },
                ]}
              />
            </div>
          )}
        </div>
      </div>

    {/* Content */}
    <div className="px-4 sm:px-6 pb-6 space-y-6">
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
                <Image
                  src={m.url}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover sm:hover:scale-98 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-black flex items-center justify-center relative">
                   <Image
                    src={m.url} 
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover opacity-50"
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

      {/* Footer / Stats & Comments */}
      <div className="p-4 sm:p-6 flex flex-col gap-6 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button 
              onClick={handleLike}
              disabled={isLiking}
              className={`flex items-center gap-0 transition-all duration-300 cursor-pointer group/stat ${isLikedInternal ? "text-accent" : "text-text-secondary md:hover:text-accent"}`}
            >
              <div className={`p-2 rounded-full transition-colors ${isLikedInternal ? "bg-accent/5" : "md:hover:bg-accent/5"}`}>
                <motion.div
                  animate={isLikedInternal ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <Heart className={`w-5 h-5 ${isLikedInternal ? "fill-accent text-accent" : "md:group-hover/stat:fill-accent"}`} />
                </motion.div>
              </div>
              <div className="overflow-hidden relative h-[18px] flex items-center">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={currentLikes}
                    initial={{ y: direction * 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -direction * 15, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                    className="text-[13px] font-mono font-black block"
                  >
                    {currentLikes}
                  </motion.span>
                </AnimatePresence>
              </div>
            </button>
            
            <button 
              onClick={() => setIsCommentsExpanded(!isCommentsExpanded)}
              className={`flex items-center gap-0 transition-all duration-300 cursor-pointer group/stat ${isCommentsExpanded ? "text-accent" : "text-text-secondary md:hover:text-white"}`}
            >
              <div className={`p-2 rounded-full transition-colors ${isCommentsExpanded ? "bg-accent/5" : "md:hover:bg-white/5"}`}>
                <MessageCircle className={`w-5 h-5 ${isCommentsExpanded ? "fill-accent/20" : ""}`} />
              </div>
              <div className="overflow-hidden relative h-[18px] flex items-center">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={currentCommentsCount}
                    initial={{ y: commentDirection * 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -commentDirection * 15, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                    className="text-[13px] font-mono font-black block"
                  >
                    {currentCommentsCount}
                  </motion.span>
                </AnimatePresence>
              </div>
            </button>
            
            <button 
              onClick={handleShare}
              className="flex items-center gap-0 text-text-secondary hover:text-white transition-all duration-300 cursor-pointer group active:scale-95"
            >
              <div className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <Share2 className="w-5 h-5" />
              </div>
            </button>
          </div>
          <div className="flex-1" />
        </div>

        <CommentSection 
          postId={postId}
          token={token}
          currentUserId={currentUserId}
          isExpanded={isCommentsExpanded}
          onExpand={() => setIsCommentsExpanded(true)}
          onCommentsCountChange={(delta) => {
            setCommentDirection(delta > 0 ? 1 : -1);
            setCurrentCommentsCount(prev => prev + delta);
          }}
        />
      </div>

      <Popup
        isOpen={showDeletePopup}
        onClose={() => setShowDeletePopup(false)}
        title="TERMINATE_SIGNAL_CONFIRMATION"
        description="Are you sure you want to delete this post? This action cannot be reversed in this sector."
        primaryButton={{
          label: "TERMINATE_SIGNAL",
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
            className="absolute inset-0 bg-black/70 backdrop-blur-xl"
            onClick={() => setSelectedMedia(null)}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative max-w-7xl max-h-screen z-10 flex items-center justify-center"
          >
            {selectedMedia.type === 'image' ? (
              <div className="relative group">
                <Image
                  src={selectedMedia.url}
                  width={1400}
                  height={900}
                  unoptimized
                  className="w-auto h-auto max-w-full max-h-[90vh] border border-white/10 shadow-2xl object-contain"
                  alt="Enlarged signal media"
                  priority
                />
                <button
                  onClick={() => setSelectedMedia(null)}
                  className="absolute top-0 -right-10 text-white/50 hover:text-white transition-colors cursor-pointer p-1 bg-white/10 hidden sm:block"
                  title="Close Preview"
                >
                  <X size={24} />
                </button>
                <button
                  onClick={() => setSelectedMedia(null)}
                  className="absolute top-2 right-2 text-white/50 hover:text-white bg-black/40 backdrop-blur-md p-2 sm:hidden z-20"
                >
                  <X size={20} />
                </button>

              </div>
            ) : (
              <div className="relative group">
                <video
                  src={selectedMedia.url}
                  className="max-w-full max-h-[90vh] border border-white/10 shadow-2xl"
                  controls
                  autoPlay
                />
                <button
                  onClick={() => setSelectedMedia(null)}
                  className="absolute top-0 -right-10 text-white/50 hover:text-white transition-colors p-1 bg-white/10 cursor-pointer hidden sm:block"
                  title="Close Preview"
                >
                  <X size={24} />
                </button>
                <button
                  onClick={() => setSelectedMedia(null)}
                  className="absolute top-2 right-2 text-white/50 hover:text-white bg-black/40 backdrop-blur-md p-2 sm:hidden z-20"
                >
                  <X size={20} />
                </button>
              </div>
            )}
          </motion.div>
        </div>,
        document.body
      )}
    </motion.div>
  );
}
