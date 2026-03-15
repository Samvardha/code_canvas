"use client";

import { motion } from "framer-motion";
import { Heart, MessageCircle, Share2, MoreHorizontal, Clock } from "lucide-react";

interface PostCardProps {
  username: string;
  userHandle: string;
  avatarUrl?: string;
  timestamp: string;
  date: string;
  content: string;
  imageUrl?: string;
  likes: number;
  comments: number;
}

export function PostCard({
  username,
  userHandle,
  avatarUrl,
  timestamp,
  date,
  content,
  imageUrl,
  likes,
  comments,
}: PostCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-surface border border-border overflow-hidden group hover:border-accent/40 transition-colors duration-500"
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
        <button className="text-text-secondary hover:text-white transition-colors cursor-pointer">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-5 pb-4">
        <p className="text-sm text-text-primary leading-relaxed font-medium">
          {content}
        </p>
      </div>

      {/* Image if available */}
      {imageUrl && (
        <div className="relative aspect-video overflow-hidden border-y border-border group-hover:border-accent/20 transition-colors">
          <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Post content"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
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
    </motion.div>
  );
}
