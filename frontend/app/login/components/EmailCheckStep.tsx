"use client";

import { Pencil } from "lucide-react";
import { Flow } from "../page";


interface EmailCheckStepProps {
  email: string;
  setEmail: (email: string) => void;
  flow: Flow;
  setFlow: (flow: Flow) => void;
  setError: (msg: string) => void;
  setSuccessMsg: (msg: string) => void;
  setPassword: (pwd: string) => void;
  setConfirmPassword: (pwd: string) => void;
}

export function EmailCheckStep({
  email,
  setEmail,
  flow,
  setFlow,
  setError,
  setSuccessMsg,
  setPassword,
  setConfirmPassword,
}: EmailCheckStepProps) {
  const isReadOnly = flow !== "email-check" && flow !== "reset-password";

  const handleEditClick = () => {
    setFlow("email-check");
    setError("");
    setSuccessMsg("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="email"
        className="text-xs font-mono text-text-secondary uppercase tracking-widest font-bold"
      >
        EMAIL
      </label>
      <div className="relative">
        <input
          id="email"
          type="email"
          placeholder="example@mail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}

          required
          readOnly={isReadOnly}
          autoComplete="email"
          tabIndex={isReadOnly ? -1 : 0}
          className={`w-full bg-background border border-border px-4 py-3 text-sm font-mono text-white focus:outline-none transition-colors placeholder:text-border rounded-none ${
            isReadOnly
              ? "pr-10 text-neutral-400 opacity-80 pointer-events-none"
              : "focus:border-white"
          }`}
        />
        {isReadOnly && (
          <button
            type="button"
            onClick={handleEditClick}
            className="absolute inset-y-0 right-0 p-3 flex items-center justify-center text-text-secondary hover:text-white transition-colors h-full cursor-pointer"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
