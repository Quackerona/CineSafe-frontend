import { BookmarkedMovie, ChatMessage, MovieResult, UserProfile } from "./types";

const PROFILES_LIST_KEY = "cinesafe_saved_profiles";
const ACTIVE_PROFILE_ID_KEY = "cinesafe_active_profile_id";

const DEFAULT_PROFILE: UserProfile = {
  user_id: "arachno",
  name: "Alex",
  topic_prefs: [
    { topic_id: 1, name: "spiders", strictness: "never" },
    { topic_id: 6, name: "jump scares", strictness: "warn" },
  ],
};

function getActiveId(): string {
  if (typeof window === "undefined") return DEFAULT_PROFILE.user_id;
  return localStorage.getItem(ACTIVE_PROFILE_ID_KEY) || DEFAULT_PROFILE.user_id;
}

export const storage = {
  // Profiles Management
  getAllProfiles(): UserProfile[] {
    if (typeof window === "undefined") return [DEFAULT_PROFILE];
    const raw = localStorage.getItem(PROFILES_LIST_KEY);
    if (!raw) {
      this.saveAllProfiles([DEFAULT_PROFILE]);
      return [DEFAULT_PROFILE];
    }
    try {
      const list: UserProfile[] = JSON.parse(raw);
      if (!Array.isArray(list) || list.length === 0) {
        return [DEFAULT_PROFILE];
      }

      // Automatically purge duplicates by name/id
      const seen = new Set<string>();
      const deduplicated: UserProfile[] = [];
      for (const p of list) {
        const key = (p.name || p.user_id).toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          deduplicated.push(p);
        }
      }

      if (deduplicated.length !== list.length) {
        this.saveAllProfiles(deduplicated);
      }

      return deduplicated.length > 0 ? deduplicated : [DEFAULT_PROFILE];
    } catch {
      return [DEFAULT_PROFILE];
    }
  },

  saveAllProfiles(profiles: UserProfile[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(PROFILES_LIST_KEY, JSON.stringify(profiles));
  },

  getUser(): UserProfile {
    if (typeof window === "undefined") return DEFAULT_PROFILE;
    const activeId = getActiveId();
    const profiles = this.getAllProfiles();
    const found = profiles.find((p) => p.user_id === activeId);
    return found || profiles[0] || DEFAULT_PROFILE;
  },

  setUser(profile: UserProfile): void {
    if (typeof window === "undefined" || !profile) return;

    const profiles = this.getAllProfiles();
    // Match by user_id OR by name to prevent duplicate creation
    const index = profiles.findIndex(
      (p) =>
        p.user_id === profile.user_id ||
        p.name.toLowerCase().trim() === profile.name.toLowerCase().trim()
    );

    if (index >= 0) {
      profiles[index] = { ...profiles[index], ...profile };
    } else {
      profiles.push(profile);
    }

    localStorage.setItem(ACTIVE_PROFILE_ID_KEY, profile.user_id);
    this.saveAllProfiles(profiles);
    window.dispatchEvent(new Event("cinesafe_profile_switched"));
  },

  setActiveProfile(userId: string): UserProfile {
    if (typeof window === "undefined") return DEFAULT_PROFILE;
    localStorage.setItem(ACTIVE_PROFILE_ID_KEY, userId);
    const user = this.getUser();
    window.dispatchEvent(new Event("cinesafe_profile_switched"));
    return user;
  },

  deleteProfile(userId: string): UserProfile {
    let profiles = this.getAllProfiles().filter((p) => p.user_id !== userId);
    if (profiles.length === 0) {
      profiles = [DEFAULT_PROFILE];
    }
    this.saveAllProfiles(profiles);

    if (typeof window !== "undefined") {
      localStorage.removeItem(`cinesafe_session_id_${userId}`);
      localStorage.removeItem(`cinesafe_chat_history_${userId}`);
      localStorage.removeItem(`cinesafe_movie_summary_${userId}`);
      localStorage.removeItem(`cinesafe_bookmarks_${userId}`);
    }

    const nextActive = profiles[0];
    return this.setActiveProfile(nextActive.user_id);
  },

  // Per-Profile Session & Chat
  getSessionId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(`cinesafe_session_id_${getActiveId()}`);
  },

  setSessionId(id: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(`cinesafe_session_id_${getActiveId()}`, id);
  },

  clearSession(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(`cinesafe_session_id_${getActiveId()}`);
  },

  getChatHistory(): ChatMessage[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(`cinesafe_chat_history_${getActiveId()}`);
    return raw ? JSON.parse(raw) : [];
  },

  setChatHistory(messages: ChatMessage[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(`cinesafe_chat_history_${getActiveId()}`, JSON.stringify(messages));
  },

  clearChatHistory(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(`cinesafe_chat_history_${getActiveId()}`);
  },

  getMovieSummary(): MovieResult[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(`cinesafe_movie_summary_${getActiveId()}`);
    return raw ? JSON.parse(raw) : [];
  },

  setMovieSummary(movies: MovieResult[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(`cinesafe_movie_summary_${getActiveId()}`, JSON.stringify(movies));
  },

  clearMovieSummary(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(`cinesafe_movie_summary_${getActiveId()}`);
  },

  // Per-Profile Bookmarks
  getBookmarks(): BookmarkedMovie[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(`cinesafe_bookmarks_${getActiveId()}`);
    return raw ? JSON.parse(raw) : [];
  },

  saveBookmark(movie: BookmarkedMovie): void {
    if (typeof window === "undefined" || !movie) return;
    const current = this.getBookmarks();
    const id = movie.movie_id || movie.title;
    if (!current.some((m) => m.movie_id === id || m.title === movie.title)) {
      current.unshift(movie);
      localStorage.setItem(`cinesafe_bookmarks_${getActiveId()}`, JSON.stringify(current));
    }
  },

  removeBookmark(idOrTitle: string): void {
    if (typeof window === "undefined" || !idOrTitle) return;
    const filtered = this.getBookmarks().filter(
      (m) => m.movie_id !== idOrTitle && m.title !== idOrTitle
    );
    localStorage.setItem(`cinesafe_bookmarks_${getActiveId()}`, JSON.stringify(filtered));
  },

  toggleWatchStatus(idOrTitle: string): "unwatched" | "watched" {
    const list = this.getBookmarks();
    const target = list.find((m) => m.movie_id === idOrTitle || m.title === idOrTitle);
    if (!target) return "unwatched";

    target.status = target.status === "watched" ? "unwatched" : "watched";
    localStorage.setItem(`cinesafe_bookmarks_${getActiveId()}`, JSON.stringify(list));
    return target.status;
  },

  updateRating(idOrTitle: string, rating: number): void {
    const list = this.getBookmarks();
    const target = list.find((m) => m.movie_id === idOrTitle || m.title === idOrTitle);
    if (target) {
      target.userRating = rating;
      localStorage.setItem(`cinesafe_bookmarks_${getActiveId()}`, JSON.stringify(list));
    }
  },

  isBookmarked(idOrTitle: string): boolean {
    if (!idOrTitle) return false;
    return this.getBookmarks().some(
      (m) => m.movie_id === idOrTitle || m.title === idOrTitle
    );
  },
};
