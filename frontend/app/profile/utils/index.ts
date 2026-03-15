export function formatEventType(type: string, action?: string) {
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

export function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export const LANG_COLORS: Record<string, string> = {
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
  Elixir: "#6e4a7e",
  Zig: "#ec915c",
};
