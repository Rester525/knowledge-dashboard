"""
Personal Knowledge Dashboard — FastAPI Backend.
Aggregates Notes, To-Dos, and Bookmarks with local semantic search.
"""

import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from search_engine import SearchEngine

# ── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("dashboard")

# ── Paths ────────────────────────────────────────────────────────────────────

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "app.db")

os.makedirs(DATA_DIR, exist_ok=True)

# ── SQLAlchemy Setup ─────────────────────────────────────────────────────────

engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


# ── Models ───────────────────────────────────────────────────────────────────

class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    chroma_id = Column(String(32), nullable=True)


class Todo(Base):
    __tablename__ = "todos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    text = Column(String(500), nullable=False)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Bookmark(Base):
    __tablename__ = "bookmarks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    url = Column(String(2048), nullable=False)
    title = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ── Pydantic Schemas ─────────────────────────────────────────────────────────

class NoteCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)


class NoteResponse(BaseModel):
    id: int
    content: str
    created_at: str

    model_config = ConfigDict(from_attributes=True)


class TodoCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)


class TodoResponse(BaseModel):
    id: int
    text: str
    completed: bool
    created_at: str

    model_config = ConfigDict(from_attributes=True)


class BookmarkCreate(BaseModel):
    url: str = Field(..., min_length=1, max_length=2048)
    title: str = Field(..., min_length=1, max_length=500)


class BookmarkResponse(BaseModel):
    id: int
    url: str
    title: str
    created_at: str

    model_config = ConfigDict(from_attributes=True)


class SearchResult(BaseModel):
    id: int
    content: str
    score: float


# ── App Lifecycle ────────────────────────────────────────────────────────────

search_engine: SearchEngine | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global search_engine
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database ready at %s", DB_PATH)

    logger.info("Initializing search engine...")
    search_engine = SearchEngine()
    logger.info("Search engine ready.")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="Knowledge Dashboard",
    description="Local, privacy-first personal knowledge manager.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")


# ── Helpers ──────────────────────────────────────────────────────────────────

def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Frontend ─────────────────────────────────────────────────────────────────

@app.get("/")
def serve_frontend():
    return FileResponse(os.path.join(TEMPLATES_DIR, "index.html"))


# ── Notes API ────────────────────────────────────────────────────────────────

@app.post("/api/notes", response_model=NoteResponse, status_code=201)
def create_note(payload: NoteCreate):
    db = next(get_db())
    try:
        note = Note(content=payload.content)
        db.add(note)
        db.commit()
        db.refresh(note)

        search_engine.add_note(note.id, note.content)

        logger.info("Created note %d.", note.id)
        return {
            "id": note.id,
            "content": note.content,
            "created_at": note.created_at.isoformat(),
        }
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create note.")


@app.get("/api/notes")
def list_notes():
    db = next(get_db())
    try:
        notes = db.query(Note).order_by(Note.created_at.desc()).all()
        return [
            {"id": n.id, "content": n.content, "created_at": n.created_at.isoformat()}
            for n in notes
        ]
    finally:
        db.close()


@app.get("/api/notes/{note_id}", response_model=NoteResponse)
def get_note(note_id: int):
    db = next(get_db())
    try:
        note = db.query(Note).filter(Note.id == note_id).first()
        if not note:
            raise HTTPException(status_code=404, detail="Note not found.")
        return {
            "id": note.id,
            "content": note.content,
            "created_at": note.created_at.isoformat(),
        }
    finally:
        db.close()


@app.delete("/api/notes/{note_id}", status_code=204)
def delete_note(note_id: int):
    db = next(get_db())
    try:
        note = db.query(Note).filter(Note.id == note_id).first()
        if not note:
            raise HTTPException(status_code=404, detail="Note not found.")

        db.delete(note)
        db.commit()

        search_engine.delete_note(note_id)

        logger.info("Deleted note %d.", note_id)
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete note.")


