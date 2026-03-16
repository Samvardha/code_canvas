import { baseUrl, getHeaders, handleResponse } from "./client";

export type PostStatus = "open" | "closed" | "filled";
export type EventMode = "offline" | "online";
export type EventStatus = "upcoming" | "ongoing" | "completed" | "cancelled";

export interface CollabMeta {
  title: string;
  looking_for: string[];
  requirements: string[];
  duration: string | null;
  status: PostStatus;
}

export interface Venue {
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
}

export interface EventMeta {
  title: string;
  description: string | null;
  venue: Venue | null;
  start_at: string;
  end_at: string | null;
  rsvp_url: string | null;
  mode: EventMode;
  status: EventStatus;
}

export interface Post {
  _id: string;
  author_id: string;
  author?: {
    firebase_uid: string;
    username: string;
    name: string;
    avatar_url: string;
    bio: string;
  };
  categories: string[];
  content: {
    text?: string;
    links: { url: string; title?: string }[];
    media: {
      type: "image" | "video";
      url: string;
      thumbnail_url?: string;
      mime_type?: string;
      width?: number;
      height?: number;
      duration_sec?: number;
      public_id?: string;
      bytes?: number;
    }[];
  };
  github?: {
    repo_url: string | null;
    repo_name: string | null;
    repo_owner: string | null;
  };
  collab_meta?: CollabMeta;
  event_meta?: EventMeta;
  stats: {
    likes_count: number;
    comments_count: number;
    shares_count: number;
  };
  created_at: string;
  updated_at: string;
}

export interface PostCreateRequest {
  categories: string[];
  content: {
    text?: string;
    links: { url: string }[];
    media?: any[];
  };
  github?: {
    repo_url: string | null;
    repo_name: string | null;
    repo_owner: string | null;
  } | null;
  collab_meta?: CollabMeta | null;
  event_meta?: EventMeta | null;
}

export interface FeedResponse {
  posts: Post[];
  total: number;
  has_more: boolean;
}

export async function createPost(
  data: PostCreateRequest,
  files: File[],
  token: string
): Promise<Post> {
  const formData = new FormData();
  formData.append("data", JSON.stringify(data));
  files.forEach((file) => formData.append("files", file));

  const res = await fetch(`${baseUrl}/posts`, {
    method: "POST",
    headers: getHeaders({ token }),
    body: formData,
  });

  return handleResponse<Post>(res, "Failed to create post");
}

export async function getExploreFeed(
  token: string,
  offset: number = 0,
  limit: number = 10
): Promise<FeedResponse> {
  const res = await fetch(`${baseUrl}/posts/feed/explore?offset=${offset}&limit=${limit}`, {
    method: "GET",
    headers: getHeaders({ token, isJson: true }),
  });

  return handleResponse<FeedResponse>(res, "Failed to fetch explore feed");
}

export async function getCollabFeed(
  token: string,
  offset: number = 0,
  limit: number = 10
): Promise<FeedResponse> {
  const res = await fetch(`${baseUrl}/posts/feed/collab?offset=${offset}&limit=${limit}`, {
    method: "GET",
    headers: getHeaders({ token, isJson: true }),
  });

  return handleResponse<FeedResponse>(res, "Failed to fetch collab feed");
}

export async function getEventsFeed(
  token: string,
  offset: number = 0,
  limit: number = 10
): Promise<FeedResponse> {
  const res = await fetch(`${baseUrl}/posts/feed/events?offset=${offset}&limit=${limit}`, {
    method: "GET",
    headers: getHeaders({ token, isJson: true }),
  });

  return handleResponse<FeedResponse>(res, "Failed to fetch events feed");
}

export async function getUserPosts(
  userId: string,
  token: string,
  offset: number = 0,
  limit: number = 10
): Promise<FeedResponse> {
  const res = await fetch(`${baseUrl}/posts/user/${userId}?offset=${offset}&limit=${limit}`, {
    method: "GET",
    headers: getHeaders({ token, isJson: true }),
  });

  return handleResponse<FeedResponse>(res, "Failed to fetch user posts");
}

export async function getPost(postId: string, token: string): Promise<Post> {
  const res = await fetch(`${baseUrl}/posts/${postId}`, {
    method: "GET",
    headers: getHeaders({ token, isJson: true }),
  });

  return handleResponse<Post>(res, "Failed to fetch post");
}

export async function updatePost(
  postId: string,
  data: Partial<PostCreateRequest> & { removed_media_ids?: string[] },
  token: string
): Promise<Post> {
  const res = await fetch(`${baseUrl}/posts/${postId}`, {
    method: "PATCH",
    headers: getHeaders({ token, isJson: true }),
    body: JSON.stringify(data),
  });

  return handleResponse<Post>(res, "Failed to update post");
}

export async function deletePost(postId: string, token: string): Promise<any> {
  const res = await fetch(`${baseUrl}/posts/${postId}`, {
    method: "DELETE",
    headers: getHeaders({ token, isJson: true }),
  });

  return handleResponse<any>(res, "Failed to delete post");
}
