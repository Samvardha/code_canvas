"use client";

import React from "react";

interface BadgeIconProps {
  icon: React.ElementType;
  onClick: () => void;
  unreadCount?: number;
  title: string;
}

export default function BadgeIcon({
  icon: Icon,
  onClick,
  unreadCount = 0,
  title,
}: BadgeIconProps) {
  return (
    <button
      onClick={onClick}
      className="relative p-1 sm:p-2 hover:bg-white/5 transition-colors group cursor-pointer"
      title={title}
    >
      <Icon className="w-5 h-5 text-text-secondary group-hover:text-accent transition-colors" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-accent text-black text-[7px] sm:text-[8px] font-mono font-bold flex items-center justify-center">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
