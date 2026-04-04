import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Post, FeedResponse } from "@/lib/api/posts";
import { useInfiniteQuery, useQueryClient, InfiniteData } from "@tanstack/react-query";

export function useFeed(
  queryKey: string,
  fetchFn: (token: string, offset: number, limit: number) => Promise<FeedResponse>
) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const LIMIT = 10;

  const fullQueryKey = useMemo(() => [queryKey, user?.uid], [queryKey, user?.uid]);

  const getToken = useCallback(async () => {
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch (err) {
      console.error("Failed to get fresh token:", err);
      return null;
    }
  }, [user]);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useInfiniteQuery({
    queryKey: fullQueryKey,
    queryFn: async ({ pageParam = 0 }) => {
      const idToken = await getToken();
      if (!idToken) throw new Error("AUTH_REQUIRED");
      return fetchFn(idToken, pageParam, LIMIT);
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.has_more) return undefined;
      return allPages.reduce((acc, page) => acc + page.posts.length, 0);
    },
    enabled: !!user && !authLoading,
    initialPageParam: 0,
  });

  const posts = useMemo(() => {
    return data?.pages.flatMap((page) => page.posts) ?? [];
  }, [data]);

  const setPosts = (updater: Post[] | ((prev: Post[]) => Post[])) => {
    queryClient.setQueryData<InfiniteData<FeedResponse>>(fullQueryKey, (oldData) => {
      if (!oldData) return oldData;
      
      const currentPosts = oldData.pages.flatMap(p => p.posts);
      const newPosts = typeof updater === "function" ? updater(currentPosts) : updater;

      return {
        ...oldData,
        pages: [{
          ...oldData.pages[0],
          posts: newPosts,
          has_more: oldData.pages[oldData.pages.length - 1].has_more
        }]
      };
    });
  };

  const [errorToast, setErrorToast] = useState<{ isVisible: boolean; message: string }>({
    isVisible: false,
    message: "",
  });

  useEffect(() => {
    if (error) {
      setErrorToast({
        isVisible: true,
        message: (error as any).message || "FAILED_TO_INTERCEPT_SIGNALS",
      });
    }
  }, [error]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  return {
    posts,
    setPosts,
    loading: isLoading,
    loadingMore: isFetchingNextPage,
    hasMore: hasNextPage,
    getToken,
    authLoading,
    user,
    errorToast,
    setErrorToast,
    loadMore: fetchNextPage,
  };
}
