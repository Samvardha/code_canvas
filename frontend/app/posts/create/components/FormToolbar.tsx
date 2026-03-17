"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/Button";

interface FormToolbarProps {
  loading: boolean;
  editId: string | null;
  handleReset: () => void;
  handleSubmit: () => void;
}

export const FormToolbar = ({
  loading,
  editId,
  handleReset,
  handleSubmit,
}: FormToolbarProps) => {
  return (
    <div className="p-6 border-t border-border/50 flex items-center justify-end bg-background/50 shrink-0 transition-colors gap-4">
      <div className="flex">
        <button
          type="button"
          onClick={handleReset}
          disabled={loading}
          className="h-10 px-10 text-[11px] font-mono tracking-[0.2em] font-bold text-accent hover:text-white transition-colors duration-200 cursor-pointer disabled:opacity-50"
        >
          RESET
        </button>

        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="h-10 px-10 text-[11px] font-mono tracking-[0.2em] font-bold"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : editId ? (
            "UPDATE"
          ) : (
            "BROADCAST"
          )}
        </Button>
      </div>
    </div>
  );
};
