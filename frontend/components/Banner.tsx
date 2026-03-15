"use client";

import React from "react";

type BannerVariant = "error" | "success" | "info" | "warning";

interface BannerProps {
  variant?: BannerVariant;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}

const baseClasses =
  "text-xs font-mono uppercase tracking-widest font-bold flex items-start";

const variantClasses: Record<BannerVariant, string> = {
  error: "border border-red-500/50 bg-red-500/10 text-red-500",
  success: "border border-accent/50 bg-accent/10 text-accent",
  info: "border border-blue-400/50 bg-blue-400/10 text-blue-300",
  warning: "border border-yellow-400/50 bg-yellow-400/10 text-yellow-300",
};

export function Banner({
  variant = "info",
  children,
  className,
  compact,
}: BannerProps) {
  const padding = compact ? "p-3" : "p-4";

  const classes = [
    baseClasses,
    variantClasses[variant],
    padding,
    "gap-3",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
}

