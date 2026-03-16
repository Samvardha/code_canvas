"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/Button";
import { Banner } from "@/components/Banner";
import { AvatarUploadModal } from "@/components/AvatarUploadModal";
import { updateUserProfile, checkUsernameAvailability } from "@/lib/api/users";

import { OnboardingFormData, UsernameStatus } from "./types";
import {
  formatToTitleCase,
  validateUsernameFormat,
  sanitizeUsername,
  sanitizeBio,
} from "@/lib/utils/validation";

import { OnboardingHeader } from "./components/OnboardingHeader";
import { ProfilePictureSection } from "./components/ProfilePictureSection";
import { UsernameField } from "./components/UsernameField";
import { SkillInputSection } from "./components/SkillInputSection";

export default function OnboardingPage() {
  const { user, loading, profileComplete, userProfile, refreshProfile } =
    useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState<OnboardingFormData>({
    name: "",
    username: "",
    bio: "",
    location: "",
    avatar_url: "",
    skills: [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [hasInterpolated, setHasInterpolated] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (!loading && profileComplete) {
      router.push("/explore-feed");
    }
  }, [user, loading, profileComplete, router]);

  useEffect(() => {
    if (userProfile?.profile && !hasInterpolated) {
      const p = userProfile.profile;
      setFormData((prev) => ({
        ...prev,
        name: p.name || prev.name,
        location: p.location || prev.location,
        avatar_url: p.avatar_url || prev.avatar_url,
      }));
      setHasInterpolated(true);
    }
  }, [userProfile, hasInterpolated]);

  const checkUsername = async () => {
    const username = formData.username.trim();
    if (!username) {
      setUsernameStatus("idle");
      return;
    }

    if (!validateUsernameFormat(username)) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");

    try {
      const { available } = await checkUsernameAvailability(username);
      setUsernameStatus(available ? "available" : "taken");
    } catch {
      setUsernameStatus("idle");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.username.trim() ||
      !formData.bio.trim() ||
      formData.skills.length === 0
    ) {
      setError(
        "VALIDATION_ERROR: ALL_FIELDS_EXCEPT_LOCATION_AND_AVATAR_REQUIRED",
      );
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const idToken = await user?.getIdToken();
      if (!idToken) throw new Error("Authentication token unavailable");

      const trimmedData = {
        ...formData,
        name: formData.name.trim(),
        username: formData.username.trim(),
        bio: formData.bio.trim(),
        location: formData.location.trim(),
      };

      await updateUserProfile(trimmedData, idToken);
      await refreshProfile();
      router.push("/explore-feed");
    } catch (err: any) {
      setError(err.message || "ONBOARDING_FAILED: CHECK_INPUTS");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || (user && profileComplete)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="font-mono text-accent text-sm uppercase tracking-widest font-bold animate-pulse flex items-center gap-3">
          <div className="w-3 h-3 bg-accent rotate-45"></div>[
          INITIALIZING_ENVIRONMENT ]
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-black flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="fixed inset-0 grid-bg opacity-40 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-6xl border border-border bg-surface relative z-10 shadow-2xl"
      >
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-accent"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-accent"></div>

        <div className="p-6 sm:p-8">
          <OnboardingHeader />

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8"
              >
                <Banner variant="error">{error}</Banner>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col md:grid md:grid-cols-[200px_1fr] md:gap-10 items-start">
            <ProfilePictureSection
              avatarUrl={formData.avatar_url}
              onUploadClick={() => setShowUploadModal(true)}
            />

            <form onSubmit={handleSubmit} className="w-full space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Full Name */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
                    Full Name <span className="text-accent">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                      setFormData({
                        ...formData,
                        name: formatToTitleCase(val),
                      });
                    }}
                    className="w-full bg-background border border-border px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                {/* Username */}
                <UsernameField
                  username={formData.username}
                  status={usernameStatus}
                  onChange={(val) => {
                    setFormData({
                      ...formData,
                      username: sanitizeUsername(val),
                    });
                    if (usernameStatus !== "idle") setUsernameStatus("idle");
                  }}
                  onCheck={checkUsername}
                />

                {/* Location */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="City, Country"
                    value={formData.location}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^a-zA-Z\s,]/g, "");
                      setFormData({
                        ...formData,
                        location: formatToTitleCase(val),
                      });
                    }}
                    className="w-full bg-background border border-border px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                {/* Skills */}
                <SkillInputSection
                  skills={formData.skills}
                  onAddSkill={(skill) => {
                    if (!formData.skills.includes(skill)) {
                      setFormData((prev) => ({
                        ...prev,
                        skills: [...prev.skills, skill],
                      }));
                    }
                  }}
                  onRemoveSkill={(skill) => {
                    setFormData((prev) => ({
                      ...prev,
                      skills: prev.skills.filter((s) => s !== skill),
                    }));
                  }}
                />
              </div>

              {/* Bio (Full Width) */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
                    Bio <span className="text-accent">*</span>
                  </label>
                  <span
                    className={`text-[10px] font-mono font-bold ${formData.bio.length >= 200 ? "text-accent" : "text-text-secondary"}`}
                  >
                    {formData.bio.length}/200
                  </span>
                </div>
                <textarea
                  required
                  placeholder="Write a short bio about yourself"
                  rows={2}
                  maxLength={200}
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bio: sanitizeBio(e.target.value),
                    })
                  }
                  className="w-full bg-background border border-border px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-white transition-colors resize-none"
                />
              </div>

              <div className="pt-4 border-t border-border mt-6">
                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  disabled={
                    isSubmitting ||
                    !formData.name.trim() ||
                    !formData.username.trim() ||
                    usernameStatus !== "available" ||
                    !formData.bio.trim() ||
                    formData.skills.length === 0
                  }
                >
                  {isSubmitting ? "TRANSMITTING..." : "Complete Setup"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>

      <AvatarUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={(url) =>
          setFormData((prev) => ({ ...prev, avatar_url: url }))
        }
        user={user}
      />
    </div>
  );
}
