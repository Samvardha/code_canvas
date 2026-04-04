"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { PostCard } from "@/components/PostCard";
import { PostCardSkeleton } from "@/components/PostCardSkeleton";
import Toast from "@/components/Toast";
import { getUserPosts, Post } from "@/lib/api/posts";
import { Loader2, PlusSquare, Cpu } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Button } from "@/components/Button";
import { useFeed } from "@/hooks/useFeed";
import { useProfile } from "../layout";

export default function UserPostsPage() {
  const { isCurrentUser, targetUserId } = useProfile();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const {
    posts,
    setPosts,
    loading,
    getToken,
    errorToast,
    setErrorToast
  } = useFeed(
    `userPosts-${targetUserId}`, 
    (token, offset, limit) => getUserPosts(targetUserId as string, token)
  );

  if (authLoading || !user) return null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between border-b border-border pb-4">
        <h2 className="text-[10px] font-mono font-black text-white uppercase tracking-[0.3em]">
          FEED
        </h2>
        {isCurrentUser && (
          <button 
            onClick={() => router.push("/posts/create")}
            className="group flex items-center gap-2 bg-accent/10 border border-accent/20 px-3 py-1.5 hover:bg-accent hover:text-black transition-all cursor-pointer"
          >
            <PlusSquare className="w-3.5 h-3.5" />
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest">New_Post</span>
          </button>
        )}
      </header>

      <div className="flex flex-col gap-px bg-border">
        {loading ? (
          <div className="flex flex-col gap-px bg-border">
            <PostCardSkeleton />
            <PostCardSkeleton />
          </div>
        ) : posts.length > 0 ? (
          <AnimatePresence initial={false}>
            {posts.map((post, idx) => (
              <PostCard 
                key={post._id || `user-post-${idx}`} 
                postId={post._id}
                authorId={post.author_id}
                currentUserId={user?.uid}
                getToken={getToken}
                onDelete={(id) => setPosts(posts.filter(p => p._id !== id))}
                username={post.author?.name || "Anonymous"}
                userHandle={post.author?.username || "unknown"}
                avatarUrl={post.author?.avatar_url}
                timestamp={new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                date={new Date(post.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                content={post.content.text || ""}
                links={post.content.links}
                media={post.content.media}
                github={post.github}
                likes={post.stats.likes_count}
                comments={post.stats.comments_count}
                categories={post.categories}
                collabMeta={post.collab_meta}
                eventMeta={post.event_meta}
                isLiked={post.is_liked}
              />
            ))}
          </AnimatePresence>
        ) : (
          <div className="py-10 sm:py-20 text-center flex flex-col items-center gap-4 bg-transparent">
             <div className="text-xs sm:text-sm font-mono text-text-secondary uppercase tracking-widest">
              [ NO_POSTS_DETECTED ]
             </div>
             {isCurrentUser && (
               <Button onClick={() => router.push("/posts/create")} size="sm"
                variant="secondary"
                className="text-xs"
               >
                 INITIALIZE_FIRST_POST
               </Button>
             )}
          </div>
        )}
      </div>

      <Toast 
        isVisible={errorToast.isVisible}
        message={errorToast.message}
        onClose={() => setErrorToast({ ...errorToast, isVisible: false })}
      />
    </div>
  );
}
