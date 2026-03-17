import { baseUrl, getHeaders, handleResponse } from "./client";

export interface CommentAuthor {
  firebase_uid: string;
  username: string;
  name: string;
  avatar_url: string;
}

export interface Comment {
  _id: string;
  post_id: string;
  author_id: string;
  author?: CommentAuthor;
  content: {
    text: string;
  };
  parent_comment_id: string | null;
  stats: {
    likes_count: number;
  };
  is_liked: boolean;
  replies: Comment[];
  created_at: string;
  updated_at: string;
}

export async function addComment(
  postId: string,
  text: string,
  token: string
): Promise<Comment> {
  const res = await fetch(`${baseUrl}/posts/${postId}/comments`, {
    method: "POST",
    headers: getHeaders({ token, isJson: true }),
    body: JSON.stringify({ text }),
  });

  return handleResponse<Comment>(res, "Failed to add comment");
}

export async function addReply(
  commentId: string,
  text: string,
  token: string
): Promise<Comment> {
  const res = await fetch(`${baseUrl}/comments/${commentId}/reply`, {
    method: "POST",
    headers: getHeaders({ token, isJson: true }),
    body: JSON.stringify({ text }),
  });

  return handleResponse<Comment>(res, "Failed to add reply");
}

export async function getComments(
  postId: string,
  token?: string
): Promise<Comment[]> {
  const headers = token ? getHeaders({ token, isJson: true }) : getHeaders({ isJson: true });
  const res = await fetch(`${baseUrl}/posts/${postId}/comments`, {
    method: "GET",
    headers,
  });

  return handleResponse<Comment[]>(res, "Failed to fetch comments");
}

export async function deleteComment(
  commentId: string,
  token: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${baseUrl}/comments/${commentId}`, {
    method: "DELETE",
    headers: getHeaders({ token, isJson: true }),
  });

  return handleResponse<{ success: boolean; message: string }>(res, "Failed to delete comment");
}

export async function toggleCommentLike(
  commentId: string,
  token: string
): Promise<{ success: boolean; liked: boolean; likes_count: number }> {
  const res = await fetch(`${baseUrl}/comments/${commentId}/like`, {
    method: "POST",
    headers: getHeaders({ token, isJson: true }),
  });

  return handleResponse<{ success: boolean; liked: boolean; likes_count: number }>(
    res,
    "Failed to toggle comment like"
  );
}
