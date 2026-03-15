"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ToastProps {
  isVisible: boolean;
  message: string;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ isVisible, message, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 20, x: "-50%" }}
          className="fixed bottom-8 left-1/2 z-110 min-w-[300px] border border-accent/20 bg-surface/90 backdrop-blur-md px-6 py-4 shadow-2xl"
        >
          <div className="flex items-center justify-between gap-4">
            <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-accent leading-none">
              {message}
            </p>
          </div>

          <motion.div
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: duration / 1000, ease: "linear" }}
            className="absolute bottom-0 left-0 h-[2px] bg-accent"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
