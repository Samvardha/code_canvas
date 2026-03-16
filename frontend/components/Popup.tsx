"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface PopupButton {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger";
}

interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description: string;
  showCloseButton?: boolean;
  primaryButton?: PopupButton;
  secondaryButton?: PopupButton;
}

export default function Popup({
  isOpen,
  onClose,
  title,
  description,
  showCloseButton = true,
  primaryButton,
  secondaryButton,
}: PopupProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-2xl overflow-hidden border border-border bg-surface p-6 shadow-2xl shadow-black/50"
          >
            {showCloseButton && (
              <button
                onClick={onClose}
                className="absolute right-4 top-4 text-text-secondary hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <div className="space-y-4">
              {title && (
                <h3 className="font-mono text-xs font-black uppercase tracking-[0.2em] text-accent">
                  {title}
                </h3>
              )}

              <p className="text-sm text-text-secondary font-medium leading-relaxed">
                {description}
              </p>

              {(primaryButton || secondaryButton) && (
                <div className="flex flex-row-reverse gap-3 pt-4">
                  {primaryButton && (
                    <button
                      onClick={() => {
                        primaryButton.onClick();
                        onClose();
                      }}
                      className={`px-6 py-2 font-mono text-[10px] font-black uppercase tracking-widest transition-all ${
                        primaryButton.variant === "danger"
                          ? "bg-red-500 text-white hover:bg-red-600"
                          : "bg-accent text-black hover:bg-white"
                      }`}
                    >
                      {primaryButton.label}
                    </button>
                  )}
                  {secondaryButton && (
                    <button
                      onClick={() => {
                        secondaryButton.onClick();
                        onClose();
                      }}
                      className="px-6 py-2 border border-border bg-surface text-text-secondary hover:text-white transition-all font-mono text-[10px] font-black uppercase tracking-widest"
                    >
                      {secondaryButton.label}
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
