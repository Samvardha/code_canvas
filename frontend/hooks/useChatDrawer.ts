import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/hooks/useSocket";
import {
  getConversations,
  getMessages,
  startOrGetConversation,
  Conversation,
  Message,
} from "@/lib/api/chat";

export type ChatView = "list" | "chat";

export interface UseChatDrawerProps {
  isOpen: boolean;
  openWithUserId?: string | null;
  onSelectUser: (uid: string) => void;
  onUnreadCountChange?: (count: number) => void;
}

export function useChatDrawer({
  isOpen,
  openWithUserId,
  onSelectUser,
  onUnreadCountChange,
}: UseChatDrawerProps) {
  const { user, userProfile } = useAuth();
  const { socketRef, getSocket } = useSocket();
  const currentUid = userProfile?._id;

  // ── State ─────────────────────────────────────────────────
  const [view, setView] = useState<ChatView>("list");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [nextConvCursor, setNextConvCursor] = useState<string | null>(null);

  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [nextMsgCursor, setNextMsgCursor] = useState<string | null>(null);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);

  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState<Record<string, boolean>>({});
  const [focusedMessageId, setFocusedMessageId] = useState<string | null>(null);
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasLoadedRef = useRef(false);
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const activeConvIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeConvIdRef.current = activeConversation?.id || null;
  }, [activeConversation]);

  // ── Connect socket eagerly when drawer opens ───────────────
  useEffect(() => {
    if (!user) return;

    const connectAndListen = async () => {
      const socket = await getSocket();
      if (!socket) {
        console.warn("[ChatDrawer] Could not connect Socket.IO");
        return;
      }
      socketRef.current = socket;

      socket.off("new_message");
      socket.off("user_typing");

      socket.on("new_message", (msg: Message) => {
        const currentActiveConvId = activeConvIdRef.current;

        if (currentActiveConvId && msg.conversation_id === currentActiveConvId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;

            const optimisticIndex = prev.findIndex(
              (m) =>
                m.id.startsWith("temp-") &&
                m.sender_id === msg.sender_id &&
                m.content.text === msg.content.text
            );

            if (optimisticIndex !== -1) {
              const updated = [...prev];
              updated[optimisticIndex] = { ...msg, client_id: (prev[optimisticIndex] as any).client_id || prev[optimisticIndex].id } as any;
              return updated;
            }

            return [...prev, msg];
          });
          if (isOpenRef.current) {
            socket.emit("mark_as_read", {
              conversationId: currentActiveConvId,
            });
          }
        }

        setConversations((prev) => {
          const exists = prev.some((c) => c.id === msg.conversation_id);
          if (!exists) {
            fetchConversations(true);
            return prev;
          }

          const updated = prev.map((c) => {
            if (c.id === msg.conversation_id) {
              return {
                ...c,
                last_message: {
                  text: msg.content.text,
                  sender_id: msg.sender_id,
                  created_at: msg.created_at,
                },
                updated_at: msg.created_at,
                unread_count:
                  currentActiveConvId === msg.conversation_id && isOpenRef.current
                    ? 0
                    : c.unread_count + (msg.sender_id !== currentUid ? 1 : 0),
              };
            }
            return c;
          });
          return updated.sort(
            (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
        });
      });

      socket.on(
        "user_typing",
        (data: { conversation_id: string; user_id: string; is_typing: boolean }) => {
          const currentActiveConvId = activeConvIdRef.current;
          if (currentActiveConvId === data.conversation_id && data.user_id !== currentUid) {
            setIsTyping((prev) => ({
              ...prev,
              [data.conversation_id]: data.is_typing,
            }));
          }
        }
      );
    };

    connectAndListen();

    return () => {
      const sock = socketRef.current;
      if (sock) {
        sock.off("new_message");
        sock.off("user_typing");
      }
    };
  }, [user, currentUid, getSocket, socketRef]);

  // Sync total unread count to parent
  useEffect(() => {
    if (onUnreadCountChange) {
      const total = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
      onUnreadCountChange(total);
    }
  }, [conversations, onUnreadCountChange]);

  // ── Fetch conversations ──────────────────────────────────
  const fetchConversations = useCallback(
    async (reset = true) => {
      if (!user) return;
      if (reset) setLoadingConversations(true);

      try {
        const token = await user.getIdToken();
        const data = await getConversations(
          token,
          reset ? undefined : nextConvCursor || undefined,
          10
        );
        if (reset) {
          setConversations(data.conversations);
        } else {
          setConversations((prev) => [...prev, ...data.conversations]);
        }
        setNextConvCursor(data.next_cursor);
      } catch (err) {
        console.error("Failed to fetch conversations:", err);
      } finally {
        setLoadingConversations(false);
      }
    },
    [user, nextConvCursor]
  );

  // ── Get other participant uid ──────────────────────────────
  const getOtherUid = useCallback((conv: Conversation) => {
    return conv.participants.find((p) => p !== currentUid) || "";
  }, [currentUid]);

  // ── Open conversation ─────────────────────────────────────
  const openConversation = useCallback(
    (conv: Conversation) => {
      onSelectUser(getOtherUid(conv));
    },
    [onSelectUser, getOtherUid]
  );

  // ── Open conversation by target UID ────────────────────────
  const currentTargetUidRef = useRef(openWithUserId);
  useEffect(() => {
    currentTargetUidRef.current = openWithUserId;
  }, [openWithUserId]);

  const openConversationByUid = useCallback(
    async (targetUid: string) => {
      if (!user) return;

      const otherUid = activeConversation?.participants?.find(p => p !== currentUid);
      if (activeConversation && otherUid === targetUid && view === "chat") {
        return;
      }

      const existingConv = conversations.find(c => getOtherUid(c) === targetUid);
      if (existingConv) {
        setActiveConversation(existingConv);
        setView("chat");
        setLoadingMessages(true);
        try {
          const token = await user.getIdToken();
          const data = await getMessages(existingConv.id, token, undefined, 20);
          
          if (currentTargetUidRef.current !== targetUid) return;
          
          setMessages(data.messages.reverse());
          setNextMsgCursor(data.next_cursor);
          const socket = await getSocket();
          if (socket) socket.emit("mark_as_read", { conversationId: existingConv.id });
          setConversations(prev => prev.map(c => c.id === existingConv.id ? { ...c, unread_count: 0 } : c));
        } finally {
          if (currentTargetUidRef.current === targetUid) setLoadingMessages(false);
        }
        return;
      }

      try {
        setView("chat");
        setLoadingMessages(true);
        const token = await user.getIdToken();
        const { conversation } = await startOrGetConversation(targetUid, token);

        const data = await getMessages(conversation.id, token, undefined, 20);
        
        if (currentTargetUidRef.current !== targetUid) return;
        
        setActiveConversation(conversation);
        setMessages(data.messages.reverse());
        setNextMsgCursor(data.next_cursor);

        const socket = await getSocket();
        if (socket) {
          socket.emit("mark_as_read", { conversationId: conversation.id });
        }

        setConversations((prev) => {
          const exists = prev.some((c) => c.id === conversation.id);
          if (exists) {
            return prev.map((c) =>
              c.id === conversation.id ? { ...c, unread_count: 0 } : c
            );
          }
          return [{ ...conversation, unread_count: 0 }, ...prev];
        });
      } catch (err) {
        if (currentTargetUidRef.current === targetUid) {
          console.error("Failed to open conversation:", err);
          setView("list");
        }
      } finally {
        if (currentTargetUidRef.current === targetUid) {
          setLoadingMessages(false);
        }
      }
    },
    [user, getSocket, activeConversation, view, currentUid, conversations, getOtherUid]
  );

  // ── Load older messages ────────────────────────────────────
  const loadOlderMessages = useCallback(async () => {
    if (!activeConversation || !user || !nextMsgCursor || loadingOlderMessages) return;

    setLoadingOlderMessages(true);
    try {
      const token = await user.getIdToken();
      const data = await getMessages(
        activeConversation.id,
        token,
        nextMsgCursor,
        20
      );
      setMessages((prev) => [...data.messages.reverse(), ...prev]);
      setNextMsgCursor(data.next_cursor);
    } catch (err) {
      console.error("Failed to load older messages:", err);
    } finally {
      setLoadingOlderMessages(false);
    }
  }, [activeConversation, user, nextMsgCursor, loadingOlderMessages]);

  const sendMessage = useCallback(async () => {
    if (!messageText.trim() || !activeConversation || sending) return;

    setSending(true);
    const text = messageText.trim();
    setMessageText("");

    if (typingTimeoutRef.current[activeConversation.id]) {
      clearTimeout(typingTimeoutRef.current[activeConversation.id]);
    }
    const socket = await getSocket();
    if (socket) {
      socket.emit("typing", {
        conversationId: activeConversation.id,
        isTyping: false,
      });
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      conversation_id: activeConversation.id,
      sender_id: currentUid || "",
      content: { text },
      status: "sent",
      created_at: new Date().toISOString(),
    };
    (optimisticMsg as any).client_id = tempId;
    
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      if (socket) {
        setConversations((prev) => {
          return prev.map((c) => {
            if (c.id === activeConversation.id) {
              return {
                ...c,
                last_message: {
                  text,
                  sender_id: currentUid || "",
                  created_at: optimisticMsg.created_at,
                },
                updated_at: optimisticMsg.created_at,
              };
            }
            return c;
          }).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        });

        socket.emit("send_message", {
          conversationId: activeConversation.id,
          text,
          clientMessageId: optimisticMsg.id,
        }, (response: any) => {
          if (response.status === "ok") {
            setMessages((prev) => {
              const exists = prev.some((m) => m.id === response.message.id);
              if (exists) {
                return prev.filter((m) => m.id !== response.clientMessageId);
              }
              return prev.map((m) =>
                m.id === response.clientMessageId ? { ...response.message, client_id: (m as any).client_id || m.id } : m
              );
            });
          } else {
            console.error("[ChatDrawer] send_message failed:", response.message);
            setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
            setMessageText(text);
          }
        });
      } else {
        console.error("[ChatDrawer] Socket not connected, message not sent");
        setMessageText(text);
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setMessageText(text);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
    } finally {
      setSending(false);
    }
  }, [messageText, activeConversation, sending, getSocket, currentUid]);

  const handleTyping = useCallback(
    async (text: string) => {
      setMessageText(text);
      if (!activeConversation) return;

      const socket = await getSocket();
      if (!socket) return;

      socket.emit("typing", {
        conversationId: activeConversation.id,
        isTyping: true,
      });

      if (typingTimeoutRef.current[activeConversation.id]) {
        clearTimeout(typingTimeoutRef.current[activeConversation.id]);
      }

      typingTimeoutRef.current[activeConversation.id] = setTimeout(() => {
        socket.emit("typing", {
          conversationId: activeConversation.id,
          isTyping: false,
        });
      }, 2000);
    },
    [activeConversation, getSocket]
  );

  const scrollToBottom = useCallback((instant = false) => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      if (instant) {
        container.scrollTop = 0; 
      } else {
        container.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }, []);

  const lastMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (messages.length > 0) {
      const latestMsg = messages[messages.length - 1];
      if (latestMsg.id !== lastMessageIdRef.current) {
        lastMessageIdRef.current = latestMsg.id;
        scrollToBottom(false);
      }
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (user && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      fetchConversations(true);
    }
  }, [user, fetchConversations]);

  useEffect(() => {
    if (isOpen) {
      if (openWithUserId) {
        const currentOtherUid = activeConversation?.participants?.find(p => p !== currentUid);
        if (!loadingMessages && (!activeConversation || currentOtherUid !== openWithUserId || view !== "chat")) {
          openConversationByUid(openWithUserId);
        }
      } else {
        if (view !== "list") {
          setView("list");
          setActiveConversation(null);
        }
      }
    }
  }, [isOpen, openWithUserId, openConversationByUid, activeConversation, currentUid, view, loadingMessages]);

  useEffect(() => {
    if (view === "chat" && !loadingMessages) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [view, loadingMessages]);

  return {
    view, setView,
    conversations, loadingConversations, nextConvCursor, fetchConversations,
    activeConversation, setActiveConversation,
    messages, loadingMessages, nextMsgCursor, loadingOlderMessages, loadOlderMessages,
    messageText, setMessageText, sending,
    isTyping, focusedMessageId, setFocusedMessageId,
    sendMessage, handleTyping,
    messagesEndRef, messagesContainerRef, inputRef,
    getOtherUid, openConversation, scrollToBottom, currentUid
  };
}
