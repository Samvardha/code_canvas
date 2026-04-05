"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { 
  useQuery, 
  useInfiniteQuery, 
  useMutation, 
  useQueryClient,
  InfiniteData 
} from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/hooks/useSocket";
import {
  Notification,
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/api/notifications";

interface NotificationPage {
  notifications: Notification[];
  next_cursor: string | null;
}

const processedNotifications = new Set<string>();

export function useNotifications() {
  const { user } = useAuth();
  const { getSocket } = useSocket();
  const queryClient = useQueryClient();
  const socketListenerAttached = useRef(false);
  const [toast, setToast] = useState({ isVisible: false, message: "" });
  const userId = user?.uid;
  const NOTIF_LIST_KEY = useMemo(() => ["notifications", "list", userId], [userId]);
  const UNREAD_COUNT_KEY = useMemo(() => ["notifications", "unread-count", userId], [userId]);

  // ── Unread Count Query ─────────────────────────────────────
  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: async () => {
      if (!user) return 0;
      const token = await user.getIdToken();
      const data = await getUnreadCount(token);
      return data.unread_count;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // ── Notifications List Infinite Query ──────────────────────
  const {
    data: infiniteData,
    isLoading: loading,
    isFetchingNextPage: loadingMore,
    fetchNextPage,
    hasNextPage,
    isFetching: refreshing,
  } = useInfiniteQuery<NotificationPage>({
    queryKey: NOTIF_LIST_KEY,
    queryFn: async ({ pageParam }) => {
      if (!user) return { notifications: [], next_cursor: null };
      const token = await user.getIdToken();
      const cursor = pageParam as string | undefined;
      return getNotifications(token, cursor, 20);
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.next_cursor || undefined,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Derived: Flatten all notification pages into a single array
  const notifications = infiniteData?.pages.flatMap(page => page.notifications) || [];

  // ── Mark as Read Mutation ──────────────────────────────────
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user) throw new Error("AUTH_REQUIRED");
      const token = await user.getIdToken();
      return markNotificationRead(notificationId, token);
    },
    onMutate: async (notifId) => {
      // Optimistic Update
      await queryClient.cancelQueries({ queryKey: NOTIF_LIST_KEY });
      await queryClient.cancelQueries({ queryKey: UNREAD_COUNT_KEY });

      // Snapshot previous states
      const prevUnreadCount = queryClient.getQueryData<number>(UNREAD_COUNT_KEY);
      const prevList = queryClient.getQueryData<InfiniteData<NotificationPage>>(NOTIF_LIST_KEY);

      // Optimistic Update
      queryClient.setQueryData<number>(UNREAD_COUNT_KEY, (old) => Math.max(0, (old || 0) - 1));
      queryClient.setQueryData<InfiniteData<NotificationPage>>(NOTIF_LIST_KEY, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            notifications: page.notifications.map(n => 
              n._id === notifId ? { ...n, is_read: true } : n
            )
          }))
        };
      });

      return { prevUnreadCount, prevList };
    },
    onError: (err: any, notifId, context) => {
      const isGhost = err?.message?.toLowerCase().includes("not found");
      
      if (isGhost) {
        setToast({ isVisible: true, message: "NOTIFICATION_NOT_FOUND" });
        queryClient.setQueryData<InfiniteData<NotificationPage>>(NOTIF_LIST_KEY, (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map(page => ({
              ...page,
              notifications: page.notifications.filter(n => n._id !== notifId)
            }))
          };
        });
        return;
      }

      if (context?.prevUnreadCount !== undefined) {
        queryClient.setQueryData(UNREAD_COUNT_KEY, context.prevUnreadCount);
      }
      if (context?.prevList) {
        queryClient.setQueryData(NOTIF_LIST_KEY, context.prevList);
      }
    }
  });

  // ── Mark All Read Mutation ─────────────────────────────────
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("AUTH_REQUIRED");
      const token = await user.getIdToken();
      return markAllNotificationsRead(token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIF_LIST_KEY });
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: NOTIF_LIST_KEY });
      await queryClient.cancelQueries({ queryKey: UNREAD_COUNT_KEY });

      const prevUnreadCount = queryClient.getQueryData<number>(UNREAD_COUNT_KEY);
      const prevList = queryClient.getQueryData<InfiniteData<NotificationPage>>(NOTIF_LIST_KEY);

      queryClient.setQueryData<number>(UNREAD_COUNT_KEY, 0);
      queryClient.setQueryData<InfiniteData<NotificationPage>>(NOTIF_LIST_KEY, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            notifications: page.notifications.map(n => ({ ...n, is_read: true }))
          }))
        };
      });

      return { prevUnreadCount, prevList };
    },
    onError: (err, newTodo, context) => {
      if (context?.prevUnreadCount !== undefined) {
        queryClient.setQueryData(UNREAD_COUNT_KEY, context.prevUnreadCount);
      }
      if (context?.prevList) {
        queryClient.setQueryData(NOTIF_LIST_KEY, context.prevList);
      }
    }
  });

  // ── Socket Listener for Instant Cache Injection ────────────
  useEffect(() => {
    if (!user || socketListenerAttached.current) return;

    let mounted = true;
    let handleNewNotification: ((notification: Notification) => void) | null = null;

    const attachListener = async () => {
      const socket = await getSocket();
      if (!socket || !mounted) return;

      handleNewNotification = (notification: Notification) => {
        if (!mounted) return;

        // Deduplicate across multiple hook instances
        if (processedNotifications.has(notification._id)) return;
        processedNotifications.add(notification._id);

        // Update unread count independently
        queryClient.setQueryData<number>(UNREAD_COUNT_KEY, (val) => (val || 0) + 1);

        // Update list cache if it exists
        queryClient.setQueryData<InfiniteData<NotificationPage>>(NOTIF_LIST_KEY, (old) => {
          if (!old || !old.pages[0]) return old;

          const firstPage = old.pages[0];
          const newFirstPage = {
            ...firstPage,
            notifications: [notification, ...firstPage.notifications]
          };

          return {
            ...old,
            pages: [newFirstPage, ...old.pages.slice(1)]
          };
        });
      };

      socket.on("new_notification", handleNewNotification);
      socketListenerAttached.current = true;
    };

    attachListener();

    return () => {
      mounted = false;
      socketListenerAttached.current = false;
      const cleanup = async () => {
        const socket = await getSocket();
        if (socket && handleNewNotification) {
          socket.off("new_notification", handleNewNotification);
        }
      };
      cleanup();
    };
  }, [user, getSocket, queryClient, NOTIF_LIST_KEY, UNREAD_COUNT_KEY]);

  return {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    hasMore: !!hasNextPage,
    fetchNotifications: (reset: boolean = true) => {
      if (reset) {
        queryClient.invalidateQueries({ queryKey: NOTIF_LIST_KEY });
        queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
      } else {
        fetchNextPage();
      }
    },
    markAsRead: async (id: string) => {
      try {
        await markAsReadMutation.mutateAsync(id);
      } catch (err) {
        throw err;
      }
    },
    markAllRead: () => markAllReadMutation.mutate(),
    toast,
    hideToast: () => setToast({ ...toast, isVisible: false }),
    refreshing,
  };
}
