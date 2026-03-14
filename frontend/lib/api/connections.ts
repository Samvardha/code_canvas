export type ConnectionStatus = "add" | "pending" | "accept" | "connected" | "self";

export type ConnectionStatusResponse = {
  status: ConnectionStatus;
  requestId?: string;
};

export type UserConnectionsResponse = {
  userId: string;
  connections: string[];
};

const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function getConnectionStatus(targetUserId: string, token: string): Promise<ConnectionStatusResponse> {
  const res = await fetch(`${baseUrl}/peers/status/${targetUserId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error("Failed to fetch connection status");
  return res.json();
}

export async function sendConnectionRequest(targetUserId: string, token: string): Promise<{ message: string }> {
  const res = await fetch(`${baseUrl}/peers/request/${targetUserId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to send connection request");
  }
  return res.json();
}

export async function acceptConnectionRequest(requestId: string, token: string): Promise<{ message: string }> {
  const res = await fetch(`${baseUrl}/peers/accept/${requestId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to accept connection request");
  }
  return res.json();
}

export async function rejectConnectionRequest(requestId: string, token: string): Promise<{ message: string }> {
  const res = await fetch(`${baseUrl}/peers/reject/${requestId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to reject connection request");
  }
  return res.json();
}

export async function cancelConnectionRequest(targetUserId: string, token: string): Promise<{ message: string }> {
  const res = await fetch(`${baseUrl}/peers/cancel/${targetUserId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to cancel connection request");
  }
  return res.json();
}

export async function getUserConnections(userId: string, token: string): Promise<UserConnectionsResponse> {
  const res = await fetch(`${baseUrl}/peers/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error("Failed to fetch user connections");
  return res.json();
}

export async function removePeer(targetUserId: string, token: string): Promise<{ message: string }> {
  const res = await fetch(`${baseUrl}/peers/${targetUserId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to remove peer");
  }
  return res.json();
}
