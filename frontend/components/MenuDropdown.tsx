"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface DropdownItem {
  label: string;
  icon: LucideIcon;
  onClick: (e: React.MouseEvent) => void;
  variant?: "default" | "danger";
  disabled?: boolean;
}

interface MenuDropdownProps {
  isOpen: boolean;
  items: DropdownItem[];
  footerLeft?: string;
  footerRight?: string;
  className?: string;
}

export function MenuDropdown({
  isOpen,
  items,
  footerLeft,
  footerRight,
  className = "",
}: MenuDropdownProps) {
  
  const animation = {
    initial: { height: 0, opacity: 0 },
    animate: { height: "auto", opacity: 1 },
    exit: { height: 0, opacity: 0 },
    transition: {
      height: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
      opacity: { duration: 0.2, ease: "linear" },
    } as any,
  };

  const showFooter = footerLeft || footerRight;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={animation.initial}
          animate={animation.animate}
          exit={animation.exit}
          transition={animation.transition}
          className={`absolute right-0 mt-4 border border-border bg-black/85 backdrop-blur-xl shadow-2xl origin-top-right overflow-hidden shadow-black/80 z-50 ${className}`}
        >
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-accent/40" />

          <div className="p-2 flex flex-col gap-1">
            {items.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={item.onClick}
                  disabled={item.disabled}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer group/item
                    ${item.variant === "danger" 
                      ? "text-red-500 hover:bg-red-500 hover:text-white" 
                      : "text-white hover:bg-accent hover:text-black"}
                    ${item.disabled ? "opacity-30 cursor-not-allowed" : ""}
                    ${idx > 0 && items[idx-1].variant !== items[idx].variant ? "border-t border-border/50" : ""}
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {showFooter && (
            <div className="border-t border-border p-3 bg-background/50">
              <div className="flex items-center justify-between text-[8px] font-mono text-text-secondary uppercase tracking-[0.2em] font-bold">
                <span>{footerLeft}</span>
                <span className="text-accent animate-pulse">{footerRight}</span>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
