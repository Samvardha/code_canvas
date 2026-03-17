"use client";

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
} from "lucide-react";
import { Button } from "@/components/Button";
import Toast from "@/components/Toast";
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

  // Form State
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
              <CategorySignals
                selectedCategory={state.selectedCategory}
                toggleCategory={actions.toggleCategory}
                isGithubConnected={state.isGithubConnected}
                editId={state.editId}
              />

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
                    disabled={loading}
                  />
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

              <MediaUpload
                previews={state.previews}
                files={state.files}
                fileInputRef={refs.fileInputRef}
                loading={state.loading}
                editId={state.editId}
                removeFile={actions.removeFile}
                handleFileChange={actions.handleFileChange}
              />

              <AnimatePresence>
                {state.selectedCategory === "collab" && (
                  <CollabFields
                    collabMeta={state.collabMeta}
                    setCollabMeta={actions.setCollabMeta}
                    lookingForInput={state.lookingForInput}
                    setLookingForInput={actions.setLookingForInput}
                    requirementsInput={state.requirementsInput}
                    setRequirementsInput={actions.setRequirementsInput}
                    addTag={actions.addTag}
                    removeTag={actions.removeTag}
                    validationErrors={state.validationErrors}
                    clearError={actions.clearError}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {state.selectedCategory === "event" && (
                  <EventFields
                    eventMeta={state.eventMeta}
                    setEventMeta={actions.setEventMeta}
                    showModeDropdown={state.showModeDropdown}
                    setShowModeDropdown={actions.setShowModeDropdown}
                    validationErrors={state.validationErrors}
                    clearError={actions.clearError}
                    setValidationErrors={actions.setValidationErrors}
                    editId={state.editId}
                    modeDropdownRef={refs.modeDropdownRef}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Toolbar */}
            <div className="p-6 border-t border-border/50 flex items-center justify-between bg-background/50 shrink-0 transition-colors">
              <div className="flex gap-2 items-center group cursor-pointer">
                <Sparkles className="w-4 h-4 text-accent group-hover:text-white transition-colors" />
                <span className="text-[10px] font-mono font-bold text-accent group-hover:text-white tracking-widest transition-colors uppercase">
                  WRITE_WITH_AI
                </span>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  multiple
                  accept="image/*,video/*"
                />
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

        <GuideAside editId={state.editId} />
      </div>

      <Toast
        isVisible={state.showSuccessToast}
        message={
          state.editId
            ? "SIGNAL_UPDATED_SUCCESSFULLY"
            : "SIGNAL_BROADCAST_SUCCESSFUL"
        }
        onClose={() => actions.setShowSuccessToast(false)}
      />
      <Toast
        isVisible={state.toast.isVisible}
        message={state.toast.message}
        onClose={() => actions.setToast({ ...state.toast, isVisible: false })}
      />
    </main>
  );
}
