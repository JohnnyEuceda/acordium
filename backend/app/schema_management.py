from sqlalchemy import text

from app.database import engine


def ensure_schema() -> None:
    statements = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'morado'",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS social_platform TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS social_url TEXT",
        "ALTER TABLE songs ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false",
        "ALTER TABLE songs ADD COLUMN IF NOT EXISTS source_song_id UUID REFERENCES songs(id) ON DELETE SET NULL",
        """
        CREATE TABLE IF NOT EXISTS follows (
          follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (follower_id, following_id),
          CHECK (follower_id <> following_id)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS song_ratings (
          song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (song_id, user_id)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS groups (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          description TEXT,
          code TEXT UNIQUE NOT NULL,
          cover_url TEXT,
          created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS group_members (
          group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
          joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (group_id, user_id)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS group_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          event_date TIMESTAMPTZ NOT NULL,
          notes TEXT,
          status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
          created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS event_songs (
          event_id UUID NOT NULL REFERENCES group_events(id) ON DELETE CASCADE,
          song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
          added_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
          position INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (event_id, song_id)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS event_comments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          event_id UUID NOT NULL REFERENCES group_events(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          body TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_group_events_group_date ON group_events(group_id, event_date)",
        "CREATE INDEX IF NOT EXISTS idx_songs_public ON songs(is_public)",
    ]
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))
