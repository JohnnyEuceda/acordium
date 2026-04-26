from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas import ArtistResponse, PlaylistCreate, PlaylistResponse, PlaylistUpdate, SongCreate, SongResponse, SongUpdate, TransposeRequest, TransposeResponse
from app.services.songs import ArtistService, PlaylistService, SongService


router = APIRouter(prefix="/songs", tags=["songs"])


@router.get("", response_model=list[SongResponse])
def list_songs(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return SongService(db).list_songs(str(current_user.id))


@router.post("", response_model=SongResponse, status_code=status.HTTP_201_CREATED)
def create_song(payload: SongCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return SongService(db).create_song(str(current_user.id), payload)


@router.get("/{song_id}", response_model=SongResponse)
def get_song(song_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return SongService(db).get_song(song_id, str(current_user.id))


@router.put("/{song_id}", response_model=SongResponse)
def update_song(song_id: str, payload: SongUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return SongService(db).update_song(song_id, str(current_user.id), payload)


@router.delete("/{song_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_song(song_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    SongService(db).delete_song(song_id, str(current_user.id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{song_id}/transpose", response_model=TransposeResponse)
def transpose_song(song_id: str, payload: TransposeRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    content = SongService(db).transpose(song_id, str(current_user.id), payload.semitones)
    return TransposeResponse(semitones=payload.semitones, content=content)


playlists_router = APIRouter(prefix="/playlists", tags=["playlists"])
artists_router = APIRouter(prefix="/artists", tags=["artists"])


@artists_router.get("", response_model=list[ArtistResponse])
def list_artists(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return ArtistService(db).list_artists(str(current_user.id))


@playlists_router.get("", response_model=list[PlaylistResponse])
def list_playlists(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return PlaylistService(db).list_playlists(str(current_user.id))


@playlists_router.post("", response_model=PlaylistResponse, status_code=status.HTTP_201_CREATED)
def create_playlist(payload: PlaylistCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return PlaylistService(db).create_playlist(str(current_user.id), payload)


@playlists_router.put("/{playlist_id}", response_model=PlaylistResponse)
def update_playlist(
    playlist_id: str,
    payload: PlaylistUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PlaylistService(db).update_playlist(playlist_id, str(current_user.id), payload)


@playlists_router.delete("/{playlist_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_playlist(playlist_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    PlaylistService(db).delete_playlist(playlist_id, str(current_user.id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
