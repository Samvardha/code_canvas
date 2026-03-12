"use client";

import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { PostCard } from "@/components/PostCard";
import { Button } from "@/components/Button";
import { 
  PlusSquare, 
  Sparkles,
  TrendingUp,
  Cpu
} from "lucide-react";

// Dummy data for the feed
const DUMMY_POSTS = [
  {
    id: 1,
    username: "Alex Rivers",
    userHandle: "arivers_dev",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&h=200&auto=format&fit=crop",
    timestamp: "2H AGO",
    date: "MAR 12, 2026",
    content: "Just finalized the neural network architecture for the new autonomous coding assistant. The latency drop is incredible! Can't wait to ship this to production next week. #AI #Refactoring",
    imageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop",
    likes: 124,
    comments: 18,
  },
  {
    id: 2,
    username: "Sarah Chen",
    userHandle: "schen_codes",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&h=200&auto=format&fit=crop",
    timestamp: "5H AGO",
    date: "MAR 12, 2026",
    content: "Finally switched to Neovim. My productivity has either tripled or I've spent 6 hours configuring plugins. No in-between. Send help (and themes).",
    likes: 89,
    comments: 42,
  },
  {
    id: 3,
    username: "Marcus 'Zero' Thorne",
    userHandle: "mthorne_zero",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&h=200&auto=format&fit=crop",
    timestamp: "1D AGO",
    date: "MAR 11, 2026",
    content: "Building a distributed compiled language using Rust and WASM. The type safety is making my brain feel structured for the first time in years. 🦀⚡",
    imageUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc51?q=80&w=1200&auto=format&fit=crop",
    likes: 256,
    comments: 31,
  },
  {
    id: 4,
    username: "Elena Volkov",
    userHandle: "evolkov_sys",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&h=200&auto=format&fit=crop",
    timestamp: "1D AGO",
    date: "MAR 11, 2026",
    content: "Why do we always find the bug 5 minutes after the presentation? Murphy's law for developers is real. Re-deploying fixing the memory leak now.",
    likes: 142,
    comments: 12,
  },
];

export default function FeedPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirection if not logged in
  React.useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
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
      {/* Background Grid */}
      <div className="fixed inset-0 grid-bg opacity-30 pointer-events-none z-0" />
      
      {/* Main Layout */}
      <div className="relative z-10 flex flex-col md:flex-row min-h-screen max-w-[1400px] mx-auto border-x border-border bg-black/40 backdrop-blur-[2px]">
        
        {/* Center Content - Feed */}
        <section className="flex-1 overflow-y-auto border-r border-border min-h-screen hide-scrollbar">
          {/* Header */}
          <header className="sticky top-0 z-20 bg-black/80 backdrop-blur-md border-b border-border p-6 flex items-center justify-between">
            <h1 className="text-2xl font-black font-(family-name:--font-space-grotesk) uppercase text-white tracking-tight">
              MAIN_<span className="text-accent text-outline">FEED</span>
            </h1>
            <div className="flex items-center gap-4">
               <button className="text-text-secondary hover:text-white transition-colors cursor-pointer">
                 <PlusSquare className="w-6 h-6" />
               </button>
            </div>
          </header>

          {/* Post Composer Placeholder */}
          <div className="p-6 border-b border-border bg-surface/30">
            <div className="flex gap-4">
              <div className="w-10 h-10 border border-border bg-background shrink-0" />
              <div className="flex-1 flex flex-col gap-4">
                <textarea 
                  placeholder="INITIALIZE_POST_CONTENT..."
                  className="w-full bg-transparent border-none text-sm font-mono focus:ring-0 resize-none min-h-[60px] text-white placeholder:text-border outline-none"
                />
                <div className="flex justify-between items-center pt-2 border-t border-border/50">
                  <div className="flex gap-2 text-text-secondary">
                    <Sparkles className="w-4 h-4 cursor-pointer hover:text-accent transition-colors" />
                    <Cpu className="w-4 h-4 cursor-pointer hover:text-accent transition-colors" />
                  </div>
                  <Button size="sm" className="h-8 px-4 text-[10px]">
                    BROADCAST
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Posts List */}
          <div className="flex flex-col gap-px bg-border">
            <AnimatePresence initial={false}>
              {DUMMY_POSTS.map((post) => (
                <PostCard key={post.id} {...post} />
              ))}
            </AnimatePresence>
          </div>
          
          <div className="p-12 text-center text-[10px] font-mono text-text-secondary uppercase tracking-[0.3em] font-bold animate-pulse">
            [ END_OF_TRANSMISSION ]
          </div>
        </section>

        {/* Right Sidebar - Trends/Suggestions */}
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

          <div className="border border-border p-5 bg-surface/50">
             <h2 className="text-[10px] font-mono font-black text-white uppercase tracking-widest mb-4">
               CORE_COLLABORATORS
             </h2>
             <div className="flex flex-col gap-4">
                {[
                  { name: "Jordan Peak", handle: "jpeaker", role: "Kernel Dev" },
                  { name: "Lila Nova", handle: "lnova", role: "UI/UX Architect" },
                  { name: "Dexter Morgan", handle: "dex_debug", role: "Security Ops" },
                ].map((user) => (
                  <div key={user.handle} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 border border-border bg-background" />
                       <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-white uppercase leading-none mb-1">
                            {user.name}
                          </span>
                          <span className="text-[8px] font-mono text-text-secondary">
                             {user.role}
                          </span>
                       </div>
                    </div>
                    <button className="text-[9px] font-mono font-bold text-accent hover:text-white transition-colors cursor-pointer">
                       [ CONNECT ]
                    </button>
                  </div>
                ))}
             </div>
          </div>
          
          <footer className="mt-auto text-[9px] font-mono text-text-secondary flex flex-wrap gap-x-4 gap-y-2 uppercase">
             <span>© 2026 C—Canvas</span>
             <a href="#" className="hover:text-white transition-colors">Privacy</a>
             <a href="#" className="hover:text-white transition-colors">Terms</a>
             <a href="#" className="hover:text-white transition-colors">Nodes</a>
          </footer>
        </aside>

      </div>
    </main>
  );
}
