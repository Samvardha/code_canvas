"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/Button";
import { Banner } from "@/components/Banner";
import { X, Pencil, Camera, Loader2, Upload, FileImage, Plus } from "lucide-react";

export default function OnboardingPage() {
  const { user, loading, profileComplete, userProfile, refreshProfile } =
    useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    bio: "",
    location: "",
    avatar_url: "",
    skills: [] as string[],
  });

  const [skillInput, setSkillInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [hasInterpolated, setHasInterpolated] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // 1. Initial Redirection Logic
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (!loading && profileComplete) {
      router.push("/feed");
    }
  }, [user, loading, profileComplete, router]);

  // 2. Username Availability Check (Manual)
  const checkUsername = async () => {
    const username = formData.username.trim();
    if (!username) {
      setUsernameStatus("idle");
      return;
    }

    // Check format: starts with letter, only a-z0-9_, no consecutive underscores
    if (!/^[a-z][a-z0-9_]*$/.test(username) || username.includes("__")) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");

    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${backendUrl}/users/check-username/${username}`);
      if (res.ok) {
        const data = await res.json();
        setUsernameStatus(data.available ? "available" : "taken");
      } else {
        setUsernameStatus("idle");
      }
    } catch {
      setUsernameStatus("idle");
    }
  };

  // 3. Data Interpolation (Auto-populate from Google)
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

  const addSkill = () => {
    if (skillInput.trim()) {
      const newSkill = skillInput.trim().toUpperCase();
      if (!formData.skills.includes(newSkill)) {
        setFormData((prev) => ({
          ...prev,
          skills: [...prev.skills, newSkill],
        }));
      }
      setSkillInput("");
    }
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  };

  const removeSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }));
  };

  const processFile = async (file: File) => {
    // Validation: Type
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("ONLY_JPEG_OR_PNG_ALLOWED");
      setShowUploadModal(false);
      return;
    }

    // Validation: Size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("FILE_TOO_LARGE_MAX_5MB");
      setShowUploadModal(false);
      return;
    }

    setIsUploading(true);
    setError("");
    setShowUploadModal(false);

    try {
      const idToken = await user?.getIdToken();
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

      const uploadData = new FormData();
      uploadData.append("file", file);

      const res = await fetch(`${backendUrl}/users/me/upload-avatar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        body: uploadData,
      });

      if (res.ok) {
        const data = await res.json();
        setFormData((prev) => ({ ...prev, avatar_url: data.url }));
      } else {
        const data = await res.json();
        setError(data.detail || "UPLOAD_FAILED");
      }
    } catch (err) {
      setError("NETWORK_ERROR: UPLOAD_FAILED");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Final check
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
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

      const trimmedData = {
        ...formData,
        name: formData.name.trim(),
        username: formData.username.trim(),
        bio: formData.bio.trim(),
        location: formData.location.trim(),
      };

      const res = await fetch(`${backendUrl}/auth/onboarding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(trimmedData),
      });

      if (res.ok) {
        await refreshProfile();
        router.push("/feed");
      } else {
        const data = await res.json();
        setError(data.detail || "ONBOARDING_FAILED: CHECK_INPUTS");
      }
    } catch (err) {
      setError("NETWORK_ERROR: UNABLE_TO_REACH_BACKEND");
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
          <header className="mb-6 text-center sm:text-left">
            <h1 className="text-4xl font-black font-(family-name:--font-space-grotesk) uppercase text-white mb-2 leading-none">
              PROFILE_<span className="text-accent text-outline">SETUP</span>
            </h1>
          </header>

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
            {/* PROFILE PICTURE SECTION */}
            <div className="flex flex-col items-center gap-4 mb-8 md:mb-0 w-full">
              <div className="relative group">
                <div className="w-40 h-40 border-2 border-border bg-background overflow-hidden relative">
                  {formData.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={formData.avatar_url}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface">
                      <Camera className="w-10 h-10 text-text-secondary" />
                    </div>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-accent animate-spin" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  className="absolute -bottom-2 -right-2 bg-accent text-black p-2 hover:bg-white transition-colors border-2 border-black cursor-pointer shadow-lg"
                  title="Change Avatar"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] font-mono text-text-secondary uppercase font-bold tracking-widest text-center">
                Profile Picture
              </p>
            </div>

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
                      const titleCase = val
                        .split(" ")
                        .map(
                          (word) =>
                            word.charAt(0).toUpperCase() + word.slice(1),
                        )
                        .join(" ");
                      setFormData({ ...formData, name: titleCase });
                    }}
                    className="w-full bg-background border border-border px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                {/* Username */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
                      Username <span className="text-accent">*</span>
                    </label>
                    {usernameStatus !== "idle" && (
                      <span
                        className={`text-[10px] font-mono font-bold uppercase ${
                          usernameStatus === "available"
                            ? "text-green-500"
                            : usernameStatus === "checking"
                              ? "text-text-secondary animate-pulse"
                              : "text-accent"
                        }`}
                      >
                        {usernameStatus === "checking" && "[ CHECKING... ]"}
                        {usernameStatus === "available" && "[ AVAILABLE ]"}
                        {usernameStatus === "taken" && "[ TAKEN ]"}
                        {usernameStatus === "invalid" && "[ INVALID ]"}
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      required
                      placeholder="Letters, numbers, and underscores only"
                      value={formData.username}
                      onChange={(e) => {
                        let val = e.target.value.toLowerCase();
                        val = val.replace(/[^a-z0-9_]/g, "");
                        val = val.replace(/^[^a-z]+/, "");
                        val = val.replace(/_{2,}/g, "_");

                        setFormData({ ...formData, username: val });
                        if (usernameStatus !== "idle")
                          setUsernameStatus("idle");
                      }}
                      className={`w-full bg-background border px-4 py-3 pr-20 text-sm font-mono text-white focus:outline-none transition-colors ${
                        usernameStatus === "available"
                          ? "border-green-500/50"
                          : usernameStatus === "taken" ||
                              usernameStatus === "invalid"
                            ? "border-accent/50"
                            : "border-border focus:border-white"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={checkUsername}
                      disabled={
                        !formData.username.trim() ||
                        usernameStatus === "checking"
                      }
                      className="absolute right-2 px-3 py-1 bg-border hover:bg-white hover:text-black text-[10px] font-mono font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {usernameStatus === "checking" ? "..." : "CHECK"}
                    </button>
                  </div>
                </div>

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
                      const titleCase = val
                        .split(" ")
                        .map(
                          (word) =>
                            word.charAt(0).toUpperCase() + word.slice(1),
                        )
                        .join(" ");
                      setFormData({ ...formData, location: titleCase });
                    }}
                    className="w-full bg-background border border-border px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                {/* Skills */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
                    Skills <span className="text-accent">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      placeholder="Add skills (React, Python, etc.)"
                      value={skillInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                        setSkillInput(val);
                      }}
                      onKeyDown={handleSkillKeyDown}
                      className="w-full bg-background border border-border px-4 py-3 pr-12 text-sm font-mono text-white focus:outline-none focus:border-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={addSkill}
                      disabled={!skillInput.trim()}
                      className="absolute right-2 p-1.5 bg-border hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <AnimatePresence>
                      {formData.skills.map((skill) => (
                        <motion.span
                          key={skill}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="bg-accent/10 border border-accent/30 text-accent px-3 py-1.5 text-[10px] font-mono font-bold flex items-center gap-2"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="hover:text-white transition-colors cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
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
                  onChange={(e) => {
                    const val = e.target.value.replace(/  +/g, " ");
                    const formatted =
                      val.length > 0
                        ? val.charAt(0).toUpperCase() + val.slice(1)
                        : val;
                    setFormData({ ...formData, bio: formatted });
                  }}
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
                    isUploading ||
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

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUploadModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl border border-border bg-surface p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent"></div>
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent"></div>

              <button
                onClick={() => setShowUploadModal(false)}
                className="absolute top-4 right-4 text-text-secondary hover:text-white transition-colors"
              >
                <X className="w-5 h-5 cursor-pointer" />
              </button>

              <div className="text-center mb-8">
                <h2 className="text-xl font-black font-mono text-white uppercase tracking-tighter">
                  AVATAR_UPLINK_STATION
                </h2>
                <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest mt-1">
                  SECURE_FILE_TRANSFER
                </p>
              </div>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed transition-all duration-300 p-10 flex flex-col items-center gap-4 cursor-pointer group
                  ${isDragging ? "border-accent bg-accent/10" : "border-border bg-background hover:border-accent/50"}
                `}
              >
                <div
                  className={`p-4 rounded-full transition-colors ${isDragging ? "bg-accent text-black" : "bg-surface text-text-secondary group-hover:text-accent"}`}
                >
                  <Upload className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-mono text-white font-bold uppercase">
                    DRAG_&_DROP_IDENTITY
                  </p>
                  <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest mt-1">
                    OR_CLICK_TO_SCAN_FILES
                  </p>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[9px] font-mono text-text-secondary uppercase font-bold">
                  <FileImage className="w-3 h-3" />
                  JPEG_PNG_LESS_THAN_5MB
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) processFile(file);
                }}
                className="hidden"
                accept="image/jpeg,image/png"
              />

              <div className="mt-8">
                <Button
                  fullWidth
                  variant="ghost"
                  onClick={() => setShowUploadModal(false)}
                >
                  CANCEL_STAGING
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
