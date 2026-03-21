import { baseUrl, getHeaders, handleResponse } from "./client";

export type LastMessage = {
  text: string;
  sender_id: string;
  created_at: string;
};

export type Conversation = {
  id: string;
  participants: string[];
  participant_profiles?: Record<string, any>;
  last_message: LastMessage | null;
  unread_count: number;
  unread_counts?: Record<string, number>;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: { text: string };
  status: "sent" | "delivered" | "seen";
  created_at: string;
};


export async function startOrGetConversation(
  targetUserId: string,
  token: string
): Promise<{ conversation: Conversation }> {
  const res = await fetch(`${baseUrl}/conversations/${targetUserId}`, {
    method: "POST",
    headers: getHeaders({ token }),
  });
  return handleResponse(res, "Failed to start conversation");
}

export async function getConversations(
  token: string,
  cursor?: string,
  limit: number = 20
): Promise<{ conversations: Conversation[]; next_cursor: string | null }> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(`${baseUrl}/conversations?${params}`, {
    headers: getHeaders({ token }),
  });
  return handleResponse(res, "Failed to fetch conversations");
}

export async function getMessages(
  conversationId: string,
  token: string,
  cursor?: string,
  limit: number = 30
): Promise<{ messages: Message[]; next_cursor: string | null }> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(
    `${baseUrl}/conversations/${conversationId}/messages?${params}`,
    { headers: getHeaders({ token }) }
  );
  return handleResponse(res, "Failed to fetch messages");
}
