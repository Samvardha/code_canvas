import { useMemo, useCallback, useState } from "react";
import { GitHubProfileData } from "../app/profile/types";
import { getPublicGitHubProfile } from "../lib/api/users";
import { useAuth } from "@/contexts/AuthContext";
import { useInfiniteQuery, InfiniteData } from "@tanstack/react-query";

export type GitHubFetchResponse =
  | { connected: false }
  | { connected: true; data: GitHubProfileData };

interface UseProfileGithubProps {
  user: { providerData?: { providerId: string }[] } | null;
  backendUid: string | null;
  profileComplete: boolean;
  isCurrentUser: boolean;
  username: string;
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
  const [linkError, setLinkError] = useState("");

  const PAGE_SIZE = 9;

  const {
    data,
    isLoading: ghLoading,
    isFetchingNextPage: loadingMore,
    hasNextPage: hasMore,
    fetchNextPage,
    refetch,
    isError,
    error,
  } = useInfiniteQuery<GitHubFetchResponse, Error, InfiniteData<GitHubFetchResponse>, string[], number>({
    queryKey: ["githubProfile", username],

    queryFn: async ({ pageParam = 1 }) => {
      if (!authUser || !backendUid) return { connected: false };
      if (isCurrentUser && !profileComplete) return { connected: false };

      const idToken = await authUser.getIdToken();
      let response: GitHubFetchResponse;

      try {
        if (isCurrentUser) {
          response = await fetchGitHubProfile(pageParam, PAGE_SIZE);
        } else {
          response = await getPublicGitHubProfile(username, idToken, pageParam, PAGE_SIZE);
        }

        if (!response || response.connected === false) {
          return { connected: false };
        }

        return response;
      } catch (err) {
        console.error("GitHub Fetch Error:", err);
        throw err;
      }
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: GitHubFetchResponse, allPages) => {
      if (!lastPage || lastPage.connected === false) return undefined;
      const repos = lastPage.data.repositories.repositories;
      if (repos.length < PAGE_SIZE) return undefined;
      return allPages.length + 1;
    },

    // Only enable if we have a user and (if current user) profile is complete
    enabled: !!authUser && !!backendUid && (!isCurrentUser || profileComplete),
    staleTime: 3 * 60 * 1000, // 3 minute
    retry: 2,
    retryDelay: 1000,
  });

  const githubData = useMemo(() => {
    if (!data || data.pages.length === 0) return null;
    
    const pages = data.pages as GitHubFetchResponse[];
    const firstPage = pages.find((p): p is { connected: true; data: GitHubProfileData } => p.connected === true);
    if (!firstPage) return null;

    const allRepos = pages.flatMap(page => 
      page.connected ? page.data.repositories.repositories : []
    );


    return {
      ...firstPage.data,
      repositories: {
        ...firstPage.data.repositories,
        repositories: allRepos
      }
    };
  }, [data]);

  const loadGitHub = useCallback(async (force = false) => {
    if (force) {
      setLinkError("");
      refetch();
    }
  }, [refetch]);

  const handleGitHubLink = async () => {
    if (!isCurrentUser) return;
    setLinkError("");
    try {
      await linkGitHub();
      await refetch();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to link GitHub";
      setLinkError(message);
    }
  };

  const hasGitHub = isCurrentUser
    ? !!user?.providerData?.some((p: any) => p.providerId === "github.com")
    : !!publicGithubLinked;

  const connected = !!githubData;

  const aggregateFromRepos = useMemo(() => {
    if (!githubData?.repositories?.repositories) return {};
    return githubData.repositories.repositories.reduce((acc, repo) => {
      repo.languages.forEach((lang) => {
        acc[lang] = (acc[lang] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);
  }, [githubData]);

  const langEntries = useMemo(() => 
    Object.entries(aggregateFromRepos).sort(([, a], [, b]) => (b as number) - (a as number)) as [string, number][],
    [aggregateFromRepos]
  );

  const totalLangCount = useMemo(() => 
    langEntries.reduce((s, [, v]) => s + (v as number), 0),
    [langEntries]
  );


  // Combine query errors with link errors
  const finalError = linkError || (isError ? (error as any)?.message || "Failed to fetch GitHub profile" : "");

  return {
    githubData,
    ghLoading,
    linkError: finalError,
    loadGitHub,
    loadMore: fetchNextPage,
    handleGitHubLink,
    hasGitHub,
    connected,
    langEntries,
    totalLangCount,
    hasMore,
    loadingMore,
  };
}
