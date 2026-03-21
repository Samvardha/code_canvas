"use client"

import { MessageSquare } from "lucide-react";

export default function ChatBadge({
  onClick,
  unreadCount,
}: {
  onClick: () => void;
  unreadCount: number;
}) {
  return (
    <button
      onClick={onClick}
      className="relative p-2 hover:bg-white/5 transition-colors group cursor-pointer"
      title="Messages"
    >
      <MessageSquare className="w-5 h-5 text-text-secondary group-hover:text-accent transition-colors" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-accent text-black text-[8px] font-mono font-bold flex items-center justify-center">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
