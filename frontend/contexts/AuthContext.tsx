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
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<User>;
  signInWithEmail: (email: string, password: string) => Promise<User>;
  linkGitHub: () => Promise<void>;
  logout: () => Promise<void>;
  fetchGitHubProfile: () => Promise<any>;
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
  const signingInRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser && !signingInRef.current) {
        const providerId =
          firebaseUser.providerData[0]?.providerId || "unknown";
        const uid = await syncBackendSession(firebaseUser, providerId);
        setBackendUid(uid);
      } else if (!firebaseUser) {
        setBackendUid(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
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
    } finally {
      signingInRef.current = false;
    }
  };

  const signInWithGitHub = async () => {
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
      signingInRef.current = false;
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await syncBackendSession(result.user, "password");
    return result.user;
  };

  const signInWithEmail = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await syncBackendSession(result.user, "password");
    return result.user;
  };

  const logout = async () => {
    await signOut(auth);
    setBackendUid(null);
  };

  const linkGitHub = async () => {
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
      setUser({ ...result.user } as User);
    } catch (error) {
      console.error("Link GitHub error:", error);
      throw error;
    } finally {
      signingInRef.current = false;
    }
  };

  const fetchGitHubProfile = async () => {
    if (!auth.currentUser) return null;
    try {
      const idToken = await auth.currentUser.getIdToken();
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${backendUrl}/users/me/github`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch {
      console.error("Failed to fetch GitHub profile");
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        backendUid,
        signInWithGoogle,
        signInWithGitHub,
        signUpWithEmail,
        signInWithEmail,
        linkGitHub,
        logout,
        fetchGitHubProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
