from datetime import datetime
import random
import string

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import bindparam, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.domain.chords import validate_chord
from app.models import User


router = APIRouter(tags=["social"])


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=80)
    bio: str | None = Field(default=None, max_length=200)
    avatar_url: str | None = None
    theme: str = "morado"
    social_platform: str | None = None
    social_url: str | None = None


class GroupCreate(BaseModel):
    name: str = Field(min_length=1)
    description: str | None = None
    cover_url: str | None = None


class GroupUpdate(GroupCreate):
    pass


class JoinGroupRequest(BaseModel):
    code: str


class RoleUpdate(BaseModel):
    role: str


class EventCreate(BaseModel):
    title: str = Field(min_length=1)
    event_date: datetime
    notes: str | None = None


class EventUpdate(EventCreate):
    status: str = "active"


class EventSongAdd(BaseModel):
    song_id: str


class CommentCreate(BaseModel):
    body: str = Field(min_length=1)


class RatingRequest(BaseModel):
    rating: int = Field(ge=1, le=5)


class SongVisibilityRequest(BaseModel):
    is_public: bool


def display_name(user: User) -> str:
    return user.display_name or user.email.split("@")[0]


def initials(name: str) -> str:
    parts = [part for part in name.replace(".", " ").split(" ") if part]
    return "".join(part[0].upper() for part in parts[:2]) or "U"


def code() -> str:
    return "AC-" + "".join(random.choice(string.ascii_uppercase + string.digits) for _ in range(6))


def require_member(db: Session, group_id: str, user_id: str) -> str:
    role = db.scalar(text("SELECT role FROM group_members WHERE group_id = :group_id AND user_id = :user_id"), {"group_id": group_id, "user_id": user_id})
    if not role:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No perteneces a este grupo")
    return role


def require_admin(db: Session, group_id: str, user_id: str) -> None:
    if require_member(db, group_id, user_id) != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo un administrador puede hacer esto")


def group_row(row) -> dict:
    return {
        "id": str(row.id),
        "name": row.name,
        "description": row.description,
        "code": row.code,
        "cover_url": row.cover_url,
        "role": row.role,
        "member_count": row.member_count,
        "created_at": row.created_at,
    }


def event_row(row) -> dict:
    return {
        "id": str(row.id),
        "group_id": str(row.group_id),
        "title": row.title,
        "event_date": row.event_date,
        "notes": row.notes,
        "status": row.status,
        "created_by": str(row.created_by),
        "created_at": row.created_at,
    }


def song_public_row(row) -> dict:
    return {
        "id": str(row.id),
        "title": row.title,
        "artist_name": row.artist_name,
        "owner_name": row.owner_name,
        "owner_initials": initials(row.owner_name),
        "original_key": row.original_key,
        "rating_average": float(row.rating_average or 0),
        "rating_count": int(row.rating_count or 0),
    }


@router.get("/me")
def get_profile(current_user: User = Depends(get_current_user)):
    name = display_name(current_user)
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "display_name": name,
        "bio": current_user.bio,
        "avatar_url": current_user.avatar_url,
        "theme": current_user.theme,
        "social_platform": current_user.social_platform,
        "social_url": current_user.social_url,
        "initials": initials(name),
    }


