from typing import Any
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
from fastembed import TextEmbedding

from app.core.config import get_settings


class RAGService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.embedder = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
        self.client = QdrantClient(url=self.settings.qdrant_url, api_key=self.settings.qdrant_api_key) if self.settings.qdrant_url else None

    def ensure_collection(self) -> None:
        if not self.client:
            return
        collections = [c.name for c in self.client.get_collections().collections]
        if self.settings.qdrant_collection not in collections:
            self.client.create_collection(
                collection_name=self.settings.qdrant_collection,
                vectors_config=VectorParams(size=384, distance=Distance.COSINE),
            )

    def search(self, query: str, top_k: int = 5) -> list[dict[str, Any]]:
        if not self.client:
            return []
        try:
            vector = list(next(self.embedder.embed([query])))
            # qdrant-client >= 1.7: use query_points
            res = self.client.query_points(
                collection_name=self.settings.qdrant_collection,
                query=vector,
                limit=top_k,
                with_payload=True,
            )
            return [
                {
                    "id": str(p.id),
                    "score": round(float(p.score), 3),
                    "title": p.payload.get("title", "Unknown"),
                    "content": p.payload.get("content", ""),
                    "source": p.payload.get("source", ""),
                    "category": p.payload.get("category", "General"),
                }
                for p in res.points
            ]
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning("RAG search failed: %s", e)
            return []

    def search_by_category(self, category: str, top_k: int = 10) -> list[dict[str, Any]]:
        """Retrieve documents filtered by category."""
        if not self.client:
            return []
        try:
            from qdrant_client.models import Filter, FieldCondition, MatchValue
            # Use scroll to get all docs in a category
            results, _ = self.client.scroll(
                collection_name=self.settings.qdrant_collection,
                scroll_filter=Filter(
                    must=[FieldCondition(key="category", match=MatchValue(value=category))]
                ),
                limit=top_k,
                with_payload=True,
            )
            return [
                {
                    "id": str(p.id),
                    "title": p.payload.get("title", "Unknown"),
                    "content": p.payload.get("content", ""),
                    "source": p.payload.get("source", ""),
                    "category": p.payload.get("category", "General"),
                }
                for p in results
            ]
        except Exception:
            return []

    def get_authority_contacts(self) -> str:
        """Retrieve authority contact information for alert messages."""
        # Try specifically searching in the Authority Contacts category first
        docs = self.search_by_category("Authority Contacts", top_k=3)
        if not docs:
            # Fallback to semantic search if category is empty or missing
            docs = self.search("marine authority contact emergency hotline escalation", top_k=3)
        
        if docs:
            return "\n\n".join(d["content"] for d in docs)
        return "Contact your local marine park authority for emergency reef events."
