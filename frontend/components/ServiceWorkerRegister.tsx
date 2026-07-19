"use client";

import { useEffect } from "react";


async function unregisterLegacyServiceWorkers() {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((reg) => {
        const scriptUrl = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL;
        return scriptUrl?.endsWith("/sw.js");
      })
      .map((reg) => reg.unregister())
  );
}

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const configParams = new URLSearchParams({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
    }).toString();

    unregisterLegacyServiceWorkers()
      .then(() =>
        navigator.serviceWorker.register(`/firebase-messaging-sw.js?${configParams}`, { scope: "/" })
      )
      .then((reg) => console.log("[SW] Registered:", reg.scope))
      .catch((err) => console.error("[SW] Registration failed:", err));
  }, []);

  return null;
}