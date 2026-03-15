"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Flow } from "../page";


interface AuthHeaderProps {
  flow: Flow;
  onBack: () => void;
}

export function AuthHeader({ flow, onBack }: AuthHeaderProps) {
  const getTitle = () => {
    if (flow === "reset-password") return "RESET PASSWORD";
    if (flow === "signup") return "SIGNUP";
    if (flow === "password-login") return "LOGIN";
    return (
      <>
        LOGIN <span className="text-accent text-outline">/</span> SIGNUP
      </>
    );
  };

  return (
    <div className="flex items-center border-b border-border p-4 sm:p-6 bg-background relative overflow-hidden">
      <AnimatePresence>
        {flow !== "email-check" && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 40 }}
            exit={{ width: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="shrink-0 overflow-hidden"
          >
            <motion.button
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              type="button"
              onClick={onBack}
              className="text-text-secondary hover:text-white transition-colors cursor-pointer flex items-center pr-4"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 whitespace-nowrap overflow-hidden">
        <h1 className="text-3xl sm:text-4xl font-black font-(family-name:--font-space-grotesk) uppercase text-white truncate">
          {getTitle()}
        </h1>
      </div>
    </div>
  );
}
