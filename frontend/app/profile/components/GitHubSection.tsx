import { StatCell } from "./StatCell";
import { DetailRow } from "./DetailRow";
import { formatEventType, timeAgo, LANG_COLORS } from "../utils";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import type { GitHubProfileData } from "../types";

interface GitHubSectionProps {
  ghLoading: boolean;
  githubData: GitHubProfileData | null;
  hasGitHub: boolean;
  connected: boolean;
  langEntries: [string, number][];
  totalLangCount: number;
  handleGitHubLink: () => Promise<void>;
  linkError: string;
  isCurrentUser?: boolean;
  loadMore?: () => Promise<void>;
  hasMore?: boolean;
  loadingMore?: boolean;
}

export function GitHubSection({
  ghLoading,
  githubData: gh,
  hasGitHub,
  connected,
  langEntries,
  totalLangCount,
  handleGitHubLink,
  linkError,
  isCurrentUser = false,
  loadMore,
  hasMore = false,
  loadingMore = false,
}: GitHubSectionProps) {
  if (ghLoading) {
    return (
      <div className="border border-border bg-surface p-8 sm:p-12 flex items-center justify-center mt-8">
        <div className="font-mono text-accent text-[10px] sm:text-sm uppercase tracking-widest font-bold animate-pulse flex items-center gap-3 text-center">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-accent rotate-45 shrink-0"></div>
          [ SYNCHRONIZING_GITHUB_CORE ]
        </div>
      </div>
    );
  }

  if (!hasGitHub && !connected) {
    if (!isCurrentUser) {
      return (
        <div className="border border-border bg-surface relative mt-8">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-border/30"></div>
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-border/30"></div>
          <div className="border-b border-border px-6 py-3 bg-background">
            <span className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
              GITHUB_LINKAGE_STATION
            </span>
          </div>
          <div className="p-8 flex items-center justify-center">
            <p className="text-text-secondary font-mono text-xs uppercase tracking-[0.2em] italic">
              [ THIS USER HAS NOT LINKED THEIR GITHUB ]
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="border border-border bg-surface relative mt-8">
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
            <Button
              onClick={handleGitHubLink}
              variant="ghost"
              className="group relative mt-4 md:mt-0 font-mono text-[11px] tracking-[0.2em] border-transparent text-text-secondary hover:text-white hover:border-transparent overflow-hidden px-8"
            >
              <div className="absolute bottom-0 left-0 w-full h-[2px] bg-accent -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out" />
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="transition-transform duration-300 group-hover:scale-110 group-hover:text-accent"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              INITIALIZE_GITHUB
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!gh) return null;

  return (
    <div className="mt-8 flex flex-col gap-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        <div className="border border-border bg-surface relative flex flex-col">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent"></div>
          <div className="border-b border-border px-6 bg-background flex items-center justify-between h-10">
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
          <div className="p-6 flex flex-col gap-5 flex-1">
            <div className="flex flex-col gap-2.5 text-xs font-mono">
              {gh.identity.company && (
                <DetailRow icon="◈" label="ORG" value={gh.identity.company} />
              )}
              {gh.identity.website && (
                <DetailRow icon="◈" label="WEB" value={gh.identity.website} />
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

        <div className="border border-border bg-surface relative flex flex-col">
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent"></div>
          <div className="border-b border-border px-6 bg-background">
            <span className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold flex items-center justify-between h-10">
              REPOSITORY_METRICS
            </span>
          </div>
          <div className="grid grid-cols-2 gap-px bg-border flex-1 overflow-hidden">
            <StatCell
              label="SCRIPTS (REPOS)"
              value={gh.identity?.public_repos || 0}
            />
            <StatCell label="GISTS" value={gh.identity?.public_gists || 0} />
          </div>
        </div>
      </div>

      {gh.repositories?.repositories &&
        gh.repositories.repositories.length > 0 && (
        <div className="border border-border bg-surface relative">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent"></div>
          <div className="border-b border-border px-6 bg-background flex items-center justify-between h-10">
            <span className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
              CORE_ASSETS (TOP_REPOS)
            </span>
          </div>
          <div className="bg-border">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px overflow-hidden">
              {[...gh.repositories.repositories]
                .sort((a, b) => (b.stars || 0) - (a.stars || 0))
                .map((repo, i: number) => (
                  <a
                    key={i}
                    href={repo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-6 bg-background hover:bg-surface-hover transition-colors flex flex-col gap-3 group h-full"
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
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {repo.languages && repo.languages.length > 0 ? (
                        repo.languages.slice(0, 3).map((lang: string, idx: number) => (
                          <span key={idx} className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2"
                              style={{
                                backgroundColor: LANG_COLORS[lang] || "#888",
                              }}
                            ></span>
                            {lang}
                          </span>
                        ))
                      ) : (
                        <span className="opacity-50">NO_LANGUAGE_DETECTED</span>
                      )}
                    </div>
                    <span>★ {repo.stars}</span>
                    <span>⑂ {repo.forks}</span>
                  </div>
                </a>
                ))}
            </div>
          </div>
          {hasMore && (
            <div className="border-t border-border p-4 bg-background/50">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full h-10 border border-border bg-surface hover:bg-surface-hover text-accent font-mono text-[10px] uppercase tracking-[0.2em] font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-3 cursor-pointer"
              >
                {loadingMore ? null : (
                  <span>
                    ▼
                  </span>
                )}
                {loadingMore ? <span className="animate-pulse">DOWNLOADING_MORE_DATA</span> : "LOAD_MORE_ASSETS"}
              </button>
            </div>
          )}
        </div>
      )}

      {langEntries.length > 0 && (
        <div className="border border-border bg-surface relative">
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent"></div>
          <div className="border-b border-border px-6 bg-background flex items-center justify-between h-10">
            <span className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
              LINGUISTIC_MATRIX
            </span>
          </div>
          <div className="p-8 flex flex-col gap-6">
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
                    {Math.round(((count as number) / totalLangCount) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {gh.activity && gh.activity.length > 0 && (
        <div className="border border-border bg-surface relative">
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent"></div>
          <div className="border-b border-border px-6 py-3 bg-background flex items-center justify-between">
            <span className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
              ACTION_SEQUENCES
            </span>
          </div>
          <div className="divide-y divide-border max-h-[400px] overflow-y-auto custom-scrollbar">
            {gh.activity.slice(0, 20).map((event, i: number) => (
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
    </div>
  );
}
