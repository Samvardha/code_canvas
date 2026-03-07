"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const {
    user,
    loading,
    signInWithGoogle,
    signInWithGitHub,
    signInWithEmail,
    signUpWithEmail,
  } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      try {
        await signInWithEmail(email, password);
      } catch (err: any) {
        if (
          err.code === "auth/invalid-credential" ||
          err.code === "auth/user-not-found"
        ) {
          try {
            await signUpWithEmail(email, password);
          } catch (signUpErr: any) {
            if (signUpErr.code === "auth/email-already-in-use") {
              throw new Error("Invalid password for existing account.");
            }
            throw signUpErr;
          }
        } else {
          throw err;
        }
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Authentication failed";
      setError(
        errorMessage
          .replace("Firebase: ", "")
          .replace(/\(auth\/.*\)/, "")
          .trim(),
      );
    } finally {
      setEmailLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      console.error("Google Sign-in Error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Google sign-in failed";
      setError(
        errorMessage
          .replace("Firebase: ", "")
          .replace(/\(auth\/.*\)/, "")
          .trim(),
      );
    }
  };

  const handleGitHubSignIn = async () => {
    setError("");
    try {
      await signInWithGitHub();
    } catch (err: unknown) {
      console.error("GitHub Sign-in Error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "GitHub sign-in failed";
      setError(
        errorMessage
          .replace("Firebase: ", "")
          .replace(/\(auth\/.*\)/, "")
          .trim(),
      );
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="font-mono text-accent text-sm uppercase tracking-widest font-bold animate-pulse flex items-center gap-3">
          <div className="w-3 h-3 bg-accent rotate-45"></div>[
          ESTABLISHING_CONNECTION ]
        </div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="flex min-h-svh items-center justify-center bg-black px-4 relative overflow-hidden py-4 sm:py-8">
      <div className="w-full max-w-[480px] border border-border bg-surface relative z-10 flex flex-col group shadow-2xl h-max my-auto">
        {/* Header */}
        <div className="flex flex-col gap-2 border-b border-border p-6 sm:p-8 bg-background">
          <h1 className="text-3xl sm:text-4xl font-black font-(family-name:--font-space-grotesk) uppercase text-white">
            LOGIN <span className="text-accent text-outline">/</span> SIGNUP
          </h1>
        </div>

        <div className="p-6 sm:p-8 flex flex-col gap-6">
          {error && (
            <div className="border border-red-500/50 bg-red-500/10 p-4 text-xs font-mono text-red-500 uppercase tracking-widest font-bold flex gap-3 items-start">
              <span>{">"}</span>
              <span>ERR: {error}</span>
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="flex flex-col gap-5">
            <div className="flex flex-col gap-4">
              {/* Email */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="email"
                  className="text-xs font-mono text-text-secondary uppercase tracking-widest font-bold"
                >
                  EMAIL
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="ENG@HOST.COM"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full bg-background border border-border px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-white transition-colors placeholder:text-border rounded-none"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="password"
                  className="text-xs font-mono text-text-secondary uppercase tracking-widest font-bold"
                >
                  PASSWORD
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete= "current-password"
                  className="w-full bg-background border border-border px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-white transition-colors placeholder:text-border rounded-none tracking-widest"
                />
                <div className="text-right">
                  <a
                    href="#"
                    className="text-[10px] font-mono text-text-secondary uppercase tracking-widest hover:text-white transition-colors"
                  >
                    FORGOT PASSWORD?
                  </a>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={emailLoading}
              className="w-full inline-flex items-center justify-center gap-3 bg-white text-black px-6 py-4 text-sm font-bold uppercase tracking-widest hover:bg-transparent hover:text-white transition-colors duration-300 border-2 border-white disabled:opacity-50 disabled:pointer-events-none mt-2"
            >
              {emailLoading ? "LOADING..." : "CONTINUE"}
            </button>
          </form>

          <div className="relative flex items-center justify-center my-2">
            <div className="absolute inset-x-0 h-px bg-border"></div>
            <span className="relative bg-black px-8 text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold hidden sm:block">
              OR BYPASS WITH
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={handleGitHubSignIn}
              className="flex-1 border border-border bg-background hover:border-white hover:bg-white/5 transition-colors p-4 flex items-center justify-center gap-3 text-xs font-mono text-white uppercase tracking-widest font-bold"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </button>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="flex-1 border border-border bg-background hover:border-white hover:bg-white/5 transition-colors p-4 flex items-center justify-center gap-3 text-xs font-mono text-white uppercase tracking-widest font-bold"
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-background to-transparent pointer-events-none z-20"></div>
    </div>
  );
}
