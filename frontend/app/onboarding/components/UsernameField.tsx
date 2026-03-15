"use client";

import { UsernameStatus } from "../types";

interface UsernameFieldProps {
  username: string;
  status: UsernameStatus;
  onChange: (val: string) => void;
  onCheck: () => void;
}

export function UsernameField({
  username,
  status,
  onChange,
  onCheck,
}: UsernameFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-end">
        <label className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
          Username <span className="text-accent">*</span>
        </label>
        {status !== "idle" && (
          <span
            className={`text-[10px] font-mono font-bold uppercase ${
              status === "available"
                ? "text-green-500"
                : status === "checking"
                  ? "text-text-secondary animate-pulse"
                  : "text-accent"
            }`}
          >
            {status === "checking" && "[ CHECKING... ]"}
            {status === "available" && "[ AVAILABLE ]"}
            {status === "taken" && "[ TAKEN ]"}
            {status === "invalid" && "[ INVALID ]"}
          </span>
        )}
      </div>
      <div className="relative flex items-center">
        <input
          type="text"
          required
          placeholder="Letters, numbers, and underscores only"
          value={username}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-background border px-4 py-3 pr-20 text-sm font-mono text-white focus:outline-none transition-colors ${
            status === "available"
              ? "border-green-500/50"
              : status === "taken" || status === "invalid"
                ? "border-accent/50"
                : "border-border focus:border-white"
          }`}
        />
        <button
          type="button"
          onClick={onCheck}
          disabled={!username.trim() || status === "checking"}
          className="absolute right-2 px-3 py-1 bg-border hover:bg-white hover:text-black text-[10px] font-mono font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {status === "checking" ? "..." : "CHECK"}
        </button>
      </div>
    </div>
  );
}
