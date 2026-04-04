"use client";

import React, { useEffect } from "react";
import {
  Bell,
  X,
  Heart,
  MessageCircle,
  UserPlus,
  UserCheck,
  Loader2,
  CheckCheck,
} from "lucide-react";
import SideDrawer from "./SideDrawer";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/hooks/useNotifications";
import { Notification } from "@/lib/api/notifications";
import { formatDistanceToNow } from "date-fns";

// [ HELPERS ] ─────────────────────────────────────────────────────────────────

const NOTIFICATION_CONFIG: Record<
  string,
  { icon: React.ElementType; label: string; color: string }
> = {
  like: {
    icon: Heart,
    label: "liked your post",
    color: "text-red-400",
  },
  comment: {
    icon: MessageCircle,
    label: "commented on your post",
    color: "text-blue-400",
  },
  peer_request: {
    icon: UserPlus,
    label: "sent you a peer request",
    color: "text-yellow-400",
  },
  peer_accept: {
    icon: UserCheck,
    label: "accepted your peer request",
    color: "text-green-400",
  },
};

function getRelativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return "";
  }
}

function getNavigationPath(notification: Notification): string | null {
  const { type, entity, sender_id, sender_username } = notification;

  switch (type) {
    case "like":
    case "comment":
      if (entity.type === "post") return `/posts/${entity.id}`;
      return null;
    case "peer_request":
    case "peer_accept":
      return `/profile/${sender_username}`;
    default:
      return null;
  }
}

// [ NOTIFICATION ITEM ] ───────────────────────────────────────────────────────

function NotificationItem({
  notification,
  onNavigate,
}: {
  notification: Notification;
  onNavigate: (path: string, notification: Notification) => void;
}) {
  const config = NOTIFICATION_CONFIG[notification.type] || {
    icon: Bell,
    label: "sent you a notification",
    color: "text-text-secondary",
  };
  const Icon = config.icon;
  const path = getNavigationPath(notification);

  return (
    <button
      onClick={() => path && onNavigate(path, notification)}
      className={`w-full flex items-start gap-3 p-4 text-left transition-all duration-200 border-l-2 border-b border-border
        ${notification.is_read
          ? "bg-transparent hover:bg-white/10 border-l-transparent"
          : "bg-linear-to-l from-accent/5 to-accent/15 hover:bg-white/5 border-l-accent"
        }
        ${path ? "cursor-pointer" : "cursor-default"}
      `}
    >
      <div
        className={`w-10 h-10 shrink-0 flex items-center justify-center border bg-transparent transition-colors duration-300 ${
          notification.is_read ? "border-border" : "border-accent/40"
        }`}
      >
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-mono leading-relaxed text-white">
          <span className="font-bold uppercase tracking-tight text-accent">
            {notification.sender_username}
          </span>{" "}
          <span className="text-text-secondary">{config.label}</span>
        </p>
        <span className="text-[9px] font-mono uppercase tracking-widest mt-1 block text-text-secondary">
          {getRelativeTime(notification.created_at)}
        </span>
      </div>
    </button>
  );
}

// [ NOTIFICATION DRAWER ] ──────────────────────────────────────────────────────

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationDrawer({
  isOpen,
  onClose,
}: NotificationDrawerProps) {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    nextCursor,
    fetchNotifications,
    markAsRead,
    markAllRead,
  } = useNotifications();

  // Fetch on first open
  useEffect(() => {
    if (isOpen) {
      fetchNotifications(true);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNavigate = (path: string, notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification._id);
    }
    onClose();
    router.push(path);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (
      scrollHeight - scrollTop <= clientHeight + 80 &&
      nextCursor &&
      !loadingMore
    ) {
      fetchNotifications(false);
    }
  };

  return (
    <SideDrawer isOpen={isOpen} onClose={onClose} widthClass="sm:w-[420px]">
      {/* Header */}
            <div className="h-16 border-b border-border bg-surface/50 flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[18px] font-mono font-bold uppercase tracking-[0.15em] text-white">
                    NOTIFICATIONS
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="p-1.5 hover:bg-white/5 transition-colors group/mark cursor-pointer"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-4 h-4 text-text-secondary group-hover/mark:text-accent transition-colors" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 text-text-secondary" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div
              className="flex-1 overflow-y-auto"
              onScroll={handleScroll}
            >
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="w-5 h-5 text-accent animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-60 gap-4 px-6">
                  <div className="w-16 h-16 border border-border bg-surface flex items-center justify-center">
                    <Bell className="w-6 h-6 text-text-secondary" />
                  </div>
                  <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest text-center">
                    NO NOTIFICATIONS DETECTED
                  </p>
                  <p className="text-[9px] font-mono text-text-secondary/60 text-center">
                    INTERACTIONS WILL APPEAR HERE
                  </p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map((notif) => (
                    <NotificationItem
                      key={notif._id}
                      notification={notif}
                      onNavigate={handleNavigate}
                    />
                  ))}

                  {loadingMore && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-4 h-4 text-accent animate-spin" />
                    </div>
                  )}

                </div>
              )}
            </div>
    </SideDrawer>
  );
}
