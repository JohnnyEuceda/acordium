export type SongToken = { text: string } | { chord: string };

export type SongLine = {
  type: "line";
  content: SongToken[];
};

export type Song = {
  id: string;
  title: string;
  artist_name?: string | null;
  album_name?: string | null;
  original_key: string;
  content: SongLine[];
  tags: string[];
  is_public?: boolean;
  source_song_id?: string | null;
  created_at: string;
};

export type Playlist = {
  id: string;
  name: string;
  description?: string | null;
  song_ids: string[];
  song_count: number;
  created_at: string;
};

export type Artist = {
  id: string;
  name: string;
  song_count: number;
};

export type Profile = {
  id: string;
  email: string;
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  theme: string;
  social_platform?: string | null;
  social_url?: string | null;
  initials: string;
};

export type Group = {
  id: string;
  name: string;
  description?: string | null;
  code: string;
  cover_url?: string | null;
  role: "admin" | "member";
  member_count: number;
  created_at: string;
};

export type GroupMember = {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string | null;
  initials: string;
  role: "admin" | "member";
};

export type GroupEvent = {
  id: string;
  group_id: string;
  title: string;
  event_date: string;
  notes?: string | null;
  status: "active" | "archived";
  created_by: string;
  created_at: string;
};

export type EventSong = Song & {
  owner_name: string;
  owner_initials: string;
  added_by_name: string;
};

export type EventComment = {
  id: string;
  body: string;
  created_at: string;
  author_name: string;
  author_initials: string;
};

export type PublicSong = {
  id: string;
  title: string;
  artist_name?: string | null;
  owner_name: string;
  owner_initials: string;
  original_key: string;
  rating_average: number;
  rating_count: number;
};
