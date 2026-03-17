import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Post, FeedResponse } from "@/lib/api/posts";

export function useFeed(fetchFn: (token: string, offset: number, limit: number) => Promise<FeedResponse>) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const fetchedRef = useRef<string | null>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<{ isVisible: boolean; message: string }>({
    isVisible: false,
    message: "",
  });

  const LIMIT = 10;

  const fetchPosts = useCallback(async (userToken: string, currentOffset: number = 0, isInitial: boolean = true) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const data = await fetchFn(userToken, currentOffset, LIMIT);
      
      if (isInitial) {
        setPosts(data.posts);
      } else {
        setPosts(prev => [...prev, ...data.posts]);
      }
      
      setHasMore(data.has_more);
      setOffset(currentOffset + data.posts.length);
    } catch (err: any) {
      console.error("Failed to fetch signals:", err);
      setErrorToast({
        isVisible: true,
        message: err.message || "FAILED_TO_INTERCEPT_SIGNALS",
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [fetchFn]);

  const loadMore = useCallback(() => {
    if (token && hasMore && !loadingMore && !loading) {
      fetchPosts(token, offset, false);
    }
  }, [token, hasMore, loadingMore, loading, offset, fetchPosts]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user && fetchedRef.current !== user.uid) {
      fetchedRef.current = user.uid;
      user.getIdToken().then((t) => {
        setToken(t);
        fetchPosts(t, 0, true);
      });
    }
  }, [user, authLoading, router, fetchPosts]);

  return {
    posts,
    setPosts,
    loading,
    loadingMore,
    hasMore,
    token,
    authLoading,
    user,
    errorToast,
    setErrorToast,
    loadMore,
  };
}
