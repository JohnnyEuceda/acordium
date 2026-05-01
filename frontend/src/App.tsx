import { Archive, BookOpen, ChevronLeft, ChevronRight, Copy, Expand, Globe2, Home, ListMusic, LogOut, Menu, MessageSquare, Minus, Music, Palette, Plus, Search, Star, Trash2, Users, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { api, type EventPayload, type GroupPayload, type PlaylistPayload, type ProfilePayload, type SongPayload } from "./api/client";
import { AuthPanel } from "./components/AuthPanel";
import { SongEditor } from "./components/SongEditor";
import { SongViewer } from "./components/SongViewer";
import type { Artist, EventComment, EventSong, Group, GroupEvent, GroupMember, Playlist, Profile, PublicSong, Song, SongLine } from "./types";

const TOKEN_KEY = "acordium_token";
type View = "inicio" | "canciones" | "canciones-performance" | "artistas" | "listas" | "grupos" | "explorar" | "configuracion";
type Theme = "morado" | "uva" | "menta" | "cielo" | "coral";

const themes: Record<Theme, string> = {
  morado: "Morado suave",
  uva: "Uva profundo",
  menta: "Menta",
  cielo: "Cielo",
  coral: "Coral"
};

export function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? "");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [theme, setTheme] = useState<Theme>("morado");
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [publicSongs, setPublicSongs] = useState<PublicSong[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventSongs, setEventSongs] = useState<EventSong[]>([]);
  const [eventComments, setEventComments] = useState<EventComment[]>([]);
  const [view, setView] = useState<View>("inicio");
  const [editingSong, setEditingSong] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(false);
  const [editingEvent, setEditingEvent] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [playlistDescription, setPlaylistDescription] = useState("");
  const [playlistSongIds, setPlaylistSongIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventNotes, setEventNotes] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [transposeBy, setTransposeBy] = useState(0);
  const [transposedContent, setTransposedContent] = useState<SongLine[] | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuCollapsed, setMenuCollapsed] = useState(false);
  const [error, setError] = useState("");

  const selectedPlaylist = playlists.find((playlist) => playlist.id === selectedPlaylistId) ?? null;
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? null;
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;
  const visibleContent = useMemo(() => transposedContent ?? selectedSong?.content ?? [], [selectedSong, transposedContent]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!token) return;
    loadAll();
  }, [token]);

  useEffect(() => {
    setTransposeBy(0);
    setTransposedContent(null);
  }, [selectedSong?.id]);

  useEffect(() => {
    if (!selectedGroupId || !token) return;
    loadGroupDetails(selectedGroupId);
  }, [selectedGroupId, token]);

  useEffect(() => {
    if (!selectedEventId || !token) {
      setEventSongs([]);
      setEventComments([]);
      return;
    }
    loadEventDetails(selectedEventId);
  }, [selectedEventId, token]);

  async function loadAll() {
    try {
      const [me, songList, playlistList, artistList, groupList, publicList] = await Promise.all([
        api.getProfile(token),
        api.listSongs(token),
        api.listPlaylists(token),
        api.listArtists(token),
        api.listGroups(token),
        api.listPublicSongs(token)
      ]);
      setProfile(me);
      setTheme((me.theme as Theme) || "morado");
      setSongs(songList);
      setPlaylists(playlistList);
      setArtists(artistList);
      setGroups(groupList);
      setPublicSongs(publicList);
      setSelectedSong((current) => current ?? songList[0] ?? null);
      setSelectedPlaylistId((current) => current ?? playlistList[0]?.id ?? null);
      setSelectedGroupId((current) => current ?? groupList[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar Acordium");
    }
  }

  async function loadGroupDetails(groupId: string) {
    const [eventList, memberList] = await Promise.all([api.listEvents(groupId, token), api.listMembers(groupId, token)]);
    setEvents(eventList);
    setMembers(memberList);
    setSelectedEventId((current) => eventList.some((event) => event.id === current) ? current : null);
  }

  async function loadEventDetails(eventId: string) {
    const [songList, commentList] = await Promise.all([api.listEventSongs(eventId, token), api.listEventComments(eventId, token)]);
    setEventSongs(songList);
    setEventComments(commentList);
  }

  async function handleLogin(email: string, password: string, register: boolean) {
    if (register) {
      await api.register(email, password).catch((err) => {
        if (err instanceof Error && !err.message.includes("already") && !err.message.includes("registrado")) throw err;
      });
    }
    const response = await api.login(email, password);
    localStorage.setItem(TOKEN_KEY, response.access_token);
    setToken(response.access_token);
  }

  async function saveSong(payload: SongPayload) {
    const saved = selectedSong && editingSong ? await api.updateSong(selectedSong.id, payload, token) : await api.createSong(payload, token);
    await loadAll();
    setSelectedSong(saved);
    setEditingSong(false);
    setView("canciones");
  }

  async function deleteSong(song: Song) {
    await api.deleteSong(song.id, token);
    await loadAll();
  }

  async function togglePublic(song: Song) {
    if (song.source_song_id) {
      setError("Las copias no se pueden publicar para evitar duplicados en Explorar.");
      return;
    }
    const isPublic = !song.is_public;
    await api.setSongVisibility(song.id, isPublic, token);
    await loadAll();
  }

  async function transpose(delta: number) {
    if (!selectedSong) return;
    const next = transposeBy + delta;
    setTransposeBy(next);
    const response = await api.transpose(selectedSong.id, next, token);
    setTransposedContent(response.content);
  }

  function startPlaylistCreate() {
    setSelectedPlaylistId(null);
    setPlaylistName("");
    setPlaylistDescription("");
    setPlaylistSongIds([]);
    setEditingPlaylist(true);
    setView("listas");
  }

  function startPlaylistEdit(playlist: Playlist) {
    setSelectedPlaylistId(playlist.id);
    setPlaylistName(playlist.name);
    setPlaylistDescription(playlist.description ?? "");
    setPlaylistSongIds(playlist.song_ids);
    setEditingPlaylist(true);
    setView("listas");
  }

  async function savePlaylist() {
    const payload: PlaylistPayload = { name: playlistName, description: playlistDescription || undefined, song_ids: playlistSongIds };
    const saved = selectedPlaylistId ? await api.updatePlaylist(selectedPlaylistId, payload, token) : await api.createPlaylist(payload, token);
    const list = await api.listPlaylists(token);
    setPlaylists(list);
    setSelectedPlaylistId(saved.id);
    setEditingPlaylist(false);
  }

  async function deletePlaylist(playlist: Playlist) {
    await api.deletePlaylist(playlist.id, token);
    const list = await api.listPlaylists(token);
    setPlaylists(list);
    setSelectedPlaylistId(list[0]?.id ?? null);
  }

  async function createGroup() {
    const payload: GroupPayload = { name: groupName, description: groupDescription || undefined };
    const created = await api.createGroup(payload, token);
    setGroupName("");
    setGroupDescription("");
    await loadAll();
    setSelectedGroupId(created.id);
  }

  async function joinGroup() {
    const joined = await api.joinGroup(joinCode, token);
    setJoinCode("");
    await loadAll();
    setSelectedGroupId(joined.id);
  }

  async function leaveGroup(group: Group) {
    await api.leaveGroup(group.id, token);
    await loadAll();
  }

  function startEventCreate() {
    setSelectedEventId(null);
    setEventTitle("");
    setEventDate(new Date().toISOString().slice(0, 16));
    setEventNotes("");
    setEditingEvent(true);
  }

  function startEventEdit(event: GroupEvent) {
    setSelectedEventId(event.id);
    setEventTitle(event.title);
    setEventDate(event.event_date.slice(0, 16));
    setEventNotes(event.notes ?? "");
    setEditingEvent(true);
  }

  async function saveEvent(status: "active" | "archived" = "active") {
    if (!selectedGroupId) return;
    const payload: EventPayload = { title: eventTitle, event_date: new Date(eventDate).toISOString(), notes: eventNotes || undefined, status };
    if (selectedEventId && events.some((event) => event.id === selectedEventId)) {
      await api.updateEvent(selectedGroupId, selectedEventId, payload, token);
    } else {
      const created = await api.createEvent(selectedGroupId, payload, token);
      setSelectedEventId(created.id);
    }
    setEditingEvent(false);
    await loadGroupDetails(selectedGroupId);
  }

  async function archiveEvent(event: GroupEvent) {
    if (!selectedGroupId) return;
    await api.updateEvent(selectedGroupId, event.id, { title: event.title, event_date: event.event_date, notes: event.notes || undefined, status: "archived" }, token);
    setSelectedEventId(null);
    await loadGroupDetails(selectedGroupId);
  }

  async function deleteEvent(event: GroupEvent) {
    if (!selectedGroupId) return;
    await api.deleteEvent(selectedGroupId, event.id, token);
    setSelectedEventId(null);
    await loadGroupDetails(selectedGroupId);
  }

  async function addSongToEvent(songId: string) {
    if (!selectedEventId) return;
    await api.addEventSong(selectedEventId, songId, token);
    await loadEventDetails(selectedEventId);
  }

  async function removeSongFromEvent(songId: string) {
    if (!selectedEventId) return;
    await api.removeEventSong(selectedEventId, songId, token);
    await loadEventDetails(selectedEventId);
  }

  async function addComment() {
    if (!selectedEventId || !commentBody.trim()) return;
    await api.createEventComment(selectedEventId, commentBody, token);
    setCommentBody("");
    await loadEventDetails(selectedEventId);
  }

  async function copySong(songId: string) {
    await api.copySong(songId, token);
    await loadAll();
  }

  async function rate(songId: string, value: number) {
    await api.ratePublicSong(songId, value, token);
    setPublicSongs(await api.listPublicSongs(token));
  }

  async function saveProfile(payload: ProfilePayload) {
    const updated = await api.updateProfile(payload, token);
    setProfile(updated);
    setTheme((updated.theme as Theme) || "morado");
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setProfile(null);
    setSongs([]);
    setPlaylists([]);
    setArtists([]);
    setGroups([]);
  }

  function go(next: View) {
    setView(next);
    setEditingSong(false);
    setEditingPlaylist(false);
    setEditingEvent(false);
    setMenuOpen(false);
  }

  function openSong(song: Song) {
    setSelectedSong(song);
    setEditingSong(false);
    go("canciones");
  }

  function openGroup(group: Group) {
    setSelectedGroupId(group.id);
    setSelectedEventId(null);
    go("grupos");
  }

  function backToEvents() {
    setSelectedEventId(null);
    setEditingEvent(false);
  }

  if (!token) {
    return <AuthPanel onLogin={handleLogin} />;
  }

  if (view === "canciones-performance" && selectedSong) {
    return <PerformanceView song={selectedSong} content={visibleContent} transposeBy={transposeBy} onTranspose={transpose} onExit={() => setView("canciones")} />;
  }

  return (
    <main className={menuCollapsed ? "app-shell menu-collapsed" : "app-shell"}>
      <button className="hamburger" onClick={() => setMenuOpen(true)} title="Abrir menu"><Menu size={22} /></button>
      <aside className={menuOpen ? "library open" : "library"}>
        <div className="library-header">
          <h1>{menuCollapsed ? "A" : "Acordium"}</h1>
          <button className="icon-button mobile-close" onClick={() => setMenuOpen(false)} title="Cerrar menu"><X size={20} /></button>
        </div>
        <button className="collapse-button" onClick={() => setMenuCollapsed(!menuCollapsed)} title="Colapsar menu">
          {menuCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!menuCollapsed && "Colapsar"}
        </button>
        <nav className="main-nav">
          <NavButton active={view === "inicio"} collapsed={menuCollapsed} icon={<Home size={18} />} label="Inicio" onClick={() => go("inicio")} />
          <NavButton active={view === "canciones"} collapsed={menuCollapsed} icon={<Music size={18} />} label="Canciones" onClick={() => go("canciones")} />
          <NavButton active={view === "artistas"} collapsed={menuCollapsed} icon={<Search size={18} />} label="Artistas" onClick={() => go("artistas")} />
          <NavButton active={view === "listas"} collapsed={menuCollapsed} icon={<ListMusic size={18} />} label="Listas" onClick={() => go("listas")} />
          <NavButton active={view === "grupos"} collapsed={menuCollapsed} icon={<Users size={18} />} label="Grupos" onClick={() => go("grupos")} />
          <NavButton active={view === "explorar"} collapsed={menuCollapsed} icon={<Globe2 size={18} />} label="Explorar" onClick={() => go("explorar")} />
          <NavButton active={view === "configuracion"} collapsed={menuCollapsed} icon={<Palette size={18} />} label="Perfil" onClick={() => go("configuracion")} />
        </nav>
        {!menuCollapsed && (
          <div className="side-section">
            <div className="side-title">
              <span>Canciones</span>
              <button className="icon-button" onClick={() => { setSelectedSong(null); setEditingSong(true); setView("canciones"); }} title="Nueva cancion"><Plus size={18} /></button>
            </div>
            <div className="song-list">
              {songs.slice(0, 8).map((song) => (
                <button key={song.id} className={selectedSong?.id === song.id ? "song-row selected" : "song-row"} onClick={() => { setSelectedSong(song); go("canciones"); }}>
                  <Music size={17} />
                  <span><strong>{song.title}</strong><small>{song.artist_name || "Sin artista"}</small></span>
                </button>
              ))}
            </div>
          </div>
        )}
        <button className="logout-button" onClick={logout}><LogOut size={18} />{!menuCollapsed && "Salir"}</button>
      </aside>
      <section className="workspace">
        {view === "inicio" && <HomeView songs={songs} playlists={playlists} artists={artists} groups={groups} publicSongs={publicSongs} onNavigate={go} onOpenSong={openSong} onOpenGroup={openGroup} onNewSong={() => { setSelectedSong(null); setEditingSong(true); setView("canciones"); }} />}
        {view === "canciones" && <SongsView songs={songs} selectedSong={selectedSong} editing={editingSong} transposeBy={transposeBy} visibleContent={visibleContent} artists={artists} onSelect={(song) => { setSelectedSong(song); setEditingSong(false); }} onNew={() => { setSelectedSong(null); setEditingSong(true); }} onEdit={() => setEditingSong(true)} onDelete={deleteSong} onSave={saveSong} onTranspose={transpose} onPerformance={() => setView("canciones-performance")} onTogglePublic={togglePublic} error={error} />}
        {view === "artistas" && <ArtistsView artists={artists} songs={songs} />}
        {view === "listas" && <PlaylistsView songs={songs} playlists={playlists} selectedPlaylist={selectedPlaylist} editing={editingPlaylist} name={playlistName} description={playlistDescription} songIds={playlistSongIds} onSelect={(playlist) => { setSelectedPlaylistId(playlist.id); setEditingPlaylist(false); }} onNew={startPlaylistCreate} onEdit={startPlaylistEdit} onDelete={deletePlaylist} onName={setPlaylistName} onDescription={setPlaylistDescription} onSongIds={setPlaylistSongIds} onSave={savePlaylist} />}
        {view === "grupos" && <GroupsView groups={groups} selectedGroup={selectedGroup} selectedEvent={selectedEvent} events={events} members={members} songs={songs} eventSongs={eventSongs} comments={eventComments} groupName={groupName} groupDescription={groupDescription} joinCode={joinCode} editingEvent={editingEvent} eventTitle={eventTitle} eventDate={eventDate} eventNotes={eventNotes} commentBody={commentBody} onGroupName={setGroupName} onGroupDescription={setGroupDescription} onJoinCode={setJoinCode} onCreateGroup={createGroup} onJoinGroup={joinGroup} onLeaveGroup={leaveGroup} onSelectGroup={(id) => { setSelectedGroupId(id); setSelectedEventId(null); }} onSelectEvent={setSelectedEventId} onBackToEvents={backToEvents} onNewEvent={startEventCreate} onEditEvent={startEventEdit} onArchiveEvent={archiveEvent} onDeleteEvent={deleteEvent} onEventTitle={setEventTitle} onEventDate={setEventDate} onEventNotes={setEventNotes} onSaveEvent={saveEvent} onAddSong={addSongToEvent} onRemoveSong={removeSongFromEvent} onCopySong={copySong} onCommentBody={setCommentBody} onAddComment={addComment} />}
        {view === "explorar" && <ExploreView songs={publicSongs} onRate={rate} onCopy={copySong} />}
        {view === "configuracion" && profile && <ProfileView profile={profile} theme={theme} themes={themes} onSave={saveProfile} />}
      </section>
    </main>
  );
}

function NavButton({ active, collapsed, icon, label, onClick }: { active: boolean; collapsed: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return <button className={active ? "nav-item active" : "nav-item"} onClick={onClick} title={label}>{icon}{!collapsed && label}</button>;
}

function HomeView({ songs, playlists, artists, groups, publicSongs, onNavigate, onOpenSong, onOpenGroup, onNewSong }: { songs: Song[]; playlists: Playlist[]; artists: Artist[]; groups: Group[]; publicSongs: PublicSong[]; onNavigate: (view: View) => void; onOpenSong: (song: Song) => void; onOpenGroup: (group: Group) => void; onNewSong: () => void }) {
  return (
    <div className="page">
      <header className="topbar">
        <div><h2>Inicio</h2><p>Tu biblioteca, grupos y canciones compartidas en un solo lugar.</p></div>
        <div className="toolbar"><button className="primary" onClick={onNewSong}><Plus size={18} /> Nueva cancion</button></div>
      </header>
      <section className="summary-grid">
        <SummaryCard icon={<Music size={22} />} label="Canciones" value={songs.length} onClick={() => onNavigate("canciones")} />
        <SummaryCard icon={<Search size={22} />} label="Artistas" value={artists.length} onClick={() => onNavigate("artistas")} />
        <SummaryCard icon={<ListMusic size={22} />} label="Listas" value={playlists.length} onClick={() => onNavigate("listas")} />
        <SummaryCard icon={<Users size={22} />} label="Grupos" value={groups.length} onClick={() => onNavigate("grupos")} />
        <SummaryCard icon={<Globe2 size={22} />} label="Publicas" value={publicSongs.length} onClick={() => onNavigate("explorar")} />
      </section>
      <section className="content-grid">
        <div className="panel"><h3>Canciones recientes</h3>{songs.slice(0, 6).map((song) => <button className="home-row" key={song.id} onClick={() => onOpenSong(song)}><strong>{song.title}</strong><span>{song.artist_name || "Sin artista"}</span></button>)}</div>
        <div className="panel"><h3>Grupos</h3>{groups.slice(0, 6).map((group) => <button className="home-row" key={group.id} onClick={() => onOpenGroup(group)}><strong>{group.name}</strong><span>{group.member_count} miembros</span></button>)}</div>
      </section>
    </div>
  );
}

function SummaryCard({ icon, label, value, onClick }: { icon: ReactNode; label: string; value: number; onClick: () => void }) {
  return <button className="summary-card" onClick={onClick}>{icon}<span>{label}</span><strong>{value}</strong></button>;
}

function SongsView(props: {
  songs: Song[];
  selectedSong: Song | null;
  editing: boolean;
  transposeBy: number;
  visibleContent: SongLine[];
  artists: Artist[];
  onSelect: (song: Song) => void;
  onNew: () => void;
  onEdit: () => void;
  onDelete: (song: Song) => void;
  onSave: (payload: SongPayload) => Promise<void>;
  onTranspose: (delta: number) => void;
  onPerformance: () => void;
  onTogglePublic: (song: Song) => void;
  error: string;
}) {
  return (
    <div className="page two-column">
      <aside className="panel list-panel">
        <div className="panel-header"><h3>Canciones</h3><button className="icon-button" onClick={props.onNew} title="Nueva cancion"><Plus size={18} /></button></div>
        {props.songs.map((song) => (
          <button key={song.id} className={props.selectedSong?.id === song.id ? "item-row active" : "item-row"} onClick={() => props.onSelect(song)}>
            <span><strong>{song.title}</strong><small>{song.artist_name || "Sin artista"}</small></span>
            <Trash2 size={16} onClick={(event) => { event.stopPropagation(); props.onDelete(song); }} />
          </button>
        ))}
      </aside>
      <section>
        <header className="topbar">
          <div><h2>{props.selectedSong?.title ?? "Nueva cancion"}</h2><p>{props.selectedSong?.artist_name ?? "Editor de letras con acordes estructurados."}</p></div>
          <div className="toolbar">
            <button className="icon-button" onClick={() => props.onTranspose(-1)} disabled={!props.selectedSong || props.editing} title="Bajar tonalidad"><Minus size={18} /></button>
            <span className="transpose-count">{props.transposeBy > 0 ? `+${props.transposeBy}` : props.transposeBy}</span>
            <button className="icon-button" onClick={() => props.onTranspose(1)} disabled={!props.selectedSong || props.editing} title="Subir tonalidad"><Plus size={18} /></button>
            <button onClick={props.onEdit} disabled={!props.selectedSong}>Editar</button>
            {props.selectedSong && <button onClick={() => props.onTogglePublic(props.selectedSong!)} disabled={Boolean(props.selectedSong.source_song_id)} title={props.selectedSong.source_song_id ? "Las copias se mantienen privadas para evitar duplicados" : "Publicar en Explorar"}><Globe2 size={18} /> {props.selectedSong.is_public ? "Quitar publica" : "Publicar"}</button>}
            <button className="icon-button" onClick={props.onPerformance} disabled={!props.selectedSong || props.editing} title="Pantalla completa"><Expand size={18} /></button>
          </div>
        </header>
        {props.error && <p className="error">{props.error}</p>}
        {props.editing ? <SongEditor song={props.selectedSong} artists={props.artists} onSave={props.onSave} /> : props.selectedSong ? <SongViewer content={props.visibleContent} /> : <EmptySongs onNew={props.onNew} />}
      </section>
    </div>
  );
}

function EmptySongs({ onNew }: { onNew: () => void }) {
  return <div className="empty-state"><BookOpen size={36} /><h2>No hay canciones todavia</h2><button className="primary" onClick={onNew}><Plus size={18} /> Crear cancion</button></div>;
}

function PerformanceView({ song, content, transposeBy, onTranspose, onExit }: { song: Song; content: SongLine[]; transposeBy: number; onTranspose: (delta: number) => void; onExit: () => void }) {
  return (
    <main className="performance-mode">
      <header><div><h1>{song.title}</h1><p>{song.artist_name}</p></div><div className="toolbar"><button className="icon-button" onClick={() => onTranspose(-1)} title="Bajar tonalidad"><Minus size={22} /></button><strong>{transposeBy > 0 ? `+${transposeBy}` : transposeBy}</strong><button className="icon-button" onClick={() => onTranspose(1)} title="Subir tonalidad"><Plus size={22} /></button><button onClick={onExit}>Salir</button></div></header>
      <SongViewer content={content} performance />
    </main>
  );
}

function ArtistsView({ artists, songs }: { artists: Artist[]; songs: Song[] }) {
  return (
    <div className="page">
      <header className="topbar"><div><h2>Artistas</h2><p>Se crean automaticamente cuando guardas una cancion con un artista nuevo.</p></div></header>
      <section className="content-grid">
        <div className="panel"><h3>Todos los artistas</h3>{artists.length === 0 && <p>Aun no tienes artistas registrados.</p>}{artists.map((artist) => <p key={artist.id}><strong>{artist.name}</strong><span>{artist.song_count} canciones</span></p>)}</div>
        <div className="panel"><h3>Canciones por artista</h3>{artists.map((artist) => <div className="artist-group" key={artist.id}><strong>{artist.name}</strong>{songs.filter((song) => song.artist_name === artist.name).map((song) => <span key={song.id}>{song.title}</span>)}</div>)}</div>
      </section>
    </div>
  );
}

function PlaylistsView(props: {
  songs: Song[]; playlists: Playlist[]; selectedPlaylist: Playlist | null; editing: boolean; name: string; description: string; songIds: string[];
  onSelect: (playlist: Playlist) => void; onNew: () => void; onEdit: (playlist: Playlist) => void; onDelete: (playlist: Playlist) => void;
  onName: (value: string) => void; onDescription: (value: string) => void; onSongIds: (value: string[]) => void; onSave: () => void;
}) {
  const songsInList = props.songs.filter((song) => props.selectedPlaylist?.song_ids.includes(song.id));
  return (
    <div className="page two-column">
      <aside className="panel list-panel"><div className="panel-header"><h3>Listas</h3><button className="icon-button" onClick={props.onNew} title="Nueva lista"><Plus size={18} /></button></div>{props.playlists.map((playlist) => <button key={playlist.id} className={props.selectedPlaylist?.id === playlist.id ? "item-row active" : "item-row"} onClick={() => props.onSelect(playlist)}><span><strong>{playlist.name}</strong><small>{playlist.song_count} canciones</small></span><Trash2 size={16} onClick={(event) => { event.stopPropagation(); props.onDelete(playlist); }} /></button>)}</aside>
      <section>
        <header className="topbar"><div><h2>{props.editing ? "Editar lista" : props.selectedPlaylist?.name ?? "Listas"}</h2><p>Organiza canciones personales para ensayos o eventos rapidos.</p></div><div className="toolbar"><button className="primary" onClick={props.onNew}><Plus size={18} /> Nueva lista</button>{props.selectedPlaylist && <button onClick={() => props.onEdit(props.selectedPlaylist!)}>Editar</button>}</div></header>
        {props.editing ? <section className="editor"><div className="form-grid compact"><label>Nombre<input value={props.name} onChange={(event) => props.onName(event.target.value)} /></label><label>Descripcion<input value={props.description} onChange={(event) => props.onDescription(event.target.value)} /></label></div><div className="check-list">{props.songs.map((song) => <label key={song.id} className="check-row"><input type="checkbox" checked={props.songIds.includes(song.id)} onChange={(event) => props.onSongIds(event.target.checked ? [...props.songIds, song.id] : props.songIds.filter((id) => id !== song.id))} /><span><strong>{song.title}</strong><small>{song.artist_name || "Sin artista"}</small></span></label>)}</div><button className="primary" onClick={props.onSave} disabled={!props.name.trim()}>Guardar lista</button></section> : <div className="panel detail-panel">{props.selectedPlaylist ? songsInList.map((song) => <p key={song.id}><strong>{song.title}</strong><span>{song.artist_name || "Sin artista"}</span></p>) : <p>Aun no tienes listas creadas.</p>}</div>}
      </section>
    </div>
  );
}

function GroupsView(props: {
  groups: Group[]; selectedGroup: Group | null; selectedEvent: GroupEvent | null; events: GroupEvent[]; members: GroupMember[]; songs: Song[]; eventSongs: EventSong[]; comments: EventComment[];
  groupName: string; groupDescription: string; joinCode: string; editingEvent: boolean; eventTitle: string; eventDate: string; eventNotes: string; commentBody: string;
  onGroupName: (v: string) => void; onGroupDescription: (v: string) => void; onJoinCode: (v: string) => void; onCreateGroup: () => void; onJoinGroup: () => void; onLeaveGroup: (g: Group) => void;
  onSelectGroup: (id: string) => void; onSelectEvent: (id: string) => void; onBackToEvents: () => void; onNewEvent: () => void; onEditEvent: (e: GroupEvent) => void; onArchiveEvent: (e: GroupEvent) => void; onDeleteEvent: (e: GroupEvent) => void;
  onEventTitle: (v: string) => void; onEventDate: (v: string) => void; onEventNotes: (v: string) => void; onSaveEvent: (status?: "active" | "archived") => void;
  onAddSong: (songId: string) => void; onRemoveSong: (songId: string) => void; onCopySong: (songId: string) => void; onCommentBody: (v: string) => void; onAddComment: () => void;
}) {
  const now = Date.now();
  const future = props.events.filter((event) => event.status === "active" && new Date(event.event_date).getTime() >= now);
  const past = props.events.filter((event) => event.status === "archived" || new Date(event.event_date).getTime() < now);
  return (
    <div className="page group-page">
      <header className="topbar"><div><h2>Grupos</h2><p>Crea equipos, comparte canciones y prepara eventos juntos.</p></div></header>
      <section className="group-layout">
        <aside className="panel list-panel">
          <h3>Mis grupos</h3>
          {props.groups.map((group) => <button key={group.id} className={props.selectedGroup?.id === group.id ? "item-row active" : "item-row"} onClick={() => props.onSelectGroup(group.id)}><span><strong>{group.name}</strong><small>{group.code}</small></span><Users size={16} /></button>)}
          <div className="mini-form"><input placeholder="Nombre del grupo" value={props.groupName} onChange={(event) => props.onGroupName(event.target.value)} /><input placeholder="Descripcion" value={props.groupDescription} onChange={(event) => props.onGroupDescription(event.target.value)} /><button className="primary" onClick={props.onCreateGroup} disabled={!props.groupName.trim()}><Plus size={18} /> Crear grupo</button></div>
          <div className="mini-form"><input placeholder="Codigo del grupo" value={props.joinCode} onChange={(event) => props.onJoinCode(event.target.value)} /><button onClick={props.onJoinGroup}>Unirme</button></div>
        </aside>
        <section className="group-main">
          {props.selectedGroup ? (
            <>
              <div className="group-hero"><div><h1>{props.selectedGroup.name}</h1><p>{props.selectedGroup.description || "Grupo colaborativo"}</p><strong>Codigo: {props.selectedGroup.code}</strong></div><button onClick={() => props.onLeaveGroup(props.selectedGroup!)}>Salir del grupo</button></div>
              {!props.selectedEvent && !props.editingEvent && (
                <>
                  <div className="toolbar"><button className="primary" onClick={props.onNewEvent}><Plus size={18} /> Nuevo evento</button></div>
                  <div className="content-grid">
                    <EventColumn title="Eventos futuros" events={future} onSelect={props.onSelectEvent} />
                    <EventColumn title="Eventos pasados" events={past} onSelect={props.onSelectEvent} />
                  </div>
                  <div className="panel"><h3>Miembros</h3>{props.members.map((member) => <p key={member.id}><strong>{member.display_name}</strong><span>{member.role}</span></p>)}</div>
                </>
              )}
              {props.editingEvent && <section className="panel event-editor"><div className="panel-header"><h3>{props.selectedEvent ? "Editar evento" : "Nuevo evento"}</h3><button onClick={props.onBackToEvents}>Volver</button></div><div className="form-grid compact"><label>Titulo<input value={props.eventTitle} onChange={(event) => props.onEventTitle(event.target.value)} /></label><label>Fecha<input type="datetime-local" value={props.eventDate} onChange={(event) => props.onEventDate(event.target.value)} /></label></div><label>Observaciones<textarea className="small-textarea" value={props.eventNotes} onChange={(event) => props.onEventNotes(event.target.value)} /></label><button className="primary" onClick={() => props.onSaveEvent("active")} disabled={!props.eventTitle.trim()}>Guardar evento</button></section>}
              {props.selectedEvent && !props.editingEvent && <EventDetail event={props.selectedEvent} songs={props.songs} eventSongs={props.eventSongs} comments={props.comments} commentBody={props.commentBody} onBack={props.onBackToEvents} onEdit={() => props.onEditEvent(props.selectedEvent!)} onArchive={() => props.onArchiveEvent(props.selectedEvent!)} onDelete={() => props.onDeleteEvent(props.selectedEvent!)} onAddSong={props.onAddSong} onRemoveSong={props.onRemoveSong} onCopySong={props.onCopySong} onCommentBody={props.onCommentBody} onAddComment={props.onAddComment} />}
            </>
          ) : <div className="empty-state"><Users size={36} /><h2>Crea o unete a un grupo</h2></div>}
        </section>
      </section>
    </div>
  );
}

function EventColumn({ title, events, onSelect }: { title: string; events: GroupEvent[]; onSelect: (id: string) => void }) {
  return <div className="panel event-column"><h3>{title}</h3>{events.length === 0 && <p>Sin eventos.</p>}{events.map((event) => <button key={event.id} className="event-card" onClick={() => onSelect(event.id)}><strong>{event.title}</strong><span>{new Date(event.event_date).toLocaleString()}</span></button>)}</div>;
}

function EventDetail(props: { event: GroupEvent; songs: Song[]; eventSongs: EventSong[]; comments: EventComment[]; commentBody: string; onBack: () => void; onEdit: () => void; onArchive: () => void; onDelete: () => void; onAddSong: (id: string) => void; onRemoveSong: (id: string) => void; onCopySong: (id: string) => void; onCommentBody: (v: string) => void; onAddComment: () => void }) {
  const [activeSongId, setActiveSongId] = useState<string | null>(null);
  const activeSong = props.eventSongs.find((song) => song.id === activeSongId) ?? props.eventSongs[0] ?? null;
  return (
    <section className="event-page">
      <header className="topbar"><div><button onClick={props.onBack}>Volver a eventos</button><h2>{props.event.title}</h2><p>{new Date(props.event.event_date).toLocaleString()}</p></div><div className="toolbar"><button onClick={props.onEdit}>Editar</button><button onClick={props.onArchive}><Archive size={18} /> Archivar</button><button onClick={props.onDelete}><Trash2 size={18} /> Borrar</button></div></header>
      <div className="event-focus-grid">
        <div className="panel event-song-list"><h3>Canciones del evento</h3><p>{props.event.notes || "Sin observaciones."}</p><select onChange={(event) => event.target.value && props.onAddSong(event.target.value)} defaultValue=""><option value="">Agregar cancion al evento</option>{props.songs.map((song) => <option value={song.id} key={song.id}>{song.title}</option>)}</select>{props.eventSongs.map((song) => <div className={activeSong?.id === song.id ? "event-song active" : "event-song"} key={song.id}><div className="avatar">{song.owner_initials}</div><button className="event-song-title" onClick={() => setActiveSongId(song.id)}><strong>{song.title}</strong><small>Publicada por {song.owner_name}. Agregada por {song.added_by_name}</small></button><div className="song-actions"><button onClick={() => props.onCopySong(song.id)} title="Copiar"><Copy size={16} /></button><button onClick={() => props.onRemoveSong(song.id)} title="Quitar"><Trash2 size={16} /></button></div></div>)}</div>
        <div className="panel event-player">{activeSong ? <><div className="panel-header"><h3>{activeSong.title}</h3><span>{activeSong.artist_name || "Sin artista"}</span></div><SongViewer content={activeSong.content} /></> : <div className="empty-state"><Music size={36} /><h2>Agrega una cancion para verla aqui</h2></div>}</div>
      </div>
      <div className="panel"><h3>Conversacion</h3>{props.comments.map((comment) => <div className="comment" key={comment.id}><div className="avatar">{comment.author_initials}</div><div><strong>{comment.author_name}</strong><p>{comment.body}</p></div></div>)}<div className="comment-box"><input value={props.commentBody} onChange={(event) => props.onCommentBody(event.target.value)} placeholder="Responder observacion..." /><button onClick={props.onAddComment}><MessageSquare size={18} /></button></div></div>
    </section>
  );
}

function ExploreView({ songs, onRate, onCopy }: { songs: PublicSong[]; onRate: (id: string, rating: number) => void; onCopy: (id: string) => void }) {
  return (
    <div className="page">
      <header className="topbar"><div><h2>Explorar</h2><p>Canciones publicas que otros usuarios compartieron para copiar y adaptar.</p></div></header>
      <section className="content-grid">{songs.map((song) => <div className="panel public-song" key={song.id}><div className="avatar">{song.owner_initials}</div><h3>{song.title}</h3><p>{song.artist_name || "Sin artista"} - por {song.owner_name}</p><div className="stars">{[1, 2, 3, 4, 5].map((value) => <button key={value} className="star-button" onClick={() => onRate(song.id, value)}><Star size={16} fill={value <= Math.round(song.rating_average) ? "currentColor" : "none"} /></button>)}</div><small>{song.rating_average.toFixed(1)} / 5 ({song.rating_count})</small><button onClick={() => onCopy(song.id)}><Copy size={16} /> Copiar a mi biblioteca</button></div>)}</section>
    </div>
  );
}

function ProfileView({ profile, theme, themes, onSave }: { profile: Profile; theme: Theme; themes: Record<Theme, string>; onSave: (payload: ProfilePayload) => void }) {
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [selectedTheme, setSelectedTheme] = useState<Theme>(theme);
  const [socialPlatform, setSocialPlatform] = useState(profile.social_platform ?? "");
  const [socialUrl, setSocialUrl] = useState(profile.social_url ?? "");
  return (
    <div className="page">
      <header className="topbar"><div><h2>Perfil</h2><p>Tema, presentacion publica y red social opcional.</p></div></header>
      <section className="profile-grid">
        <div className="panel profile-preview"><div className="avatar large">{avatarUrl ? <img src={avatarUrl} alt="" /> : profile.initials}</div><h3>{displayName}</h3><p>{bio || "Sin descripcion."}</p>{socialUrl && <a href={socialUrl} target="_blank" rel="noreferrer">{socialPlatform || "Link"}</a>}</div>
        <div className="panel"><div className="form-grid compact"><label>Nombre publico<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label><label>Foto o portada pequena<input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://..." /></label></div><label>Descripcion<textarea className="small-textarea" maxLength={200} value={bio} onChange={(event) => setBio(event.target.value)} /></label><div className="form-grid compact"><label>Red social<select value={socialPlatform} onChange={(event) => setSocialPlatform(event.target.value)}><option value="">Sin red</option><option value="Instagram">Instagram</option><option value="YouTube">YouTube</option><option value="TikTok">TikTok</option><option value="Facebook">Facebook</option><option value="Sitio web">Sitio web</option></select></label><label>Link<input value={socialUrl} onChange={(event) => setSocialUrl(event.target.value)} /></label></div><h3>Tema secundario</h3><div className="theme-grid">{(Object.keys(themes) as Theme[]).map((key) => <button key={key} className={selectedTheme === key ? "theme-option active" : "theme-option"} onClick={() => setSelectedTheme(key)}><span className={`swatch ${key}`} /> {themes[key]}</button>)}</div><button className="primary" onClick={() => onSave({ display_name: displayName, bio, avatar_url: avatarUrl, theme: selectedTheme, social_platform: socialPlatform, social_url: socialUrl })}>Guardar perfil</button></div>
      </section>
    </div>
  );
}
