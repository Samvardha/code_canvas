"use client";

import { useRef, useCallback, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/contexts/AuthContext";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

let globalSocket: Socket | null = null;
let globalConnectPromise: Promise<Socket | null> | null = null;

export function useSocket() {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(globalSocket);
  useEffect(() => {
    socketRef.current = globalSocket;
  }, []);

  const getSocket = useCallback(async (): Promise<Socket | null> => {
    if (globalSocket?.connected) return globalSocket;

    if (globalConnectPromise) return globalConnectPromise;

    if (!user) return null;
    const connectAttempt = (async () => {
      try {
        const token = await user.getIdToken();
        if (globalSocket?.connected) return globalSocket;

        if (globalSocket) {
          globalSocket.removeAllListeners();
          globalSocket.disconnect();
          globalSocket = null;
        }

        console.log("[Socket] Initializing connection to:", BACKEND_URL);
        const socket = io(BACKEND_URL, {
          auth: { token },
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 2000,
        });

        globalSocket = socket;

        return await new Promise<Socket | null>((resolve) => {
          let timeoutId: NodeJS.Timeout;

          const onConnect = () => {
            console.log("[Socket] Connected:", socket.id);
            clearTimeout(timeoutId);
            cleanup();
            resolve(socket);
          };

          const onConnectError = (err: Error) => {
            console.error("[Socket] Connection error:", err.message);
            clearTimeout(timeoutId);
            cleanup();
            resolve(null);
          };

          const cleanup = () => {
            socket.off("connect", onConnect);
            socket.off("connect_error", onConnectError);
          };

          socket.on("connect", onConnect);
          socket.on("connect_error", onConnectError);

          timeoutId = setTimeout(() => {
            cleanup();
            if (socket.connected) {
              resolve(socket);
            } else {
              console.warn("[Socket] Connection timed out");
              resolve(null);
            }
          }, 10000);
        });
      } catch (err) {
        console.error("[Socket] Unexpected initialize error:", err);
        return null;
      } finally {
        globalConnectPromise = null;
      }
    })();

    globalConnectPromise = connectAttempt;
    return connectAttempt;
  }, [user]);

  return { socketRef, getSocket };
}
