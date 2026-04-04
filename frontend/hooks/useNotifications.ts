"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/hooks/useSocket";
import {
  Notification,
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/api/notifications";

export function useNotifications() {
  const { user } = useAuth();
  const { getSocket } = useSocket();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const socketListenerAttached = useRef(false);

  // ── Fetch unread count ──────────────────────────────────────
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const data = await getUnreadCount(token);
      setUnreadCount(data.unread_count);
    } catch (err) {
      console.error("[Notifications] Failed to fetch unread count:", err);
    }
  }, [user]);

  // ── Fetch notifications (initial) ──────────────────────────
  const fetchNotifications = useCallback(
    async (reset: boolean = true) => {
      if (!user) return;

      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const token = await user.getIdToken();
        const cursor = reset ? undefined : nextCursor || undefined;
        const data = await getNotifications(token, cursor, 20);

        if (reset) {
          setNotifications(data.notifications);
        } else {
          setNotifications((prev) => [...prev, ...data.notifications]);
        }
        setNextCursor(data.next_cursor);
      } catch (err) {
        console.error("[Notifications] Failed to fetch:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user, nextCursor]
  );

  // ── Mark single as read ────────────────────────────────────
  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        await markNotificationRead(notificationId, token);

        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notificationId ? { ...n, is_read: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error("[Notifications] Failed to mark as read:", err);
      }
    },
    [user]
  );

  // ── Mark all as read ───────────────────────────────────────
  const markAllRead = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      await markAllNotificationsRead(token);

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("[Notifications] Failed to mark all as read:", err);
    }
  }, [user]);

  // ── Socket listener for real-time notifications ────────────
  useEffect(() => {
    if (!user || socketListenerAttached.current) return;

    let mounted = true;

    const attachListener = async () => {
      const socket = await getSocket();
      if (!socket || !mounted) return;

      socket.on("new_notification", (notification: Notification) => {
        if (!mounted) return;

        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      });

      socketListenerAttached.current = true;
    };

    attachListener();

    return () => {
      mounted = false;
      socketListenerAttached.current = false;

      // Cleanup listener
      const cleanup = async () => {
        const socket = await getSocket();
        if (socket) {
          socket.off("new_notification");
        }
      };
      cleanup();
    };
  }, [user, getSocket]);

  // ── Fetch unread count on mount ────────────────────────────
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    nextCursor,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllRead,
  };
}
