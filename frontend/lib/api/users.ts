import { baseUrl, getHeaders, handleResponse } from "./client";

export type User = {
  firebase_uid: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
};

export type UserSearchResponse = {
  users: User[];
  total: number;
  has_more: boolean;
  query: string;
};

export type UpdateUserProfilePayload = {
  username?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  name?: string;
  location?: string;
  skills?: string[];
  [key: string]: any;
};

export type UpdateUserProfileResponse = {
  message?: string;
  user?: User;
};

export type GitHubRepo = {
  repo_url: string | null;
  repo_name: string | null;
  repo_owner: string | null;
};

export type GitHubReposResponse = {
  repos: GitHubRepo[];
  has_more: boolean;
};

export async function searchUsers(
  q: string,
  token: string,
  offset: number = 0,
  limit: number = 10
): Promise<UserSearchResponse> {
  const query = q.trim();

  const res = await fetch(
    `${baseUrl}/users/search?q=${encodeURIComponent(query)}&offset=${offset}&limit=${limit}`,
    {
      method: "GET",
      headers: getHeaders({ token }),
    }
  );

  return handleResponse<UserSearchResponse>(res, "Search request failed");
}

export async function updateUserProfile(
  data: UpdateUserProfilePayload,
  token: string
): Promise<any> {
  const res = await fetch(`${baseUrl}/auth/onboarding`, {
    method: "POST",
    headers: getHeaders({ token, isJson: true }),
    body: JSON.stringify(data),
  });

  return handleResponse<any>(res, "Profile update failed");
}

export async function uploadAvatar(
  file: File,
  token: string
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${baseUrl}/users/me/upload-avatar`, {
    method: "POST",
    headers: getHeaders({ token }),
    body: formData,
  });

  return handleResponse<{ url: string }>(res, "Upload failed");
}

export async function getUserProfile(
  username: string,
  token: string
): Promise<any> {
  const res = await fetch(`${baseUrl}/users/profile/${username}`, {
    method: "GET",
    headers: getHeaders({ token, isJson: true }),
  });

  return handleResponse<any>(res, "Failed to fetch user profile");
}

export async function getPublicGitHubProfile(
  username: string,
  token: string,
  page: number = 1,
  per_page: number = 9
): Promise<any> {
  const res = await fetch(
    `${baseUrl}/users/profile/${username}/github?page=${page}&per_page=${per_page}`,
    {
      method: "GET",
      headers: getHeaders({ token, isJson: true }),
    }
  );

  return handleResponse<any>(res, "Failed to fetch public github profile");
}

export async function checkUsernameAvailability(
  username: string
): Promise<{ available: boolean }> {
  const res = await fetch(`${baseUrl}/users/check-username/${username}`, {
    method: "GET",
    headers: getHeaders({ isJson: true }),
  });

  return handleResponse<{ available: boolean }>(res, "Username check failed");
}

export async function getMe(token: string): Promise<any> {
  const res = await fetch(`${baseUrl}/users/me`, {
    method: "GET",
    headers: getHeaders({ token, isJson: true }),
  });

  return handleResponse<any>(res, "Failed to fetch current user");
}

export async function getUserRepos(
  token: string,
  page: number = 1,
  per_page: number = 9
): Promise<GitHubReposResponse> {
  const res = await fetch(
    `${baseUrl}/users/me/github?repos=true&page=${page}&per_page=${per_page}`,
    {
      method: "GET",
      headers: getHeaders({ token, isJson: true }),
    }
  );

  return handleResponse<GitHubReposResponse>(res, "Failed to fetch user repositories");
}
