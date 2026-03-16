"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Image as ImageIcon,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Loader2,
  Calendar,
  Users,
  Info,
  Plus,
  Github,
  ChevronDown,
  Maximize,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/Button";
import Toast from "@/components/Toast";
import { aiApi } from "@/lib/api/ai";
import {
  createPost,
  getPost,
  updatePost,
  PostCreateRequest,
  CollabMeta,
  EventMeta,
} from "@/lib/api/posts";
import { getUserRepos, GitHubRepo, getMe } from "@/lib/api/users";

const VideoPreview = ({ url }: { url: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const handleFSChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFSChange);
    document.addEventListener("webkitfullscreenchange", handleFSChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFSChange);
      document.removeEventListener("webkitfullscreenchange", handleFSChange);
    };
  }, []);

  useEffect(() => {
    let rafId: number;
    const updateProgress = () => {
      if (videoRef.current && isPlaying) {
        const p =
          (videoRef.current.currentTime / videoRef.current.duration) * 100;
        setProgress(p);
        rafId = requestAnimationFrame(updateProgress);
      }
    };

    if (isPlaying) {
      rafId = requestAnimationFrame(updateProgress);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isPlaying]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullScreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        if (containerRef.current.requestFullscreen) {
          containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          (containerRef.current as any).webkitRequestFullscreen();
        } else if ((containerRef.current as any).msRequestFullscreen) {
          (containerRef.current as any).msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative group/video flex items-center justify-center bg-black cursor-pointer overflow-hidden rounded-sm border border-border transition-all ${
        isFullScreen
          ? "fixed inset-0 z-100 w-screen h-screen"
          : "h-40 w-auto aspect-video"
      }`}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={url}
        className="h-full w-full object-contain pointer-events-none"
        muted={isMuted}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        preload="metadata"
      />

      {/* Custom Controls Overlay */}
      <div
        className={`absolute inset-x-0 bottom-0 top-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/video:opacity-100 transition-opacity flex flex-col justify-between p-4 z-10 ${
          isFullScreen ? "opacity-100" : ""
        }`}
      >
        <div className="flex-1 flex items-center justify-center">
          <div
            className={`${isFullScreen ? "w-16 h-16" : "w-10 h-10"} flex items-center justify-center transition-all transform active:scale-95`}
          >
            {isPlaying ? (
              <Pause size={isFullScreen ? 32 : 20} fill="currentColor" />
            ) : (
              <Play size={isFullScreen ? 32 : 20} fill="currentColor" />
            )}
          </div>
        </div>

        <div className="">
          {/* Progress Bar */}
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden cursor-pointer group/progress">
            <div
              className="h-full bg-white/50 relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={toggleMute}
              className="text-text-secondary hover:text-white transition-colors p-2 cursor-pointer"
            >
              {isMuted ? (
                <VolumeX size={isFullScreen ? 20 : 14} />
              ) : (
                <Volume2 size={isFullScreen ? 20 : 14} />
              )}
            </button>
            <button
              onClick={toggleFullScreen}
              className="text-text-secondary hover:text-white transition-colors p-2 cursor-pointer"
            >
              <Maximize size={isFullScreen ? 20 : 14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function CreatePostPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const [token, setToken] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [isGithubConnected, setIsGithubConnected] = useState(true);

  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [collabMeta, setCollabMeta] = useState({
    title: "",
    duration: "",
    looking_for: [] as string[],
    requirements: [] as string[],
  });

  const [lookingForInput, setLookingForInput] = useState("");
  const [requirementsInput, setRequirementsInput] = useState("");

  const addTag = (field: "looking_for" | "requirements") => {
    const input = field === "looking_for" ? lookingForInput : requirementsInput;
    if (input.trim()) {
      setCollabMeta((prev) => ({
        ...prev,
        [field]: [...prev[field], input.trim()],
      }));
      if (field === "looking_for") setLookingForInput("");
      else setRequirementsInput("");
    }
  };

  const removeTag = (field: "looking_for" | "requirements", index: number) => {
    setCollabMeta((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const [eventMeta, setEventMeta] = useState({
    title: "",
    description: "",
    venue: {
      address: "",
      city: "",
      state: "",
      pincode: "",
    },
    start_at: "",
    end_at: "",
    rsvp_url: "",
    mode: "online",
  });

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ url: string; type: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [toast, setToast] = useState<{ isVisible: boolean; message: string }>({
    isVisible: false,
    message: "",
  });

  const showToast = (message: string) => {
    setToast({ isVisible: true, message });
  };

  // GitHub Repo State
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubPage, setGithubPage] = useState(1);
  const [hasMoreRepos, setHasMoreRepos] = useState(true);
  const [showRepoDropdown, setShowRepoDropdown] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const modeDropdownRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Click outside for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setShowRepoDropdown(false);
      }
      if (
        modeDropdownRef.current &&
        !modeDropdownRef.current.contains(target)
      ) {
        setShowModeDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchRepos = async (page: number = 1, force: boolean = false) => {
    if (!token || (githubLoading && page === 1)) return;

    // Use cache if available and not forcing a refresh
    if (page === 1 && repos.length > 0 && !force) {
      return;
    }

    setGithubLoading(true);
    try {
      const data = await getUserRepos(token, page, 9);
      if (page === 1) {
        setRepos(data.repos);
      } else {
        setRepos((prev) => [...prev, ...data.repos]);
      }
      setHasMoreRepos(data.has_more);
      setGithubPage(page);
    } catch (err: any) {
      console.error("Failed to fetch GitHub repos:", err);
      // Clear cache on error to allow retry
      if (page === 1) setRepos([]);
    } finally {
      setGithubLoading(false);
    }
  };

  const handleRepoSelect = (repo: GitHubRepo) => {
    setSelectedRepo((prev) => (prev?.repo_url === repo.repo_url ? null : repo));
    setShowRepoDropdown(false);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    const getToken = async () => {
      if (user) {
        const t = await user.getIdToken();
        setToken(t);

        try {
          const userData = await getMe(t);
          setIsGithubConnected(userData.providers?.github?.linked || false);
        } catch (err) {
          console.error("Failed to fetch user connection status:", err);
        }
      }
    };
    getToken();
  }, [user, authLoading, router]);

  const toggleCategory = (cat: string) => {
    if (editId) return;
    setSelectedCategory((prev) => (prev === cat ? null : cat));
    setValidationErrors([]);
  };

  const clearError = (errorId: string) => {
    if (validationErrors.includes(errorId)) {
      setValidationErrors((prev) => prev.filter((e) => e !== errorId));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const remainingSlots = 10 - files.length;
    if (remainingSlots <= 0) {
      setToast({
        isVisible: true,
        message: "MAX_10_FILES_ALLOWED",
      });
      return;
    }

    const newFiles = [...files];
    const newPreviews = [...previews];

    // Only process up to the remaining slots
    const filesToProcess = selectedFiles.slice(0, remainingSlots);

    if (selectedFiles.length > remainingSlots) {
      setToast({
        isVisible: true,
        message: `LIMIT_REACHED_ONLY_FIRST_${remainingSlots}_FILES_ADDED`,
      });
    }

    filesToProcess.forEach((file) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if (!isImage && !isVideo) {
        setToast({
          isVisible: true,
          message: "ONLY_IMAGES_AND_VIDEOS_ALLOWED",
        });
        return;
      }

      newFiles.push(file);
      newPreviews.push({
        url: URL.createObjectURL(file),
        type: isImage ? "image" : "video",
      });
    });

    setFiles(newFiles);
    setPreviews(newPreviews);
    setValidationErrors([]);
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    const newPreviews = [...previews];
    URL.revokeObjectURL(newPreviews[index].url);
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    setFiles(newFiles);
    setPreviews(newPreviews);
  };

  // Fetch post data for editing
  useEffect(() => {
    if (editId && token) {
      const fetchPostData = async () => {
        try {
          const post = await getPost(editId, token);
          setText(post.content.text || "");
          setSelectedCategory(post.categories[0] || null);
          
          if (post.collab_meta) {
            setCollabMeta({
              title: post.collab_meta.title || "",
              duration: post.collab_meta.duration || "",
              looking_for: post.collab_meta.looking_for || [],
              requirements: post.collab_meta.requirements || [],
            });
          }

          if (post.event_meta) {
            setEventMeta({
              title: post.event_meta.title || "",
              description: post.event_meta.description || "",
              venue: {
                address: post.event_meta.venue?.address || "",
                city: post.event_meta.venue?.city || "",
                state: post.event_meta.venue?.state || "",
                pincode: post.event_meta.venue?.pincode || "",
              },
              start_at: post.event_meta.start_at || "",
              end_at: post.event_meta.end_at || "",
              rsvp_url: post.event_meta.rsvp_url || "",
              mode: post.event_meta.mode || "online",
            });
          }

          if (post.github) {
            setSelectedRepo(post.github as any);
          }
          
          // Note: and more... existing files are harder to map back to File objects
          // but we can show existing media as previews if needed.
          if (post.content.media?.length) {
            setPreviews(post.content.media.map(m => ({ url: m.url, type: m.type })));
          }

        } catch (err) {
          console.error("Failed to fetch post for editing:", err);
          showToast("Failed to load post data");
        }
      };
      fetchPostData();
    }
  }, [editId, token]);

  const handleSuggest = async () => {
    if (!token || !text.trim() || isGenerating) return;

    setIsGenerating(true);
    setSuggestions([]);
    try {
      const results = await aiApi.suggestCaptions(text, token);
      setSuggestions(results);
    } catch (error: any) {
      console.error("AI Generation failed:", error);
      showToast(error.message || "AI_GENERATION_FAILED");
    } finally {
      setIsGenerating(false);
    }
  };

  const applySuggestion = (suggestion: string) => {
    setText(suggestion);
    setSuggestions([]);
  };

  const handleSubmit = async () => {
    if (!token) return;
    const errors: string[] = [];

    // Local Validation - Media is optional
    if (!text.trim()) {
      errors.push("text");
    }

    if (selectedCategory === "collab") {
      if (!collabMeta.title) errors.push("collab_title");
      if (!collabMeta.duration) errors.push("collab_duration");
      if (collabMeta.looking_for.length === 0) errors.push("collab_looking_for");
      if (collabMeta.requirements.length === 0) errors.push("collab_requirements");
    }

    if (selectedCategory === "event") {
      if (!eventMeta.title) errors.push("event_title");
      if (!eventMeta.rsvp_url) errors.push("event_rsvp");
      if (!eventMeta.start_at) errors.push("event_start");
      if (!eventMeta.end_at) errors.push("event_end");
      if (eventMeta.mode === "offline") {
        if (!eventMeta.venue.address) errors.push("event_address");
        if (!eventMeta.venue.city) errors.push("event_city");
        if (!eventMeta.venue.state) errors.push("event_state");
        if (!eventMeta.venue.pincode) errors.push("event_pincode");
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setLoading(true);
    setValidationErrors([]);

    try {
      const postData: PostCreateRequest = {
        categories: selectedCategory ? [selectedCategory] : [],
        content: {
          text: text.trim(),
          links: link ? [{ url: link }] : [],
          media: [],
        },
        github: selectedRepo
          ? {
              repo_url: selectedRepo.repo_url,
              repo_name: selectedRepo.repo_name,
              repo_owner: selectedRepo.repo_owner,
            }
          : null,
      };

      if (selectedCategory === "collab") {
        postData.collab_meta = {
          title: collabMeta.title,
          duration: collabMeta.duration || null,
          looking_for: collabMeta.looking_for,
          requirements: collabMeta.requirements,
          status: "open" as any,
        };
      }

      if (selectedCategory === "event") {
        const formatForBackend = (dateStr: string) => {
          if (!dateStr || dateStr.length < 10) return null;
          const [d, m, y] = dateStr.split("/");
          return `${y}-${m}-${d}`;
        };

        const startAtFormatted = formatForBackend(eventMeta.start_at);
        const endAtFormatted = formatForBackend(eventMeta.end_at);

        if (!startAtFormatted) {
          setToast({ isVisible: true, message: "INVALID_START_DATE_FORMAT" });
          setLoading(false);
          return;
        }

        postData.event_meta = {
          title: eventMeta.title,
          description: eventMeta.description || text.trim() || null,
          venue: eventMeta.mode === "offline" ? eventMeta.venue : null,
          start_at: startAtFormatted as any,
          end_at: endAtFormatted as any,
          rsvp_url: eventMeta.rsvp_url || null,
          mode: eventMeta.mode as any,
          status: "upcoming" as any,
        };
      }

      if (editId) {
        await updatePost(editId, postData, token);
      } else {
        await createPost(postData, files, token);
      }
      
      setShowSuccessToast(true);
      setTimeout(() => {
        router.push("/explore-feed");
      }, 2000);
    } catch (err: any) {
      setToast({
        isVisible: true,
        message: err.message || "FAILED_TO_BROADCAST_SIGNAL",
      });
    } finally {
      setLoading(false);
      setRepos([]);
      setGithubPage(1);
      setHasMoreRepos(true);
    }
  };

  const handleReset = () => {
    setText("");
    setLink("");
    setSelectedCategory(null);
    setSelectedRepo(null);
    setRepos([]);
    setGithubPage(1);
    setHasMoreRepos(true);
    setCollabMeta({
      title: "",
      duration: "",
      looking_for: [],
      requirements: [],
    });
    setLookingForInput("");
    setRequirementsInput("");
    setEventMeta({
      title: "",
      description: "",
      venue: {
        address: "",
        city: "",
        state: "",
        pincode: "",
      },
      start_at: "",
      end_at: "",
      rsvp_url: "",
      mode: "online",
    });
    setFiles([]);
    setPreviews([]);
    setValidationErrors([]);
    setToast({ isVisible: false, message: "" });
  };

  if (authLoading || (!token && !user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="font-mono text-accent text-sm uppercase tracking-widest font-bold animate-pulse flex items-center gap-3">
          <div className="w-3 h-3 bg-accent rotate-45" />[ SYNCING_CENTER ]
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-foreground selection:bg-accent selection:text-black font-sans relative">
      <div className="fixed inset-0 grid-bg opacity-30 pointer-events-none z-0" />

      <div className="relative z-10 flex flex-col md:flex-row min-h-screen max-w-[1400px] mx-auto border-x border-border bg-black/40 backdrop-blur-[2px]">
        <section className="flex-1 overflow-y-auto border-r border-border min-h-screen hide-scrollbar">
          <header className="sticky top-0 z-20 bg-black/80 backdrop-blur-md border-b border-border p-6 flex items-center justify-between">
            <h1 className="text-2xl font-black font-(family-name:--font-space-grotesk) uppercase text-white tracking-tight">
              INITIALIZE_
              <span className="text-accent text-outline">BROADCAST</span>
            </h1>
          </header>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col"
          >
            {/* Scrollable Content */}
            <div className="p-6 space-y-8 bg-surface/50 min-h-[calc(100vh-89px)]">
              {/* Category Selection */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-[10px] font-mono font-black text-text-secondary uppercase tracking-widest">
                    SELECT_POST_TYPE
                  </label>
                  <p className="text-[9px] font-mono text-accent uppercase italic tracking-wider">
                    {editId 
                      ? "> POST_TYPE_IS_LOCKED_FOR_EXISTING_SIGNALS" 
                      : "> IF NONE SELECTED, BROADCAST WILL BE TAGGED AS GENERAL"}
                  </p>
                </div>
                <div className="flex gap-4">
                  {["collab", "event"].map((cat) => {
                    const isDisabled = cat === "collab" && !isGithubConnected;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => !isDisabled && !editId && toggleCategory(cat)}
                        disabled={isDisabled || !!editId}
                        className={`flex-1 py-4 px-6 border font-mono text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-3 mt-4 ${
                          selectedCategory === cat
                            ? "border-accent bg-accent/5 text-accent"
                            : isDisabled || !!editId
                              ? "border-border/50 bg-background/20 text-text-secondary/30 cursor-not-allowed opacity-50"
                              : "border-border bg-background/50 text-text-secondary hover:border-text-secondary hover:bg-surface/30"
                        }`}
                      >
                        {cat === "collab" ? (
                          <Users className="w-4 h-4" />
                        ) : (
                          <Calendar className="w-4 h-4" />
                        )}
                        {cat}
                        {isDisabled && (
                          <span className="text-[8px] normal-case font-normal opacity-60 block">
                            (GITHUB_LINK_REQUIRED)
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Common Content */}
              <div className="grid grid-cols-1 gap-8">
                <div>
                  <label className="text-[10px] font-mono font-black text-text-secondary uppercase tracking-widest">
                    TRANSMISSION_DATA
                  </label>
                  <textarea
                    value={text}
                    onFocus={() => clearError("text")}
                    onChange={(e) => {
                      setText(e.target.value);
                      clearError("text");
                    }}
                    placeholder="DESCRIBE_THE_SIGNAL"
                    rows={3}
                    className={`w-full bg-background/30 border p-5 text-sm font-mono text-white placeholder:text-border focus:ring-1 focus:ring-accent outline-none resize-none transition-colors mt-4 ${
                      validationErrors.includes("text")
                        ? "border-red-500/50"
                        : "border-border"
                    }`}
                    disabled={loading || isGenerating}
                  />

                  {/* AI Suggestions Box */}
                  <AnimatePresence>
                    {suggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="flex flex-col gap-2 overflow-hidden"
                      >
                        <div className="flex items-center justify-between border-b border-border/50 pb-2">
                          <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                            <Sparkles className="w-3 h-3" />
                            AI_REWORK_OPTIONS
                          </span>
                          <button
                            type="button"
                            onClick={() => setSuggestions([])}
                            className="text-text-secondary hover:text-white transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex flex-col gap-4 py-4">
                          {suggestions.map((s, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => applySuggestion(s)}
                              className="group relative flex flex-col gap-3 text-left bg-black/40 border border-white/5 p-5 hover:border-accent/40 transition-all overflow-hidden cursor-pointer"
                            >
                              <div className="absolute top-0 left-0 w-1 h-full bg-border/50 group-hover:bg-accent transition-colors" />
                              <div className="flex justify-between items-center w-full">
                                <span className="text-[10px] font-mono font-black text-text-secondary group-hover:text-accent uppercase tracking-widest transition-colors pl-2">
                                  OPTION_{(idx + 1).toString().padStart(2, '0')}
                                </span>
                                <span className="opacity-0 group-hover:opacity-100 text-[9px] font-mono font-bold text-accent uppercase tracking-widest transition-opacity pr-2">
                                  CLICK_TO_APPLY
                                </span>
                              </div>
                              <p className="text-[13px] text-text-secondary group-hover:text-white font-mono leading-relaxed transition-colors pl-2 pr-2">
                                {s}
                              </p>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {selectedCategory !== "event" && isGithubConnected && (
                  <div className="relative" ref={dropdownRef}>
                    <label className="text-[10px] font-mono font-black text-text-secondary uppercase tracking-widest">
                      CHOOSE_GITHUB_PROJECT
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (!showRepoDropdown) {
                          fetchRepos(1);
                        }
                        setShowRepoDropdown(!showRepoDropdown);
                      }}
                      className="w-full bg-background/30 border border-border p-4 text-sm font-mono text-white flex items-center justify-between hover:border-accent/40 transition-colors mt-4 cursor-pointer"
                    >
                      <span
                        className={selectedRepo ? "text-white" : "text-border"}
                      >
                        {selectedRepo
                          ? selectedRepo.repo_name
                          : "SELECT_REPOSITORY"}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${showRepoDropdown ? "rotate-180" : ""}`}
                      />
                    </button>

                    <AnimatePresence>
                      {showRepoDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute z-30 w-full mt-2 bg-[#0A0A0A] border border-border shadow-2xl overflow-hidden"
                        >
                          <div
                            className="max-h-60 overflow-y-auto hide-scrollbar"
                            onScroll={(e) => {
                              const target = e.currentTarget;
                              if (
                                target.scrollHeight - target.scrollTop <=
                                  target.clientHeight + 1 &&
                                !githubLoading &&
                                hasMoreRepos
                              ) {
                                fetchRepos(githubPage + 1);
                              }
                            }}
                          >
                            {githubLoading && repos.length === 0 ? (
                              <div className="p-4 flex items-center justify-center gap-2 text-accent font-mono text-[10px]">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                FETCHING_REPOSITORIES...
                              </div>
                            ) : repos.length === 0 ? (
                              <div className="p-4 text-center text-border font-mono text-[10px]">
                                NO_REPOSITORIES_FOUND
                              </div>
                            ) : (
                              <div className="p-1">
                                {repos.map((repo) => (
                                  <button
                                    key={repo.repo_url}
                                    type="button"
                                    onClick={() => handleRepoSelect(repo)}
                                    className={`w-full text-left p-3 font-mono text-[11px] uppercase tracking-wider transition-colors flex items-center justify-between ${
                                      selectedRepo?.repo_url === repo.repo_url
                                        ? "bg-white/10 text-white"
                                        : "text-text-secondary hover:bg-surface/50 hover:text-white"
                                    }`}
                                  >
                                    {repo.repo_name}
                                    {selectedRepo?.repo_url ===
                                      repo.repo_url && (
                                      <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                                    )}
                                  </button>
                                ))}
                                {githubLoading && (
                                  <div className="p-3 flex items-center justify-center gap-2 text-accent/50 font-mono text-[9px] uppercase tracking-widest">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    SYNCING_MORE_SIGNALS...
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-mono font-black text-text-secondary uppercase tracking-widest">
                    EXTERNAL_UPLINK (SINGLE_LINK_ONLY)
                  </label>
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="ENTER_EXTERNAL_LINK"
                    className="w-full bg-background/30 border border-border p-4 text-sm font-mono text-white placeholder:text-border focus:ring-1 focus:ring-accent outline-none transition-colors mt-4"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Media Upload Section */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <label className="text-[10px] font-mono font-black text-text-secondary uppercase tracking-widest">
                    ATTACH_MEDIA
                  </label>
                  <p className="text-[9px] font-mono text-accent uppercase italic tracking-wider">
                    &gt; PNG/JPEG &lt; 5MB | MP4/WEBM &lt; 50MB
                  </p>
                </div>

                {previews.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-40 border-2 border-dashed border-border hover:border-accent/40 bg-background/30 text-text-secondary hover:text-accent transition-all flex flex-col items-center justify-center gap-4 disabled:opacity-50 cursor-pointer"
                    disabled={loading}
                  >
                    <ImageIcon size={28} />
                    <p className="text-[11px] font-mono uppercase tracking-[0.2em] font-black">
                      INITIALIZE_MEDIA_UPLOAD
                    </p>
                  </button>
                ) : (
                  <div className="flex flex-wrap gap-4 items-start">
                    {previews.map((preview, idx) => (
                      <div
                        key={idx}
                        className="relative h-40 w-auto min-w-[120px] border border-border bg-black/40 overflow-hidden group/preview"
                      >
                        {preview.type === "image" ? (
                          <img
                            src={preview.url}
                            alt=""
                            className="h-full w-auto object-contain"
                          />
                        ) : (
                          <VideoPreview url={preview.url} />
                        )}
                        {!loading && (
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            className="absolute top-2 right-2 z-10 bg-black/80 text-white p-1.5 border border-white/10 opacity-0 group-hover/preview:opacity-100 transition-all hover:bg-red-500 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`h-40 w-40 border-2 border-dashed border-border transition-all flex flex-col items-center justify-center gap-2 group ${
                        files.length >= 10
                          ? "opacity-50 cursor-not-allowed bg-surface/20 text-text-secondary"
                          : "hover:border-white/40 bg-surface/50 text-text-secondary hover:text-white cursor-pointer"
                      }`}
                      disabled={loading || files.length >= 10}
                    >
                      <Plus size={24} />
                      <span className="text-[9px] font-mono uppercase tracking-widest font-bold text-center px-2">
                        {files.length >= 10 ? "LIMIT_REACHED" : "ADD_MORE"}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Dynamic Collab Fields */}
              <AnimatePresence>
                {selectedCategory === "collab" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-4 pt-4 border-t border-border/50">
                      <div className="p-6 bg-white/3 border border-white/10 space-y-6">
                        <h3 className="text-[11px] font-mono font-black text-accent uppercase tracking-widest">
                          COLLABORATION_METADATA
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4 col-span-full">
                            <label className="text-[10px] font-mono font-black text-text-secondary uppercase tracking-widest">
                              Project_Title
                            </label>
                            <input
                              type="text"
                              value={collabMeta.title}
                              onFocus={() => clearError("collab_title")}
                              onChange={(e) => {
                                setCollabMeta({
                                  ...collabMeta,
                                  title: e.target.value,
                                });
                                clearError("collab_title");
                              }}
                              className={`w-full bg-background/30 border p-4 text-sm font-mono text-white placeholder:text-border focus:ring-1 focus:ring-accent outline-none transition-colors mt-2 ${
                                validationErrors.includes("collab_title")
                                  ? "border-red-500/50"
                                  : "border-border"
                              }`}
                              placeholder="E.G. AI_POWERED_MARKETPLACE"
                            />
                          </div>
                          <div className="space-y-4">
                            <label className="text-[10px] font-mono font-black text-text-secondary uppercase tracking-widest">
                              Duration
                            </label>
                            <div className="relative mt-2">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={collabMeta.duration}
                                onFocus={() => clearError("collab_duration")}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, "");
                                  setCollabMeta({
                                    ...collabMeta,
                                    duration: val,
                                  });
                                  clearError("collab_duration");
                                }}
                                className={`w-full bg-background/30 border p-4 pr-20 text-sm font-mono text-white placeholder:text-border focus:ring-1 focus:ring-accent outline-none transition-colors ${
                                  validationErrors.includes("collab_duration")
                                    ? "border-red-500/50"
                                    : "border-border"
                                }`}
                                placeholder="0"
                              />
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-text-secondary/50 pointer-events-none uppercase">
                                MONTHS
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <label className="text-[10px] font-mono font-black text-text-secondary uppercase tracking-widest">
                              Looking_For
                            </label>
                            <div className="space-y-3 mt-2">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={lookingForInput}
                                  onFocus={() => clearError("collab_looking_for")}
                                  onChange={(e) => {
                                    setLookingForInput(
                                      e.target.value.toUpperCase(),
                                    );
                                    clearError("collab_looking_for");
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      addTag("looking_for");
                                      clearError("collab_looking_for");
                                    }
                                  }}
                                  className={`flex-1 bg-background/30 border p-4 text-sm font-mono text-white placeholder:text-border focus:ring-1 focus:ring-accent outline-none transition-colors ${
                                    validationErrors.includes("collab_looking_for")
                                      ? "border-red-500/50"
                                      : "border-border"
                                  }`}
                                  placeholder="E.G. BACKEND_DEV"
                                />
                                <button
                                  type="button"
                                  onClick={() => addTag("looking_for")}
                                  className="bg-white/5 border border-white/10 text-white/50 px-4 hover:bg-white/10 hover:border-white/20 transition-colors"
                                >
                                  <Plus size={18} />
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {collabMeta.looking_for.map((tag, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-sm"
                                  >
                                    <span className="text-[10px] font-mono font-bold text-white/70">
                                      {tag}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeTag("looking_for", idx)
                                      }
                                      className="text-white/30 hover:text-white transition-colors"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4 col-span-full">
                            <label className="text-[10px] font-mono font-black text-text-secondary uppercase tracking-widest">
                              Requirements
                            </label>
                            <div className="space-y-3 mt-2">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={requirementsInput}
                                  onFocus={() => clearError("collab_requirements")}
                                  onChange={(e) => {
                                    setRequirementsInput(
                                      e.target.value.toUpperCase(),
                                    );
                                    clearError("collab_requirements");
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      addTag("requirements");
                                      clearError("collab_requirements");
                                    }
                                  }}
                                  className={`flex-1 bg-background/30 border p-4 text-sm font-mono text-white placeholder:text-border focus:ring-1 focus:ring-accent outline-none transition-colors ${
                                    validationErrors.includes("collab_requirements")
                                      ? "border-red-500/50"
                                      : "border-border"
                                  }`}
                                  placeholder="E.G. REACT_NATIVE"
                                />
                                <button
                                  type="button"
                                  onClick={() => addTag("requirements")}
                                  className="bg-white/5 border border-white/10 text-white/50 px-4 hover:bg-white/10 hover:border-white/20 transition-colors"
                                >
                                  <Plus size={18} />
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {collabMeta.requirements.map((tag, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-sm"
                                  >
                                    <span className="text-[10px] font-mono font-bold text-white/70">
                                      {tag}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeTag("requirements", idx)
                                      }
                                      className="text-white/30 hover:text-white transition-colors"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Dynamic Event Fields */}
              <AnimatePresence>
                {selectedCategory === "event" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-4 pt-4 border-t border-border/50">
                      <div className="p-6 bg-white/3 border border-white/10 space-y-6">
                        <h3 className="text-[11px] font-mono font-black text-accent uppercase tracking-widest">
                          EVENT_METADATA
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4 col-span-full">
                            <label className="text-[10px] font-mono font-black text-text-secondary uppercase tracking-widest">
                              Event_Title
                            </label>
                            <input
                              type="text"
                              value={eventMeta.title}
                              onFocus={() => clearError("event_title")}
                              onChange={(e) => {
                                setEventMeta({
                                  ...eventMeta,
                                  title: e.target.value,
                                });
                                clearError("event_title");
                              }}
                              className={`w-full bg-background/30 border p-4 text-sm font-mono text-white placeholder:text-border focus:ring-1 focus:ring-accent outline-none transition-colors mt-2 ${
                                validationErrors.includes("event_title")
                                  ? "border-red-500/50"
                                  : "border-border"
                              }`}
                              placeholder="E.G. TECH_SUMMIT_2024"
                            />
                          </div>

                          <div className="space-y-4">
                            <label className="text-[10px] font-mono font-black text-text-secondary uppercase tracking-widest">
                              RSVP_URL
                            </label>
                            <input
                              type="url"
                              value={eventMeta.rsvp_url}
                              onFocus={() => clearError("event_rsvp")}
                              onChange={(e) => {
                                setEventMeta({
                                  ...eventMeta,
                                  rsvp_url: e.target.value,
                                });
                                clearError("event_rsvp");
                              }}
                              className={`w-full bg-background/30 border p-4 text-sm font-mono text-white placeholder:text-border focus:ring-1 focus:ring-accent outline-none transition-colors mt-2 ${
                                validationErrors.includes("event_rsvp")
                                  ? "border-red-500/50"
                                  : "border-border"
                              }`}
                              placeholder="https://event.link/register"
                            />
                          </div>

                          <div className="relative" ref={modeDropdownRef}>
                            <label className="text-[10px] font-mono font-black text-text-secondary uppercase tracking-widest block">
                              Mode
                            </label>
                            <button
                              type="button"
                              onClick={() => !editId && setShowModeDropdown(!showModeDropdown)}
                              disabled={!!editId}
                              className={`w-full bg-background/30 border p-4 text-sm font-mono text-white flex items-center justify-between hover:border-accent/40 transition-colors mt-4 cursor-pointer ${
                                !!editId ? "opacity-50 cursor-not-allowed border-border/50" : ""
                              } ${
                                validationErrors.includes("event_mode")
                                  ? "border-red-500/50"
                                  : "border-border"
                              }`}
                            >
                              <span className="uppercase">{eventMeta.mode}</span>
                              <ChevronDown
                                className={`w-4 h-4 transition-transform ${showModeDropdown ? "rotate-180" : ""}`}
                              />
                            </button>

                            <AnimatePresence>
                              {showModeDropdown && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 10 }}
                                  className="absolute top-full left-0 z-30 w-full mt-2 bg-[#0A0A0A] border border-border shadow-2xl overflow-hidden"
                                >
                                  <div className="max-h-60 overflow-y-auto hide-scrollbar">
                                    {["online", "offline"].map((mode) => (
                                        <button
                                          key={mode}
                                          type="button"
                                          onClick={() => {
                                            setEventMeta({
                                              ...eventMeta,
                                              mode,
                                            });
                                            setShowModeDropdown(false);
                                          }}
                                          className={`w-full text-left p-4 text-xs font-mono uppercase transition-colors hover:bg-white/5 ${
                                            eventMeta.mode === mode
                                              ? "text-accent bg-accent/5"
                                              : "text-text-secondary"
                                          }`}
                                        >
                                          {mode}
                                        </button>
                                      ),
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          <div className="space-y-4">
                            <label className="text-[10px] font-mono font-black text-text-secondary uppercase tracking-widest">
                              Start_At
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={eventMeta.start_at}
                              onFocus={() => clearError("event_start")}
                              onChange={(e) => {
                                if (editId) return;
                                let val = e.target.value.replace(/\D/g, "");
                                if (val.length > 8) val = val.slice(0, 8);
                                let formatted = val;
                                if (val.length > 2) {
                                  formatted =
                                    val.slice(0, 2) + "/" + val.slice(2);
                                }
                                if (val.length > 4) {
                                  formatted =
                                    formatted.slice(0, 5) + "/" + val.slice(4);
                                }
                                setEventMeta({
                                  ...eventMeta,
                                  start_at: formatted,
                                });
                                clearError("event_start");
                              }}
                              disabled={!!editId}
                              className={`w-full bg-background/30 border p-4 text-sm font-mono text-white placeholder:text-white/20 focus:ring-1 focus:ring-accent outline-none transition-colors mt-2 ${
                                !!editId ? "opacity-50 cursor-not-allowed border-border/50" : ""
                              } ${
                                validationErrors.includes("event_start")
                                  ? "border-red-500/50"
                                  : "border-border"
                              }`}
                              placeholder="DD/MM/YYYY"
                            />
                          </div>
                          <div className="space-y-4">
                            <label className="text-[10px] font-mono font-black text-text-secondary uppercase tracking-widest">
                              End_At
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={eventMeta.end_at}
                              onFocus={() => clearError("event_end")}
                              onChange={(e) => {
                                if (editId) return;
                                let val = e.target.value.replace(/\D/g, "");
                                if (val.length > 8) val = val.slice(0, 8);
                                let formatted = val;
                                if (val.length > 2) {
                                  formatted =
                                    val.slice(0, 2) + "/" + val.slice(2);
                                }
                                if (val.length > 4) {
                                  formatted =
                                    formatted.slice(0, 5) + "/" + val.slice(4);
                                }
                                setEventMeta({
                                  ...eventMeta,
                                  end_at: formatted,
                                });
                                clearError("event_end");
                              }}
                              disabled={!!editId}
                              className={`w-full bg-background/30 border p-4 text-sm font-mono text-white placeholder:text-white/20 focus:ring-1 focus:ring-accent outline-none transition-colors mt-2 ${
                                !!editId ? "opacity-50 cursor-not-allowed border-border/50" : ""
                              } ${
                                validationErrors.includes("event_end")
                                  ? "border-red-500/50"
                                  : "border-border"
                              }`}
                              placeholder="DD/MM/YYYY"
                            />
                          </div>

                          {eventMeta.mode === "offline" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 col-span-full">
                              <div className="space-y-4">
                                <label className="text-[10px] font-mono font-black text-text-secondary uppercase tracking-widest">
                                  Venue_Address
                                </label>
                                <input
                                  type="text"
                                  value={eventMeta.venue.address}
                                  onFocus={() => clearError("event_address")}
                                  onChange={(e) => {
                                    setEventMeta({
                                      ...eventMeta,
                                      venue: {
                                        ...eventMeta.venue,
                                        address: e.target.value,
                                      },
                                    });
                                    clearError("event_address");
                                  }}
                                  className={`w-full bg-background/30 border p-4 text-sm font-mono text-white placeholder:text-border focus:ring-1 focus:ring-accent outline-none transition-colors mt-2 ${
                                    validationErrors.includes("event_address")
                                      ? "border-red-500/50"
                                      : "border-border"
                                  }`}
                                  placeholder="STREET_OR_BUILDING"
                                />
                              </div>
                              <div className="space-y-4">
                                <label className="text-[10px] font-mono font-black text-text-secondary uppercase tracking-widest">
                                  City
                                </label>
                                <input
                                  type="text"
                                  value={eventMeta.venue.city}
                                  onFocus={() => clearError("event_city")}
                                  onChange={(e) => {
                                    setEventMeta({
                                      ...eventMeta,
                                      venue: {
                                        ...eventMeta.venue,
                                        city: e.target.value,
                                      },
                                    });
                                    clearError("event_city");
                                  }}
                                  className={`w-full bg-background/30 border p-4 text-sm font-mono text-white placeholder:text-border focus:ring-1 focus:ring-accent outline-none transition-colors mt-2 ${
                                    validationErrors.includes("event_city")
                                      ? "border-red-500/50"
                                      : "border-border"
                                  }`}
                                  placeholder="CITY_NAME"
                                />
                              </div>
                              <div className="space-y-4">
                                <label className="text-[10px] font-mono font-black text-text-secondary uppercase tracking-widest">
                                  State
                                </label>
                                <input
                                  type="text"
                                  value={eventMeta.venue.state}
                                  onFocus={() => clearError("event_state")}
                                  onChange={(e) => {
                                    setEventMeta({
                                      ...eventMeta,
                                      venue: {
                                        ...eventMeta.venue,
                                        state: e.target.value,
                                      },
                                    });
                                    clearError("event_state");
                                  }}
                                  className={`w-full bg-background/30 border p-4 text-sm font-mono text-white placeholder:text-border focus:ring-1 focus:ring-accent outline-none transition-colors mt-2 ${
                                    validationErrors.includes("event_state")
                                      ? "border-red-500/50"
                                      : "border-border"
                                  }`}
                                  placeholder="STATE/PROVINCE"
                                />
                              </div>
                              <div className="space-y-4">
                                <label className="text-[10px] font-mono font-black text-text-secondary uppercase tracking-widest">
                                  Pincode
                                </label>
                                <input
                                  type="text"
                                  value={eventMeta.venue.pincode}
                                  onFocus={() => clearError("event_pincode")}
                                  onChange={(e) => {
                                    setEventMeta({
                                      ...eventMeta,
                                      venue: {
                                        ...eventMeta.venue,
                                        pincode: e.target.value,
                                      },
                                    });
                                    clearError("event_pincode");
                                  }}
                                  className={`w-full bg-background/30 border p-4 text-sm font-mono text-white placeholder:text-border focus:ring-1 focus:ring-accent outline-none transition-colors mt-2 ${
                                    validationErrors.includes("event_pincode")
                                      ? "border-red-500/50"
                                      : "border-border"
                                  }`}
                                  placeholder="ZIP/POSTAL_CODE"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Toolbar */}
            <div className="p-6 border-t border-border/50 flex flex-wrap items-center justify-between bg-background/50 shrink-0 transition-colors gap-4">
              <div className="flex gap-4 items-center">
                <button
                  type="button"
                  onClick={handleSuggest}
                  disabled={loading || isGenerating || !text.trim()}
                  className={`flex gap-2 items-center group cursor-pointer transition-colors ${
                    isGenerating ? "text-accent" : "text-text-secondary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  }`}
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 group-hover:text-accent transition-colors" />
                  )}
                  <span className={`text-[10px] font-mono font-bold tracking-widest uppercase transition-colors ${
                    isGenerating ? "" : "group-hover:text-white"
                  }`}>
                    {isGenerating ? "PROCESSING..." : "WRITE_WITH_AI"}
                  </span>
                </button>
                <div className="w-px h-4 bg-border/50"></div>
                <label className="flex gap-2 items-center group cursor-pointer">
                  <ImageIcon className="w-4 h-4 text-text-secondary group-hover:text-white transition-colors" />
                  <span className="text-[10px] font-mono font-bold text-text-secondary group-hover:text-white tracking-widest transition-colors uppercase">
                    ATTACH
                  </span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    multiple
                    accept="image/*,video/*"
                  />
                </label>
              </div>

              <div className="flex">
                <button
                  onClick={handleReset}
                  disabled={loading}
                  className="h-10 px-10 text-[11px] font-mono tracking-[0.2em] font-bold text-accent hover:text-white transition-colors duration-200 cursor-pointer"
                >
                  RESET
                </button>

                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="h-10 px-10 text-[11px] font-mono tracking-[0.2em] font-bold"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    editId ? "UPDATE" : "BROADCAST"
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </section>

        <aside className="hidden lg:flex w-80 p-6 flex-col gap-8">
          <div className="border border-border p-5 bg-surface/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-8 h-8 bg-accent/10 flex items-center justify-center border-b border-l border-border">
              <Info className="w-4 h-4 text-accent" />
            </div>
            <h2 className="text-[10px] font-mono font-black text-white uppercase tracking-widest mb-4">
              {editId ? "UPDATE_GUIDE" : "BROADCAST_GUIDE"}
            </h2>
            <div className="space-y-4 text-[10px] font-mono text-text-secondary uppercase leading-relaxed">
              <p>&gt; CHOOSE_CATEGORY_FOR_BETTER_REACH</p>
              <p>&gt; ATTACH_MEDIA_TO_INCREASE_ENGAGEMENT</p>
              <p>&gt; COLLABS_ALLOW_TEAM_BUILDING</p>
              <p>&gt; EVENTS_SYNC_COMMUNITIES</p>
            </div>
          </div>
        </aside>
      </div>

      <Toast
        isVisible={showSuccessToast}
        message={editId ? "SIGNAL_UPDATED_SUCCESSFULLY" : "SIGNAL_BROADCAST_SUCCESSFUL"}
        onClose={() => setShowSuccessToast(false)}
      />
      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </main>
  );
}
