import { ChatReply, Topic, UserProfile, ProfileUpdateStrictness } from "./types";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.error || errorData.detail || errorData.hint || `Request failed (${res.status})`
    );
  }

  return res.json() as Promise<T>;
}

export const api = {
  getTopics: () => request<Topic[]>("/topics"),

  createUser: (name: string) =>
    request<UserProfile>("/users", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  getUser: (userId: string) => request<UserProfile>(`/users/${userId}`),

  updatePreference: (userId: string, topicId: number, strictness: ProfileUpdateStrictness) =>
    request<UserProfile>(`/users/${userId}/preferences/${topicId}`, {
      method: "PUT",
      body: JSON.stringify({ strictness }),
    }),

  createSession: (userId: string) =>
    request<{ session_id: string }>("/sessions", {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    }),

  sendMessage: (sessionId: string, text: string) =>
    request<ChatReply>(`/sessions/${sessionId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
};
