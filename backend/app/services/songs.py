from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.domain.transposition import transpose_song_content
from app.models import Song
from app.repositories.songs import ArtistRepository, PlaylistRepository, SongRepository
from app.schemas import ArtistResponse, PlaylistCreate, PlaylistResponse, PlaylistUpdate, SongCreate, SongResponse, SongUpdate


class SongService:
    def __init__(self, db: Session):
        self.songs = SongRepository(db)

    def _to_response(self, song: Song) -> SongResponse:
        return SongResponse(
            id=str(song.id),
            title=song.title,
            artist_name=song.artist.name if song.artist else None,
            album_name=song.album.name if song.album else None,
            original_key=song.original_key,
            content=song.content,
            tags=self.songs.get_tag_names(str(song.id)),
            is_public=bool(song.is_public),
            source_song_id=str(song.source_song_id) if song.source_song_id else None,
            created_at=song.created_at,
        )

    def list_songs(self, user_id: str) -> list[SongResponse]:
        return [self._to_response(song) for song in self.songs.list_for_user(user_id)]

    def get_song(self, song_id: str, user_id: str) -> SongResponse:
        return self._to_response(self._require_song(song_id, user_id))

    def create_song(self, user_id: str, payload: SongCreate) -> SongResponse:
        data = payload.model_dump(mode="json")
        tags = data.pop("tags", [])
        song = self.songs.create(user_id, data, tags)
        return self._to_response(song)

    def update_song(self, song_id: str, user_id: str, payload: SongUpdate) -> SongResponse:
        song = self._require_song(song_id, user_id)
        data = payload.model_dump(mode="json")
        tags = data.pop("tags", [])
        return self._to_response(self.songs.update(song, data, tags))

    def delete_song(self, song_id: str, user_id: str) -> None:
        self.songs.delete(self._require_song(song_id, user_id))

    def transpose(self, song_id: str, user_id: str, semitones: int) -> list[dict]:
        song = self._require_song(song_id, user_id)
        return transpose_song_content(song.content, semitones, song.original_key)

    def _require_song(self, song_id: str, user_id: str) -> Song:
        song = self.songs.get_for_user(song_id, user_id)
        if not song:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Song not found")
        return song


class PlaylistService:
    def __init__(self, db: Session):
        self.playlists = PlaylistRepository(db)

    def _to_response(self, playlist) -> PlaylistResponse:
        song_ids = self.playlists.get_song_ids(str(playlist.id))
        return PlaylistResponse(
            id=str(playlist.id),
            name=playlist.name,
            description=playlist.description,
            song_ids=song_ids,
            song_count=len(song_ids),
            created_at=playlist.created_at,
        )

    def list_playlists(self, user_id: str) -> list[PlaylistResponse]:
        return [self._to_response(playlist) for playlist in self.playlists.list_for_user(user_id)]

    def create_playlist(self, user_id: str, payload: PlaylistCreate) -> PlaylistResponse:
        playlist = self.playlists.create(user_id, payload.name, payload.description, payload.song_ids)
        return self._to_response(playlist)

    def update_playlist(self, playlist_id: str, user_id: str, payload: PlaylistUpdate) -> PlaylistResponse:
        playlist = self._require_playlist(playlist_id, user_id)
        return self._to_response(self.playlists.update(playlist, payload.name, payload.description, payload.song_ids))

    def delete_playlist(self, playlist_id: str, user_id: str) -> None:
        self.playlists.delete(self._require_playlist(playlist_id, user_id))

    def _require_playlist(self, playlist_id: str, user_id: str):
        playlist = self.playlists.get_for_user(playlist_id, user_id)
        if not playlist:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lista no encontrada")
        return playlist


class ArtistService:
    def __init__(self, db: Session):
        self.artists = ArtistRepository(db)

    def list_artists(self, user_id: str) -> list[ArtistResponse]:
        return [
            ArtistResponse(id=str(artist.id), name=artist.name, song_count=song_count)
            for artist, song_count in self.artists.list_for_user(user_id)
        ]
