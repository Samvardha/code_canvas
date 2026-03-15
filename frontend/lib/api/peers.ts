import { baseUrl, getHeaders, handleResponse } from "./client";

export type ConnectionStatus = "add" | "pending" | "accept" | "connected" | "self";

export type ConnectionStatusResponse = {
  status: ConnectionStatus;
  requestId?: string;
};

export type UserConnectionsResponse = {
  userId: string;
  connections: string[];
};

type MessageResponse = {
  message: string;
};

type SendConnectionResponse = {
  message: string;
  status?: ConnectionStatus;
  requestId?: string;
};

export async function getConnectionStatus(
  targetUserId: string,
  token: string
): Promise<ConnectionStatusResponse> {
  const res = await fetch(`${baseUrl}/peers/status/${targetUserId}`, {
    headers: getHeaders({ token }),
  });

  return handleResponse<ConnectionStatusResponse>(
    res,
    "Failed to fetch connection status"
  );
}

export async function sendConnectionRequest(
  targetUserId: string,
  token: string
): Promise<SendConnectionResponse> {
  const res = await fetch(`${baseUrl}/peers/request/${targetUserId}`, {
    method: "POST",
    headers: getHeaders({ token }),
  });

  return handleResponse<SendConnectionResponse>(
    res,
    "Failed to send connection request"
  );
}

export async function acceptConnectionRequest(
  requestId: string,
  token: string
): Promise<MessageResponse> {
  const res = await fetch(`${baseUrl}/peers/accept/${requestId}`, {
    method: "POST",
    headers: getHeaders({ token }),
  });

  return handleResponse<MessageResponse>(
    res,
    "Failed to accept connection request"
  );
}

export async function rejectConnectionRequest(
  requestId: string,
  token: string
): Promise<MessageResponse> {
  const res = await fetch(`${baseUrl}/peers/reject/${requestId}`, {
    method: "POST",
    headers: getHeaders({ token }),
  });

  return handleResponse<MessageResponse>(
    res,
    "Failed to reject connection request"
  );
}

export async function cancelConnectionRequest(
  targetUserId: string,
  token: string
): Promise<MessageResponse> {
  const res = await fetch(`${baseUrl}/peers/cancel/${targetUserId}`, {
    method: "POST",
    headers: getHeaders({ token }),
  });

  return handleResponse<MessageResponse>(
    res,
    "Failed to cancel connection request"
  );
}

export async function getUserConnections(
  userId: string,
  token: string
): Promise<UserConnectionsResponse> {
  const res = await fetch(`${baseUrl}/peers/${userId}`, {
    headers: getHeaders({ token }),
  });

  return handleResponse<UserConnectionsResponse>(
    res,
    "Failed to fetch user connections"
  );
}

export async function removePeer(
  targetUserId: string,
  token: string
): Promise<MessageResponse> {
  const res = await fetch(`${baseUrl}/peers/${targetUserId}`, {
    method: "DELETE",
    headers: getHeaders({ token }),
  });

  return handleResponse<MessageResponse>(res, "Failed to remove peer");
}
