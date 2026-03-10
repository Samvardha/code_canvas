"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { sendEmailVerification, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
  const {
    user,
    loading,
    logout,
    signInWithGoogle,
    signInWithGitHub,
    signInWithEmail,
    signUpWithEmail,
  } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);

  // Realtime string checking for the form constraints UI
  const trimmedEmail = email.trim();
  const trimmedPassword = password.trim();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const isPasswordValid =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(
      trimmedPassword,
    );
  const isFormValid = isEmailValid && (isResetMode || isPasswordValid);

  useEffect(() => {
    if (!loading && user) {
      const isPasswordAuth = user.providerData.some(
        (p) => p.providerId === "password",
      );
      if (isPasswordAuth && !user.emailVerified) {
        setVerificationPending(true);
      } else {
        router.push("/dashboard");
      }
    }
  }, [user, loading, router]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setError("");
    setSuccessMsg("");
    setEmailLoading(true);

    try {
      try {
        const authUser = await signInWithEmail(trimmedEmail, trimmedPassword);
        if (authUser && !authUser.emailVerified) {
          try {
            await sendEmailVerification(authUser);
          } catch (e) {
            console.error("Failed to resend verification:", e);
          }
        }
      } catch (err: any) {
        if (
          err.code === "auth/invalid-credential" ||
          err.code === "auth/user-not-found"
        ) {
          try {
            const newUser = await signUpWithEmail(
              trimmedEmail,
              trimmedPassword,
            );
            if (newUser && !newUser.emailVerified) {
              await sendEmailVerification(newUser);
            }
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
    setSuccessMsg("");
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
    setSuccessMsg("");
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

  const handleForgotPassword = async (
    e: React.FormEvent | React.MouseEvent,
  ) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("ENTER A VALID EMAIL TO RESET PASSWORD");
      return;
    }

    setEmailLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setSuccessMsg("PASSWORD RESET EMAIL SENT! CHECK YOUR INBOX.");
    } catch (err: unknown) {
      console.error("Password reset error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Reset process failed";
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

  if (user && !verificationPending) return null;

  if (verificationPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black px-4 relative overflow-hidden py-4 sm:py-8">
        <div className="w-full max-w-[480px] border border-border bg-surface relative z-10 flex flex-col group shadow-2xl h-max my-auto text-center p-8 sm:p-10 gap-6">
          <h1 className="text-3xl font-black font-(family-name:--font-space-grotesk) uppercase text-white">
            VERIFY <span className="text-accent text-outline">EMAIL</span>
          </h1>
          {error && (
            <div className="text-left border border-red-500/50 bg-red-500/10 p-4 text-xs font-mono text-red-500 uppercase tracking-widest font-bold flex gap-3 items-start">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="text-left border border-accent/50 bg-accent/10 p-4 text-xs font-mono text-accent uppercase tracking-widest font-bold flex gap-3 items-start">
              {successMsg}
            </div>
          )}
          <p className="text-xs font-mono text-text-secondary leading-loose">
            A verification link has been transmitted to <br />
            <span className="text-white font-bold bg-white/5 py-1 px-2 border border-border">
              {user?.email || email}
            </span>
            <br />
            <br />
            Check your inbox to establish connection to the network.
          </p>

          <button
            onClick={() => window.location.reload()}
            className="w-full inline-flex items-center justify-center gap-3 bg-white text-black px-6 py-4 text-sm font-bold uppercase tracking-widest hover:bg-transparent hover:text-white transition-colors duration-300 border-2 border-white mt-4 cursor-pointer"
          >
            I HAVE VERIFIED
          </button>

          <button
            onClick={async () => {
              if (user) {
                try {
                  setEmailLoading(true);
                  await sendEmailVerification(user);
                  setSuccessMsg("VERIFICATION LINK RESENT! CHECK YOUR INBOX.");
                } catch (err: any) {
                  setError(
                    err.message || "FAILED TO RESEND VERIFICATION LINK.",
                  );
                } finally {
                  setEmailLoading(false);
                }
              }
            }}
            disabled={emailLoading}
            className="w-full inline-flex items-center justify-center gap-3 bg-transparent text-text-secondary px-6 py-3 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors duration-300 border border-border cursor-pointer disabled:opacity-50"
          >
            RESEND EMAIL
          </button>

          <button
            onClick={async () => {
              await logout();
              setVerificationPending(false);
            }}
            className="text-xs font-mono text-text-secondary uppercase tracking-widest font-bold hover:text-white transition-colors mt-6"
          >
            [ CANCEL & LOGOUT ]
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-black px-4 relative overflow-hidden py-4 sm:py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "circOut" }}
        className="w-full max-w-[480px] border border-border bg-surface relative z-10 flex flex-col group shadow-2xl h-max my-auto"
      >
        {/* Header */}
        <div className="flex flex-col gap-2 border-b border-border p-6 sm:p-8 bg-background">
          {isResetMode ? (
            <h1 className="text-3xl sm:text-4xl font-black font-(family-name:--font-space-grotesk) uppercase text-white">
              RESET PASSWORD
            </h1>
          ) : (
            <h1 className="text-3xl sm:text-4xl font-black font-(family-name:--font-space-grotesk) uppercase text-white">
              LOGIN <span className="text-accent text-outline">/</span> SIGNUP
            </h1>
          )}
        </div>

        <div className="p-6 sm:p-8 flex flex-col gap-6">
          <AnimatePresence mode="popLayout">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="border border-red-500/50 bg-red-500/10 p-4 text-xs font-mono text-red-500 uppercase tracking-widest font-bold flex gap-3 items-start">
                  {error}
                </div>
              </motion.div>
            )}
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="border border-accent/50 bg-accent/10 p-4 text-xs font-mono text-accent uppercase tracking-widest font-bold flex gap-3 items-start">
                  {successMsg}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form
            onSubmit={isResetMode ? handleForgotPassword : handleEmailAuth}
            className="flex flex-col gap-5"
          >
            <div className="flex flex-col">
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
                  placeholder="example@mail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full bg-background border border-border px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-white transition-colors placeholder:text-border rounded-none"
                />
              </div>

              {/* Password */}
              <AnimatePresence initial={false}>
                {!isResetMode && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="flex flex-col gap-2 overflow-hidden"
                  >
                    <label
                      htmlFor="password"
                      className="text-xs font-mono text-text-secondary uppercase tracking-widest font-bold"
                    >
                      PASSWORD
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Example@1"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required={!isResetMode}
                        minLength={6}
                        autoComplete="current-password"
                        className="w-full bg-background border border-border px-4 py-3 pr-10 text-sm font-mono text-white focus:outline-none focus:border-white transition-colors placeholder:text-border rounded-none tracking-widest"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 p-3 pt-3.5 flex items-center justify-center text-text-secondary hover:text-white transition-colors h-full cursor-pointer"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-[10px] uppercase font-mono tracking-widest font-bold">
                      <div
                        className={`flex items-center gap-1.5 transition-colors duration-300 ${password.trim().length >= 8 ? "text-white" : "text-neutral-600"}`}
                      >
                        <div
                          className={`w-2.5 h-2.5 border transition-colors duration-300 ${password.trim().length >= 8 ? "bg-white border-white" : "bg-transparent border-neutral-600"}`}
                        />
                        8+ CHARS
                      </div>
                      <div
                        className={`flex items-center gap-1.5 transition-colors duration-300 ${/[A-Z]/.test(password.trim()) ? "text-white" : "text-neutral-600"}`}
                      >
                        <div
                          className={`w-2.5 h-2.5 border transition-colors duration-300 ${/[A-Z]/.test(password.trim()) ? "bg-white border-white" : "bg-transparent border-neutral-600"}`}
                        />
                        UPPERCASE
                      </div>
                      <div
                        className={`flex items-center gap-1.5 transition-colors duration-300 ${/[a-z]/.test(password.trim()) ? "text-white" : "text-neutral-600"}`}
                      >
                        <div
                          className={`w-2.5 h-2.5 border transition-colors duration-300 ${/[a-z]/.test(password.trim()) ? "bg-white border-white" : "bg-transparent border-neutral-600"}`}
                        />
                        LOWERCASE
                      </div>
                      <div
                        className={`flex items-center gap-1.5 transition-colors duration-300 ${/\d/.test(password.trim()) ? "text-white" : "text-neutral-600"}`}
                      >
                        <div
                          className={`w-2.5 h-2.5 border transition-colors duration-300 ${/\d/.test(password.trim()) ? "bg-white border-white" : "bg-transparent border-neutral-600"}`}
                        />
                        0-9
                      </div>
                      <div
                        className={`flex items-center gap-1.5 transition-colors duration-300 ${/[^A-Za-z0-9]/.test(password.trim()) ? "text-white" : "text-neutral-600"}`}
                      >
                        <div
                          className={`w-2.5 h-2.5 border transition-colors duration-300 ${/[^A-Za-z0-9]/.test(password.trim()) ? "bg-white border-white" : "bg-transparent border-neutral-600"}`}
                        />
                        SPECIAL
                      </div>
                    </div>

                    <div className="text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsResetMode(true);
                          setError("");
                          setSuccessMsg("");
                        }}
                        className="text-[10px] font-mono text-accent uppercase tracking-widest cursor-pointer"
                      >
                        FORGOT PASSWORD?
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Submit */}
            <div className="flex flex-col">
              <button
                type="submit"
                disabled={emailLoading || !isFormValid}
                className="w-full inline-flex items-center justify-center gap-3 bg-white text-black px-4 py-3 text-sm font-bold uppercase tracking-widest hover:bg-transparent hover:text-white transition-colors duration-300 border-2 border-white disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-black disabled:cursor-not-allowed cursor-pointer"
              >
                {emailLoading
                  ? "LOADING..."
                  : isResetMode
                    ? "SEND RESET LINK"
                    : "CONTINUE"}
              </button>

              <AnimatePresence initial={false}>
                {isResetMode && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden flex justify-center"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetMode(false);
                        setError("");
                        setSuccessMsg("");
                      }}
                      className="text-[10px] font-mono text-accent uppercase tracking-widest cursor-pointer text-center"
                    >
                      GO BACK
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </form>

          <div className="relative flex items-center justify-center my-2">
            <div className="absolute inset-x-0 h-px bg-border"></div>
            <span className="relative bg-black px-8 text-[10px] font-mono text-white uppercase tracking-widest font-bold hidden sm:block">
              OR BYPASS WITH
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={handleGitHubSignIn}
              className="flex-1 border border-border bg-background hover:border-white hover:bg-white/5 transition-colors px-4 py-3 flex items-center justify-center gap-3 text-xs font-mono text-white uppercase tracking-widest font-bold cursor-pointer"
            >
              <svg width={20} height={20} viewBox="0 0 128 128">
                <g fill="#fafafa">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M64 5.103c-33.347 0-60.388 27.035-60.388 60.388 0 26.682 17.303 49.317 41.297 57.303 3.017.56 4.125-1.31 4.125-2.905 0-1.44-.056-6.197-.082-11.243-16.8 3.653-20.345-7.125-20.345-7.125-2.747-6.98-6.705-8.836-6.705-8.836-5.48-3.748.413-3.67.413-3.67 6.063.425 9.257 6.223 9.257 6.223 5.386 9.23 14.127 6.562 17.573 5.02.542-3.903 2.107-6.568 3.834-8.076-13.413-1.525-27.514-6.704-27.514-29.843 0-6.593 2.36-11.98 6.223-16.21-.628-1.52-2.695-7.662.584-15.98 0 0 5.07-1.623 16.61 6.19C53.7 35 58.867 34.327 64 34.304c5.13.023 10.3.694 15.127 2.033 11.526-7.813 16.59-6.19 16.59-6.19 3.287 8.317 1.22 14.46.593 15.98 3.872 4.23 6.215 9.617 6.215 16.21 0 23.194-14.127 28.3-27.574 29.796 2.167 1.874 4.097 5.55 4.097 11.183 0 8.08-.07 14.583-.07 16.572 0 1.607 1.088 3.49 4.148 2.897 23.98-7.994 41.263-30.622 41.263-57.294C124.388 32.14 97.35 5.104 64 5.104z"
                  ></path>
                  <path d="M26.484 91.806c-.133.3-.605.39-1.035.185-.44-.196-.685-.605-.543-.906.13-.31.603-.395 1.04-.188.44.197.69.61.537.91zm2.446 2.729c-.287.267-.85.143-1.232-.28-.396-.42-.47-.983-.177-1.254.298-.266.844-.14 1.24.28.394.426.472.984.17 1.255zM31.312 98.012c-.37.258-.976.017-1.35-.52-.37-.538-.37-1.183.01-1.44.373-.258.97-.025 1.35.507.368.545.368 1.19-.01 1.452zm3.261 3.361c-.33.365-1.036.267-1.552-.23-.527-.487-.674-1.18-.343-1.544.336-.366 1.045-.264 1.564.23.527.486.686 1.18.333 1.543zm4.5 1.951c-.147.473-.825.688-1.51.486-.683-.207-1.13-.76-.99-1.238.14-.477.823-.7 1.512-.485.683.206 1.13.756.988 1.237zm4.943.361c.017.498-.563.91-1.28.92-.723.017-1.308-.387-1.315-.877 0-.503.568-.91 1.29-.924.717-.013 1.306.387 1.306.88zm4.598-.782c.086.485-.413.984-1.126 1.117-.7.13-1.35-.172-1.44-.653-.086-.498.422-.997 1.122-1.126.714-.123 1.354.17 1.444.663zm0 0"></path>
                </g>
              </svg>
            </button>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="flex-1 border border-border bg-background hover:border-white hover:bg-white/5 transition-colors px-4 py-3 flex items-center justify-center gap-3 text-xs font-mono text-white uppercase tracking-widest font-bold cursor-pointer"
            >
              <svg width={20} height={20} viewBox="0 0 128 128">
                <path
                  fill="#fff"
                  d="M44.59 4.21a63.28 63.28 0 004.33 120.9 67.6 67.6 0 0032.36.35 57.13 57.13 0 0025.9-13.46 57.44 57.44 0 0016-26.26 74.33 74.33 0 001.61-33.58H65.27v24.69h34.47a29.72 29.72 0 01-12.66 19.52 36.16 36.16 0 01-13.93 5.5 41.29 41.29 0 01-15.1 0A37.16 37.16 0 0144 95.74a39.3 39.3 0 01-14.5-19.42 38.31 38.31 0 010-24.63 39.25 39.25 0 019.18-14.91A37.17 37.17 0 0176.13 27a34.28 34.28 0 0113.64 8q5.83-5.8 11.64-11.63c2-2.09 4.18-4.08 6.15-6.22A61.22 61.22 0 0087.2 4.59a64 64 0 00-42.61-.38z"
                ></path>
                <path
                  fill="#e33629"
                  d="M44.59 4.21a64 64 0 0142.61.37 61.22 61.22 0 0120.35 12.62c-2 2.14-4.11 4.14-6.15 6.22Q95.58 29.23 89.77 35a34.28 34.28 0 00-13.64-8 37.17 37.17 0 00-37.46 9.74 39.25 39.25 0 00-9.18 14.91L8.76 35.6A63.53 63.53 0 0144.59 4.21z"
                ></path>
                <path
                  fill="#f8bd00"
                  d="M3.26 51.5a62.93 62.93 0 015.5-15.9l20.73 16.09a38.31 38.31 0 000 24.63q-10.36 8-20.73 16.08a63.33 63.33 0 01-5.5-40.9z"
                ></path>
                <path
                  fill="#587dbd"
                  d="M65.27 52.15h59.52a74.33 74.33 0 01-1.61 33.58 57.44 57.44 0 01-16 26.26c-6.69-5.22-13.41-10.4-20.1-15.62a29.72 29.72 0 0012.66-19.54H65.27c-.01-8.22 0-16.45 0-24.68z"
                ></path>
                <path
                  fill="#319f43"
                  d="M8.75 92.4q10.37-8 20.73-16.08A39.3 39.3 0 0044 95.74a37.16 37.16 0 0014.08 6.08 41.29 41.29 0 0015.1 0 36.16 36.16 0 0013.93-5.5c6.69 5.22 13.41 10.4 20.1 15.62a57.13 57.13 0 01-25.9 13.47 67.6 67.6 0 01-32.36-.35 63 63 0 01-23-11.59A63.73 63.73 0 018.75 92.4z"
                ></path>
              </svg>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
