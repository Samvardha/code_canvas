"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  X,
  ArrowLeft,
  Send,
  Loader2,
} from "lucide-react";
import { useChatDrawer } from "@/hooks/useChatDrawer";
import ConversationListItem from "./ConversationListItem";
import ChatMessageBubble from "./ChatMessageBubble";

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  openWithUserId?: string | null;
  onSelectUser: (uid: string) => void;
  onBackToList: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export default function ChatDrawer({
  isOpen,
  onClose,
  openWithUserId,
  onSelectUser,
  onBackToList,
  onUnreadCountChange,
}: ChatDrawerProps) {
  const {
    view,
    conversations,
    loadingConversations,
    nextConvCursor,
    fetchConversations,
    activeConversation,
    messages,
    loadingMessages,
    nextMsgCursor,
    loadingOlderMessages,
    loadOlderMessages,
    messageText,
    sending,
    isTyping,
    focusedMessageId,
    setFocusedMessageId,
    sendMessage,
    handleTyping,
    messagesEndRef,
    messagesContainerRef,
    inputRef,
    getOtherUid,
    openConversation,
    currentUid,
  } = useChatDrawer({
    isOpen,
    openWithUserId,
    onSelectUser,
    onUnreadCountChange,
  });

  // ── Scroll Lock ───────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // ── Messages scroll handler ────────────────────────────────

  const handleMessagesScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtTop = Math.abs(scrollTop) + clientHeight >= scrollHeight - 50;

    if (isAtTop && nextMsgCursor && !loadingOlderMessages) {
      loadOlderMessages();
    }
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-60"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[620px] bg-background border-l border-border z-61 flex flex-col"
          >
            {/* Header */}
            <div className="h-16 border-b border-border bg-surface/50 flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-3">
                {view === "chat" && (
                  <button
                    onClick={() => {
                      onBackToList();
                    }}
                    className="p-1.5 hover:bg-white/5 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 text-text-secondary" />
                  </button>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-[18px] font-mono font-bold uppercase tracking-[0.15em] text-white truncate max-w-[300px]">
                    {view === "list"
                      ? "MESSAGES"
                      : (() => {
                          const uid = openWithUserId;
                          if (!uid) return "CHAT";
                          const existingConv = conversations.find(c => getOtherUid(c) === uid);
                          const profile = existingConv?.participant_profiles?.[uid] || activeConversation?.participant_profiles?.[uid];
                          return profile?.name || "CHAT";
                        })()}
                  </span>
                  {view === "list" && !loadingConversations && (
                    <span className="text-[10px] font-mono font-black bg-accent text-black px-1.5 py-0.5 min-w-6 text-center">
                      {conversations.length}
                    </span>
                  )}
                </div>


              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4 text-text-secondary" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <AnimatePresence mode="wait">
                {view === "list" ? (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex-1 overflow-y-auto"
                  >
                    {loadingConversations ? (
                      <div className="flex items-center justify-center h-40">
                        <Loader2 className="w-5 h-5 text-accent animate-spin" />
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-60 gap-4 px-6">
                        <div className="w-16 h-16 border border-border bg-surface flex items-center justify-center">
                          <MessageSquare className="w-6 h-6 text-text-secondary" />
                        </div>
                        <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest text-center">
                          NO ACTIVE TRANSMISSIONS
                        </p>
                        <p className="text-[9px] font-mono text-text-secondary/60 text-center">
                          START A CHAT FROM A PEER&apos;S PROFILE
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {conversations.map((conv) => (
                          <ConversationListItem
                            key={conv.id}
                            conv={conv}
                            getOtherUid={getOtherUid}
                            openConversation={openConversation}
                            onClose={onClose}
                          />
                        ))}

                        {nextConvCursor && (
                          <button
                            onClick={() => fetchConversations(false)}
                            className="w-full p-3 text-[9px] font-mono text-accent uppercase tracking-widest hover:bg-white/5 transition-colors"
                          >
                            LOAD MORE
                          </button>
                        )}
                      </div>
                    )}


                  </motion.div>
                ) : (
                  <motion.div
                    key="chat"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex-1 flex flex-col overflow-hidden"
                  >
                    {/* Messages area */}
                    <div
                      ref={messagesContainerRef}
                      onScroll={handleMessagesScroll}
                      className="flex-1 overflow-y-auto p-4 flex flex-col-reverse gap-3"
                    >
                      {/* Typing Indicator */}
                      <AnimatePresence>
                        {activeConversation &&
                          isTyping[activeConversation.id] && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.9 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.9 }}
                              transition={{
                                type: "spring",
                                stiffness: 400,
                                damping: 30,
                              }}
                              className="flex items-center gap-2 bg-surface/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/50 self-start mb-2 pointer-events-none"
                            >
                              <div className="flex gap-1 mr-1">
                                <span className="w-1 h-1 bg-accent rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1 h-1 bg-accent rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1 h-1 bg-accent rounded-full animate-bounce"></span>
                              </div>
                              <span className="text-[10px] font-mono text-text-primary uppercase tracking-wider font-medium">
                                {activeConversation.participant_profiles?.[
                                  getOtherUid(activeConversation)
                                ]?.name?.split(" ")[0] || "Partner"}
                                {" "}<span className="text-text-secondary font-normal lowercase opacity-70">typing...</span>
                              </span>
                            </motion.div>

                          )}
                      </AnimatePresence>
                      {/* Anchor at top of code (bottom of chat) */}
                      <div ref={messagesEndRef} />

                      {loadingMessages ? (
                        <div className="flex items-center justify-center h-40">
                          <Loader2 className="w-5 h-5 text-accent animate-spin" />
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-2">
                          <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                            START THE CONVERSATION
                          </p>
                          <p className="text-[9px] font-mono text-text-secondary/60">
                            SEND A MESSAGE BELOW
                          </p>
                        </div>
                      ) : (
                        <AnimatePresence initial={false}>
                          {[...messages].reverse().map((msg, index, array) => (
                            <ChatMessageBubble
                              key={(msg as any).client_id || msg.id}
                              msg={msg}
                              index={index}
                              array={array}
                              currentUid={currentUid}
                              activeConversation={activeConversation}
                              onClose={onClose}
                              focusedMessageId={focusedMessageId}
                              setFocusedMessageId={setFocusedMessageId}
                            />
                          ))}
                        </AnimatePresence>
                      )}

                      {/* Pagination at the end of code (top of chat) */}
                      {nextMsgCursor && !loadingOlderMessages && (
                        <button
                          onClick={loadOlderMessages}
                          className="w-full text-[9px] font-mono text-text-secondary uppercase tracking-widest hover:text-accent transition-colors py-2"
                        >
                          ↑ LOAD OLDER MESSAGES
                        </button>
                      )}

                      {loadingOlderMessages && (
                        <div className="flex justify-center py-2">
                          <Loader2 className="w-4 h-4 text-accent animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Input */}
                    <div className="border-t border-border bg-surface/50 p-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <input
                          ref={inputRef}
                          type="text"
                          value={messageText}
                          onChange={(e) => handleTyping(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              sendMessage();
                            }
                          }}
                          placeholder="Type a message..."
                          className="flex-1 bg-background border border-border px-4 py-2.5 text-xs font-mono text-white placeholder:text-text-secondary/50 focus:outline-none focus:border-accent/50 transition-colors"
                        />
                        <button
                          onClick={sendMessage}
                          disabled={!messageText.trim() || sending}
                          className="p-2.5 bg-accent text-black hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          {sending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}