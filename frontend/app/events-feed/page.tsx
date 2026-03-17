"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { PostCard } from "@/components/PostCard";
import { getEventsFeed } from "@/lib/api/posts";
import { FeedLayout } from "@/components/FeedLayout";
import { useFeed } from "@/hooks/useFeed";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import Toast from "@/components/Toast";
import { 
  Loader2,
  Calendar
} from "lucide-react";

export default function EventsFeedPage() {
  const router = useRouter();
  const { 
    posts, 
    setPosts, 
    loading, 
    loadingMore,
    hasMore,
    token, 
    authLoading, 
    user, 
    errorToast, 
    setErrorToast,
    loadMore
  } = useFeed(getEventsFeed);

  const observerRef = useIntersectionObserver(loadMore, [hasMore, loadingMore, loading]);

  return (
    <>
      <FeedLayout
        isSyncing={authLoading || !user}
        syncingText="SYNCING_EVENTS"
        headerTitle={
          <>
            EVENT_<span className="text-accent text-outline">FEED</span>
          </>
        }
        actionButtonText="New_Post"
        onActionClick={() => router.push("/posts/create")}
        sidebarContent={
          <div className="space-y-8">
            <div className="p-6 border border-border bg-white/3 space-y-4 w-full">
              <h3 className="text-[10px] font-mono font-black text-accent uppercase tracking-[0.2em]">Sector_Intel</h3>
              <p className="text-xs text-text-secondary leading-relaxed font-mono italic">
                {">"} Real-world and digital summits. Connect with the community through shared experiences.
              </p>
            </div>
          </div>
        }
      >
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4 bg-black">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
            <span className="text-[10px] font-mono text-accent uppercase tracking-widest">Intercepting_Events...</span>
          </div>
        ) : posts.length > 0 ? (
          <>
            <AnimatePresence initial={false}>
              {posts.map((post, idx) => (
                <PostCard 
                  key={post._id || `post-${idx}`} 
                  postId={post._id}
                  authorId={post.author_id}
                  currentUserId={user?.uid}
                  token={token}
                  onDelete={(id) => setPosts(posts.filter(p => p._id !== id))}
                  username={post.author?.name || "Anonymous"}
                  userHandle={post.author?.username || "unknown"}
                  avatarUrl={post.author?.avatar_url}
                  timestamp={new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  date={new Date(post.created_at).toLocaleDateString()}
                  content={post.content.text || ""}
                  links={post.content.links}
                  media={post.content.media}
                  github={post.github}
                  likes={post.stats.likes_count}
                  comments={post.stats.comments_count}
                  categories={post.categories}
                  collabMeta={post.collab_meta}
                  eventMeta={post.event_meta}
                />
              ))}
            </AnimatePresence>
            
            <div ref={observerRef} className="h-20 flex items-center justify-center">
              {loadingMore && (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-accent animate-spin" />
                  <span className="text-[8px] font-mono text-accent uppercase tracking-widest">FETCHING_MORE_EVENTS...</span>
                </div>
              )}
              {!hasMore && (
                <span className="text-[8px] font-mono text-text-secondary uppercase tracking-[0.2em]">BOTTOM_OF_SECTOR_REACHED</span>
              )}
            </div>
          </>
        ) : (
          <div className="p-20 text-center bg-black">
            <p className="text-text-secondary font-mono text-sm uppercase tracking-widest italic animate-pulse">
              [ NO_EVENT_SIGNALS_FOUND_IN_THIS_SECTOR ]
            </p>
          </div>
        )}
      </FeedLayout>

      <Toast
        isVisible={errorToast.isVisible}
        message={errorToast.message}
        onClose={() => setErrorToast({ isVisible: false, message: "" })}
      />
    </>
  );
}
