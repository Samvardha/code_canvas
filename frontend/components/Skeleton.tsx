import React from "react";
import { motion } from "framer-motion";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
}

export function Skeleton({ className = "", width, height, borderRadius }: SkeletonProps) {
  return (
    <div
      style={{
        width: width ?? "100%",
        height: height ?? "100%",
        borderRadius: borderRadius ?? "0",
      }}
      className={`relative overflow-hidden bg-white/5 border border-white/10 ${className}`}
    >
      <motion.div
        animate={{
          x: ["-100%", "100%"],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent"
      />
    </div>
  );
}
