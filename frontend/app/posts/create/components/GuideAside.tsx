"use client";

import React from "react";
import { Info } from "lucide-react";

interface GuideAsideProps {
  editId: string | null;
}

export const GuideAside = ({ editId }: GuideAsideProps) => {
  return (
    <aside className="hidden lg:flex w-80 p-6 flex-col gap-8">
      <div className="border border-border p-5 bg-surface/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-8 h-8 bg-accent/10 flex items-center justify-center border-b border-l border-border">
          <Info className="w-4 h-4 text-accent" />
        </div>
        <h2 className="text-[11px] font-mono font-black text-white uppercase tracking-widest mb-4">
          {editId ? "UPDATE_GUIDE" : "BROADCAST_GUIDE"}
        </h2>
        <div className="space-y-4 text-[11px] font-mono text-text-secondary uppercase leading-relaxed">
          <p>&gt; CHOOSE_CATEGORY_FOR_BETTER_REACH</p>
          <p>&gt; ATTACH_MEDIA_TO_INCREASE_ENGAGEMENT</p>
          <p>&gt; COLLABS_ALLOW_TEAM_BUILDING</p>
          <p>&gt; EVENTS_SYNC_COMMUNITIES</p>
        </div>
      </div>
    </aside>
  );
};
