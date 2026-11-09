export type WarningStatus = "present" | "absent" | "unknown";
export type DtddLabel = "yes" | "no" | "unclear" | null;
export type Strictness = "never" | "warn";
export type ProfileUpdateStrictness = "never" | "warn" | "fine";

export interface Topic {
  topic_id: number;
  name: string;
  category: string;
  covers: number[];
}

export interface TopicWarning {
  topic_id: number;
  topic_name: string;
  label: DtddLabel;
  status: WarningStatus;
  present_via: string[];
}

export interface MovieResult {
  movie_id: string;
  title: string;
  year: number;
  rating: number;
  genres: string[];
  overview: string;
  warnings: TopicWarning[];
  unknown_topics: string[];
  relevance_score?: number;
  match_reasons?: string[];
}

export interface PendingProfileUpdate {
  proposal_id: string;
  topic_id: number;
  topic_name: string;
  strictness: Strictness;
}

export interface ChatReply {
  reply: string;
  movies: MovieResult[];
  pending_profile_update: PendingProfileUpdate | null;
  trace: Array<{
    name: string;
    arguments: string;
    ok: boolean;
    output: unknown;
  }>;
}

export interface UserPreference {
  topic_id: number;
  name: string;
  strictness: Strictness;
}

export interface UserProfile {
  user_id: string;
  name: string;
  topic_prefs: UserPreference[];
}

export interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  time: string;
  movies?: MovieResult[];
  pendingProfileUpdate?: PendingProfileUpdate | null;
}

export interface BookmarkedMovie {
  movie_id: string;
  title: string;
  year: number;
  rating: number;
  genres: string[];
  overview: string;
  warnings?: TopicWarning[];
  savedAt: string;
  status: "unwatched" | "watched";
  userRating?: number;
  note?: string;
}
