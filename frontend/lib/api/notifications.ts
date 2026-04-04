import { baseUrl, getHeaders, handleResponse } from "./client";

// [ TYPES ] ───────────────────────────────────────────────────────────────────

export type NotificationEntity = {
  id: string;
  type: "post" | "user" | "comment" | "conversation";
};

export type Notification = {
  _id: string;
  recipient_id: string;
  sender_id: string;
  sender_username: string;
  type: "like" | "comment" | "peer_request" | "peer_accept" | "comment_like" | "comment_reply";
  entity: NotificationEntity;
  is_read: boolean;
  created_at: string;
};

export type NotificationListResponse = {
  notifications: Notification[];
  next_cursor: string | null;
};

export type UnreadCountResponse = {
  unread_count: number;
};

// [ API CALLS ] ───────────────────────────────────────────────────────────────

export async function getNotifications(
  token: string,
  cursor?: string,
  limit: number = 20
): Promise<NotificationListResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(`${baseUrl}/notifications?${params}`, {
    headers: getHeaders({ token }),
  });
  return handleResponse(res, "Failed to fetch notifications");
}

export async function getUnreadCount(
  token: string
): Promise<UnreadCountResponse> {
  const res = await fetch(`${baseUrl}/notifications/unread-count`, {
    headers: getHeaders({ token }),
  });
  return handleResponse(res, "Failed to fetch unread count");
}

export async function markNotificationRead(
  notificationId: string,
  token: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${baseUrl}/notifications/${notificationId}/read`, {
    method: "PATCH",
    headers: getHeaders({ token }),
  });
  return handleResponse(res, "Failed to mark notification as read");
}

export async function markAllNotificationsRead(
  token: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${baseUrl}/notifications/read-all`, {
    method: "PATCH",
    headers: getHeaders({ token }),
  });
  return handleResponse(res, "Failed to mark all as read");
}
