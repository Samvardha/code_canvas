import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Post } from "@/lib/api/posts";

export function useFeed(fetchFn: (token: string) => Promise<{ posts: Post[] }>) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const fetchedRef = useRef<string | null>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<{ isVisible: boolean; message: string }>({
    isVisible: false,
    message: "",
  });

  const fetchPosts = useCallback(async (userToken: string) => {
    try {
      setLoading(true);
      const data = await fetchFn(userToken);
      setPosts(data.posts);
    } catch (err: any) {
      console.error("Failed to fetch signals:", err);
      setErrorToast({
        isVisible: true,
        message: err.message || "FAILED_TO_INTERCEPT_SIGNALS",
      });
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user && fetchedRef.current !== user.uid) {
      fetchedRef.current = user.uid;
      user.getIdToken().then((t) => {
        setToken(t);
        fetchPosts(t);
      });
    }
  }, [user, authLoading, router, fetchPosts]);

  return {
    posts,
    setPosts,
    loading,
    token,
    authLoading,
    user,
    errorToast,
    setErrorToast,
    fetchPosts: () => token && fetchPosts(token),
  };
}
