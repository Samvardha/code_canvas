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
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    backendUid: string | null;
    signInWithGoogle: () => Promise<void>;
    signInWithGitHub: () => Promise<void>;
    signUpWithEmail: (email: string, password: string) => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

async function storeUserInFirestore(user: User) {
    await setDoc(
        doc(db, "users", user.uid),
        {
            uid: user.uid,
            email: user.email,
        },
        { merge: true }
    );
}

async function verifyTokenWithBackend(user: User): Promise<string | null> {
    try {
        const token = await user.getIdToken();
        const backendUrl =
            process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
        const res = await fetch(`${backendUrl}/verify-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
        });
        if (res.ok) {
            const data = await res.json();
            return data.uid;
        }
        return null;
    } catch {
        console.error("Backend verification failed");
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
            if (firebaseUser) {
                await storeUserInFirestore(firebaseUser);
                const uid = await verifyTokenWithBackend(firebaseUser);
                setBackendUid(uid);
            } else {
                setBackendUid(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        await signInWithPopup(auth, googleProvider);
    };

    const signInWithGitHub = async () => {
        await signInWithPopup(auth, githubProvider);
    };

    const signUpWithEmail = async (email: string, password: string) => {
        await createUserWithEmailAndPassword(auth, email, password);
    };

    const signInWithEmail = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
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
