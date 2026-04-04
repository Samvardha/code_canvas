"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getPost, Post } from "@/lib/api/posts";
import { PostCard } from "@/components/PostCard";
import { PostCardSkeleton } from "@/components/PostCardSkeleton";
import { FeedLayout } from "@/components/FeedLayout";
import { Loader2, AlertCircle, ArrowLeft, TrendingUp } from "lucide-react";
import Toast from "@/components/Toast";
import { Button } from "@/components/Button";

export default function SinglePostPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorToast, setErrorToast] = useState({ isVisible: false, message: "" });
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    async function fetchSinglePost() {
      if (!user) return;
      try {
        setLoading(true);
        const t = await user.getIdToken();
        setToken(t);
        const data = await getPost(params.id as string, t);
        setPost(data);
      } catch (err: any) {
        console.error("Failed to fetch post:", err);
        setErrorToast({ isVisible: true, message: err.message || "FAILED TO ACQUIRE SIGNAL" });
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading && user) {
      fetchSinglePost();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading, params.id]);

  const handleDelete = () => {
    // Navigate away if the currently viewed isolated post is deleted
    router.push("/explore-feed");
  };

  return (
    <>
      <FeedLayout
        isSyncing={authLoading || loading}
        syncingText="LOCATING_SIGNAL"
        headerTitle={
          <div className="flex items-center">
            <span className="text-xl font-black font-(family-name:--font-space-grotesk) tracking-tight">
              ISOLATED_<span className="text-accent text-outline">POST</span>
            </span>
          </div>
        }
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
        {loading || authLoading ? (
          <div className="pt-0">
            <PostCardSkeleton />
          </div>
        ) : post ? (
          <div className="pt-0">
            <PostCard 
              postId={post._id}
              authorId={post.author_id}
              currentUserId={user?.uid}
              token={token}
              onDelete={handleDelete}
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
          </div>
        ) : (
          <div className="p-20 text-center flex flex-col items-center gap-4 bg-black min-h-[50vh]">
            <div className="w-12 h-12 border border-border flex items-center justify-center bg-surface">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <div className="text-[10px] font-mono text-text-secondary uppercase tracking-[0.2em]">
              SIGNAL_LOST_OR_DESTROYED
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => router.push("/explore-feed")}
              className="mt-2"
            >
              RETURN_TO_NETWORK
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
