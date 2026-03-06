"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
    const { user, loading, backendUid, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
            </div>
        );
    }

    if (!user) return null;

    const getProviderName = () => {
        const providerId = user.providerData[0]?.providerId;
        switch (providerId) {
            case "google.com": return "Google";
            case "github.com": return "GitHub";
            case "password": return "Email/Password";
            default: return providerId || "Unknown";
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-sm">
                {/* Header */}
                <div className="flex flex-col items-center space-y-3 px-6 pt-8 pb-4">
                    <div className="relative">
                        {user.photoURL ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={user.photoURL}
                                alt="avatar"
                                referrerPolicy="no-referrer"
                                className="h-16 w-16 rounded-full border-2 border-border object-cover"
                            />
                        ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                                {(user.email?.[0] || "U").toUpperCase()}
                            </div>
                        )}
                        <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-card bg-green-500"></span>
                    </div>
                    <div className="text-center">
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">
                            {user.metadata.creationTime === user.metadata.lastSignInTime
                                ? "Welcome!"
                                : "Welcome back!"}
                        </h1>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                </div>

                {/* Info Cards */}
                <div className="space-y-3 px-6 pb-4">
                    <div className="rounded-lg border border-border bg-muted/50 px-4 py-3">
                        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Firebase UID</p>
                        <p className="break-all font-mono text-xs text-foreground">{user.uid}</p>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/50 px-4 py-3">
                        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Backend Verified UID</p>
                        {backendUid ? (
                            <div className="flex items-start gap-2">
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="mt-0.5 shrink-0 text-green-500">
                                    <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.78 5.28a.75.75 0 00-1.06-1.06L7 7.94 5.28 6.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l4.25-4.25z" />
                                </svg>
                                <p className="break-all font-mono text-xs text-foreground">{backendUid}</p>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"></div>
                                Verifying...
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-border bg-muted/50 px-4 py-3">
                            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Provider</p>
                            <p className="text-sm font-medium text-foreground">{getProviderName()}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-muted/50 px-4 py-3">
                            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Email Verified</p>
                            {user.emailVerified ? (
                                <span className="inline-block rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">Verified</span>
                            ) : (
                                <span className="inline-block rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400">Pending</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Logout */}
                <div className="px-6 pb-8">
                    <button
                        onClick={logout}
                        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                            <polyline points="16,17 21,12 16,7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
