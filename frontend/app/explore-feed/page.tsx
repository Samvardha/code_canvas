"use client";

import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { PostCard } from "@/components/PostCard";
import { Button } from "@/components/Button";
import Toast from "@/components/Toast";
import { getExploreFeed, Post } from "@/lib/api/posts";
import { 
  PlusSquare, 
  TrendingUp,
  Cpu,
  Loader2
} from "lucide-react";

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const fetchedRef = React.useRef<string | null>(null);

  const [posts, setPosts] = React.useState<Post[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [toast, setToast] = React.useState<{ isVisible: boolean; message: string }>({
    isVisible: false,
    message: ""
  });
  const [token, setToken] = React.useState<string | null>(null);

  const showToast = (message: string) => {
    setToast({ isVisible: true, message });
  };

  const fetchPosts = React.useCallback(async (userToken: string) => {
    try {
      setLoading(true);
      const data = await getExploreFeed(userToken);
      setPosts(data.posts);
    } catch (err) {
      console.error("Failed to fetch signals:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user && fetchedRef.current !== user.uid) {
      fetchedRef.current = user.uid;
      user.getIdToken().then(t => {
        setToken(t);
        fetchPosts(t);
      });
    }
  }, [user, authLoading, router, fetchPosts]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="font-mono text-accent text-sm uppercase tracking-widest font-bold animate-pulse flex items-center gap-3">
          <div className="w-3 h-3 bg-accent rotate-45" />[ SYNCING_FEED ]
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-foreground selection:bg-accent selection:text-black font-sans relative">
      <div className="fixed inset-0 grid-bg opacity-30 pointer-events-none z-0" />
      
      <div className="relative z-10 flex flex-col md:flex-row min-h-screen max-w-[1400px] mx-auto border-x border-border bg-black/40 backdrop-blur-[2px]">
        
        <section className="flex-1 overflow-y-auto border-r border-border min-h-screen hide-scrollbar">
          <header className="sticky top-0 z-20 bg-black/80 backdrop-blur-md border-b border-border p-6 flex items-center justify-between">
            <h1 className="text-2xl font-black font-(family-name:--font-space-grotesk) uppercase text-white tracking-tight">
              MAIN_<span className="text-accent text-outline">FEED</span>
            </h1>
            <div className="flex items-center gap-4">
               <button 
                 onClick={() => router.push("/posts/create")}
                 className="group flex items-center gap-2 bg-accent/10 border border-accent/20 px-3 py-1.5 hover:bg-accent hover:text-black transition-all cursor-pointer"
               >
                 <PlusSquare className="w-3.5 h-3.5" />
                 <span className="text-[9px] font-mono font-bold uppercase tracking-widest">New_Post</span>
               </button>
            </div>
          </header>

          <div className="flex flex-col gap-px bg-border">
            {loading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4 bg-black">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
                <span className="text-[10px] font-mono text-accent uppercase tracking-widest">Intercepting_Signals...</span>
              </div>
            ) : posts.length > 0 ? (
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
                    imageUrl={post.content.media?.[0]?.url}
                    likes={post.stats.likes_count}
                    comments={post.stats.comments_count}
                    categories={post.categories}
                    collabMeta={post.collab_meta}
                    eventMeta={post.event_meta}
                  />
                ))}
              </AnimatePresence>
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
          </div>
        </section>

        <aside className="hidden lg:flex w-80 p-6 flex-col gap-8">
          <div className="border border-border p-5 bg-surface/50 relative overflow-hidden">
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
          
          <footer className="mt-auto text-[9px] font-mono text-text-secondary flex flex-wrap gap-x-4 gap-y-2 uppercase">
             <span>© 2026 Tech Connect</span>
          </footer>
        </aside>
      </div>

      <Toast 
        isVisible={toast.isVisible}
        message={toast.message}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </main>
  );
}
