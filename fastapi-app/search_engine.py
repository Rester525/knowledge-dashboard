"""
search_engine.py — ChromaDB + sentence-transformers for local semantic search.

ASYNC DESIGN:
  ChromaDB's Python client is synchronous (HTTP-based for the client-server mode,
  or embedded). We wrap every operation in asyncio.to_thread() so the FastAPI
  event loop never blocks. This matters under load: without it, a single search
  would stall ALL concurrent requests.
"""

import asyncio
import os
from typing import Optional

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

# ── Paths ──────────────────────────────────────────────────────────────────
DB_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")
COLLECTION_NAME = "notes"

# ── Singleton model (loaded once, re-used across all requests) ──────────────
_model: Optional[SentenceTransformer] = None


def _get_model() -> SentenceTransformer:
    """Lazy-load the embedding model.

    WHY LAZY: SentenceTransformer downloads ~500 MB on first import.
    Loading at module level would stall the server start and waste memory
    if the search feature is never used.
    """
    global _model
    if _model is None:
        _model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    return _model


def _get_client() -> chromadb.ClientAPI:
    """Return a persistent ChromaDB client, creating it once."""
    return chromadb.PersistentClient(
        path=DB_DIR,
        settings=Settings(anonymized_telemetry=False),
    )


# ── Collection helpers (run in thread pool) ─────────────────────────────────

def _ensure_collection():
    """Get or create the notes collection (synchronous — call via thread)."""
    client = _get_client()
    try:
        return client.get_collection(COLLECTION_NAME)
    except ValueError:
        return client.create_collection(COLLECTION_NAME)


def _add_note_to_collection(note_id: str, text: str, metadata: dict | None = None):
    """Embed + index a single note."""
    coll = _ensure_collection()
    model = _get_model()
    embedding = model.encode(text).tolist()
    coll.add(ids=[note_id], embeddings=[embedding], metadatas=[metadata or {}])


def _update_note_in_collection(note_id: str, text: str, metadata: dict | None = None):
    """Update embedding for an existing note."""
    coll = _ensure_collection()
    model = _get_model()
    embedding = model.encode(text).tolist()
    coll.update(ids=[note_id], embeddings=[embedding], metadatas=[metadata or {}])


def _delete_note_from_collection(note_id: str):
    """Remove a note from the index."""
    coll = _ensure_collection()
    try:
        coll.delete(ids=[note_id])
    except Exception:
        pass  # Not in index — no-op


def _search_collection(query: str, top_k: int = 10) -> list[dict]:
    """Search by semantic similarity. Returns [{id, score, metadata}, ...]."""
    coll = _ensure_collection()
    model = _get_model()
    q_emb = model.encode(query).tolist()
    results = coll.query(query_embeddings=[q_emb], n_results=top_k)
    hits = []
    if results["ids"] and results["ids"][0]:
        for i, doc_id in enumerate(results["ids"][0]):
            hits.append({
                "id": doc_id,
                "score": float(results["distances"][0][i]),
                "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
            })
    return hits


# ── Public async API (non-blocking) ─────────────────────────────────────────

async def add_note(note_id: str, text: str, metadata: dict | None = None) -> None:
    """Embed and index a note asynchronously."""
    await asyncio.to_thread(_add_note_to_collection, note_id, text, metadata)


async def update_note(note_id: str, text: str, metadata: dict | None = None) -> None:
    """Re-embed a note when its content changes."""
    await asyncio.to_thread(_update_note_in_collection, note_id, text, metadata)


async def delete_note(note_id: str) -> None:
    """Remove a note from the vector index."""
    await asyncio.to_thread(_delete_note_from_collection, note_id)


async def search_notes(query: str, top_k: int = 10) -> list[dict]:
    """Async semantic search — the event loop stays free while the model runs."""
    return await asyncio.to_thread(_search_collection, query, top_k)
