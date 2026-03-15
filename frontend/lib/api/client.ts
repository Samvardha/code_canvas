const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

type HeaderOptions = {
  token?: string;
  isJson?: boolean;
};

export function getHeaders({ token, isJson = false }: HeaderOptions = {}): HeadersInit {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(isJson ? { "Content-Type": "application/json" } : {}),
  };
}

export async function handleResponse<T>(
  res: Response,
  fallbackMessage: string
): Promise<T> {
  if (!res.ok) {
    let errorMessage = fallbackMessage;

    try {
      const error = await res.json();
      errorMessage = error.detail || error.message || fallbackMessage;
    } catch {}

    throw new Error(errorMessage);
  }

  return res.json();
}

export { baseUrl };
