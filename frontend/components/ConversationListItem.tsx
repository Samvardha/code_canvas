import React from "react";
import Link from "next/link";
import { Conversation } from "@/lib/api/chat";
import { formatRelativeTime, truncate } from "@/lib/utils/formatters";

interface ConversationListItemProps {
  conv: Conversation;
  getOtherUid: (conv: Conversation) => string;
  openConversation: (conv: Conversation) => void;
  onClose: () => void;
}

export default function ConversationListItem({
  conv,
  getOtherUid,
  openConversation,
  onClose,
}: ConversationListItemProps) {
  const otherUid = getOtherUid(conv);
  const hasUnread = (conv.unread_count || 0) > 0;

  return (
    <button
      onClick={() => openConversation(conv)}
      className="w-full flex items-center gap-3 p-4 hover:bg-white/10 transition-colors text-left group cursor-pointer"
    >
      <Link
        href={`/profile/${conv.participant_profiles?.[otherUid]?.username || otherUid}`}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="w-10 h-10 shrink-0 border border-border bg-surface flex items-center justify-center overflow-hidden"
      >
        {conv.participant_profiles?.[otherUid]?.avatar_url ? (
          <img
            src={conv.participant_profiles[otherUid].avatar_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-[10px] font-mono font-bold text-accent">
            {conv.participant_profiles?.[otherUid]?.name
              ?.substring(0, 2)
              .toUpperCase() || otherUid.substring(0, 2).toUpperCase()}
          </span>
        )}
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-tight truncate group-hover:text-accent transition-colors">
            {conv.participant_profiles?.[otherUid]?.name ||
              `${otherUid.substring(0, 12)}...`}
          </span>
          {conv.last_message && (
            <span className="text-[9px] font-mono text-text-secondary shrink-0 ml-2">
              {formatRelativeTime(conv.last_message.created_at)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] font-mono text-text-secondary truncate">
            {conv.last_message
              ? truncate(conv.last_message.text, 40)
              : "NO MESSAGES YET"}
          </span>
          {hasUnread && (
            <span className="ml-2 shrink-0 w-5 h-5 bg-accent text-black text-[9px] font-mono font-bold flex items-center justify-center">
              {conv.unread_count > 9 ? "9+" : conv.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
