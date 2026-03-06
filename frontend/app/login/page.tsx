"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
    const { user, loading, signInWithGoogle, signInWithGitHub, signInWithEmail, signUpWithEmail } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState("");
    const [emailLoading, setEmailLoading] = useState(false);

    useEffect(() => {
        if (!loading && user) {
            router.push("/dashboard");
        }
    }, [user, loading, router]);

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setEmailLoading(true);
        try {
            if (isSignUp) {
                await signUpWithEmail(email, password);
            } else {
                await signInWithEmail(email, password);
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Authentication failed";
            setError(errorMessage.replace("Firebase: ", "").replace(/\(auth\/.*\)/, "").trim());
        } finally {
            setEmailLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError("");
        try {
            await signInWithGoogle();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Google sign-in failed";
            setError(errorMessage.replace("Firebase: ", "").replace(/\(auth\/.*\)/, "").trim());
        }
    };

    const handleGitHubSignIn = async () => {
        setError("");
        try {
            await signInWithGitHub();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "GitHub sign-in failed";
            setError(errorMessage.replace("Firebase: ", "").replace(/\(auth\/.*\)/, "").trim());
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
            </div>
        );
    }

    if (user) return null;

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            {/* Card */}
            <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-sm">
                {/* Card Header */}
                <div className="flex flex-col space-y-1.5 px-6 pt-6 pb-4">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                        {isSignUp ? "Create an account" : "Login to your account"}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {isSignUp
                            ? "Enter your email below to create your account"
                            : "Enter your email below to login to your account"}
                    </p>
                </div>

                {/* Card Content */}
                <div className="px-6 pb-4">
                    {error && (
                        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleEmailAuth}>
                        <div className="flex flex-col gap-5">
                            {/* Email */}
                            <div className="grid gap-2">
                                <label htmlFor="email" className="text-sm font-medium text-foreground">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="m@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>

                            {/* Password */}
                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <label htmlFor="password" className="text-sm font-medium text-foreground">
                                        Password
                                    </label>
                                    {!isSignUp && (
                                        <a href="#" className="ml-auto inline-block text-sm text-muted-foreground underline-offset-4 hover:underline">
                                            Forgot your password?
                                        </a>
                                    )}
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    autoComplete={isSignUp ? "new-password" : "current-password"}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>
                        </div>

                        {/* Card Footer */}
                        <div className="mt-6 flex flex-col gap-2">
                            {/* Login / Sign Up Button */}
                            <button
                                type="submit"
                                disabled={emailLoading}
                                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                            >
                                {emailLoading ? (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"></div>
                                ) : isSignUp ? (
                                    "Sign Up"
                                ) : (
                                    "Login"
                                )}
                            </button>

                            {/* Google Button */}
                            <button
                                type="button"
                                onClick={handleGoogleSignIn}
                                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            >
                                <svg width="16" height="16" viewBox="0 0 48 48">
                                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                                </svg>
                                Continue with Google
                            </button>

                            {/* GitHub Button */}
                            <button
                                type="button"
                                onClick={handleGitHubSignIn}
                                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                </svg>
                                Continue with GitHub
                            </button>

                            {/* Toggle sign-in / sign-up */}
                            <div className="mt-4 text-center text-sm text-muted-foreground">
                                {isSignUp ? "Already have an account?" : "Don\u0027t have an account?"}{" "}
                                <button
                                    type="button"
                                    onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
                                    className="text-foreground underline underline-offset-4 hover:text-primary"
                                >
                                    {isSignUp ? "Login" : "Sign up"}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* bottom padding */}
                <div className="pb-6"></div>
            </div>
        </div>
    );
}
