
export type User = {
  firebase_uid:  string
  username:      string
  display_name:  string
  avatar_url:    string | null
  bio:           string | null
}

export type UserSearchResponse = {
  users: User[]
  count: number
  query: string
}

export async function searchUsers(q: string, token: string): Promise<UserSearchResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  const res = await fetch(
    `${baseUrl}/users/search?q=${encodeURIComponent(q)}&limit=10`,
    {
      method:      "GET", 
      headers:     { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    }
  );
  if (!res.ok) throw new Error("Search request failed");
  return res.json();
}
