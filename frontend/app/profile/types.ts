export type GitHubActivityEvent = {
  type: string;
  action?: string;
  repo: string;
  created_at?: string;
};

export type GitHubIdentity = {
  html_url: string;
  username: string;
  company?: string;
  website?: string;
  created_at?: string;
  public_repos?: number;
  public_gists?: number;
};

export type GitHubRepoStats = {
  page: number;
  per_page: number;
};

export type GitHubRepository = {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  languages: string[];
  stars: number;
  forks: number;
};

export type GitHubProfileData = {
  identity: GitHubIdentity;
  repositories: {
    repositories: GitHubRepository[];
    repo_stats: GitHubRepoStats;
  };
  activity: GitHubActivityEvent[];
};

export type PublicProfileResponse = {
  _id: string;
  profile: {
    username: string;
    name?: string;
    avatar_url?: string;
    bio?: string;
    location?: string;
    skills?: string[];
  };
  stats: {
    posts_count: number;
    peers_count: number;
    collabs_count: number;
  };
  providers?: {
    github?: {
      linked: boolean;
      username?: string;
    };
  };
};
