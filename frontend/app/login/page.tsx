"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  checkEmailSignInMethods,
  sendResetPasswordEmail,
  sendUserEmailVerification,
} from "@/lib/api/auth";
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
import { validateEmail, validatePassword } from "@/lib/utils/validation";
import { VerificationStep } from "./components/VerificationStep";
import { AuthHeader } from "./components/AuthHeader";
import { EmailCheckStep } from "./components/EmailCheckStep";
import { PasswordStep } from "./components/PasswordStep";
import { GoogleSignIn } from "./components/GoogleSignIn";

export type Flow =
  | "email-check"
  | "password-login"
  | "signup"
  | "reset-password";

export default function LoginPage() {
  const {
    user,
    loading,
    profileComplete,
    logout,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    isBackendSyncing,
  } = useAuth();
  const router = useRouter();
  const [flow, setFlow] = useState<Flow>("email-check");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  useEffect(() => {
    if (verificationPending) {
      startResendCooldown();
    }
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [verificationPending, startResendCooldown]);

  const isEmailValid = validateEmail(email);
  const isPasswordValid = validatePassword(password);

  let isFormValid = false;
  if (flow === "email-check" || flow === "reset-password") {
    isFormValid = isEmailValid;
  } else if (flow === "password-login") {
    isFormValid = isEmailValid && password.trim().length >= 6;
  } else if (flow === "signup") {
    isFormValid =
      isEmailValid &&
      isPasswordValid &&
      password.trim() === confirmPassword.trim();
  }

  useEffect(() => {
    // PREVENT ALL REDIRECTIONS IF WE ARE LOADING OR SYNCING
    if (loading || isBackendSyncing) return;
    
    if (user) {
      const isPasswordAuth = user.providerData.some(
        (p) => p.providerId === "password",
      );
      if (isPasswordAuth && !user.emailVerified) {
        setVerificationPending(true);
      } else if (!profileComplete) {
        router.push("/onboarding");
      } else {
        router.push("/explore-feed");
      }
    }
  }, [user, loading, profileComplete, isBackendSyncing, router]);

  const handleEmailCheck = async () => {
    if (!isEmailValid) return;
    setError("");
    setSuccessMsg("");
    setEmailLoading(true);

    try {
      const methods = await checkEmailSignInMethods(email.trim());
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
      const authUser = await signInWithEmail(email.trim(), password.trim());

      if (authUser && !authUser.emailVerified) {
        try {
          await sendUserEmailVerification(authUser);
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
      await signUpWithEmail(email.trim(), password.trim());

      if (auth.currentUser) {
        await sendUserEmailVerification(auth.currentUser);
        setVerificationPending(true);
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
      await sendResetPasswordEmail(email.trim());
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

  if (loading || isBackendSyncing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="font-mono text-accent text-sm uppercase tracking-widest font-bold animate-pulse flex items-center gap-3">
          <div className="w-3 h-3 bg-accent rotate-45"></div>
          [{isBackendSyncing ? "SYNCING_SECURE_CONNECTION" : "ESTABLISHING_CONNECTION"}]
        </div>
      </div>
    );
  }

  if (user && !verificationPending) return null;

  if (verificationPending) {
    return (
      <VerificationStep
        user={user}
        email={email}
        error={error}
        successMsg={successMsg}
        emailLoading={emailLoading}
        resendCooldown={resendCooldown}
        onVerify={async () => {
          setError("");
          setSuccessMsg("");
          try {
            await user?.reload();
            const refreshedUser = auth.currentUser;
            if (refreshedUser?.emailVerified) {
              if (!profileComplete) {
                router.push("/onboarding");
              } else {
                router.push("/explore-feed");
              }
            } else {
              setError(
                "EMAIL NOT VERIFIED YET — CHECK YOUR INBOX AND CLICK THE VERIFICATION LINK",
              );
            }
          } catch {
            setError("FAILED TO CHECK VERIFICATION STATUS — TRY AGAIN");
          }
        }}
        onResend={async () => {
          setError("");
          setSuccessMsg("");
          if (resendCooldown > 0) return;
          setEmailLoading(true);
          try {
            if (user) await sendUserEmailVerification(user);
            setSuccessMsg("VERIFICATION_EMAIL_RETRANSMITTED");
            startResendCooldown();
          } catch (err: any) {
            setError(err.message || "FAILED TO RESEND VERIFICATION LINK.");
          } finally {
            setEmailLoading(false);
          }
        }}
        onLogout={async () => {
          await logout();
          setVerificationPending(false);
        }}
      />
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
        <AuthHeader
          flow={flow}
          onBack={() => {
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
        />

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
              <EmailCheckStep
                email={email}
                setEmail={setEmail}
                flow={flow}
                setFlow={setFlow}
                setError={setError}
                setSuccessMsg={setSuccessMsg}
                setPassword={setPassword}
                setConfirmPassword={setConfirmPassword}
              />

              <PasswordStep
                flow={flow}
                password={password}
                setPassword={setPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                onForgotPassword={() => {
                  setFlow("reset-password");
                  setError("");
                  setSuccessMsg("");
                }}
              />
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

          <GoogleSignIn onSignIn={handleGoogleSignIn} />
        </div>
      </motion.div>
    </div>
  );
}
