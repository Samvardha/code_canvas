"use client";

import { User } from "firebase/auth";
import { Banner } from "@/components/Banner";
import { motion, AnimatePresence } from "framer-motion";

interface VerificationStepProps {
  user: User | null;
  email: string;
  error: string;
  successMsg: string;
  emailLoading: boolean;
  resendCooldown: number;
  onVerify: () => Promise<void>;
  onResend: () => Promise<void>;
  onLogout: () => Promise<void>;
}

export function VerificationStep({
  user,
  email,
  error,
  successMsg,
  emailLoading,
  resendCooldown,
  onVerify,
  onResend,
  onLogout,
}: VerificationStepProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-black px-4 relative overflow-hidden py-4 sm:py-8">
      <div className="w-full max-w-[480px] border border-border bg-surface relative z-10 flex flex-col group shadow-2xl h-max my-auto text-center p-8 sm:p-10 gap-6">
        <h1 className="text-3xl font-black font-(family-name:--font-space-grotesk) uppercase text-white">
          VERIFY <span className="text-accent text-outline">EMAIL</span>
        </h1>

        <AnimatePresence mode="popLayout">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <Banner variant="error">{error}</Banner>
            </motion.div>
          )}
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <Banner variant="success">{successMsg}</Banner>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-xs font-mono text-text-secondary leading-loose">
          A verification link has been transmitted to <br />
          <span className="text-white font-bold bg-white/5 py-1 px-2 border border-border">
            {user?.email || email}
          </span>
          <br />
          <br />
          Check your inbox to establish connection to the network.
        </p>

        <button
          onClick={onVerify}
          className="w-full inline-flex items-center justify-center gap-3 bg-white text-black px-6 py-3 text-sm font-bold uppercase tracking-widest hover:bg-transparent hover:text-white transition-colors duration-300 border-2 border-white mt-4 cursor-pointer"
        >
          I HAVE VERIFIED
        </button>

        <button
          onClick={onResend}
          disabled={emailLoading || resendCooldown > 0}
          className="w-full inline-flex items-center justify-center gap-3 bg-transparent text-text-secondary px-6 py-3 text-sm font-bold uppercase tracking-widest hover:text-white transition-colors duration-300 border border-border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-text-secondary"
        >
          {resendCooldown > 0
            ? `RESEND EMAIL (${resendCooldown})`
            : "RESEND EMAIL"}
        </button>

        <button
          onClick={onLogout}
          className="text-xs font-mono text-accent uppercase tracking-widest font-bold mt-4 cursor-pointer"
        >
          [ CANCEL & LOGOUT ]
        </button>
      </div>
    </div>
  );
}
