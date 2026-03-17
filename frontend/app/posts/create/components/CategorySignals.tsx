"use client";

import React from "react";
import { Users, Calendar, Loader2 } from "lucide-react";

interface CategorySignalsProps {
  selectedCategory: string | null;
  toggleCategory: (cat: string) => void;
  isGithubConnected: boolean | null;
  editId: string | null;
}

export const CategorySignals = ({
  selectedCategory,
  toggleCategory,
  isGithubConnected,
  editId,
}: CategorySignalsProps) => {
  return (
    <div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-mono font-black text-text-secondary uppercase tracking-widest">
          SELECT_POST_TYPE
        </label>
        <p className="text-[10px] font-mono text-accent uppercase italic tracking-wider">
          {editId
            ? "> POST_TYPE_IS_LOCKED_FOR_EXISTING_SIGNALS"
            : "> IF NONE SELECTED, BROADCAST WILL BE TAGGED AS GENERAL"}
        </p>
      </div>
      <div className="flex gap-4">
        {["collab", "event"].map((cat) => {
          const isLoadingGit = cat === "collab" && isGithubConnected === null;
          const isDisabled = cat === "collab" && isGithubConnected === false;
          return (
            <button
              key={cat}
              type="button"
              onClick={() =>
                !isDisabled && !isLoadingGit && !editId && toggleCategory(cat)
              }
              disabled={isDisabled || isLoadingGit || !!editId}
              className={`flex-1 py-4 px-6 border font-mono text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-3 mt-4 ${
                selectedCategory === cat
                  ? "border-accent bg-accent/5 text-accent"
                  : isLoadingGit
                    ? "border-border/50 bg-background/20 text-text-secondary/30 pointer-events-none animate-pulse"
                    : isDisabled || !!editId
                      ? "border-border/50 bg-background/20 text-text-secondary/30 cursor-not-allowed opacity-50"
                      : "border-border bg-background/50 text-text-secondary hover:border-text-secondary hover:bg-surface/30"
              }`}
            >
              {cat === "collab" ? (
                isLoadingGit ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Users className="w-4 h-4" />
                )
              ) : (
                <Calendar className="w-4 h-4" />
              )}
              {cat}
              {isDisabled && !isLoadingGit && (
                <span className="text-[10px] normal-case font-normal opacity-60 block">
                  (GITHUB_LINK_REQUIRED)
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
