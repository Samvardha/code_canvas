"use client";

import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export default function PushNotificationManager() {
  const { permission, isSupported, requestSubscription } = usePushNotifications();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("push_banner_dismissed");
    if (isSupported && permission === "default" && !dismissed) {
      const timer = setTimeout(() => setShowBanner(true), 2500);
      return () => clearTimeout(timer);
    } else {
      setShowBanner(false);
    }
  }, [isSupported, permission]);

  const handleEnable = async () => {
    await requestSubscription();
    setShowBanner(false);
  };

  const handleDismiss = () => {
    sessionStorage.setItem("push_banner_dismissed", "true");
    setShowBanner(false);
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="fixed bottom-6 right-6 z-50 w-[calc(100%-2rem)] sm:w-96 overflow-hidden rounded-2xl border border-border bg-surface/85 backdrop-blur-xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        >
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Bell className="h-5 w-5 animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">Enable Notifications</h3>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                Stay updated on collaboration requests, event updates, and messages in real time.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleEnable}
                  className="rounded-lg bg-accent px-3.5 py-1.5 text-xs font-semibold text-black transition-all hover:opacity-90 active:scale-95 cursor-pointer"
                >
                  Enable
                </button>
                <button
                  onClick={handleDismiss}
                  className="rounded-lg border border-border bg-surface hover:bg-surface-hover px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition-all active:scale-95 cursor-pointer"
                >
                  Maybe Later
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 self-start cursor-pointer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
