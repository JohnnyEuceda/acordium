from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.domain.chords import ChordValidationError, validate_chord


class AuthRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class AuthLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    created_at: datetime


class TextToken(BaseModel):
    text: str


class ChordToken(BaseModel):
    chord: str

    @field_validator("chord")
    @classmethod
    def validate_known_chord(cls, value: str) -> str:
        try:
            validate_chord(value)
        except ChordValidationError as exc:
            raise ValueError(str(exc)) from exc
        return value


class SongLine(BaseModel):
    type: Literal["line"]
    content: list[TextToken | ChordToken]


SongContent = list[SongLine]


class SongBase(BaseModel):
    title: str = Field(min_length=1)
    artist_name: str | None = None
    album_name: str | None = None
    original_key: str
    content: SongContent
    tags: list[str] = []

    @field_validator("original_key")
    @classmethod
    def validate_key(cls, value: str) -> str:
        validate_chord(value)
        return value


class SongCreate(SongBase):
    pass


class SongUpdate(SongBase):
    pass


class SongResponse(BaseModel):
    id: str
    title: str
    artist_name: str | None = None
    album_name: str | None = None
    original_key: str
    content: list[dict]
    tags: list[str] = []
    is_public: bool = False
    source_song_id: str | None = None
    created_at: datetime


class TransposeRequest(BaseModel):
    semitones: int = Field(ge=-24, le=24)


class TransposeResponse(BaseModel):
    semitones: int
    content: list[dict]


class ArtistResponse(BaseModel):
    id: str
    name: str
    song_count: int


class PlaylistCreate(BaseModel):
    name: str = Field(min_length=1)
    description: str | None = None
    song_ids: list[str] = []


class PlaylistUpdate(PlaylistCreate):
    pass


class PlaylistResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    song_ids: list[str] = []
    song_count: int
    created_at: datetime
