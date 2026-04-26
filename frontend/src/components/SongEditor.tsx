import { Save } from "lucide-react";
import { useMemo, useState } from "react";

import type { Artist, Song } from "../types";
import { parseNaturalSong, stringifySong } from "../utils";
import type { SongPayload } from "../api/client";

type Props = {
  song?: Song | null;
  artists?: Artist[];
  onSave: (payload: SongPayload) => Promise<void>;
};

export function SongEditor({ song, artists = [], onSave }: Props) {
  const [title, setTitle] = useState(song?.title ?? "");
  const [artist, setArtist] = useState(song?.artist_name ?? "");
  const [album, setAlbum] = useState(song?.album_name ?? "");
  const [originalKey, setOriginalKey] = useState(song?.original_key ?? "C");
  const [tags, setTags] = useState(song?.tags.join(", ") ?? "");
  const [body, setBody] = useState(song ? stringifySong(song.content) : "Amazing [G] grace\nHow [C] sweet the [G] sound");
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => parseNaturalSong(body), [body]);

  async function submit() {
    setSaving(true);
    try {
      await onSave({
        title,
        artist_name: artist || undefined,
        album_name: album || undefined,
        original_key: originalKey,
        content: preview,
        tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean)
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="editor">
      <div className="form-grid">
        <label>
          Titulo
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          Artista
          <input list="artist-options" value={artist} onChange={(event) => setArtist(event.target.value)} />
          <datalist id="artist-options">
            {artists.map((item) => <option key={item.id} value={item.name} />)}
          </datalist>
          <small>Elige uno existente o escribe uno nuevo.</small>
        </label>
        <label>
          Album
          <input value={album} onChange={(event) => setAlbum(event.target.value)} />
        </label>
        <label>
          Tonalidad
          <input value={originalKey} onChange={(event) => setOriginalKey(event.target.value)} />
          <small>Usa una tonalidad como C, G, F#, Bb o Cm. Sirve como referencia para transponer.</small>
        </label>
        <label>
          Etiquetas
          <input value={tags} onChange={(event) => setTags(event.target.value)} />
          <small>Sepáralas con coma, por ejemplo: adoración, ensayo, rápida.</small>
        </label>
      </div>
      <textarea value={body} onChange={(event) => setBody(event.target.value)} spellCheck="false" />
      <p className="field-help">Escribe normal y pon los acordes entre corchetes: <strong>Grande [G] es tu amor [C]</strong>.</p>
      <button className="primary" onClick={submit} disabled={saving || !title.trim()}>
        <Save size={18} />
        {saving ? "Guardando" : "Guardar"}
      </button>
    </section>
  );
}
