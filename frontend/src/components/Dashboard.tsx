import { Music, Plus, Trash2 } from "lucide-react";

import type { Song } from "../types";

type Props = {
  songs: Song[];
  selectedId?: string;
  onSelect: (song: Song) => void;
  onCreate: () => void;
  onDelete: (song: Song) => void;
};

export function Dashboard({ songs, selectedId, onSelect, onCreate, onDelete }: Props) {
  return (
    <aside className="library">
      <div className="library-header">
        <h1>Acordium</h1>
        <button className="icon-button" onClick={onCreate} title="New song">
          <Plus size={20} />
        </button>
      </div>
      <div className="song-list">
        {songs.map((song) => (
          <button
            key={song.id}
            className={selectedId === song.id ? "song-row selected" : "song-row"}
            onClick={() => onSelect(song)}
          >
            <Music size={18} />
            <span>
              <strong>{song.title}</strong>
              <small>{song.artist_name || "Untitled artist"}</small>
            </span>
            <Trash2
              size={17}
              onClick={(event) => {
                event.stopPropagation();
                onDelete(song);
              }}
            />
          </button>
        ))}
      </div>
    </aside>
  );
}
