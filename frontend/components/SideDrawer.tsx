"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  widthClass?: string;
}

export default function SideDrawer({
  isOpen,
  onClose,
  children,
  widthClass = "sm:w-[420px]",
}: SideDrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-[3px] z-60"
          />

          {/* Drawer container */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={`fixed top-0 right-0 h-full w-full ${widthClass} bg-background border-l border-border z-61 flex flex-col`}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
