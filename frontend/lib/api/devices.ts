import { baseUrl, getHeaders, handleResponse } from "./client";

export async function registerDevice(
  token: string,
  deviceId: string,
  fcmToken: string
): Promise<{ success: boolean; status: string }> {
  const res = await fetch(`${baseUrl}/devices/register`, {
    method: "POST",
    headers: getHeaders({ token, isJson: true }),
    body: JSON.stringify({ device_id: deviceId, token: fcmToken }),
  });
  return handleResponse(res, "Failed to register device");
}

export async function removeDevice(
  token: string,
  deviceId: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${baseUrl}/devices/remove`, {
    method: "POST",
    headers: getHeaders({ token, isJson: true }),
    body: JSON.stringify({ device_id: deviceId }),
  });
  return handleResponse(res, "Failed to remove device");
}
