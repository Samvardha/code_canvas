"use client";

import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Flow } from "../page";

import { passwordConstraints } from "@/lib/utils/validation";


interface PasswordStepProps {
  flow: Flow;
  password: string;
  setPassword: (pwd: string) => void;
  confirmPassword: string;
  setConfirmPassword: (pwd: string) => void;
  onForgotPassword: () => void;
}

export function PasswordStep({
  flow,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  onForgotPassword,
}: PasswordStepProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (flow !== "password-login" && flow !== "signup") return null;

  const trimmedPassword = password.trim();
  const trimmedConfirmPassword = confirmPassword.trim();

  return (
    <motion.div
      initial={{ opacity: 0, height: 0, marginTop: 0 }}
      animate={{ opacity: 1, height: "auto", marginTop: 16 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="flex flex-col gap-2 overflow-hidden"
    >
      <label
        htmlFor="password"
        className="text-xs font-mono text-text-secondary uppercase tracking-widest font-bold"
      >
        PASSWORD
      </label>
      <div className="relative">
        <input
          id="password"
          type={showPassword ? "text" : "password"}
          placeholder="Example@1"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete={flow === "signup" ? "new-password" : "current-password"}

          className="w-full bg-background border border-border px-4 py-3 pr-10 text-sm font-mono text-white focus:outline-none focus:border-white transition-colors placeholder:text-border rounded-none tracking-widest"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 p-3 pt-3.5 flex items-center justify-center text-text-secondary hover:text-white transition-colors h-full cursor-pointer"
          tabIndex={-1}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {flow === "signup" && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-[10px] uppercase font-mono tracking-widest font-bold">
          <ConstraintItem
            label="8+ CHARS"
            met={passwordConstraints.hasMinLength(password)}
          />
          <ConstraintItem
            label="UPPERCASE"
            met={passwordConstraints.hasUpperCase(password)}
          />
          <ConstraintItem
            label="LOWERCASE"
            met={passwordConstraints.hasLowerCase(password)}
          />
          <ConstraintItem
            label="0-9"
            met={passwordConstraints.hasNumber(password)}
          />
          <ConstraintItem
            label="SPECIAL"
            met={passwordConstraints.hasSpecialChar(password)}
          />
        </div>
      )}

      {flow === "signup" && (
        <div className="flex flex-col gap-2 mt-4">
          <label
            htmlFor="confirmPassword"
            className="text-xs font-mono text-text-secondary uppercase tracking-widest font-bold"
          >
            CONFIRM PASSWORD
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Example@1"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full bg-background border border-border px-4 py-3 pr-10 text-sm font-mono text-white focus:outline-none focus:border-white transition-colors placeholder:text-border rounded-none tracking-widest"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 p-3 pt-3.5 flex items-center justify-center text-text-secondary hover:text-white transition-colors h-full cursor-pointer"
              tabIndex={-1}
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-[10px] uppercase font-mono tracking-widest font-bold">
            <ConstraintItem
              label="PASSWORDS MATCH"
              met={
                confirmPassword.length > 0 &&
                passwordConstraints.matchesConfirm(password, confirmPassword)
              }
            />
          </div>
        </div>
      )}

      {flow === "password-login" && (
        <div className="text-right mt-1">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onForgotPassword();
            }}
            className="text-[10px] font-mono text-accent uppercase tracking-widest cursor-pointer"
          >
            FORGOT PASSWORD?
          </button>
        </div>
      )}
    </motion.div>
  );
}

function ConstraintItem({ label, met }: { label: string; met: boolean }) {
  return (
    <div
      className={`flex items-center gap-1.5 transition-colors duration-300 ${
        met ? "text-white" : "text-neutral-600"
      }`}
    >
      <div
        className={`w-2.5 h-2.5 border transition-colors duration-300 ${
          met ? "bg-white border-white" : "bg-transparent border-neutral-600"
        }`}
      />
      {label}
    </div>
  );
}
