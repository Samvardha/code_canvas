"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  GithubAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  getAdditionalUserInfo,
  linkWithPopup,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  backendUid: string | null;
  profileComplete: boolean;
  userProfile: any | null;
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<User>;
  signInWithEmail: (email: string, password: string) => Promise<User>;
  linkGitHub: () => Promise<void>;
  logout: () => Promise<void>;
  fetchGitHubProfile: (page?: number, per_page?: number) => Promise<any>;
  fetchUserProfile: () => Promise<any>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();
githubProvider.setCustomParameters({
  prompt: "select_account",
});

async function syncBackendSession(
  user: User,
  providerId: string,
  githubAccessToken?: string,
  profileEmail?: string,
): Promise<string | null> {
  try {
    const idToken = await user.getIdToken();
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

    const resolvedEmail =
      user.email || user.providerData?.[0]?.email || profileEmail || null;

    const res = await fetch(`${backendUrl}/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_token: idToken,
        provider_id: providerId,
        github_access_token: githubAccessToken || null,
        email: resolvedEmail,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.uid;
    }
    return null;
  } catch {
    console.error("Backend sync failed");
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendUid, setBackendUid] = useState<string | null>(null);
  const [profileComplete, setProfileComplete] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const signingInRef = useRef(false);

  const fetchUserProfile = React.useCallback(async () => {
    if (!auth.currentUser) return null;
    try {
      const idToken = await auth.currentUser.getIdToken();
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${backendUrl}/users/me`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
        setProfileComplete(data.profile_complete || false);
        return data;
      }
      return null;
    } catch {
      console.error("Failed to fetch user profile");
      return null;
    }
  }, []);

  const refreshProfile = React.useCallback(async () => {
    await fetchUserProfile();
  }, [fetchUserProfile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Always update Firebase user state
      setUser(firebaseUser);
      
      if (firebaseUser) {
        if (signingInRef.current) {
          // Manual sign-in flow handles its own setLoading(false)
          return;
        }

        const providerId = firebaseUser.providerData[0]?.providerId || "unknown";
        const uid = await syncBackendSession(firebaseUser, providerId);
        setBackendUid(uid);
        if (uid) {
          await fetchUserProfile();
        }
      } else {
        setBackendUid(null);
        setUserProfile(null);
        setProfileComplete(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchUserProfile]);

  const signInWithGoogle = React.useCallback(async () => {
    signingInRef.current = true;
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const additionalInfo = getAdditionalUserInfo(result);
      const profileEmail = (additionalInfo?.profile as Record<string, unknown>)
        ?.email as string | undefined;
      const uid = await syncBackendSession(
        result.user,
        "google.com",
        undefined,
        profileEmail,
      );
      setBackendUid(uid);
      if (uid) {
        await fetchUserProfile();
      }
    } finally {
      setLoading(false);
      // Small delay to ensure onAuthStateChanged sees the ref before it turns false
      setTimeout(() => {
        signingInRef.current = false;
      }, 500);
    }
  }, [fetchUserProfile]);

  const signInWithGitHub = React.useCallback(async () => {
    signingInRef.current = true;
    try {
      const result = await signInWithPopup(auth, githubProvider);
      const credential = GithubAuthProvider.credentialFromResult(result);
      const githubAccessToken = credential?.accessToken;
      const additionalInfo = getAdditionalUserInfo(result);
      const profileEmail = (additionalInfo?.profile as Record<string, unknown>)
        ?.email as string | undefined;
      const uid = await syncBackendSession(
        result.user,
        "github.com",
        githubAccessToken,
        profileEmail,
      );
      setBackendUid(uid);
      if (uid) {
        await fetchUserProfile();
      }
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      if (
        firebaseError.code === "auth/account-exists-with-different-credential"
      ) {
        throw new Error(
          "An account with this email already exists. Please sign in with Google or Email instead, then link GitHub from your profile.",
        );
      }
      throw error;
    } finally {
      setLoading(false);
      setTimeout(() => {
        signingInRef.current = false;
      }, 500);
    }
  }, [fetchUserProfile]);

  const signUpWithEmail = React.useCallback(async (email: string, password: string) => {
    signingInRef.current = true;
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const uid = await syncBackendSession(result.user, "password");
      setBackendUid(uid);
      if (uid) {
        await fetchUserProfile();
      }
      return result.user;
    } finally {
      setLoading(false);
      setTimeout(() => {
        signingInRef.current = false;
      }, 500);
    }
  }, [fetchUserProfile]);

  const signInWithEmail = React.useCallback(async (email: string, password: string) => {
    signingInRef.current = true;
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const uid = await syncBackendSession(result.user, "password");
      setBackendUid(uid);
      if (uid) {
        await fetchUserProfile();
      }
      return result.user;
    } finally {
      setLoading(false);
      setTimeout(() => {
        signingInRef.current = false;
      }, 500);
    }
  }, [fetchUserProfile]);

  const logout = React.useCallback(async () => {
    await signOut(auth);
    setBackendUid(null);
    setUserProfile(null);
    setProfileComplete(false);
  }, []);

  const linkGitHub = React.useCallback(async () => {
    if (!auth.currentUser) return;
    signingInRef.current = true;
    try {
      const result = await linkWithPopup(auth.currentUser, githubProvider);
      const credential = GithubAuthProvider.credentialFromResult(result);
      const githubAccessToken = credential?.accessToken;
      const additionalInfo = getAdditionalUserInfo(result);
      const profileEmail = (additionalInfo?.profile as Record<string, unknown>)
        ?.email as string | undefined;
      const uid = await syncBackendSession(
        result.user,
        "github.com",
        githubAccessToken,
        profileEmail,
      );
      setBackendUid(uid);
      if (uid) {
        await fetchUserProfile();
      }
      setUser({ ...result.user } as User);
    } catch (error) {
      console.error("Link GitHub error:", error);
      throw error;
    } finally {
      setLoading(false);
      setTimeout(() => {
        signingInRef.current = false;
      }, 500);
    }
  }, [fetchUserProfile]);

  const fetchGitHubProfile = React.useCallback(
    async (page: number = 1, per_page: number = 9) => {
      if (!auth.currentUser) return null;
      try {
        const idToken = await auth.currentUser.getIdToken();
        const backendUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
        const res = await fetch(
          `${backendUrl}/users/me/github?page=${page}&per_page=${per_page}`,
          {
            headers: { Authorization: `Bearer ${idToken}` },
          },
        );
        if (res.ok) {
          return await res.json();
        }
        return null;
      } catch {
        console.error("Failed to fetch GitHub profile");
        return null;
      }
    },
    [],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        backendUid,
        profileComplete,
        userProfile,
        signInWithGoogle,
        signInWithGitHub,
        signUpWithEmail,
        signInWithEmail,
        linkGitHub,
        logout,
        fetchGitHubProfile,
        fetchUserProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
