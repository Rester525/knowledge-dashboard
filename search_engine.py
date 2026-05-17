"""
Semantic search engine using ChromaDB and SentenceTransformers.
Runs entirely locally — no API calls, no telemetry.
"""

import logging
import os

import chromadb
from chromadb.config import Settings as ChromaSettings
from sentence_transformers import SentenceTransformer

logger = logging.getLogger("search_engine")

COLLECTION_NAME = "notes"
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
CHROMA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "chroma")


class SearchEngine:
    def __init__(self):
        os.makedirs(CHROMA_DIR, exist_ok=True)

        logger.info("Loading embedding model %s (first run will download ~80MB)...", MODEL_NAME)
        self.model = SentenceTransformer(MODEL_NAME)
        logger.info("Embedding model loaded.")

        self.client = chromadb.PersistentClient(
            path=CHROMA_DIR,
            settings=ChromaSettings(anonymized_telemetry=False),
        )

        self.collection = self.client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info("ChromaDB collection '%s' ready (%d docs).", COLLECTION_NAME, self.collection.count())

    def add_note(self, note_id: int, content: str) -> None:
        """Embed content and upsert into the vector collection."""
        embedding = self.model.encode(content).tolist()
        self.collection.upsert(
            ids=[str(note_id)],
            embeddings=[embedding],
            documents=[content],
            metadatas=[{"note_id": note_id}],
        )
        logger.info("Indexed note %d (%d chars).", note_id, len(content))

    def search(self, query: str, n_results: int = 10) -> list[dict]:
        """Semantic search over notes. Returns list of {id, content, score}."""
        if self.collection.count() == 0:
            return []

        embedding = self.model.encode(query).tolist()
        results = self.collection.query(
            query_embeddings=[embedding],
            n_results=min(n_results, self.collection.count()),
            include=["documents", "metadatas", "distances"],
        )

        hits = []
        ids = results.get("ids", [[]])[0]
        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        for i, doc_id in enumerate(ids):
            distance = distances[i] if i < len(distances) else 0.0
            score = max(0.0, 1.0 - distance)
            hits.append({
                "id": int(doc_id),
                "content": docs[i] if i < len(docs) else "",
                "score": round(score, 4),
            })

        logger.info("Search for '%s' returned %d results.", query, len(hits))
        return hits

    def delete_note(self, note_id: int) -> None:
        """Remove a note embedding from the collection."""
        self.collection.delete(ids=[str(note_id)])
        logger.info("Removed note %d from vector index.", note_id)
