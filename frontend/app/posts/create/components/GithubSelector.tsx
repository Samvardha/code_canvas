"use client";

import React from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GitHubRepo } from "@/lib/api/users";

interface GithubSelectorProps {
  selectedRepo: GitHubRepo | null;
  repos: GitHubRepo[];
  githubLoading: boolean;
  hasMoreRepos: boolean;
  githubPage: number;
  showRepoDropdown: boolean;
  setShowRepoDropdown: (show: boolean) => void;
  fetchRepos: (page?: number, force?: boolean) => void;
  handleRepoSelect: (repo: GitHubRepo) => void;
  isGithubConnected: boolean | null;
  selectedCategory: string | null;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}

export const GithubSelector = ({
  selectedRepo,
  repos,
  githubLoading,
  hasMoreRepos,
  githubPage,
  showRepoDropdown,
  setShowRepoDropdown,
  fetchRepos,
  handleRepoSelect,
  isGithubConnected,
  selectedCategory,
  dropdownRef,
}: GithubSelectorProps) => {
  if (selectedCategory === "event" || !isGithubConnected) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="text-[11px] font-mono font-black text-text-secondary uppercase tracking-widest">
        CHOOSE_GITHUB_PROJECT
      </label>
      <button
        type="button"
        onClick={() => {
          if (!showRepoDropdown) {
            fetchRepos(1);
          }
          setShowRepoDropdown(!showRepoDropdown);
        }}
        className="w-full bg-background/30 border border-border p-4 text-sm font-mono text-white flex items-center justify-between hover:border-accent/40 transition-colors mt-4 cursor-pointer"
      >
        <span className={selectedRepo ? "text-white" : "text-white/40"}>
          {selectedRepo ? selectedRepo.repo_name : "SELECT_REPOSITORY"}
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${showRepoDropdown ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {showRepoDropdown && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute z-30 w-full mt-2 bg-[#0A0A0A] border border-border shadow-2xl overflow-hidden"
          >
            <div
              className="max-h-60 overflow-y-auto hide-scrollbar"
              onScroll={(e) => {
                const target = e.currentTarget;
                if (
                  target.scrollHeight - target.scrollTop <=
                    target.clientHeight + 1 &&
                  !githubLoading &&
                  hasMoreRepos
                ) {
                  fetchRepos(githubPage + 1);
                }
              }}
            >
              {githubLoading && repos.length === 0 ? (
                <div className="p-4 flex items-center justify-center gap-2 text-accent font-mono text-[11px]">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  FETCHING_REPOSITORIES...
                </div>
              ) : repos.length === 0 ? (
                <div className="p-4 text-center text-border font-mono text-[11px]">
                  NO_REPOSITORIES_FOUND
                </div>
              ) : (
                <div className="p-1">
                  {repos.map((repo) => (
                    <button
                      key={repo.repo_url}
                      type="button"
                      onClick={() => handleRepoSelect(repo)}
                      className={`w-full text-left p-3 font-mono text-[11px] uppercase tracking-wider transition-colors flex items-center justify-between cursor-pointer ${
                        selectedRepo?.repo_url === repo.repo_url
                          ? "bg-white/10 text-white"
                          : "text-text-secondary hover:bg-surface/50 hover:text-white"
                      }`}
                    >
                      {repo.repo_name}
                      {selectedRepo?.repo_url === repo.repo_url && (
                        <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                      )}
                    </button>
                  ))}
                  {githubLoading && (
                    <div className="p-3 flex items-center justify-center gap-2 text-accent/50 font-mono text-[10px] uppercase tracking-widest">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      SYNCING_MORE_SIGNALS...
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
