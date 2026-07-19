"use client";

import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useState, useEffect } from "react";
import { Bell, X, RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export default function PWAManager() {
  const { permission, isSupported, requestSubscription } = usePushNotifications();
  const [showPushBanner, setShowPushBanner] = useState(false);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("push_banner_dismissed");
    if (isSupported && permission === "default" && !dismissed) {
      const timer = setTimeout(() => setShowPushBanner(true), 2500);
      return () => clearTimeout(timer);
    } else {
      setShowPushBanner(false);
    }
  }, [isSupported, permission]);

  useEffect(() => {
    const handleUpdate = () => {
      setShowUpdateBanner(true);
      setShowPushBanner(false);
    };

    window.addEventListener("sw-update-available", handleUpdate);
    return () => window.removeEventListener("sw-update-available", handleUpdate);
  }, []);

  const handleEnablePush = async () => {
    await requestSubscription();
    setShowPushBanner(false);
  };

  const handleDismissPush = () => {
    sessionStorage.setItem("push_banner_dismissed", "true");
    setShowPushBanner(false);
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {showPushBanner && !showUpdateBanner && (
        <motion.div
          key="push-banner"
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
                  onClick={handleEnablePush}
                  className="rounded-lg bg-accent px-3.5 py-1.5 text-xs font-semibold text-black transition-all hover:opacity-90 active:scale-95 cursor-pointer"
                >
                  Enable
                </button>
                <button
                  onClick={handleDismissPush}
                  className="rounded-lg border border-border bg-surface hover:bg-surface-hover px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition-all active:scale-95 cursor-pointer"
                >
                  Maybe Later
                </button>
              </div>
            </div>
            <button
              onClick={handleDismissPush}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 self-start cursor-pointer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}

      {showUpdateBanner && (
        <div className="fixed inset-0 z-999999 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          />

          <motion.div
            key="update-banner"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative z-10 w-full max-w-fit overflow-hidden rounded-2xl border border-accent/20 bg-surface/90 backdrop-blur-xl p-6 shadow-2xl"
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">Update Downloaded</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Reload the application to apply the latest changes and features.
                </p>
              </div>
              <button
                onClick={handleReload}
                className="w-full rounded-lg bg-accent py-2 text-xs font-semibold text-black transition-all hover:opacity-90 active:scale-95 cursor-pointer"
              >
                Reload
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
