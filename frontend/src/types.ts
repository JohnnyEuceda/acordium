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
