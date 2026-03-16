"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  createPost,
  getPost,
  updatePost,
  PostCreateRequest,
} from "@/lib/api/posts";
import { GitHubRepo, getMe } from "@/lib/api/users";
import {
  ValidationKey,
  CollabMeta,
  EventMeta,
  formatFromBackend,
  formatToBackend,
  validatePostData,
} from "../app/posts/create/utils";

// Sub-hooks
import { useMediaManager } from "./useMediaManager";
import { useGithubRepos } from "./useGithubRepos";
import { useSignalsAI } from "./useSignalsAI";

export const useCreatePost = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const [token, setToken] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [isGithubConnected, setIsGithubConnected] = useState<boolean | null>(
    null,
  );

  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [collabMeta, setCollabMeta] = useState<CollabMeta>({
    title: "",
    duration: "",
    looking_for: [] as string[],
    requirements: [] as string[],
    status: "open",
  });

  const [lookingForInput, setLookingForInput] = useState("");
  const [requirementsInput, setRequirementsInput] = useState("");

  const [eventMeta, setEventMeta] = useState<EventMeta>({
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
    status: "upcoming",
  });

  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationKey[]>([]);
  const [toast, setToast] = useState<{ isVisible: boolean; message: string }>({
    isVisible: false,
    message: "",
  });

  const showToast = useCallback((message: string) => {
    setToast({ isVisible: true, message });
  }, []);

  // Use specialized hooks
  const media = useMediaManager();
  const github = useGithubRepos(token);
  const ai = useSignalsAI(token);

  // Extract stable setters/actions
  const {
    resetGithub,
    setSelectedRepo,
    setRepos,
    setGithubPage,
    setHasMoreRepos,
    setShowRepoDropdown,
  } = github;
  const { resetMedia, setOriginalMedia, setPreviews, setFiles } = media;
  const { resetAI, setSuggestions, setIsGenerating } = ai;

  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const modeDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside for mode dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
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
          setIsGithubConnected(false);
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

  const clearError = (errorId: ValidationKey) => {
    if (validationErrors.includes(errorId)) {
      setValidationErrors((prev) => prev.filter((e) => e !== errorId));
    }
  };

  const handleReset = useCallback(() => {
    setText("");
    setLink("");
    setSelectedCategory(null);
    resetGithub();
    setCollabMeta({
      title: "",
      duration: "",
      looking_for: [],
      requirements: [],
      status: "open",
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
      status: "upcoming",
    });
    resetMedia();
    resetAI();
    setValidationErrors([]);
    setToast({ isVisible: false, message: "" });
  }, [resetGithub, resetMedia, resetAI]);

  // Fetch post data for editing
  useEffect(() => {
    if (editId && token) {
      const fetchPostData = async () => {
        try {
          const post = await getPost(editId, token);
          setText(post.content.text || "");
          setLink(post.content.links?.[0]?.url || "");
          setSelectedCategory(post.categories[0] || null);

          if (post.collab_meta) {
            setCollabMeta({
              title: post.collab_meta.title || "",
              duration: post.collab_meta.duration || "",
              looking_for: post.collab_meta.looking_for || [],
              requirements: post.collab_meta.requirements || [],
              status: post.collab_meta.status || "open",
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
              start_at: formatFromBackend(post.event_meta.start_at),
              end_at: formatFromBackend(post.event_meta.end_at),
              rsvp_url: post.event_meta.rsvp_url || "",
              mode: post.event_meta.mode || "online",
              status: post.event_meta.status || "upcoming",
            });
          }

          if (post.github) {
            setSelectedRepo({
              repo_url: post.github.repo_url,
              repo_name: post.github.repo_name,
              repo_owner: post.github.repo_owner,
            } as GitHubRepo);
          }

          if (post.content.media?.length) {
            setOriginalMedia(post.content.media);
            setPreviews(
              post.content.media.map((m) => ({ url: m.url, type: m.type })),
            );
          }
        } catch (err) {
          console.error("Failed to fetch post for editing:", err);
          showToast("Failed to load post data");
        }
      };
      fetchPostData();
    } else if (!editId && token) {
      handleReset();
    }
  }, [
    editId,
    token,
    handleReset,
    setSelectedRepo,
    setOriginalMedia,
    setPreviews,
  ]);

  const applySuggestion = (suggestion: string) => {
    setText(suggestion);
    setSuggestions([]);
    clearError("text");
  };

  const handleSubmit = async () => {
    if (!token || loading || ai.isGenerating) return;
    const errors = validatePostData(
      text,
      selectedCategory,
      collabMeta,
      eventMeta,
      editId,
    );

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
          media: editId ? media.originalMedia : [],
        },
        github: github.selectedRepo
          ? {
              repo_url: github.selectedRepo.repo_url,
              repo_name: github.selectedRepo.repo_name,
              repo_owner: github.selectedRepo.repo_owner,
            }
          : null,
      };

      if (selectedCategory === "collab") {
        postData.collab_meta = {
          title: collabMeta.title,
          duration: collabMeta.duration || null,
          looking_for: collabMeta.looking_for,
          requirements: collabMeta.requirements,
          status: collabMeta.status as any,
        };
      }

      if (selectedCategory === "event") {
        const startAtFormatted = formatToBackend(eventMeta.start_at);
        const endAtFormatted = formatToBackend(eventMeta.end_at);

        if (!startAtFormatted) {
          showToast("INVALID_START_DATE_FORMAT");
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
          status: eventMeta.status as any,
        };
      }

      if (editId) {
        await updatePost(editId, postData, token);
      } else {
        await createPost(postData, media.files, token);
      }

      setShowSuccessToast(true);
      setTimeout(() => {
        router.push("/explore-feed");
      }, 2000);
    } catch (err: any) {
      showToast(err.message || "FAILED_TO_BROADCAST_SIGNAL");
    } finally {
      setLoading(false);
      setRepos([]);
      setGithubPage(1);
      setHasMoreRepos(true);
    }
  };

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

  const actions = useMemo(
    () => ({
      setText,
      setLink,
      setSelectedCategory,
      setIsGenerating,
      setSuggestions,
      setCollabMeta,
      setLookingForInput,
      setRequirementsInput,
      setEventMeta,
      setFiles,
      setPreviews,
      setLoading,
      setValidationErrors,
      setToast,
      setShowRepoDropdown,
      setShowModeDropdown,
      setShowSuccessToast,
      toggleCategory,
      clearError,
      handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        media.handleFileChange(e, showToast),
      removeFile: media.removeFile,
      fetchRepos: github.fetchRepos,
      handleRepoSelect: github.handleRepoSelect,
      handleSuggest: () => ai.handleSuggest(text, loading, showToast),
      applySuggestion,
      handleSubmit,
      handleReset,
      addTag,
      removeTag,
    }),
    [
      setText,
      setLink,
      setSelectedCategory,
      setIsGenerating,
      setSuggestions,
      setCollabMeta,
      setLookingForInput,
      setRequirementsInput,
      setEventMeta,
      setFiles,
      setPreviews,
      setLoading,
      setValidationErrors,
      setToast,
      setShowRepoDropdown,
      setShowModeDropdown,
      setShowSuccessToast,
      toggleCategory,
      clearError,
      media.handleFileChange,
      showToast,
      media.removeFile,
      github.fetchRepos,
      github.handleRepoSelect,
      ai.handleSuggest,
      text,
      loading,
      applySuggestion,
      handleSubmit,
      handleReset,
      addTag,
      removeTag,
    ],
  );

  return {
    state: {
      user,
      authLoading,
      token,
      showSuccessToast,
      isGithubConnected,
      text,
      link,
      selectedCategory,
      isGenerating: ai.isGenerating,
      suggestions: ai.suggestions,
      collabMeta,
      lookingForInput,
      requirementsInput,
      eventMeta,
      files: media.files,
      previews: media.previews,
      loading,
      validationErrors,
      toast,
      selectedRepo: github.selectedRepo,
      repos: github.repos,
      githubLoading: github.githubLoading,
      githubPage: github.githubPage,
      hasMoreRepos: github.hasMoreRepos,
      showRepoDropdown: github.showRepoDropdown,
      showModeDropdown,
      editId,
    },
    actions,
    refs: {
      dropdownRef: github.dropdownRef,
      modeDropdownRef,
      fileInputRef: media.fileInputRef,
    },
  };
};
