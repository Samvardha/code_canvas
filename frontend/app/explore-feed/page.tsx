"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { PostCard } from "@/components/PostCard";
import { Button } from "@/components/Button";
import { getExploreFeed } from "@/lib/api/posts";
import { FeedLayout } from "@/components/FeedLayout";
import { useFeed } from "@/hooks/useFeed";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import Toast from "@/components/Toast";
import { 
  TrendingUp,
  Cpu,
  Loader2
} from "lucide-react";

export default function FeedPage() {
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
  } = useFeed(getExploreFeed);

  const observerRef = useIntersectionObserver(loadMore, [hasMore, loadingMore, loading]);

  return (
    <>
      <FeedLayout
        isSyncing={authLoading || !user}
        syncingText="SYNCING_FEED"
        headerTitle={
          <>
            EXPLORE_<span className="text-accent text-outline">FEED</span>
          </>
        }
        actionButtonText="New_Post"
        onActionClick={() => router.push("/posts/create")}
        sidebarContent={
          <>
            <div className="border border-border p-5 bg-surface/50 relative overflow-hidden w-full">
              <div className="absolute top-0 right-0 w-8 h-8 bg-accent/10 flex items-center justify-center border-b border-l border-border">
                <TrendingUp className="w-4 h-4 text-accent" />
              </div>
              <h2 className="text-[10px] font-mono font-black text-white uppercase tracking-widest mb-4">
                HOT_MODULES
              </h2>
              <div className="flex flex-col gap-4">
                {[
                  { tag: "#rust_lang", posts: "2.4k" },
                  { tag: "#nextjs_15", posts: "1.8k" },
                  { tag: "#tailwind_v4", posts: "1.2k" },
                  { tag: "#framer_motion", posts: "0.9k" },
                ].map((trend) => (
                  <div key={trend.tag} className="flex flex-col group cursor-pointer">
                    <span className="text-xs font-bold text-accent group-hover:underline">
                      {trend.tag}
                    </span>
                    <span className="text-[9px] font-mono text-text-secondary">
                      {trend.posts} SIGNALS
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <footer className="mt-auto text-[9px] font-mono text-text-secondary flex flex-wrap gap-x-4 gap-y-2 uppercase w-full">
              <span>© 2026 Tech Connect</span>
            </footer>
          </>
        }
      >
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4 bg-black">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
            <span className="text-[10px] font-mono text-accent uppercase tracking-widest">Intercepting_Signals...</span>
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
                  isLiked={post.is_liked}
                />
              ))}
            </AnimatePresence>
            
            <div ref={observerRef} className="h-20 flex items-center justify-center">
              {loadingMore && (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-accent animate-spin" />
                  <span className="text-[8px] font-mono text-accent uppercase tracking-widest">FETCHING_MORE_SIGNALS...</span>
                </div>
              )}
              {!hasMore && (
                <span className="text-[8px] font-mono text-text-secondary uppercase tracking-[0.2em]">BOTTOM_OF_SECTOR_REACHED</span>
              )}
            </div>
          </>
        ) : (
          <div className="p-20 text-center flex flex-col items-center gap-4 bg-black">
            <div className="w-12 h-12 border border-border flex items-center justify-center">
              <Cpu className="w-6 h-6 text-text-secondary" />
            </div>
            <div className="text-[10px] font-mono text-text-secondary uppercase tracking-[0.2em]">
              NO_SIGNALS_DETECTED_IN_THIS_SECTOR
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => router.push("/posts/create")}
              className="mt-2"
            >
              INITIALIZE_SIGNAL
            </Button>
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
