from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, engine
from app import models
from app.routers import auth, songs
from app.routers import social
from app.schema_management import ensure_schema


settings = get_settings()

Base.metadata.create_all(bind=engine)
ensure_schema()

app = FastAPI(title="Acordium API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(songs.router)
app.include_router(songs.playlists_router)
app.include_router(songs.artists_router)
app.include_router(social.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
