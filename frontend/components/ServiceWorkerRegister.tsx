"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export default function ServiceWorkerRegister() {
  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[SW] Registered:", reg.scope);
          reg.update();
        })
        .catch((err) => console.error("[SW] Registration failed:", err));
    }

    // Track PWA standalone sessions
    if (window.matchMedia("(display-mode: standalone)").matches) {
      window.gtag?.("event", "pwa_session", {
        display_mode: "standalone",
      });
    }

    // Track PWA installs
    window.addEventListener("appinstalled", () => {
      window.gtag?.("event", "pwa_installed");
    });
  }, []);

  return null;
}
