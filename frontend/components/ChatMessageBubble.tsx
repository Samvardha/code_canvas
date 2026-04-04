import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Conversation, Message } from "@/lib/api/chat";
import { formatTime, formatDateSeparator } from "@/lib/utils/formatters";
import { Check, CheckCheck } from "lucide-react";

interface ChatMessageBubbleProps {
  msg: Message;
  index: number;
  array: Message[];
  currentUid: string | undefined;
  activeConversation: Conversation | null;
  onClose: () => void;
  focusedMessageId: string | null;
  setFocusedMessageId: (id: string | null) => void;
}

export default function ChatMessageBubble({
  msg,
  index,
  array,
  currentUid,
  activeConversation,
  onClose,
  focusedMessageId,
  setFocusedMessageId,
}: ChatMessageBubbleProps) {
  const isMine = msg.sender_id === currentUid;
  const followingMsg = array[index - 1];
  const isRecentInBlock = !followingMsg || followingMsg.sender_id !== msg.sender_id;

  const previousMsg = array[index + 1];
  const isStartOfBlock = !previousMsg || previousMsg.sender_id !== msg.sender_id;

  const olderMsg = array[index + 1];
  const isFirstOfDailyBlock =
    !olderMsg ||
    new Date(msg.created_at).toDateString() !== new Date(olderMsg.created_at).toDateString();

  const bubbleStyle = isMine ? "bg-accent text-black" : "bg-[#181818] text-white";

  return (
    <div key={(msg as any).client_id || msg.id}>
      {isFirstOfDailyBlock && (
        <div className="flex items-center gap-4 my-8 opacity-40 px-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[9px] font-mono uppercase tracking-widest whitespace-nowrap">
            {formatDateSeparator(msg.created_at)}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
      )}
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.98, y: isMine ? 5 : -5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 35, mass: 0.5 }}
        className={`flex items-end gap-4 ${isMine ? "flex-row-reverse" : "flex-row"} ${isRecentInBlock ? "mb-6" : "mb-1"}`}
      >
        {isRecentInBlock && !isMine ? (
          <Link
            href={`/profile/${activeConversation?.participant_profiles?.[msg.sender_id]?.username || msg.sender_id}`}
            onClick={onClose}
            className="w-8 h-8 shrink-0 border border-border bg-surface flex items-center justify-center overflow-hidden"
          >
            {activeConversation?.participant_profiles?.[msg.sender_id]?.avatar_url ? (
              <img
                src={activeConversation.participant_profiles[msg.sender_id].avatar_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[7px] font-mono font-bold text-accent">
                {(
                  activeConversation?.participant_profiles?.[msg.sender_id]?.name || "U"
                )
                  .substring(0, 1)
                  .toUpperCase()}
              </span>
            )}
          </Link>
        ) : (
          !isMine && <div className="w-8 shrink-0" />
        )}

        <div className="flex flex-col max-w-[70%] justify-center">
          <div
            onClick={() =>
              !isRecentInBlock &&
              setFocusedMessageId(focusedMessageId === msg.id ? null : msg.id)
            }
            className={`relative px-4 py-2 mb-1 ${!isRecentInBlock ? "cursor-pointer select-none" : ""} ${bubbleStyle}`}
          >
            <p className="relative z-10 text-[13px] font-medium leading-relaxed wrap-break-word">
              {msg.content.text}
            </p>
            {isRecentInBlock && (
              <div
                className={`absolute bottom-0 w-5 h-5 ${isMine ? "-right-2 bg-accent" : "-left-2 bg-[#181818]"}`}
                style={{
                  clipPath: isMine
                    ? "polygon(0 0, 0% 100%, 100% 100%)"
                    : "polygon(100% 0, 0 100%, 100% 100%)",
                }}
              />
            )}
          </div>
          <AnimatePresence>
            {(isRecentInBlock || focusedMessageId === msg.id) && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 4 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className={`text-[8px] font-mono uppercase tracking-widest overflow-hidden ${
                  isMine
                    ? "text-text-secondary/50 place-self-end text-right"
                    : "text-text-secondary/70 place-self-start text-left"
                }`}
              >
                <div className={`flex items-center gap-1.5 ${isMine ? "justify-end" : "justify-start"}`}>
                  {formatTime(msg.created_at)}
                  {isMine && (
                    <div className="flex items-center">
                      {msg.status === "seen" ? (
                        <CheckCheck className="w-[10px] h-[10px] text-accent opacity-90" />
                      ) : (
                        <Check className="w-[10px] h-[10px] text-text-secondary opacity-40 ml-0.5" />
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