@router.put("/me")
def update_profile(payload: ProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.execute(
        text(
            """
            UPDATE users
            SET display_name = :display_name, bio = :bio, avatar_url = :avatar_url,
                theme = :theme, social_platform = :social_platform, social_url = :social_url
            WHERE id = :user_id
            """
        ),
        {
            "display_name": payload.display_name,
            "bio": payload.bio,
            "avatar_url": payload.avatar_url,
            "theme": payload.theme,
            "social_platform": payload.social_platform,
            "social_url": payload.social_url,
            "user_id": str(current_user.id),
        },
    )
    db.commit()
    db.refresh(current_user)
    return get_profile(current_user)


@router.put("/songs/{song_id}/visibility")
def set_song_visibility(song_id: str, payload: SongVisibilityRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = db.execute(text("UPDATE songs SET is_public = :public WHERE id = :song_id AND user_id = :user_id"), {"public": payload.is_public, "song_id": song_id, "user_id": str(current_user.id)})
    if result.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cancion no encontrada")
    db.commit()
    return {"ok": True}


@router.get("/public-songs")
def list_public_songs(db: Session = Depends(get_db)):
    rows = db.execute(
        text(
            """
            SELECT s.id, s.title, a.name AS artist_name, COALESCE(u.display_name, split_part(u.email, '@', 1)) AS owner_name,
                   s.original_key, COALESCE(avg(sr.rating), 0) AS rating_average, count(sr.rating) AS rating_count
            FROM songs s
            JOIN users u ON u.id = s.user_id
            LEFT JOIN artists a ON a.id = s.artist_id
            LEFT JOIN song_ratings sr ON sr.song_id = s.id
            WHERE s.is_public = true
            GROUP BY s.id, a.name, u.display_name, u.email
            ORDER BY rating_average DESC, s.created_at DESC
            """
        )
    ).all()
    return [song_public_row(row) for row in rows]


@router.post("/public-songs/{song_id}/rate")
def rate_song(song_id: str, payload: RatingRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    exists = db.scalar(text("SELECT id FROM songs WHERE id = :song_id AND is_public = true"), {"song_id": song_id})
    if not exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cancion publica no encontrada")
    db.execute(
        text(
            """
            INSERT INTO song_ratings (song_id, user_id, rating)
            VALUES (:song_id, :user_id, :rating)
            ON CONFLICT (song_id, user_id) DO UPDATE SET rating = EXCLUDED.rating, created_at = now()
            """
        ),
        {"song_id": song_id, "user_id": str(current_user.id), "rating": payload.rating},
    )
    db.commit()
    return {"ok": True}


@router.post("/songs/{song_id}/copy")
def copy_song(song_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.execute(text("SELECT * FROM songs WHERE id = :song_id AND (is_public = true OR user_id = :user_id)"), {"song_id": song_id, "user_id": str(current_user.id)}).mappings().first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cancion no disponible")
    validate_chord(row["original_key"])
    statement = text(
        """
        INSERT INTO songs (user_id, title, artist_id, album_id, original_key, content, instrument, source_song_id)
        VALUES (:user_id, :title, :artist_id, :album_id, :original_key, :content, 'guitar', :source_song_id)
        RETURNING id
        """
    ).bindparams(bindparam("content", type_=JSONB))
    new_id = db.scalar(
        statement,
        {
            "user_id": str(current_user.id),
            "title": f"{row['title']} (copia)",
            "artist_id": row["artist_id"],
            "album_id": row["album_id"],
            "original_key": row["original_key"],
            "content": row["content"],
            "source_song_id": song_id,
        },
    )
    db.commit()
    return {"id": str(new_id)}


@router.get("/groups")
def list_groups(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.execute(
        text(
            """
            SELECT g.*, gm.role, count(all_members.user_id) AS member_count
            FROM groups g
            JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = :user_id
            LEFT JOIN group_members all_members ON all_members.group_id = g.id
            GROUP BY g.id, gm.role
            ORDER BY g.created_at DESC
            """
        ),
        {"user_id": str(current_user.id)},
    ).all()
    return [group_row(row) for row in rows]


@router.post("/groups", status_code=status.HTTP_201_CREATED)
def create_group(payload: GroupCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    group_code = code()
    group_id = db.scalar(
        text("INSERT INTO groups (name, description, code, cover_url, created_by) VALUES (:name, :description, :code, :cover_url, :user_id) RETURNING id"),
        {"name": payload.name, "description": payload.description, "code": group_code, "cover_url": payload.cover_url, "user_id": str(current_user.id)},
    )
    db.execute(text("INSERT INTO group_members (group_id, user_id, role) VALUES (:group_id, :user_id, 'admin')"), {"group_id": group_id, "user_id": str(current_user.id)})
    db.commit()
    return {"id": str(group_id), "code": group_code}


@router.post("/groups/join")
def join_group(payload: JoinGroupRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    group_id = db.scalar(text("SELECT id FROM groups WHERE upper(code) = upper(:code)"), {"code": payload.code.strip()})
    if not group_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grupo no encontrado")
    db.execute(
        text("INSERT INTO group_members (group_id, user_id, role) VALUES (:group_id, :user_id, 'member') ON CONFLICT DO NOTHING"),
        {"group_id": group_id, "user_id": str(current_user.id)},
    )
    db.commit()
    return {"id": str(group_id)}


@router.delete("/groups/{group_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
def leave_group(group_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.execute(text("DELETE FROM group_members WHERE group_id = :group_id AND user_id = :user_id"), {"group_id": group_id, "user_id": str(current_user.id)})
    db.commit()
    return None


@router.get("/groups/{group_id}/members")
def list_members(group_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_member(db, group_id, str(current_user.id))
    rows = db.execute(
        text(
            """
            SELECT u.id, u.email, COALESCE(u.display_name, split_part(u.email, '@', 1)) AS display_name,
                   u.avatar_url, gm.role
            FROM group_members gm
            JOIN users u ON u.id = gm.user_id
            WHERE gm.group_id = :group_id
            ORDER BY gm.role, display_name
            """
        ),
        {"group_id": group_id},
    ).all()
    return [
        {"id": str(row.id), "email": row.email, "display_name": row.display_name, "avatar_url": row.avatar_url, "initials": initials(row.display_name), "role": row.role}
        for row in rows
    ]


@router.put("/groups/{group_id}/members/{user_id}/role")
def update_member_role(group_id: str, user_id: str, payload: RoleUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_admin(db, group_id, str(current_user.id))
    if payload.role not in {"admin", "member"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rol invalido")
    db.execute(text("UPDATE group_members SET role = :role WHERE group_id = :group_id AND user_id = :user_id"), {"role": payload.role, "group_id": group_id, "user_id": user_id})
    db.commit()
    return {"ok": True}


@router.get("/groups/{group_id}/events")
def list_events(group_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_member(db, group_id, str(current_user.id))
    rows = db.execute(text("SELECT * FROM group_events WHERE group_id = :group_id ORDER BY event_date ASC"), {"group_id": group_id}).all()
    return [event_row(row) for row in rows]


@router.post("/groups/{group_id}/events", status_code=status.HTTP_201_CREATED)
def create_event(group_id: str, payload: EventCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_member(db, group_id, str(current_user.id))
    event_id = db.scalar(
        text("INSERT INTO group_events (group_id, title, event_date, notes, created_by) VALUES (:group_id, :title, :event_date, :notes, :user_id) RETURNING id"),
        {"group_id": group_id, "title": payload.title, "event_date": payload.event_date, "notes": payload.notes, "user_id": str(current_user.id)},
    )
    db.commit()
    return {"id": str(event_id)}


@router.put("/groups/{group_id}/events/{event_id}")
def update_event(group_id: str, event_id: str, payload: EventUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_member(db, group_id, str(current_user.id))
    db.execute(
        text("UPDATE group_events SET title = :title, event_date = :event_date, notes = :notes, status = :status WHERE id = :event_id AND group_id = :group_id"),
        {"title": payload.title, "event_date": payload.event_date, "notes": payload.notes, "status": payload.status, "event_id": event_id, "group_id": group_id},
    )
    db.commit()
    return {"ok": True}


@router.delete("/groups/{group_id}/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(group_id: str, event_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_admin(db, group_id, str(current_user.id))
    db.execute(text("DELETE FROM group_events WHERE id = :event_id AND group_id = :group_id"), {"event_id": event_id, "group_id": group_id})
    db.commit()
    return None


@router.get("/events/{event_id}/songs")
def list_event_songs(event_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    group_id = db.scalar(text("SELECT group_id FROM group_events WHERE id = :event_id"), {"event_id": event_id})
    require_member(db, str(group_id), str(current_user.id))
    rows = db.execute(
        text(
            """
            SELECT s.id, s.title, s.original_key, s.content, a.name AS artist_name,
                   COALESCE(u.display_name, split_part(u.email, '@', 1)) AS owner_name,
                   COALESCE(adder.display_name, split_part(adder.email, '@', 1)) AS added_by_name
            FROM event_songs es
            JOIN songs s ON s.id = es.song_id
            JOIN users adder ON adder.id = es.added_by
            JOIN users u ON u.id = s.user_id
            LEFT JOIN artists a ON a.id = s.artist_id
            WHERE es.event_id = :event_id
            ORDER BY es.position, es.created_at
            """
        ),
        {"event_id": event_id},
    ).all()
    return [
        {
            "id": str(row.id),
            "title": row.title,
            "artist_name": row.artist_name,
            "original_key": row.original_key,
            "content": row.content,
            "owner_name": row.owner_name,
            "owner_initials": initials(row.owner_name),
            "added_by_name": row.added_by_name,
        }
        for row in rows
    ]


@router.post("/events/{event_id}/songs")
def add_event_song(event_id: str, payload: EventSongAdd, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    group_id = db.scalar(text("SELECT group_id FROM group_events WHERE id = :event_id"), {"event_id": event_id})
    require_member(db, str(group_id), str(current_user.id))
    db.execute(
        text("INSERT INTO event_songs (event_id, song_id, added_by, position) VALUES (:event_id, :song_id, :user_id, 0) ON CONFLICT DO NOTHING"),
        {"event_id": event_id, "song_id": payload.song_id, "user_id": str(current_user.id)},
    )
    db.commit()
    return {"ok": True}


@router.get("/events/{event_id}/comments")
def list_comments(event_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    group_id = db.scalar(text("SELECT group_id FROM group_events WHERE id = :event_id"), {"event_id": event_id})
    require_member(db, str(group_id), str(current_user.id))
    rows = db.execute(
        text(
            """
            SELECT c.id, c.body, c.created_at, COALESCE(u.display_name, split_part(u.email, '@', 1)) AS author_name
            FROM event_comments c
            JOIN users u ON u.id = c.user_id
            WHERE c.event_id = :event_id
            ORDER BY c.created_at ASC
            """
        ),
        {"event_id": event_id},
    ).all()
    return [{"id": str(row.id), "body": row.body, "created_at": row.created_at, "author_name": row.author_name, "author_initials": initials(row.author_name)} for row in rows]


@router.post("/events/{event_id}/comments", status_code=status.HTTP_201_CREATED)
def create_comment(event_id: str, payload: CommentCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    group_id = db.scalar(text("SELECT group_id FROM group_events WHERE id = :event_id"), {"event_id": event_id})
    require_member(db, str(group_id), str(current_user.id))
    db.execute(text("INSERT INTO event_comments (event_id, user_id, body) VALUES (:event_id, :user_id, :body)"), {"event_id": event_id, "user_id": str(current_user.id), "body": payload.body})
    db.commit()
    return {"ok": True}
