"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseMessaging, getToken } from "@/lib/firebase";
import { registerDevice } from "@/lib/api/devices";
import { onMessage, type MessagePayload } from "firebase/messaging";

const VALID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VALID_KEY;

async function getMessagingServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;

  const registration = await navigator.serviceWorker.getRegistration("/");
  if (registration) return registration;

  const configParams = new URLSearchParams({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  }).toString();

  return navigator.serviceWorker.register(`/firebase-messaging-sw.js?${configParams}`, { scope: "/" });
}

function extractRoute(payload: MessagePayload): string {
  const route = payload.data?.route;
  return route && route.startsWith("/") ? route : "/explore-feed";
}

function showForegroundNotification(payload: MessagePayload, onNavigate: (route: string) => void) {
  if (typeof window === "undefined" || Notification.permission !== "granted") return;

  const title = payload.data?.title ?? payload.notification?.title ?? "Tech Connect";
  const body = payload.data?.body ?? payload.notification?.body ?? "You have a new notification";
  const route = extractRoute(payload);

  const notification = new Notification(title, {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { route },
  });

  notification.onclick = (event) => {
    event.preventDefault();
    window.focus();
    onNavigate(route);
    notification.close();
  };
}

export function usePushNotifications() {
  const { user } = useAuth();
  const router = useRouter();
  const registeringRef = useRef(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const registerAndSubscribe = async () => {
    if (!user || registeringRef.current) return;
    registeringRef.current = true;
    try {
      const messaging = getFirebaseMessaging();
      if (!messaging) return;

      if (!VALID_KEY) {
        console.warn("Push notifications disabled: NEXT_PUBLIC_FIREBASE_VALID_KEY is not set.");
        return;
      }

      let deviceId = localStorage.getItem("device_id");
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem("device_id", deviceId);
      }

      const requestStatus = await Notification.requestPermission();
      setPermission(requestStatus);
      if (requestStatus !== "granted") {
        console.log("Push notifications permission denied.");
        return;
      }

      const swRegistration = await getMessagingServiceWorker();
      if (!swRegistration) {
        console.warn("Service worker unavailable; push registration skipped.");
        return;
      }

      await navigator.serviceWorker.ready;

      const fcmToken = await getToken(messaging, {
        vapidKey: VALID_KEY,
        serviceWorkerRegistration: swRegistration,
      });

      if (fcmToken && user) {
        const token = await user.getIdToken();
        await registerDevice(token, deviceId, fcmToken);
        localStorage.setItem("fcm_token", fcmToken);
      }
    } catch (error) {
      console.error("Failed to initialize push notifications:", error);
    } finally {
      registeringRef.current = false;
    }
  };

  useEffect(() => {
    if (!user || permission !== "granted") return;

    let mounted = true;
    let removeVisibilityListener: (() => void) | null = null;

    async function initPush() {
      if (registeringRef.current) return;
      registeringRef.current = true;
      try {
        const messaging = getFirebaseMessaging();
        if (!messaging) return;

        if (!VALID_KEY) return;

        let deviceId = localStorage.getItem("device_id");
        if (!deviceId) {
          deviceId = crypto.randomUUID();
          localStorage.setItem("device_id", deviceId);
        }

        const swRegistration = await getMessagingServiceWorker();
        if (!swRegistration) return;

        await navigator.serviceWorker.ready;

        const fcmToken = await getToken(messaging, {
          vapidKey: VALID_KEY,
          serviceWorkerRegistration: swRegistration,
        });

        if (fcmToken && mounted && user) {
          const token = await user.getIdToken();
          await registerDevice(token, deviceId, fcmToken);
          localStorage.setItem("fcm_token", fcmToken);
        }

        const refreshToken = async () => {
          if (!mounted || !user) return;
          try {
            const nextToken = await getToken(messaging, {
              vapidKey: VALID_KEY,
              serviceWorkerRegistration: swRegistration,
            });
            if (!nextToken) return;

            const storedToken = localStorage.getItem("fcm_token");
            if (storedToken === nextToken) return;

            const authToken = await user.getIdToken();
            await registerDevice(authToken, deviceId, nextToken);
            localStorage.setItem("fcm_token", nextToken);
          } catch (error) {
            console.warn("Failed to refresh push token:", error);
          }
        };

        const onVisibilityChange = () => {
          if (document.visibilityState === "visible") {
            refreshToken();
          }
        };

        document.addEventListener("visibilitychange", onVisibilityChange);
        removeVisibilityListener = () => {
          document.removeEventListener("visibilitychange", onVisibilityChange);
        };
      } catch (error) {
        console.warn("Failed to run background token check:", error);
      } finally {
        if (mounted) {
          registeringRef.current = false;
        }
      }
    }

    initPush();

    return () => {
      mounted = false;
      removeVisibilityListener?.();
    };
  }, [user, permission]);

  useEffect(() => {
    const messaging = getFirebaseMessaging();
    if (!messaging) return;

    try {
      const unsubscribe = onMessage(messaging, (payload) => {
        showForegroundNotification(payload, (route) => router.push(route));
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn("Could not attach onMessage listener", e);
    }
  }, [router]);

  return {
    permission,
    isSupported: typeof window !== "undefined" && "Notification" in window,
    requestSubscription: registerAndSubscribe,
  };
}
