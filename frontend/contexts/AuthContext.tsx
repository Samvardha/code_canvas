"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  GithubAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
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
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();
// Force GitHub to prompt for account selection instead of auto-logging in
githubProvider.setCustomParameters({
  prompt: "select_account",
});

async function syncBackendSession(
  user: User,
  providerId: string,
  githubAccessToken?: string,
): Promise<string | null> {
  try {
    const idToken = await user.getIdToken();
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

    const res = await fetch(`${backendUrl}/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_token: idToken,
        provider_id: providerId,
        github_access_token: githubAccessToken || null,
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      // the initial load sync (no github token available here, but keeps basic auth alive)
      if (firebaseUser) {
        const providerId =
          firebaseUser.providerData[0]?.providerId || "unknown";
        const uid = await syncBackendSession(firebaseUser, providerId);
        setBackendUid(uid);
      } else {
        setBackendUid(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    await syncBackendSession(result.user, "google.com");
  };

  const signInWithGitHub = async () => {
    const result = await signInWithPopup(auth, githubProvider);
    const credential = GithubAuthProvider.credentialFromResult(result);
    const githubAccessToken = credential?.accessToken;
    await syncBackendSession(result.user, "github.com", githubAccessToken);
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
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
