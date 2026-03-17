import React from "react";
import { PlusSquare } from "lucide-react";

interface FeedLayoutProps {
  isSyncing: boolean;
  syncingText?: string;
  headerIcon?: React.ReactNode;
  headerTitle: React.ReactNode;
  actionButtonText?: string;
  onActionClick?: () => void;
  sidebarContent?: React.ReactNode;
  children: React.ReactNode;
}

export function FeedLayout({
  isSyncing,
  syncingText = "SYNCING_FEED",
  headerIcon,
  headerTitle,
  actionButtonText,
  onActionClick,
  sidebarContent,
  children,
}: FeedLayoutProps) {
  if (isSyncing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="font-mono text-accent text-sm uppercase tracking-widest font-bold animate-pulse flex items-center gap-3">
          <div className="w-3 h-3 bg-accent rotate-45" />[ {syncingText} ]
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
              {headerIcon}
              <h1 className="text-2xl font-black font-(family-name:--font-space-grotesk) uppercase text-white tracking-tight">
                {headerTitle}
              </h1>
            </div>
            {actionButtonText && onActionClick && (
              <div className="flex items-center gap-4">
                 <button 
                   onClick={onActionClick}
                   className="group flex items-center gap-2 bg-accent/10 border border-accent/20 px-3 py-1.5 hover:bg-accent hover:text-black transition-all cursor-pointer"
                 >
                   <PlusSquare className="w-3.5 h-3.5" />
                   <span className="text-[9px] font-mono font-bold uppercase tracking-widest">{actionButtonText}</span>
                 </button>
              </div>
            )}
          </header>

          <div className="flex flex-col gap-6 p-4 sm:p-6 bg-black/20">
            {children}
          </div>

        </section>

        {sidebarContent && (
          <aside className="hidden lg:flex w-80 p-6 flex-col gap-8 sticky top-0 h-screen overflow-y-auto">
            {sidebarContent}
          </aside>
        )}
      </div>
    </main>
  );
}
