"use client";

import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";

export function OnboardingHeader() {
  const { logout } = useAuth();
  
  return (
    <header className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
      <h1 className="text-4xl font-black font-(family-name:--font-space-grotesk) uppercase text-white leading-none">
        PROFILE_<span className="text-accent text-outline">SETUP</span>
      </h1>
      <button
        onClick={logout}
        type="button"
        className="flex items-center gap-2 text-[10px] sm:text-[11px] font-mono font-bold text-accent hover:text-white transition-all duration-300 uppercase tracking-widest px-4 py-2 border border-border bg-background hover:bg-black cursor-pointer"
      >
        <LogOut className="w-3.5 h-3.5" />
        CHANGE_ACCOUNT
      </button>
    </header>
  );
}
