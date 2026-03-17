"use client";

import React from "react";
import { formatUrlChars } from "../utils";

interface ExternalUplinkProps {
  link: string;
  setLink: (link: string) => void;
  loading: boolean;
}

export const ExternalUplink = ({
  link,
  setLink,
  loading,
}: ExternalUplinkProps) => {
  return (
    <div>
      <label className="text-[11px] font-mono font-black text-text-secondary uppercase tracking-widest">
        EXTERNAL_UPLINK (SINGLE_LINK_ONLY)
      </label>
      <input
        type="url"
        value={link}
        onChange={(e) => {
          const val = formatUrlChars(e.target.value);
          setLink(val);
        }}
        placeholder="ENTER_EXTERNAL_LINK"
        className="w-full bg-background/30 border border-border p-4 text-sm font-mono text-white placeholder:text-white/40 focus:ring-1 focus:ring-accent outline-none transition-colors mt-4"
        disabled={loading}
      />
    </div>
  );
};
