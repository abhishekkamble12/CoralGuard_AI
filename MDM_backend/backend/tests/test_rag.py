from app.rag.qdrant_service import RAGService


def test_rag_fallback_without_qdrant():
    svc = RAGService()
    results = svc.search("reef conservation policy", top_k=3)
    assert isinstance(results, list)
