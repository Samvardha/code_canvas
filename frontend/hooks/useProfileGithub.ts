import { useState, useCallback, useRef, useEffect } from "react";
import { GitHubProfileData } from "../app/profile/types";
import { getPublicGitHubProfile } from "../lib/api/users";
import { useAuth } from "@/contexts/AuthContext";

export type GitHubFetchResponse =
  | { connected: false }
  | { connected: true; data: GitHubProfileData };

interface UseProfileGithubProps {
  user: { providerData?: { providerId: string }[] } | null;
  backendUid: string | null;
  profileComplete: boolean;
  isCurrentUser: boolean;
  username: string; // The app username for the profile being viewed
  publicGithubLinked?: boolean;
}

export function useProfileGithub({
  user,
  backendUid,
  profileComplete,
  isCurrentUser,
  username,
  publicGithubLinked,
}: UseProfileGithubProps) {
  const { fetchGitHubProfile, linkGitHub, user: authUser } = useAuth();
  const [githubData, setGithubData] = useState<GitHubProfileData | null>(null);
  const [ghLoading, setGhLoading] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const hasFetchedGhRef = useRef(false);
  useEffect(() => {
    hasFetchedGhRef.current = false;
    setGithubData(null);
    setLinkError("");
    setPage(1);
    setHasMore(true);
  }, [username]);

  const loadGitHub = useCallback(
    async (force = false) => {
      if (!authUser || !backendUid) return;
      if (isCurrentUser && !profileComplete) return;
      
      if (hasFetchedGhRef.current && !force) return;

      hasFetchedGhRef.current = true;
      setGhLoading(true);
      setPage(1);
      setHasMore(true);

      const MAX_RETRIES = 3;
      const RETRY_DELAY = 1500;
      let retries = 0;

      while (retries < MAX_RETRIES) {
        try {
          const idToken = await authUser.getIdToken();
          let data: GitHubFetchResponse | null = null;
          
          if (isCurrentUser) {
            data = await fetchGitHubProfile(1, 9);
          } else {
            data = await getPublicGitHubProfile(username, idToken, 1, 9);
          }

          if (data && data.connected === false) {
            setGithubData(null);
            setGhLoading(false);
            hasFetchedGhRef.current = false;
            return;
          }

          if (data?.connected && data?.data) {
            setGithubData(data.data as GitHubProfileData);
            setGhLoading(false);
            if (data.data.repositories.repositories.length < 9) {
              setHasMore(false);
            }
            return;
          }

          retries++;
          if (retries < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, RETRY_DELAY));
          }
        } catch (err) {
          retries++;
          if (retries < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, RETRY_DELAY));
          } else {
            console.error("Failed to fetch GitHub profile", err);
            setLinkError("Failed to fetch GitHub profile");
            setGhLoading(false);
          }
        }
      }

      setGhLoading(false);
    },
    [authUser, backendUid, profileComplete, isCurrentUser, username, fetchGitHubProfile],
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !authUser || !githubData) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const idToken = await authUser.getIdToken();
      let res;
      if (isCurrentUser) {
        res = await fetchGitHubProfile(nextPage, 9);
      } else {
        res = await getPublicGitHubProfile(username, idToken, nextPage, 9);
      }
      
      if (res?.connected && res.data) {
        const newData = res.data as GitHubProfileData;
        if (newData.repositories.repositories.length === 0) {
          setHasMore(false);
        } else {
          setGithubData(prev => {
            if (!prev) return newData;
            return {
              ...prev,
              repositories: {
                ...prev.repositories,
                repositories: [...prev.repositories.repositories, ...newData.repositories.repositories]
              }
            };
          });
          setPage(nextPage);
          if (newData.repositories.repositories.length < 9) {
            setHasMore(false);
          }
        }
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Load more failed", err);
    } finally {
      setLoadingMore(false);
    }
  }, [page, hasMore, loadingMore, authUser, githubData, isCurrentUser, username, fetchGitHubProfile]);

  const handleGitHubLink = async () => {
    if (!isCurrentUser) return;
    setLinkError("");
    try {
      await linkGitHub();
      await loadGitHub(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to link GitHub";
      setLinkError(message);
    }
  };

  const hasGitHub = isCurrentUser
    ? !!user?.providerData?.some((p: any) => p.providerId === "github.com")
    : !!publicGithubLinked;

  const connected = !!githubData;

  const aggregateFromRepos = githubData?.repositories?.repositories
    ? githubData.repositories.repositories.reduce((acc, repo) => {
        repo.languages.forEach((lang) => {
          acc[lang] = (acc[lang] || 0) + 1;
        });
        return acc;
      }, {} as Record<string, number>)
    : {};

  const langEntries = Object.entries(aggregateFromRepos).sort(
    ([, a], [, b]) => b - a,
  );
  const totalLangCount = langEntries.reduce((s, [, v]) => s + v, 0);

  return {
    githubData,
    ghLoading,
    linkError,
    loadGitHub,
    loadMore,
    handleGitHubLink,
    hasGitHub,
    connected,
    langEntries,
    totalLangCount,
    hasFetchedGhRef,
    hasMore,
    loadingMore,
  };
}