# ── Semantic Search API ──────────────────────────────────────────────────────

@app.get("/api/search")
def semantic_search(q: str = Query(..., min_length=1, description="Search query")):
    if search_engine is None:
        raise HTTPException(status_code=503, detail="Search engine not ready.")

    results = search_engine.search(q)
    return {"query": q, "results": results}


# ── Todos API ────────────────────────────────────────────────────────────────

@app.post("/api/todos", response_model=TodoResponse, status_code=201)
def create_todo(payload: TodoCreate):
    db = next(get_db())
    try:
        todo = Todo(text=payload.text)
        db.add(todo)
        db.commit()
        db.refresh(todo)
        logger.info("Created todo %d.", todo.id)
        return {
            "id": todo.id,
            "text": todo.text,
            "completed": todo.completed,
            "created_at": todo.created_at.isoformat(),
        }
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create todo.")


@app.get("/api/todos")
def list_todos():
    db = next(get_db())
    try:
        todos = db.query(Todo).order_by(Todo.created_at.desc()).all()
        return [
            {"id": t.id, "text": t.text, "completed": t.completed, "created_at": t.created_at.isoformat()}
            for t in todos
        ]
    finally:
        db.close()


@app.put("/api/todos/{todo_id}/toggle", response_model=TodoResponse)
def toggle_todo(todo_id: int):
    db = next(get_db())
    try:
        todo = db.query(Todo).filter(Todo.id == todo_id).first()
        if not todo:
            raise HTTPException(status_code=404, detail="Todo not found.")
        todo.completed = not todo.completed
        db.commit()
        db.refresh(todo)
        logger.info("Toggled todo %d → %s.", todo.id, "done" if todo.completed else "pending")
        return {
            "id": todo.id,
            "text": todo.text,
            "completed": todo.completed,
            "created_at": todo.created_at.isoformat(),
        }
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to toggle todo.")


@app.delete("/api/todos/{todo_id}", status_code=204)
def delete_todo(todo_id: int):
    db = next(get_db())
    try:
        todo = db.query(Todo).filter(Todo.id == todo_id).first()
        if not todo:
            raise HTTPException(status_code=404, detail="Todo not found.")
        db.delete(todo)
        db.commit()
        logger.info("Deleted todo %d.", todo_id)
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete todo.")


# ── Bookmarks API ────────────────────────────────────────────────────────────

@app.post("/api/bookmarks", response_model=BookmarkResponse, status_code=201)
def create_bookmark(payload: BookmarkCreate):
    db = next(get_db())
    try:
        bookmark = Bookmark(url=payload.url, title=payload.title)
        db.add(bookmark)
        db.commit()
        db.refresh(bookmark)
        logger.info("Created bookmark %d.", bookmark.id)
        return {
            "id": bookmark.id,
            "url": bookmark.url,
            "title": bookmark.title,
            "created_at": bookmark.created_at.isoformat(),
        }
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create bookmark.")


@app.get("/api/bookmarks")
def list_bookmarks():
    db = next(get_db())
    try:
        bookmarks = db.query(Bookmark).order_by(Bookmark.created_at.desc()).all()
        return [
            {"id": b.id, "url": b.url, "title": b.title, "created_at": b.created_at.isoformat()}
            for b in bookmarks
        ]
    finally:
        db.close()


@app.delete("/api/bookmarks/{bookmark_id}", status_code=204)
def delete_bookmark(bookmark_id: int):
    db = next(get_db())
    try:
        bookmark = db.query(Bookmark).filter(Bookmark.id == bookmark_id).first()
        if not bookmark:
            raise HTTPException(status_code=404, detail="Bookmark not found.")
        db.delete(bookmark)
        db.commit()
        logger.info("Deleted bookmark %d.", bookmark_id)
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete bookmark.")


# ── Entrypoint ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    logger.info("Starting Knowledge Dashboard on http://localhost:8000")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
