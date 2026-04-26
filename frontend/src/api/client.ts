import type { Artist, Playlist, Song, SongLine } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export type SongPayload = {
  title: string;
  artist_name?: string;
  album_name?: string;
  original_key: string;
  content: SongLine[];
  tags: string[];
};

export type PlaylistPayload = {
  name: string;
  description?: string;
  song_ids: string[];
};

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(typeof body.detail === "string" ? body.detail : "La solicitud no se pudo completar");
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

export const api = {
  register: (email: string, password: string) =>
    request<{ id: string; email: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password })
    }),
  login: (email: string, password: string) =>
    request<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    }),
  listSongs: (token: string) => request<Song[]>("/songs", {}, token),
  createSong: (payload: SongPayload, token: string) =>
    request<Song>("/songs", { method: "POST", body: JSON.stringify(payload) }, token),
  updateSong: (id: string, payload: SongPayload, token: string) =>
    request<Song>(`/songs/${id}`, { method: "PUT", body: JSON.stringify(payload) }, token),
  deleteSong: (id: string, token: string) => request<void>(`/songs/${id}`, { method: "DELETE" }, token),
  transpose: (id: string, semitones: number, token: string) =>
    request<{ content: SongLine[] }>(`/songs/${id}/transpose`, {
      method: "POST",
      body: JSON.stringify({ semitones })
    }, token),
  listPlaylists: (token: string) => request<Playlist[]>("/playlists", {}, token),
  listArtists: (token: string) => request<Artist[]>("/artists", {}, token),
  createPlaylist: (payload: PlaylistPayload, token: string) =>
    request<Playlist>("/playlists", { method: "POST", body: JSON.stringify(payload) }, token),
  updatePlaylist: (id: string, payload: PlaylistPayload, token: string) =>
    request<Playlist>(`/playlists/${id}`, { method: "PUT", body: JSON.stringify(payload) }, token),
  deletePlaylist: (id: string, token: string) => request<void>(`/playlists/${id}`, { method: "DELETE" }, token)
};
