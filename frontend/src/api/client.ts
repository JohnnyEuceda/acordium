import type { Artist, EventComment, EventSong, Group, GroupEvent, GroupMember, Playlist, Profile, PublicSong, Song, SongLine } from "../types";

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

export type ProfilePayload = {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  theme: string;
  social_platform?: string;
  social_url?: string;
};

export type GroupPayload = {
  name: string;
  description?: string;
  cover_url?: string;
};

export type EventPayload = {
  title: string;
  event_date: string;
  notes?: string;
  status?: "active" | "archived";
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
  getProfile: (token: string) => request<Profile>("/me", {}, token),
  updateProfile: (payload: ProfilePayload, token: string) =>
    request<Profile>("/me", { method: "PUT", body: JSON.stringify(payload) }, token),
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
  ,
  setSongVisibility: (id: string, isPublic: boolean, token: string) =>
    request<{ ok: boolean }>(`/songs/${id}/visibility`, { method: "PUT", body: JSON.stringify({ is_public: isPublic }) }, token),
  listPublicSongs: (token: string) => request<PublicSong[]>("/public-songs", {}, token),
  ratePublicSong: (id: string, rating: number, token: string) =>
    request<{ ok: boolean }>(`/public-songs/${id}/rate`, { method: "POST", body: JSON.stringify({ rating }) }, token),
  copySong: (id: string, token: string) => request<{ id: string }>(`/songs/${id}/copy`, { method: "POST" }, token),
  listGroups: (token: string) => request<Group[]>("/groups", {}, token),
  createGroup: (payload: GroupPayload, token: string) =>
    request<{ id: string; code: string }>("/groups", { method: "POST", body: JSON.stringify(payload) }, token),
  joinGroup: (code: string, token: string) =>
    request<{ id: string }>("/groups/join", { method: "POST", body: JSON.stringify({ code }) }, token),
  leaveGroup: (id: string, token: string) => request<void>(`/groups/${id}/leave`, { method: "DELETE" }, token),
  listMembers: (groupId: string, token: string) => request<GroupMember[]>(`/groups/${groupId}/members`, {}, token),
  updateMemberRole: (groupId: string, userId: string, role: "admin" | "member", token: string) =>
    request<{ ok: boolean }>(`/groups/${groupId}/members/${userId}/role`, { method: "PUT", body: JSON.stringify({ role }) }, token),
  listEvents: (groupId: string, token: string) => request<GroupEvent[]>(`/groups/${groupId}/events`, {}, token),
  createEvent: (groupId: string, payload: EventPayload, token: string) =>
    request<{ id: string }>(`/groups/${groupId}/events`, { method: "POST", body: JSON.stringify(payload) }, token),
  updateEvent: (groupId: string, eventId: string, payload: EventPayload, token: string) =>
    request<{ ok: boolean }>(`/groups/${groupId}/events/${eventId}`, { method: "PUT", body: JSON.stringify(payload) }, token),
  deleteEvent: (groupId: string, eventId: string, token: string) => request<void>(`/groups/${groupId}/events/${eventId}`, { method: "DELETE" }, token),
  listEventSongs: (eventId: string, token: string) => request<EventSong[]>(`/events/${eventId}/songs`, {}, token),
  addEventSong: (eventId: string, songId: string, token: string) =>
    request<{ ok: boolean }>(`/events/${eventId}/songs`, { method: "POST", body: JSON.stringify({ song_id: songId }) }, token),
  removeEventSong: (eventId: string, songId: string, token: string) =>
    request<void>(`/events/${eventId}/songs/${songId}`, { method: "DELETE" }, token),
  listEventComments: (eventId: string, token: string) => request<EventComment[]>(`/events/${eventId}/comments`, {}, token),
  createEventComment: (eventId: string, body: string, token: string) =>
    request<{ ok: boolean }>(`/events/${eventId}/comments`, { method: "POST", body: JSON.stringify({ body }) }, token)
};
