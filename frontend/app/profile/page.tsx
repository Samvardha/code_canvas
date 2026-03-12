"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pencil, Camera, Loader2, Upload, FileImage } from "lucide-react";

// ─── Helper: format event types into readable strings ──────────────
function formatEventType(type: string, action?: string) {
  const map: Record<string, string> = {
    PushEvent: "PUSHED TO",
    CreateEvent: "CREATED",
    DeleteEvent: "DELETED",
    WatchEvent: "STARRED",
    ForkEvent: "FORKED",
    IssuesEvent: action ? `${action.toUpperCase()} ISSUE` : "ISSUE",
    PullRequestEvent: action ? `${action.toUpperCase()} PR` : "PR",
    IssueCommentEvent: "COMMENTED ON",
    PullRequestReviewEvent: "REVIEWED PR",
    ReleaseEvent: "RELEASED",
  };
  return map[type] || type.replace("Event", "").toUpperCase();
}

// ─── Helper: time ago ──────────────────────────────────────────────
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ─── Language color map (fallback) ─────────────────────────────────
const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Rust: "#dea584",
  Go: "#00ADD8",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Lua: "#000080",
  Zig: "#ec915c",
  Elixir: "#6e4a7e",
};

export default function ProfilePage() {
  const {
    user,
    loading,
    profileComplete,
    userProfile,
    backendUid,
    linkGitHub,
    logout,
    fetchGitHubProfile,
    refreshProfile,
  } = useAuth();

  const router = useRouter();
  const [githubData, setGithubData] = useState<any>(null);
  const [ghLoading, setGhLoading] = useState(true);
  const [linkError, setLinkError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (!profileComplete) {
        router.push("/onboarding");
      }
    }
  }, [user, loading, profileComplete, router]);

  const hasFetchedRef = useRef(false);

  const loadGitHub = useCallback(
    async (force = false) => {
      if (!user || !backendUid || !profileComplete) return;
      if (hasFetchedRef.current && !force) return;

      hasFetchedRef.current = true;
      setGhLoading(true);

      const MAX_RETRIES = 3;
      const RETRY_DELAY = 2000;
      let retries = 0;

      while (retries < MAX_RETRIES) {
        const data = await fetchGitHubProfile();

        if (data && data.connected === false) {
          setGithubData(null);
          setGhLoading(false);
          // Reset ref so it can try again if user connects later
          hasFetchedRef.current = false;
          return;
        }

        if (data?.connected && data?.data) {
          setGithubData(data.data);
          setGhLoading(false);
          return;
        }

        retries++;
        if (retries < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY));
        }
      }

      setGhLoading(false);
    },
    [user, backendUid, profileComplete, fetchGitHubProfile],
  );

  useEffect(() => {
    if (user && backendUid && profileComplete && !hasFetchedRef.current) {
      loadGitHub();
    }
  }, [user, backendUid, profileComplete, loadGitHub]);

  const processFile = async (file: File) => {
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setUploadError("ONLY_JPEG_OR_PNG_ALLOWED");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("FILE_TOO_LARGE_MAX_5MB");
      return;
    }

    setIsUploading(true);
    setUploadError("");

    try {
      const idToken = await user?.getIdToken();
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

      const uploadData = new FormData();
      uploadData.append("file", file);

      const res = await fetch(`${backendUrl}/users/me/upload-avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
        body: uploadData,
      });

      if (res.ok) {
        const data = await res.json();
        // After successful upload, we need to update the user profile in the database
        await fetch(`${backendUrl}/auth/onboarding`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            ...userProfile.profile,
            avatar_url: data.url,
          }),
        });
        await refreshProfile();
        setShowUploadModal(false);
      } else {
        const data = await res.json();
        setUploadError(data.detail || "UPLOAD_FAILED");
      }
    } catch (err) {
      setUploadError("NETWORK_ERROR: UPLOAD_FAILED");
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="font-mono text-accent text-sm uppercase tracking-widest font-bold animate-pulse flex items-center gap-3">
          <div className="w-3 h-3 bg-accent rotate-45"></div>[ LOADING_SESSION ]
        </div>
      </div>
    );
  }

  if (!user || !profileComplete) return null;

  const hasGitHub = user.providerData.some(
    (p) => p.providerId === "github.com",
  );
  const gh = githubData;
  const connected = !!githubData;

  const providerLabels = user.providerData.map((p) => {
    if (p.providerId === "google.com") return "GOOGLE";
    if (p.providerId === "github.com") return "GITHUB";
    if (p.providerId === "password") return "EMAIL";
    return p.providerId.toUpperCase();
  });

  // Language bar data
  const langEntries = gh?.aggregate_languages
    ? Object.entries(gh.aggregate_languages as Record<string, number>).sort(
        ([, a], [, b]) => (b as number) - (a as number),
      )
    : [];
  const totalLangCount = langEntries.reduce((s, [, v]) => s + (v as number), 0);

  const profile = userProfile?.profile;

  return (
    <div className="min-h-svh bg-black relative overflow-hidden">
      {/* Grid background */}
      <div className="fixed inset-0 grid-bg pointer-events-none z-0" />

      <div className="relative z-10 max-w-[1100px] mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8">
        {/* ══════════ HEADER CARD ══════════ */}
        <div className="border border-border bg-surface relative">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent"></div>
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent"></div>

          <div className="p-6 sm:p-10 border-b border-border bg-background flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
            <div className="flex items-center gap-6 flex-1 min-w-0">
              <div className="relative group shrink-0">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt="avatar"
                    referrerPolicy="no-referrer"
                    className="h-24 w-24 border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center bg-accent text-black text-2xl font-bold font-mono">
                    {(
                      profile?.name?.[0] ||
                      profile?.username?.[0] ||
                      user.email?.[0] ||
                      "U"
                    ).toUpperCase()}
                  </div>
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-accent animate-spin" />
                  </div>
                )}
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="absolute -bottom-1 -right-1 bg-accent text-black p-1.5 hover:bg-white transition-colors border-2 border-black cursor-pointer shadow-lg sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl sm:text-4xl font-black font-(family-name:--font-space-grotesk) uppercase text-white leading-none">
                    {profile?.name || "ANONYMOUS_ENGINEER"}
                  </h1>
                  <span className="text-[10px] font-mono text-accent bg-accent/10 px-2 py-0.5 border border-accent/20 font-bold uppercase tracking-wider">
                    LVL_01
                  </span>
                </div>
                <p className="text-sm font-mono text-accent mt-2 font-bold tracking-widest uppercase">
                  @{profile?.username || "UNKNOWN_ID"}
                </p>
                <p className="text-xs font-mono text-text-secondary mt-1">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_8px_var(--accent)]"></span>
                <span className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
                  SIGNAL_ACTIVE
                </span>
              </div>
              <div className="font-mono text-[10px] text-text-secondary text-right">
                COORD: {profile?.location || "TOP_SECRET"}
              </div>
            </div>
          </div>
          <div className="p-6 sm:p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col gap-4">
              <label className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
                TRANSMISSION_BIO
              </label>
              <p className="text-sm text-text-secondary font-medium leading-relaxed border-l-2 border-border pl-4">
                {profile?.bio || "NO MISSION OBJECTIVES DEFINED."}
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <label className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
                CORE_SPECIALIZATIONS
              </label>
              <div className="flex flex-wrap gap-2">
                {profile?.skills?.map((skill: string) => (
                  <span
                    key={skill}
                    className="bg-surface border border-border px-3 py-1.5 text-[10px] font-mono font-bold text-white uppercase tracking-wider"
                  >
                    {skill}
                  </span>
                ))}
                {!profile?.skills?.length && (
                  <span className="text-[10px] font-mono text-text-secondary italic">
                    NO_SKILLS_STOCKED
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Main Stats Row */}
          <div className="border-t border-border grid grid-cols-3 divide-x divide-border bg-background/50">
            <StatCell
              label="POSTS"
              value={userProfile?.stats?.posts_count || 0}
            />
            <StatCell
              label="PEERS"
              value={userProfile?.stats?.peers_count || 0}
            />
            <StatCell
              label="COLLABS"
              value={userProfile?.stats?.collabs_count || 0}
            />
          </div>
        </div>

        {/* ══════════ GITHUB SECTION ══════════ */}
        {!hasGitHub && !connected ? (
          /* Not connected — show connect prompt */
          <div className="border border-border bg-surface relative">
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent"></div>
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent"></div>
            <div className="border-b border-border px-6 py-3 bg-background">
              <span className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
                GITHUB_LINKAGE_STATION
              </span>
            </div>
            <div className="p-8 sm:p-12 flex flex-col md:flex-row gap-10 items-center">
              <div className="flex-1 font-mono text-sm space-y-4 text-text-secondary">
                <p className="text-white font-bold">
                  &gt; LINK_EXTERNAL_REPOSITORY_SERVICE? [Y/N]
                </p>
                <div className="space-y-2">
                  <p className="flex items-center gap-3">
                    <span className="text-accent">◆</span> ANALYZE CODE PATTERNS
                  </p>
                  <p className="flex items-center gap-3">
                    <span className="text-accent">◆</span> TRACK REPUTATION
                    (STARS/FORKS)
                  </p>
                  <p className="flex items-center gap-3">
                    <span className="text-accent">◆</span> EXHIBIT TOP PROJECTS
                  </p>
                  <p className="flex items-center gap-3">
                    <span className="text-accent">◆</span> MONITOR REAL-TIME
                    ACTIVITY
                  </p>
                </div>
                <p className="text-accent animate-pulse">
                  &gt; STAGE: AWAITING_AUTHORIZATION_
                </p>
              </div>
              <div className="w-full md:w-auto shrink-0">
                {linkError && (
                  <div className="mb-4">
                    <Banner variant="error" compact>
                      &gt; ERR: {linkError}
                    </Banner>
                  </div>
                )}
                <button
                  onClick={async () => {
                    setLinkError("");
                    try {
                      await linkGitHub();
                      await loadGitHub(true);
                    } catch (err: any) {
                      setLinkError(err.message || "Failed to link GitHub");
                    }
                  }}
                  className="group relative w-full inline-flex items-center justify-center gap-4 bg-white text-black px-10 py-5 text-sm font-black uppercase tracking-widest hover:bg-transparent hover:text-white transition-all duration-300 border-4 border-white active:scale-95 cursor-pointer"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="group-hover:rotate-12 transition-transform"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  INITIALIZE_GITHUB
                </button>
              </div>
            </div>
          </div>
        ) : ghLoading ? (
          /* Loading GitHub data */
          <div className="border border-border bg-surface p-12 flex items-center justify-center">
            <div className="font-mono text-accent text-sm uppercase tracking-widest font-bold animate-pulse flex items-center gap-3">
              <div className="w-4 h-4 bg-accent rotate-45"></div>[
              SYNCHRONIZING_GITHUB_CORE ]
            </div>
          </div>
        ) : connected && gh ? (
          /* Full GitHub profile */
          <>
            {/* ── IDENTITY + STATS ROW ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Profile */}
              <div className="border border-border bg-surface relative">
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent"></div>
                <div className="border-b border-border px-6 py-3 bg-background flex items-center justify-between">
                  <span className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
                    GITHUB_IDENTITY
                  </span>
                  <a
                    href={gh.identity.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-mono text-accent uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2"
                  >
                    @{gh.identity.username} <span className="text-xs">↗</span>
                  </a>
                </div>
                <div className="p-6 flex flex-col gap-5">
                  <div className="flex flex-col gap-2.5 text-xs font-mono">
                    {gh.identity.location && (
                      <DetailRow
                        icon="◈"
                        label="LOC"
                        value={gh.identity.location}
                      />
                    )}
                    {gh.identity.company && (
                      <DetailRow
                        icon="◈"
                        label="ORG"
                        value={gh.identity.company}
                      />
                    )}
                    {gh.identity.website && (
                      <DetailRow
                        icon="◈"
                        label="WEB"
                        value={gh.identity.website}
                      />
                    )}
                    {gh.identity.created_at && (
                      <DetailRow
                        icon="◈"
                        label="INC"
                        value={new Date(gh.identity.created_at)
                          .getFullYear()
                          .toString()}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Repo Stats Grid */}
              <div className="border border-border bg-surface relative">
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent"></div>
                <div className="border-b border-border px-6 py-3 bg-background">
                  <span className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
                    REPOSITORY_METRICS
                  </span>
                </div>
                <div className="grid grid-cols-2 divide-x divide-y divide-border h-full">
                  <StatCell
                    label="SCRIPTS (REPOS)"
                    value={gh.repo_stats?.total_repos || 0}
                  />
                  <StatCell
                    label="CREDITS (STARS)"
                    value={gh.repo_stats?.total_stars || 0}
                  />
                  <StatCell
                    label="FORKS"
                    value={gh.repo_stats?.total_forks || 0}
                  />
                  <StatCell
                    label="GISTS"
                    value={gh.identity?.public_gists || 0}
                  />
                </div>
              </div>
            </div>

            {/* ── PINNED REPOS ── */}
            {gh.pinned_repos && gh.pinned_repos.length > 0 && (
              <div className="border border-border bg-surface relative">
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent"></div>
                <div className="border-b border-border px-6 py-3 bg-background">
                  <span className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
                    PRIORITY_REQS (PINNED)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-x divide-y divide-border">
                  {gh.pinned_repos.map((repo: any, i: number) => (
                    <a
                      key={i}
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-6 bg-background hover:bg-surface-hover transition-colors flex flex-col gap-3 group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-accent text-[10px] leading-none shrink-0">
                          CODE:
                        </span>
                        <span className="text-sm font-bold text-white group-hover:text-accent transition-colors font-mono truncate">
                          {repo.name}
                        </span>
                      </div>
                      {repo.description && (
                        <p className="text-xs text-text-secondary leading-relaxed line-clamp-2 min-h-[3em]">
                          {repo.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-auto pt-4 border-t border-border/30 text-[10px] font-mono text-text-secondary uppercase tracking-wider">
                        {repo.language && (
                          <span className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2"
                              style={{
                                backgroundColor:
                                  repo.language_color ||
                                  LANG_COLORS[repo.language] ||
                                  "#888",
                              }}
                            ></span>
                            {repo.language}
                          </span>
                        )}
                        <span>★ {repo.stars}</span>
                        <span>⑂ {repo.forks}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* ── LANGUAGE STATS ── */}
            {langEntries.length > 0 && (
              <div className="border border-border bg-surface relative">
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent"></div>
                <div className="border-b border-border px-6 py-3 bg-background">
                  <span className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
                    LINGUISTIC_MATRIX
                  </span>
                </div>
                <div className="p-8 flex flex-col gap-6">
                  {/* Color bar */}
                  <div className="w-full h-4 flex overflow-hidden border border-border bg-border/20">
                    {langEntries.map(([lang, count]) => (
                      <div
                        key={lang}
                        style={{
                          width: `${((count as number) / totalLangCount) * 100}%`,
                          backgroundColor: LANG_COLORS[lang] || "#888",
                        }}
                        title={`${lang}: ${count}`}
                        className="hover:scale-y-125 transition-transform"
                      ></div>
                    ))}
                  </div>
                  {/* Legend */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-x-6 gap-y-4">
                    {langEntries.slice(0, 12).map(([lang, count]) => (
                      <div key={lang} className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 shrink-0"
                            style={{
                              backgroundColor: LANG_COLORS[lang] || "#888",
                            }}
                          ></span>
                          <span className="uppercase tracking-widest text-[9px] font-black text-text-secondary font-mono">
                            {lang}
                          </span>
                        </div>
                        <span className="text-white font-black font-mono text-sm pl-4">
                          {Math.round(
                            ((count as number) / totalLangCount) * 100,
                          )}
                          %
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── RECENT ACTIVITY ── */}
            {gh.activity && gh.activity.length > 0 && (
              <div className="border border-border bg-surface relative">
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent"></div>
                <div className="border-b border-border px-6 py-3 bg-background flex items-center justify-between">
                  <span className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
                    ACTION_SEQUENCES
                  </span>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full animate-ping"></span>
                    <span className="text-[9px] font-mono text-accent font-bold">
                      LOGGING_LIVE
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-border max-h-[400px] overflow-y-auto custom-scrollbar">
                  {gh.activity.slice(0, 20).map((event: any, i: number) => (
                    <div
                      key={i}
                      className="px-8 py-4 flex items-start gap-4 bg-background hover:bg-surface-hover transition-all text-xs font-mono group"
                    >
                      <span className="text-accent shrink-0 mt-0.5 group-hover:translate-x-1 transition-transform">
                        [{String(i).padStart(2, "0")}]
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-white font-bold tracking-tight uppercase">
                          {formatEventType(event.type, event.action)}
                        </span>{" "}
                        <span className="text-text-secondary ml-2 border-l border-border/50 pl-3">
                          {event.repo}
                        </span>
                      </div>
                      <span className="text-text-secondary shrink-0 text-[10px]">
                        {event.created_at ? timeAgo(event.created_at) : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Upload Modal (Sharing the same design language) */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUploadModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl border border-border bg-surface shadow-2xl overflow-hidden"
            >
              {/* Corner markers */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent"></div>
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent"></div>

              <div className="p-8">
                <div className="flex justify-between items-center mb-10">
                  <div className="space-y-1">
                    <h2 className="text-xl font-black font-mono text-white uppercase tracking-tighter">
                      AVATAR_RECONFIGURATION
                    </h2>
                    <p className="text-[10px] font-mono text-accent uppercase tracking-widest font-bold">
                      SECURE_UPLINK_INITIALIZED
                    </p>
                  </div>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="text-text-secondary hover:text-white transition-colors p-2"
                  >
                    <X className="w-5 h-5 cursor-pointer" />
                  </button>
                </div>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed transition-all duration-300 p-12 flex flex-col items-center gap-5 cursor-pointer group
                    ${isDragging ? "border-accent bg-accent/10" : "border-border bg-background hover:border-accent/40"}
                    `}
                >
                  <div
                    className={`p-5 rounded-full transition-colors ${isDragging ? "bg-accent text-black shadow-[0_0_15px_rgba(var(--accent-rgb),0.5)]" : "bg-surface text-text-secondary group-hover:text-accent"}`}
                  >
                    <Upload className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-mono text-white font-bold uppercase tracking-tight">
                      DROP_NEW_IDENTITY
                    </p>
                    <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest mt-1">
                      OR_SELECT_FROM_MEMORY
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[9px] font-mono text-text-secondary uppercase font-black">
                    <FileImage className="w-3.5 h-3.5" />
                    PNG/JPEG &lt; 5MB
                  </div>
                  {isUploading && (
                    <div className="flex items-center gap-3 text-accent animate-pulse font-mono text-[10px] font-bold mt-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      TRANSMITTING...
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {uploadError && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6"
                    >
                      <Banner variant="error" compact>
                        {uploadError}
                      </Banner>
                    </motion.div>
                  )}
                </AnimatePresence>

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

                <div className="mt-8 flex gap-4">
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="flex-1 font-mono text-[10px] font-black uppercase text-text-secondary hover:text-white border border-border hover:border-white py-3 transition-all cursor-pointer"
                  >
                    ABORT_STAGING
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom gradient */}
      <div className="fixed inset-x-0 bottom-0 h-32 bg-linear-to-t from-black via-black/80 to-transparent pointer-events-none z-20"></div>
    </div>
  );
}

// ─── Reusable Components ───────────────────────────────────────────

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-5 bg-background flex flex-col items-center gap-1">
      <span className="text-2xl font-black text-white font-(family-name:--font-space-grotesk)">
        {value.toLocaleString()}
      </span>
      <span className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
        {label}
      </span>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-text-secondary">
      <span className="text-accent text-[10px]">{icon}</span>
      <span className="uppercase tracking-widest text-[10px] font-bold w-28 shrink-0">
        {label}
      </span>
      <span className="text-white truncate">{value}</span>
    </div>
  );
}
