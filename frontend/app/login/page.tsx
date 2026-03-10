"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Pencil, ArrowLeft } from "lucide-react";
import {
  sendEmailVerification,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import {
  GENERIC_AUTH_ERROR,
  GENERIC_GOOGLE_ERROR,
  GENERIC_RESET_ERROR,
  mapAuthError,
} from "@/lib/messages";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";

type Flow = "email-check" | "password-login" | "signup" | "reset-password";

export default function LoginPage() {
  const {
    user,
    loading,
    logout,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
  } = useAuth();
  const router = useRouter();

  const [flow, setFlow] = useState<Flow>("email-check");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startResendCooldown = useCallback(() => {
    setResendCooldown(30);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Start cooldown when verification page first appears
  useEffect(() => {
    if (verificationPending) {
      startResendCooldown();
    }
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [verificationPending, startResendCooldown]);

  // Realtime string checking for the form constraints UI
  const trimmedEmail = email.trim();
  const trimmedPassword = password.trim();
  const trimmedConfirmPassword = confirmPassword.trim();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const isPasswordValid =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(
      trimmedPassword,
    );

  let isFormValid = false;
  if (flow === "email-check" || flow === "reset-password") {
    isFormValid = isEmailValid;
  } else if (flow === "password-login") {
    isFormValid = isEmailValid && trimmedPassword.length >= 6;
  } else if (flow === "signup") {
    isFormValid =
      isEmailValid &&
      isPasswordValid &&
      trimmedPassword === trimmedConfirmPassword;
  }

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

  const handleEmailCheck = async () => {
    if (!isEmailValid) return;
    setError("");
    setSuccessMsg("");
    setEmailLoading(true);

    try {
      const methods = await fetchSignInMethodsForEmail(auth, trimmedEmail);
      if (methods.includes("google.com") && !methods.includes("password")) {
        setError("ACCOUNT EXISTS FOR THIS EMAIL — SIGN IN WITH GOOGLE");
      } else if (methods.includes("password")) {
        setFlow("password-login");
      } else {
        setFlow("signup");
      }
    } catch (err: unknown) {
      setError(mapAuthError(err));
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    if (!isFormValid) return;
    setError("");
    setSuccessMsg("");
    setEmailLoading(true);
    try {
      const authUser = await signInWithEmail(trimmedEmail, trimmedPassword);
      if (authUser && !authUser.emailVerified) {
        try {
          await sendEmailVerification(authUser);
        } catch (e) {
          console.error("Failed to resend verification:", e);
        }
      }
    } catch (err: unknown) {
      setError(mapAuthError(err));
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordSignup = async () => {
    if (!isFormValid) return;
    setError("");
    setSuccessMsg("");
    setEmailLoading(true);
    try {
      const newUser = await signUpWithEmail(trimmedEmail, trimmedPassword);
      if (newUser && !newUser.emailVerified) {
        await sendEmailVerification(newUser);
      }
    } catch (err: unknown) {
      setError(mapAuthError(err));
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
      const msg = mapAuthError(err);
      setError(msg === GENERIC_AUTH_ERROR ? GENERIC_GOOGLE_ERROR : msg);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setSuccessMsg("");

    if (!isEmailValid) {
      setError("ENTER A VALID EMAIL TO RESET PASSWORD");
      return;
    }

    setEmailLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setSuccessMsg("PASSWORD RESET EMAIL SENT! CHECK YOUR INBOX.");
    } catch (err: unknown) {
      console.error("Password reset error:", err);
      const msg = mapAuthError(err);
      setError(msg === GENERIC_AUTH_ERROR ? GENERIC_RESET_ERROR : msg);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleMainSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (flow === "email-check") handleEmailCheck();
    else if (flow === "password-login") handlePasswordLogin();
    else if (flow === "signup") handlePasswordSignup();
    else if (flow === "reset-password") handleForgotPassword();
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
            onClick={async () => {
              setError("");
              setSuccessMsg("");
              try {
                await user?.reload();
                if (user?.emailVerified) {
                  router.push("/dashboard");
                } else {
                  setError(
                    "EMAIL NOT VERIFIED YET — CHECK YOUR INBOX AND CLICK THE VERIFICATION LINK",
                  );
                }
              } catch {
                setError("FAILED TO CHECK VERIFICATION STATUS — TRY AGAIN");
              }
            }}
            className="w-full inline-flex items-center justify-center gap-3 bg-white text-black px-6 py-3 text-sm font-bold uppercase tracking-widest hover:bg-transparent hover:text-white transition-colors duration-300 border-2 border-white mt-4 cursor-pointer"
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
                  startResendCooldown();
                } catch (err: any) {
                  setError(
                    err.message || "FAILED TO RESEND VERIFICATION LINK.",
                  );
                } finally {
                  setEmailLoading(false);
                }
              }
            }}
            disabled={emailLoading || resendCooldown > 0}
            className="w-full inline-flex items-center justify-center gap-3 bg-transparent text-text-secondary px-6 py-3 text-sm font-bold uppercase tracking-widest hover:text-white transition-colors duration-300 border border-border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-text-secondary"
          >
            {resendCooldown > 0
              ? `RESEND EMAIL (${resendCooldown})`
              : "RESEND EMAIL"}
          </button>

          <button
            onClick={async () => {
              await logout();
              setVerificationPending(false);
            }}
            className="text-xs font-mono text-accent uppercase tracking-widest font-bold mt-4 cursor-pointer"
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
        <div className="flex items-center border-b border-border p-4 sm:p-6 bg-background relative overflow-hidden">
          <AnimatePresence>
            {flow !== "email-check" && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: 40 }}
                exit={{ width: 0 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="shrink-0 overflow-hidden"
              >
                <motion.button
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  type="button"
                  onClick={() => {
                    if (flow === "reset-password") {
                      setFlow("password-login");
                    } else {
                      setFlow("email-check");
                      setPassword("");
                      setConfirmPassword("");
                    }
                    setError("");
                    setSuccessMsg("");
                  }}
                  className="text-text-secondary hover:text-white transition-colors cursor-pointer flex items-center pr-4"
                >
                  <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 whitespace-nowrap overflow-hidden">
            {flow === "reset-password" ? (
              <h1 className="text-3xl sm:text-4xl font-black font-(family-name:--font-space-grotesk) uppercase text-white truncate">
                RESET PASSWORD
              </h1>
            ) : flow === "signup" ? (
              <h1 className="text-3xl sm:text-4xl font-black font-(family-name:--font-space-grotesk) uppercase text-white truncate">
                SIGNUP
              </h1>
            ) : flow === "password-login" ? (
              <h1 className="text-3xl sm:text-4xl font-black font-(family-name:--font-space-grotesk) uppercase text-white truncate">
                LOGIN
              </h1>
            ) : (
              <h1 className="text-3xl sm:text-4xl font-black font-(family-name:--font-space-grotesk) uppercase text-white truncate">
                LOGIN <span className="text-accent text-outline">/</span> SIGNUP
              </h1>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 flex flex-col gap-6">
          <AnimatePresence mode="popLayout">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <Banner variant="error">{error}</Banner>
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
                <Banner variant="success">{successMsg}</Banner>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleMainSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col">
              {/* Email */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="email"
                  className="text-xs font-mono text-text-secondary uppercase tracking-widest font-bold"
                >
                  EMAIL
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    placeholder="example@mail.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (flow !== "email-check" && flow !== "reset-password") {
                        setFlow("email-check");
                        setError("");
                        setSuccessMsg("");
                        setPassword("");
                        setConfirmPassword("");
                      }
                    }}
                    required
                    readOnly={
                      flow !== "email-check" && flow !== "reset-password"
                    }
                    autoComplete="email"
                    tabIndex={
                      flow !== "email-check" && flow !== "reset-password"
                        ? -1
                        : 0
                    }
                    className={`w-full bg-background border border-border px-4 py-3 text-sm font-mono text-white focus:outline-none transition-colors placeholder:text-border rounded-none ${flow !== "email-check" && flow !== "reset-password" ? "pr-10 text-neutral-400 opacity-80 pointer-events-none" : "focus:border-white"}`}
                  />
                  {flow !== "email-check" && flow !== "reset-password" && (
                    <button
                      type="button"
                      onClick={() => {
                        setFlow("email-check");
                        setError("");
                        setSuccessMsg("");
                        setPassword("");
                        setConfirmPassword("");
                      }}
                      className="absolute inset-y-0 right-0 p-3 flex items-center justify-center text-text-secondary hover:text-white transition-colors h-full cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Password */}
              <AnimatePresence initial={false}>
                {(flow === "password-login" || flow === "signup") && (
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
                        required
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

                    {flow === "signup" && (
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
                    )}

                    {flow === "signup" && (
                      <div className="flex flex-col gap-2 mt-4">
                        <label
                          htmlFor="confirmPassword"
                          className="text-xs font-mono text-text-secondary uppercase tracking-widest font-bold"
                        >
                          CONFIRM PASSWORD
                        </label>
                        <div className="relative">
                          <input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Example@1"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                            autoComplete="new-password"
                            className="w-full bg-background border border-border px-4 py-3 pr-10 text-sm font-mono text-white focus:outline-none focus:border-white transition-colors placeholder:text-border rounded-none tracking-widest"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                            className="absolute inset-y-0 right-0 p-3 pt-3.5 flex items-center justify-center text-text-secondary hover:text-white transition-colors h-full cursor-pointer"
                            tabIndex={-1}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-[10px] uppercase font-mono tracking-widest font-bold">
                          <div
                            className={`flex items-center gap-1.5 transition-colors duration-300 ${confirmPassword.length > 0 && trimmedPassword === trimmedConfirmPassword ? "text-white" : "text-neutral-600"}`}
                          >
                            <div
                              className={`w-2.5 h-2.5 border transition-colors duration-300 ${confirmPassword.length > 0 && trimmedPassword === trimmedConfirmPassword ? "bg-white border-white" : "bg-transparent border-neutral-600"}`}
                            />
                            PASSWORDS MATCH
                          </div>
                        </div>
                      </div>
                    )}

                    {flow === "password-login" && (
                      <div className="text-right mt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setFlow("reset-password");
                            setError("");
                            setSuccessMsg("");
                          }}
                          className="text-[10px] font-mono text-accent uppercase tracking-widest cursor-pointer"
                        >
                          FORGOT PASSWORD?
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-col">
              <Button
                type="submit"
                fullWidth
                disabled={emailLoading || !isFormValid}
              >
                {emailLoading
                  ? "LOADING..."
                  : flow === "reset-password"
                    ? "SEND RESET LINK"
                    : flow === "password-login"
                      ? "LOGIN"
                      : flow === "signup"
                        ? "SIGN UP"
                        : "CONTINUE"}
              </Button>

              <AnimatePresence initial={false}>
                {flow === "reset-password" && (
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
                        setFlow("email-check");
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

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-x-0 h-px bg-border"></div>
            <span className="relative bg-black px-8 text-[10px] font-mono text-white uppercase tracking-widest font-bold hidden sm:block">
              OR BYPASS WITH
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
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
