from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Album, Artist, Playlist, PlaylistSong, Song, SongTag, Tag


class SongRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_for_user(self, user_id: str) -> list[Song]:
        stmt = (
            select(Song)
            .where(Song.user_id == user_id)
            .options(selectinload(Song.artist), selectinload(Song.album))
            .order_by(Song.created_at.desc())
        )
        return list(self.db.scalars(stmt))

    def get_for_user(self, song_id: str, user_id: str) -> Song | None:
        stmt = (
            select(Song)
            .where(Song.id == song_id, Song.user_id == user_id)
            .options(selectinload(Song.artist), selectinload(Song.album))
        )
        return self.db.scalar(stmt)

    def upsert_artist(self, name: str | None) -> Artist | None:
        if not name:
            return None
        artist = self.db.scalar(select(Artist).where(Artist.name == name.strip()))
        if artist:
            return artist
        artist = Artist(name=name.strip())
        self.db.add(artist)
        self.db.flush()
        return artist

    def upsert_album(self, name: str | None, artist: Artist | None) -> Album | None:
        if not name:
            return None
        stmt = select(Album).where(Album.name == name.strip(), Album.artist_id == (artist.id if artist else None))
        album = self.db.scalar(stmt)
        if album:
            return album
        album = Album(name=name.strip(), artist_id=artist.id if artist else None)
        self.db.add(album)
        self.db.flush()
        return album

    def replace_tags(self, song: Song, names: list[str]) -> None:
        self.db.execute(delete(SongTag).where(SongTag.song_id == song.id))
        for raw_name in names:
            name = raw_name.strip().lower()
            if not name:
                continue
            tag = self.db.scalar(select(Tag).where(Tag.name == name))
            if not tag:
                tag = Tag(name=name)
                self.db.add(tag)
                self.db.flush()
            self.db.add(SongTag(song_id=song.id, tag_id=tag.id))

    def get_tag_names(self, song_id: str) -> list[str]:
        stmt = select(Tag.name).join(SongTag, SongTag.tag_id == Tag.id).where(SongTag.song_id == song_id).order_by(Tag.name)
        return list(self.db.scalars(stmt))

    def create(self, user_id: str, data: dict, tags: list[str]) -> Song:
        artist = self.upsert_artist(data.pop("artist_name", None))
        album = self.upsert_album(data.pop("album_name", None), artist)
        data.setdefault("instrument", "guitar")
        song = Song(user_id=user_id, artist_id=artist.id if artist else None, album_id=album.id if album else None, **data)
        self.db.add(song)
        self.db.flush()
        self.replace_tags(song, tags)
        self.db.commit()
        self.db.refresh(song)
        return song

    def update(self, song: Song, data: dict, tags: list[str]) -> Song:
        artist = self.upsert_artist(data.pop("artist_name", None))
        album = self.upsert_album(data.pop("album_name", None), artist)
        song.artist_id = artist.id if artist else None
        song.album_id = album.id if album else None
        for key, value in data.items():
            setattr(song, key, value)
        self.replace_tags(song, tags)
        self.db.commit()
        self.db.refresh(song)
        return song

    def delete(self, song: Song) -> None:
        self.db.delete(song)
        self.db.commit()


class PlaylistRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_for_user(self, user_id: str) -> list[Playlist]:
        stmt = select(Playlist).where(Playlist.user_id == user_id).order_by(Playlist.created_at.desc())
        return list(self.db.scalars(stmt))

    def get_for_user(self, playlist_id: str, user_id: str) -> Playlist | None:
        stmt = select(Playlist).where(Playlist.id == playlist_id, Playlist.user_id == user_id)
        return self.db.scalar(stmt)

    def create(self, user_id: str, name: str, description: str | None, song_ids: list[str]) -> Playlist:
        playlist = Playlist(user_id=user_id, name=name.strip(), description=description)
        self.db.add(playlist)
        self.db.flush()
        self.replace_songs(playlist, song_ids)
        self.db.commit()
        self.db.refresh(playlist)
        return playlist

    def update(self, playlist: Playlist, name: str, description: str | None, song_ids: list[str]) -> Playlist:
        playlist.name = name.strip()
        playlist.description = description
        self.replace_songs(playlist, song_ids)
        self.db.commit()
        self.db.refresh(playlist)
        return playlist

    def delete(self, playlist: Playlist) -> None:
        self.db.delete(playlist)
        self.db.commit()

    def replace_songs(self, playlist: Playlist, song_ids: list[str]) -> None:
        self.db.execute(delete(PlaylistSong).where(PlaylistSong.playlist_id == playlist.id))
        for index, song_id in enumerate(song_ids):
            self.db.add(PlaylistSong(playlist_id=playlist.id, song_id=song_id, position=index))

    def get_song_ids(self, playlist_id: str) -> list[str]:
        stmt = (
            select(PlaylistSong.song_id)
            .where(PlaylistSong.playlist_id == playlist_id)
            .order_by(PlaylistSong.position)
        )
        return [str(song_id) for song_id in self.db.scalars(stmt)]


class ArtistRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_for_user(self, user_id: str) -> list[tuple[Artist, int]]:
        stmt = (
            select(Artist, func.count(Song.id).label("song_count"))
            .join(Song, Song.artist_id == Artist.id)
            .where(Song.user_id == user_id)
            .group_by(Artist.id)
            .order_by(Artist.name)
        )
        return [(artist, int(song_count)) for artist, song_count in self.db.execute(stmt).all()]
