"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

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

export default function DashboardPage() {
  const { user, loading, backendUid, linkGitHub, logout, fetchGitHubProfile } =
    useAuth();
  const router = useRouter();
  const [githubData, setGithubData] = useState<any>(null);
  const [ghLoading, setGhLoading] = useState(true);
  const [linkError, setLinkError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const loadGitHub = useCallback(async () => {
    if (!user || !backendUid) return;
    setGhLoading(true);
    // Poll until background sync finishes and data is available
    const MAX_RETRIES = 8;
    const RETRY_DELAY = 3000;
    let retries = 0;

    // Initial delay to give the background task a head start
    await new Promise((r) => setTimeout(r, 2500));

    while (retries < MAX_RETRIES) {
      const data = await fetchGitHubProfile();
      if (data?.connected && data?.github) {
        setGithubData(data);
        setGhLoading(false);
        return;
      }
      retries++;
      if (retries < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY));
      }
    }

    // Final attempt — show whatever we have
    const finalData = await fetchGitHubProfile();
    setGithubData(finalData);
    setGhLoading(false);
  }, [user, backendUid, fetchGitHubProfile]);

  useEffect(() => {
    if (user && backendUid) {
      loadGitHub();
    }
  }, [user, backendUid, loadGitHub]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="font-mono text-accent text-sm uppercase tracking-widest font-bold animate-pulse flex items-center gap-3">
          <div className="w-3 h-3 bg-accent rotate-45"></div>[ LOADING_SESSION ]
        </div>
      </div>
    );
  }

  if (!user) return null;

  const hasGitHub = user.providerData.some(
    (p) => p.providerId === "github.com",
  );
  const gh = githubData?.github;
  const connected = githubData?.connected;
  const linkedProviders: string[] = githubData?.linked_providers || [];

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

  return (
    <div className="min-h-svh bg-black relative overflow-hidden">
      {/* Grid background */}
      <div className="fixed inset-0 grid-bg pointer-events-none z-0" />

      <div className="relative z-10 max-w-[960px] mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-6">
        {/* ══════════ HEADER CARD ══════════ */}
        <div className="border border-border bg-surface relative">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent"></div>
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent"></div>

          <div className="p-6 sm:p-8 border-b border-border bg-background flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {connected && gh?.identity?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={gh.identity.avatar_url}
                  alt="avatar"
                  referrerPolicy="no-referrer"
                  className="h-14 w-14 border border-border object-cover shrink-0"
                />
              ) : user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt="avatar"
                  referrerPolicy="no-referrer"
                  className="h-14 w-14 border border-border object-cover shrink-0"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center bg-accent text-black text-lg font-bold font-mono shrink-0">
                  {(user.email?.[0] || "U").toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-black font-(family-name:--font-space-grotesk) uppercase text-white leading-none">
                  {connected
                    ? gh?.identity?.name || gh?.identity?.username || "ENGINEER"
                    : user.metadata.creationTime ===
                        user.metadata.lastSignInTime
                      ? "WELCOME"
                      : "WELCOME BACK"}
                </h1>
                <p className="text-sm font-mono text-text-secondary truncate mt-1">
                  {user.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_8px_var(--accent)]"></span>
              <span className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
                ONLINE
              </span>
            </div>
          </div>

          {/* Info row */}
          <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InfoBlock label="FIREBASE_UID" value={user.uid} mono />
            <InfoBlock
              label="BACKEND_VERIFIED"
              value={backendUid || "SYNCING..."}
              mono
              indicator={backendUid ? "accent" : "pulse"}
            />
            <InfoBlock
              label="PROVIDERS"
              value={providerLabels.join(" + ")}
              accent
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
                GITHUB_STATUS
              </span>
            </div>
            <div className="p-6 sm:p-8 flex flex-col gap-5">
              <div className="font-mono text-sm space-y-2 text-text-secondary">
                <p className="text-white">
                  &gt; github.status:{" "}
                  <span className="text-red-400">NOT_LINKED</span>
                </p>
                <p>&gt; link your github to enable:</p>
                <p className="pl-4">— repository analysis</p>
                <p className="pl-4">— language profiling</p>
                <p className="pl-4">— contribution tracking</p>
                <p className="pl-4">— organization mapping</p>
                <p className="text-accent animate-pulse">
                  &gt; awaiting connection_
                </p>
              </div>
              {linkError && (
                <Banner variant="error" compact>
                  &gt; ERR: {linkError}
                </Banner>
              )}
              <Button
                onClick={async () => {
                  setLinkError("");
                  try {
                    await linkGitHub();
                    await loadGitHub();
                  } catch (err: any) {
                    setLinkError(err.message || "Failed to link GitHub");
                  }
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                CONNECT_GITHUB
              </Button>
            </div>
          </div>
        ) : ghLoading ? (
          /* Loading GitHub data */
          <div className="border border-border bg-surface p-8 flex items-center justify-center">
            <div className="font-mono text-accent text-sm uppercase tracking-widest font-bold animate-pulse flex items-center gap-3">
              <div className="w-3 h-3 bg-accent rotate-45"></div>[
              FETCHING_GITHUB_DATA ]
            </div>
          </div>
        ) : connected && gh ? (
          /* Full GitHub profile */
          <>
            {/* ── IDENTITY + STATS ROW ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profile */}
              <div className="border border-border bg-surface relative">
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent"></div>
                <div className="border-b border-border px-6 py-3 bg-background flex items-center justify-between">
                  <span className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
                    GITHUB_PROFILE
                  </span>
                  <a
                    href={gh.identity.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-mono text-accent uppercase tracking-widest hover:text-white transition-colors"
                  >
                    @{gh.identity.username}
                  </a>
                </div>
                <div className="p-6 flex flex-col gap-3">
                  {gh.identity.bio && (
                    <p className="text-sm text-text-secondary font-medium leading-relaxed">
                      {gh.identity.bio}
                    </p>
                  )}
                  <div className="flex flex-col gap-1.5 text-xs font-mono">
                    {gh.identity.location && (
                      <DetailRow
                        icon="◈"
                        label="LOCATION"
                        value={gh.identity.location}
                      />
                    )}
                    {gh.identity.company && (
                      <DetailRow
                        icon="◈"
                        label="COMPANY"
                        value={gh.identity.company}
                      />
                    )}
                    {gh.identity.website && (
                      <DetailRow
                        icon="◈"
                        label="WEBSITE"
                        value={gh.identity.website}
                      />
                    )}
                    {gh.identity.created_at && (
                      <DetailRow
                        icon="◈"
                        label="MEMBER_SINCE"
                        value={new Date(gh.identity.created_at)
                          .getFullYear()
                          .toString()}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="border border-border bg-surface relative">
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent"></div>
                <div className="border-b border-border px-6 py-3 bg-background">
                  <span className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
                    REPUTATION
                  </span>
                </div>
                <div className="grid grid-cols-2 divide-x divide-y divide-border">
                  <StatCell
                    label="REPOS"
                    value={gh.repo_stats?.total_repos || 0}
                  />
                  <StatCell
                    label="STARS"
                    value={gh.repo_stats?.total_stars || 0}
                  />
                  <StatCell
                    label="FOLLOWERS"
                    value={gh.identity?.followers || 0}
                  />
                  <StatCell
                    label="FORKS"
                    value={gh.repo_stats?.total_forks || 0}
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
                    PINNED_REPOSITORIES
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-x divide-y divide-border">
                  {gh.pinned_repos.map((repo: any, i: number) => (
                    <a
                      key={i}
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-5 bg-background hover:bg-surface-hover transition-colors flex flex-col gap-2 group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-accent text-xs">◆</span>
                        <span className="text-sm font-bold text-white group-hover:text-accent transition-colors font-mono truncate">
                          {repo.name}
                        </span>
                      </div>
                      {repo.description && (
                        <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                          {repo.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-auto pt-2 text-[10px] font-mono text-text-secondary uppercase tracking-wider">
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
                    LANGUAGE_DISTRIBUTION
                  </span>
                </div>
                <div className="p-6 flex flex-col gap-4">
                  {/* Color bar */}
                  <div className="w-full h-3 flex overflow-hidden border border-border">
                    {langEntries.map(([lang, count]) => (
                      <div
                        key={lang}
                        style={{
                          width: `${((count as number) / totalLangCount) * 100}%`,
                          backgroundColor: LANG_COLORS[lang] || "#888",
                        }}
                        title={`${lang}: ${count}`}
                      ></div>
                    ))}
                  </div>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    {langEntries.slice(0, 12).map(([lang, count]) => (
                      <div
                        key={lang}
                        className="flex items-center gap-2 text-xs font-mono text-text-secondary"
                      >
                        <span
                          className="w-2 h-2 shrink-0"
                          style={{
                            backgroundColor: LANG_COLORS[lang] || "#888",
                          }}
                        ></span>
                        <span className="uppercase tracking-wider">{lang}</span>
                        <span className="text-white font-bold">
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

            {/* ── ORGANIZATIONS ── */}
            {gh.organizations && gh.organizations.length > 0 && (
              <div className="border border-border bg-surface relative">
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent"></div>
                <div className="border-b border-border px-6 py-3 bg-background">
                  <span className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
                    ORGANIZATIONS
                  </span>
                </div>
                <div className="p-6 flex flex-wrap gap-4">
                  {gh.organizations.map((org: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 border border-border bg-background px-4 py-3 hover:border-accent/50 transition-colors"
                    >
                      {org.avatar_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={org.avatar_url}
                          alt={org.login}
                          className="w-8 h-8 border border-border"
                        />
                      )}
                      <span className="text-xs font-mono text-white font-bold uppercase tracking-wider">
                        {org.login}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── RECENT ACTIVITY ── */}
            {gh.activity && gh.activity.length > 0 && (
              <div className="border border-border bg-surface relative">
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent"></div>
                <div className="border-b border-border px-6 py-3 bg-background flex items-center justify-between">
                  <span className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
                    ACTIVITY_LOG
                  </span>
                  <span className="w-2 h-2 bg-accent rounded-full animate-pulse"></span>
                </div>
                <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                  {gh.activity.slice(0, 15).map((event: any, i: number) => (
                    <div
                      key={i}
                      className="px-6 py-3 flex items-start gap-3 bg-background hover:bg-surface-hover transition-colors text-xs font-mono"
                    >
                      <span className="text-accent shrink-0 mt-0.5">{">"}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-accent font-bold">
                          {formatEventType(event.type, event.action)}
                        </span>{" "}
                        <span className="text-text-secondary">
                          {event.repo}
                        </span>
                      </div>
                      <span className="text-text-secondary shrink-0">
                        {event.created_at ? timeAgo(event.created_at) : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TOP REPOSITORIES ── */}
            {gh.repositories && gh.repositories.length > 0 && (
              <div className="border border-border bg-surface relative">
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent"></div>
                <div className="border-b border-border px-6 py-3 bg-background">
                  <span className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
                    ALL_REPOSITORIES ({gh.repositories.length})
                  </span>
                </div>
                <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                  {[...gh.repositories]
                    .sort((a: any, b: any) => b.stars - a.stars)
                    .slice(0, 20)
                    .map((repo: any, i: number) => (
                      <a
                        key={i}
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-4 flex items-center gap-4 bg-background hover:bg-surface-hover transition-colors group"
                      >
                        <span className="font-mono text-xs text-border w-6 text-right shrink-0">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-white group-hover:text-accent transition-colors font-mono truncate">
                            {repo.name}
                          </div>
                          {repo.description && (
                            <p className="text-xs text-text-secondary truncate mt-0.5">
                              {repo.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-mono text-text-secondary uppercase tracking-wider shrink-0">
                          {repo.language && (
                            <span className="hidden sm:flex items-center gap-1.5">
                              <span
                                className="w-2 h-2"
                                style={{
                                  backgroundColor:
                                    LANG_COLORS[repo.language] || "#888",
                                }}
                              ></span>
                              {repo.language}
                            </span>
                          )}
                          <span>★ {repo.stars}</span>
                        </div>
                      </a>
                    ))}
                </div>
              </div>
            )}
          </>
        ) : null}

        {/* ══════════ SIGN OUT ══════════ */}
        <div className="flex justify-center pb-8">
          <Button onClick={logout} size="lg">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16,17 21,12 16,7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            DISCONNECT
          </Button>
        </div>
      </div>

      {/* Bottom gradient */}
      <div className="fixed inset-x-0 bottom-0 h-24 bg-linear-to-t from-black to-transparent pointer-events-none z-20"></div>
    </div>
  );
}

// ─── Reusable Components ───────────────────────────────────────────

function InfoBlock({
  label,
  value,
  mono,
  accent,
  indicator,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
  indicator?: "accent" | "pulse";
}) {
  return (
    <div className="border border-border bg-background p-4">
      <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold mb-2">
        {label}
      </p>
      <div className="flex items-start gap-2">
        {indicator && (
          <span
            className={`w-2 h-2 mt-1 shrink-0 ${indicator === "accent" ? "bg-accent" : "bg-text-secondary animate-pulse"}`}
          ></span>
        )}
        <p
          className={`text-xs wrap-break-word min-w-0 ${mono ? "font-mono text-white" : ""} ${accent ? "font-mono text-accent font-bold text-sm" : ""}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

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
