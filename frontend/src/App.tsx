import { BookOpen, Expand, Home, ListMusic, LogOut, Menu, Minus, Music, Palette, Plus, Search, Trash2, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { api, type PlaylistPayload, type SongPayload } from "./api/client";
import { AuthPanel } from "./components/AuthPanel";
import { SongEditor } from "./components/SongEditor";
import { SongViewer } from "./components/SongViewer";
import type { Artist, Playlist, Song, SongLine } from "./types";

const TOKEN_KEY = "acordium_token";
const THEME_KEY = "acordium_theme";
type View = "inicio" | "canciones" | "canciones-performance" | "artistas" | "listas" | "configuracion";
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
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(THEME_KEY) as Theme) ?? "morado");
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [view, setView] = useState<View>("inicio");
  const [editingSong, setEditingSong] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [playlistDescription, setPlaylistDescription] = useState("");
  const [playlistSongIds, setPlaylistSongIds] = useState<string[]>([]);
  const [transposeBy, setTransposeBy] = useState(0);
  const [transposedContent, setTransposedContent] = useState<SongLine[] | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState("");

  const selectedPlaylist = playlists.find((playlist) => playlist.id === selectedPlaylistId) ?? null;
  const visibleContent = useMemo(() => transposedContent ?? selectedSong?.content ?? [], [selectedSong, transposedContent]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!token) return;
    loadAll();
  }, [token]);

  useEffect(() => {
    setTransposeBy(0);
    setTransposedContent(null);
  }, [selectedSong?.id]);

  async function loadAll() {
    try {
      const [songList, playlistList, artistList] = await Promise.all([api.listSongs(token), api.listPlaylists(token), api.listArtists(token)]);
      setSongs(songList);
      setPlaylists(playlistList);
      setArtists(artistList);
      setSelectedSong((current) => current ?? songList[0] ?? null);
      setSelectedPlaylistId((current) => current ?? playlistList[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la biblioteca");
    }
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
    const [songList, playlistList, artistList] = await Promise.all([api.listSongs(token), api.listPlaylists(token), api.listArtists(token)]);
    setSongs(songList);
    setPlaylists(playlistList);
    setArtists(artistList);
    setSelectedSong((current) => (current?.id === song.id ? songList[0] ?? null : current));
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
    const payload: PlaylistPayload = {
      name: playlistName,
      description: playlistDescription || undefined,
      song_ids: playlistSongIds
    };
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

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setSongs([]);
    setPlaylists([]);
    setArtists([]);
    setSelectedSong(null);
  }

  function go(next: View) {
    setView(next);
    setEditingSong(false);
    setEditingPlaylist(false);
    setMenuOpen(false);
  }

  if (!token) {
    return <AuthPanel onLogin={handleLogin} />;
  }

  if (view === "canciones-performance" && selectedSong) {
    return <PerformanceView song={selectedSong} content={visibleContent} transposeBy={transposeBy} onTranspose={transpose} onExit={() => setView("canciones")} />;
  }

  return (
    <main className="app-shell">
      <button className="hamburger" onClick={() => setMenuOpen(true)} title="Abrir menu">
        <Menu size={22} />
      </button>
      <aside className={menuOpen ? "library open" : "library"}>
        <div className="library-header">
          <h1>Acordium</h1>
          <button className="icon-button mobile-close" onClick={() => setMenuOpen(false)} title="Cerrar menu">
            <X size={20} />
          </button>
        </div>
        <nav className="main-nav">
          <button className={view === "inicio" ? "nav-item active" : "nav-item"} onClick={() => go("inicio")}>
            <Home size={18} /> Inicio
          </button>
          <button className={view === "canciones" ? "nav-item active" : "nav-item"} onClick={() => go("canciones")}>
            <Music size={18} /> Canciones
          </button>
          <button className={view === "artistas" ? "nav-item active" : "nav-item"} onClick={() => go("artistas")}>
            <Search size={18} /> Artistas
          </button>
          <button className={view === "listas" ? "nav-item active" : "nav-item"} onClick={() => go("listas")}>
            <ListMusic size={18} /> Listas
          </button>
          <button className={view === "configuracion" ? "nav-item active" : "nav-item"} onClick={() => go("configuracion")}>
            <Palette size={18} /> Configuracion
          </button>
        </nav>
        <div className="side-section">
          <div className="side-title">
            <span>Canciones</span>
            <button className="icon-button" onClick={() => { setSelectedSong(null); setEditingSong(true); setView("canciones"); }} title="Nueva cancion">
              <Plus size={18} />
            </button>
          </div>
          <div className="song-list">
            {songs.slice(0, 8).map((song) => (
              <button key={song.id} className={selectedSong?.id === song.id ? "song-row selected" : "song-row"} onClick={() => { setSelectedSong(song); go("canciones"); }}>
                <Music size={17} />
                <span>
                  <strong>{song.title}</strong>
                  <small>{song.artist_name || "Sin artista"}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
        <button className="logout-button" onClick={logout}>
          <LogOut size={18} /> Salir
        </button>
      </aside>
      <section className="workspace">
        {view === "inicio" && (
          <HomeView songs={songs} playlists={playlists} artists={artists} onNavigate={go} onNewSong={() => { setSelectedSong(null); setEditingSong(true); setView("canciones"); }} onNewPlaylist={startPlaylistCreate} />
        )}
        {view === "canciones" && (
          <SongsView
            songs={songs}
            selectedSong={selectedSong}
            editing={editingSong}
            transposeBy={transposeBy}
            visibleContent={visibleContent}
            artists={artists}
            onSelect={(song) => { setSelectedSong(song); setEditingSong(false); }}
            onNew={() => { setSelectedSong(null); setEditingSong(true); }}
            onEdit={() => setEditingSong(true)}
            onDelete={deleteSong}
            onSave={saveSong}
            onTranspose={transpose}
            onPerformance={() => setView("canciones-performance")}
            error={error}
          />
        )}
        {view === "artistas" && <ArtistsView artists={artists} songs={songs} />}
        {view === "listas" && (
          <PlaylistsView
            songs={songs}
            playlists={playlists}
            selectedPlaylist={selectedPlaylist}
            editing={editingPlaylist}
            name={playlistName}
            description={playlistDescription}
            songIds={playlistSongIds}
            onSelect={(playlist) => { setSelectedPlaylistId(playlist.id); setEditingPlaylist(false); }}
            onNew={startPlaylistCreate}
            onEdit={startPlaylistEdit}
            onDelete={deletePlaylist}
            onName={setPlaylistName}
            onDescription={setPlaylistDescription}
            onSongIds={setPlaylistSongIds}
            onSave={savePlaylist}
          />
        )}
        {view === "configuracion" && <SettingsView theme={theme} onTheme={setTheme} />}
      </section>
    </main>
  );
}

function HomeView({ songs, playlists, artists, onNavigate, onNewSong, onNewPlaylist }: { songs: Song[]; playlists: Playlist[]; artists: Artist[]; onNavigate: (view: View) => void; onNewSong: () => void; onNewPlaylist: () => void }) {
  return (
    <div className="page">
      <header className="topbar">
        <div>
          <h2>Inicio</h2>
          <p>Resumen de tu biblioteca personal.</p>
        </div>
        <div className="toolbar">
          <button className="primary" onClick={onNewSong}><Plus size={18} /> Nueva cancion</button>
          <button onClick={onNewPlaylist}><ListMusic size={18} /> Nueva lista</button>
        </div>
      </header>
      <section className="summary-grid">
        <SummaryCard icon={<Music size={22} />} label="Canciones" value={songs.length} onClick={() => onNavigate("canciones")} />
        <SummaryCard icon={<Search size={22} />} label="Artistas" value={artists.length} onClick={() => onNavigate("artistas")} />
        <SummaryCard icon={<ListMusic size={22} />} label="Listas" value={playlists.length} onClick={() => onNavigate("listas")} />
      </section>
      <section className="content-grid">
        <div className="panel">
          <h3>Canciones recientes</h3>
          {songs.slice(0, 6).map((song) => <p key={song.id}><strong>{song.title}</strong> <span>{song.artist_name || "Sin artista"}</span></p>)}
        </div>
        <div className="panel">
          <h3>Listas</h3>
          {playlists.slice(0, 6).map((playlist) => <p key={playlist.id}><strong>{playlist.name}</strong> <span>{playlist.song_count} canciones</span></p>)}
        </div>
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
  error: string;
}) {
  return (
    <div className="page two-column">
      <aside className="panel list-panel">
        <div className="panel-header">
          <h3>Canciones</h3>
          <button className="icon-button" onClick={props.onNew} title="Nueva cancion"><Plus size={18} /></button>
        </div>
        {props.songs.map((song) => (
          <button key={song.id} className={props.selectedSong?.id === song.id ? "item-row active" : "item-row"} onClick={() => props.onSelect(song)}>
            <span><strong>{song.title}</strong><small>{song.artist_name || "Sin artista"}</small></span>
            <Trash2 size={16} onClick={(event) => { event.stopPropagation(); props.onDelete(song); }} />
          </button>
        ))}
      </aside>
      <section>
        <header className="topbar">
          <div>
            <h2>{props.selectedSong?.title ?? "Nueva cancion"}</h2>
            <p>{props.selectedSong?.artist_name ?? "Editor de letras con acordes estructurados."}</p>
          </div>
          <div className="toolbar">
            <button className="icon-button" onClick={() => props.onTranspose(-1)} disabled={!props.selectedSong || props.editing} title="Bajar tonalidad"><Minus size={18} /></button>
            <span className="transpose-count">{props.transposeBy > 0 ? `+${props.transposeBy}` : props.transposeBy}</span>
            <button className="icon-button" onClick={() => props.onTranspose(1)} disabled={!props.selectedSong || props.editing} title="Subir tonalidad"><Plus size={18} /></button>
            <button onClick={props.onEdit} disabled={!props.selectedSong}>Editar</button>
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
      <header>
        <div><h1>{song.title}</h1><p>{song.artist_name}</p></div>
        <div className="toolbar">
          <button className="icon-button" onClick={() => onTranspose(-1)} title="Bajar tonalidad"><Minus size={22} /></button>
          <strong>{transposeBy > 0 ? `+${transposeBy}` : transposeBy}</strong>
          <button className="icon-button" onClick={() => onTranspose(1)} title="Subir tonalidad"><Plus size={22} /></button>
          <button onClick={onExit}>Salir</button>
        </div>
      </header>
      <SongViewer content={content} performance />
    </main>
  );
}

function ArtistsView({ artists, songs }: { artists: Artist[]; songs: Song[] }) {
  return (
    <div className="page">
      <header className="topbar">
        <div>
          <h2>Artistas</h2>
          <p>Se crean automaticamente cuando guardas una cancion con un artista nuevo.</p>
        </div>
      </header>
      <section className="content-grid">
        <div className="panel">
          <h3>Todos los artistas</h3>
          {artists.length === 0 && <p>Aun no tienes artistas registrados.</p>}
          {artists.map((artist) => (
            <p key={artist.id}>
              <strong>{artist.name}</strong>
              <span>{artist.song_count} canciones</span>
            </p>
          ))}
        </div>
        <div className="panel">
          <h3>Canciones por artista</h3>
          {artists.length === 0 && <p>Cuando agregues canciones, apareceran agrupadas aqui.</p>}
          {artists.map((artist) => (
            <div className="artist-group" key={artist.id}>
              <strong>{artist.name}</strong>
              {songs.filter((song) => song.artist_name === artist.name).map((song) => (
                <span key={song.id}>{song.title}</span>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PlaylistsView(props: {
  songs: Song[];
  playlists: Playlist[];
  selectedPlaylist: Playlist | null;
  editing: boolean;
  name: string;
  description: string;
  songIds: string[];
  onSelect: (playlist: Playlist) => void;
  onNew: () => void;
  onEdit: (playlist: Playlist) => void;
  onDelete: (playlist: Playlist) => void;
  onName: (value: string) => void;
  onDescription: (value: string) => void;
  onSongIds: (value: string[]) => void;
  onSave: () => void;
}) {
  const songsInList = props.songs.filter((song) => props.selectedPlaylist?.song_ids.includes(song.id));
  return (
    <div className="page two-column">
      <aside className="panel list-panel">
        <div className="panel-header"><h3>Listas</h3><button className="icon-button" onClick={props.onNew} title="Nueva lista"><Plus size={18} /></button></div>
        {props.playlists.map((playlist) => (
          <button key={playlist.id} className={props.selectedPlaylist?.id === playlist.id ? "item-row active" : "item-row"} onClick={() => props.onSelect(playlist)}>
            <span><strong>{playlist.name}</strong><small>{playlist.song_count} canciones</small></span>
            <Trash2 size={16} onClick={(event) => { event.stopPropagation(); props.onDelete(playlist); }} />
          </button>
        ))}
      </aside>
      <section>
        <header className="topbar">
          <div><h2>{props.editing ? "Editar lista" : props.selectedPlaylist?.name ?? "Listas"}</h2><p>Organiza canciones para domingos, miercoles, ensayos o eventos.</p></div>
          <div className="toolbar"><button className="primary" onClick={props.onNew}><Plus size={18} /> Nueva lista</button>{props.selectedPlaylist && <button onClick={() => props.onEdit(props.selectedPlaylist!)}>Editar</button>}</div>
        </header>
        {props.editing ? (
          <section className="editor">
            <div className="form-grid compact">
              <label>Nombre<input value={props.name} onChange={(event) => props.onName(event.target.value)} /></label>
              <label>Descripcion<input value={props.description} onChange={(event) => props.onDescription(event.target.value)} /><small>Opcional. Ejemplo: repertorio para este domingo.</small></label>
            </div>
            <div className="check-list">
              {props.songs.map((song) => (
                <label key={song.id} className="check-row">
                  <input type="checkbox" checked={props.songIds.includes(song.id)} onChange={(event) => props.onSongIds(event.target.checked ? [...props.songIds, song.id] : props.songIds.filter((id) => id !== song.id))} />
                  <span><strong>{song.title}</strong><small>{song.artist_name || "Sin artista"}</small></span>
                </label>
              ))}
            </div>
            <button className="primary" onClick={props.onSave} disabled={!props.name.trim()}>Guardar lista</button>
          </section>
        ) : (
          <div className="panel detail-panel">
            {props.selectedPlaylist ? songsInList.map((song) => <p key={song.id}><strong>{song.title}</strong><span>{song.artist_name || "Sin artista"}</span></p>) : <p>Aun no tienes listas creadas.</p>}
          </div>
        )}
      </section>
    </div>
  );
}

function SettingsView({ theme, onTheme }: { theme: Theme; onTheme: (theme: Theme) => void }) {
  return (
    <div className="page">
      <header className="topbar"><div><h2>Configuracion</h2><p>Ajustes visuales de tu espacio de trabajo.</p></div></header>
      <section className="panel settings-panel">
        <h3>Tema secundario</h3>
        <p>El fondo oscuro principal se conserva. Este color cambia acentos, botones y detalles suaves.</p>
        <div className="theme-grid">
          {(Object.keys(themes) as Theme[]).map((key) => (
            <button key={key} className={theme === key ? "theme-option active" : "theme-option"} onClick={() => onTheme(key)}>
              <span className={`swatch ${key}`} /> {themes[key]}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
