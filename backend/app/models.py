from datetime import datetime
from uuid import uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    songs: Mapped[list["Song"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    playlists: Mapped[list["Playlist"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Artist(Base):
    __tablename__ = "artists"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)


class Album(Base):
    __tablename__ = "albums"
    __table_args__ = (UniqueConstraint("name", "artist_id", name="uq_album_artist"),)

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)
    artist_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("artists.id", ondelete="SET NULL"))


class Song(Base):
    __tablename__ = "songs"
    __table_args__ = (CheckConstraint("instrument IN ('guitar', 'piano')", name="ck_song_instrument"),)

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    artist_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("artists.id", ondelete="SET NULL"))
    album_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("albums.id", ondelete="SET NULL"))
    original_key: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[list[dict]] = mapped_column(JSONB, nullable=False)
    instrument: Mapped[str] = mapped_column(String, nullable=False, default="guitar")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates="songs")
    artist: Mapped[Artist | None] = relationship()
    album: Mapped[Album | None] = relationship()


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)


class SongTag(Base):
    __tablename__ = "song_tags"

    song_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("songs.id", ondelete="CASCADE"), primary_key=True)
    tag_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)


class Playlist(Base):
    __tablename__ = "playlists"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_playlist_user_name"),)

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates="playlists")


class PlaylistSong(Base):
    __tablename__ = "playlist_songs"

    playlist_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("playlists.id", ondelete="CASCADE"), primary_key=True)
    song_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("songs.id", ondelete="CASCADE"), primary_key=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
