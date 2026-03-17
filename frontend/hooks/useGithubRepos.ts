"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { getUserRepos, GitHubRepo } from "@/lib/api/users";

export const useGithubRepos = (token: string | null) => {
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubPage, setGithubPage] = useState(1);
  const [hasMoreRepos, setHasMoreRepos] = useState(true);
  const [showRepoDropdown, setShowRepoDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchRepos = useCallback(
    async (page: number = 1, force: boolean = false) => {
      if (!token || (githubLoading && page === 1)) return;

      if (page === 1 && repos.length > 0 && !force) {
        return;
      }

      setGithubLoading(true);
      try {
        const data = await getUserRepos(token, page, 9);
        if (page === 1) {
          setRepos(data.repos);
        } else {
          setRepos((prev) => [...prev, ...data.repos]);
        }
        setHasMoreRepos(data.has_more);
        setGithubPage(page);
      } catch (err: any) {
        console.error("Failed to fetch GitHub repos:", err);
        if (page === 1) setRepos([]);
      } finally {
        setGithubLoading(false);
      }
    },
    [token, githubLoading, repos.length],
  );

  const handleRepoSelect = useCallback((repo: GitHubRepo) => {
    setSelectedRepo((prev) => (prev?.repo_url === repo.repo_url ? null : repo));
    setShowRepoDropdown(false);
  }, []);

  const resetGithub = useCallback(() => {
    setSelectedRepo(null);
    setRepos([]);
    setGithubPage(1);
    setHasMoreRepos(true);
    setShowRepoDropdown(false);
  }, []);

  return useMemo(
    () => ({
      selectedRepo,
      repos,
      githubLoading,
      githubPage,
      hasMoreRepos,
      showRepoDropdown,
      dropdownRef,
      setSelectedRepo,
      setShowRepoDropdown,
      fetchRepos,
      handleRepoSelect,
      resetGithub,
      setRepos,
      setGithubPage,
      setHasMoreRepos,
    }),
    [
      selectedRepo,
      repos,
      githubLoading,
      githubPage,
      hasMoreRepos,
      showRepoDropdown,
      fetchRepos,
      handleRepoSelect,
      resetGithub,
    ],
  );
};

