"use client";

import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { PostCard } from "@/components/PostCard";
import { getEventsFeed, Post } from "@/lib/api/posts";
import { 
  PlusSquare, 
  Loader2,
  Calendar
} from "lucide-react";

export default function EventsFeedPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const fetchedRef = React.useRef<string | null>(null);

  const [posts, setPosts] = React.useState<Post[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [token, setToken] = React.useState<string | null>(null);

  const fetchPosts = React.useCallback(async (userToken: string) => {
    try {
      setLoading(true);
      const data = await getEventsFeed(userToken);
      setPosts(data.posts);
    } catch (err) {
      console.error("Failed to fetch event signals:", err);
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
          <div className="w-3 h-3 bg-accent rotate-45" />[ SYNCING_EVENTS ]
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
            <div className="flex items-center gap-4">
              <Calendar className="w-6 h-6 text-accent" />
              <h1 className="text-2xl font-black font-(family-name:--font-space-grotesk) uppercase text-white tracking-tight">
                EVENT_<span className="text-accent text-outline">FEED</span>
              </h1>
            </div>
            <div className="flex items-center gap-4">
               <button 
                 onClick={() => router.push("/posts/create")}
                 className="group flex items-center gap-2 bg-accent/10 border border-accent/20 px-3 py-1.5 hover:bg-accent hover:text-black transition-all cursor-pointer"
               >
                 <PlusSquare className="w-3.5 h-3.5" />
                 <span className="text-[9px] font-mono font-bold uppercase tracking-widest">New_Event</span>
               </button>
            </div>
          </header>

          <div className="flex flex-col gap-px bg-border">
            {loading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4 bg-black">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
                <span className="text-[10px] font-mono text-accent uppercase tracking-widest">Intercepting_Events...</span>
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
              <div className="p-20 text-center bg-black">
                <p className="text-text-secondary font-mono text-sm uppercase tracking-widest italic animate-pulse">
                  [ NO_EVENT_SIGNALS_FOUND_IN_THIS_SECTOR ]
                </p>
              </div>
            )}
          </div>
        </section>

        <aside className="w-full md:w-80 p-6 hidden xl:block sticky top-20 h-[calc(100vh-80px)] overflow-y-auto">
          <div className="space-y-8">
            <div className="p-6 border border-border bg-white/3 space-y-4">
              <h3 className="text-[10px] font-mono font-black text-accent uppercase tracking-[0.2em]">Sector_Intel</h3>
              <p className="text-xs text-text-secondary leading-relaxed font-mono italic">
                {">"} Real-world and digital summits. Connect with the community through shared experiences.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
