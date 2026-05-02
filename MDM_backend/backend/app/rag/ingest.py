"""RAG Data Ingestion Script.

Reads all .txt files from the data/ directory, chunks them, embeds them,
and upserts them into the Qdrant collection.

Usage:
    python -m app.rag.ingest          # ingest new documents only
    python -m app.rag.ingest --force   # recreate collection and re-ingest everything
"""
import sys
import uuid
import logging
from pathlib import Path

from qdrant_client.models import PointStruct, Distance, VectorParams

from app.core.config import get_settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger(__name__)


def chunk_text(text: str, chunk_size: int = 600, overlap: int = 100) -> list[str]:
    """Split text into overlapping chunks by paragraph boundaries."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: list[str] = []
    current = ""

    for para in paragraphs:
        if len(current) + len(para) > chunk_size and current:
            chunks.append(current.strip())
            # Keep last `overlap` chars for context continuity
            current = current[-overlap:] + "\n\n" + para if overlap else para
        else:
            current = current + "\n\n" + para if current else para

    if current.strip():
        chunks.append(current.strip())

    return chunks


def ingest_data(force: bool = False) -> None:
    settings = get_settings()

    # Lazy import so the script doesn't crash if fastembed is slow to load
    from fastembed import TextEmbedding
    from qdrant_client import QdrantClient

    if not settings.qdrant_url:
        logger.error("QDRANT_URL is not set. Cannot ingest.")
        return

    client = QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key)
    embedder = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
    collection = settings.qdrant_collection

    # Handle collection setup
    existing = [c.name for c in client.get_collections().collections]
    if force and collection in existing:
        logger.info("Force flag set — deleting existing collection '%s'", collection)
        client.delete_collection(collection)
        existing.remove(collection)

    if collection not in existing:
        logger.info("Creating collection '%s' (dim=384, cosine)", collection)
        client.create_collection(
            collection_name=collection,
            vectors_config=VectorParams(size=384, distance=Distance.COSINE),
        )

    # Read all knowledge base files
    data_dir = Path(__file__).parent / "data"
    if not data_dir.exists():
        logger.error("Data directory not found: %s", data_dir)
        return

    txt_files = sorted(data_dir.glob("*.txt"))
    if not txt_files:
        logger.warning("No .txt files found in %s", data_dir)
        return

    logger.info("Found %d knowledge base files", len(txt_files))

    all_points: list[PointStruct] = []
    for file_path in txt_files:
        content = file_path.read_text(encoding="utf-8")
        chunks = chunk_text(content)
        logger.info("  %s → %d chunks", file_path.name, len(chunks))

        for i, chunk in enumerate(chunks):
            # Generate embedding — fastembed returns a generator
            embedding = list(next(embedder.embed([chunk])))

            # Deterministic ID so re-running is idempotent
            point_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{file_path.name}:{i}"))

            all_points.append(
                PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload={
                        "title": file_path.stem.replace("_", " ").title(),
                        "content": chunk,
                        "source": file_path.name,
                        "chunk_index": i,
                        "category": _categorize(file_path.name),
                    },
                )
            )

    # Upsert in batches of 50
    batch_size = 50
    for start in range(0, len(all_points), batch_size):
        batch = all_points[start : start + batch_size]
        client.upsert(collection_name=collection, points=batch)
        logger.info("  Upserted batch %d–%d", start, start + len(batch))

    logger.info("✅ Successfully ingested %d chunks into '%s'", len(all_points), collection)


def _categorize(filename: str) -> str:
    """Map filenames to human-readable categories for the frontend."""
    categories = {
        "coral_bleaching_sop": "Standard Operating Procedures",
        "authority_contacts": "Authority Contacts",
        "precautionary_measures": "Precautionary Measures",
        "reef_ecology_basics": "Reef Ecology",
        "emergency_response": "Emergency Response",
        "guidelines": "General Guidelines",
    }
    stem = filename.replace(".txt", "")
    return categories.get(stem, "General")


if __name__ == "__main__":
    force_flag = "--force" in sys.argv
    ingest_data(force=force_flag)
