import logging
from sqlalchemy.orm import Session

from app.models.entities import Analysis, ChatMessage, RetrievalLog
from app.rag.qdrant_service import RAGService
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)


class ChatService:
    def __init__(self) -> None:
        self.rag = RAGService()
        self.llm = LLMService()

    def _get_latest_analysis(self, db: Session, session_id: int) -> dict | None:
        """Fetch the most recent analysis for this session to give the AI context."""
        analysis = (
            db.query(Analysis)
            .filter(Analysis.session_id == session_id)
            .order_by(Analysis.created_at.desc())
            .first()
        )
        if not analysis:
            return None
        return {
            "vision": analysis.vision_output,
            "environment": analysis.environment_output,
            "fusion": analysis.fusion_output,
            "report": analysis.report_output,
        }

    def chat(self, db: Session, session_id: int, user_id: int, message: str) -> dict:
        # Save user message
        user_msg = ChatMessage(
            session_id=session_id,
            user_id=user_id,
            role="user",
            content=message,
            metadata_json={},
        )
        db.add(user_msg)
        db.flush()

        # Retrieve relevant knowledge base documents
        docs = self.rag.search(message, top_k=5)
        db.add(RetrievalLog(session_id=session_id, query=message, top_k=5, results={"docs": docs}))

        # Get latest analysis context for this session
        analysis_context = self._get_latest_analysis(db, session_id)

        # Generate context-aware response
        answer = self.llm.generate_chat_response(
            message=message,
            rag_context=docs,
            analysis_context=analysis_context,
        )

        # Save assistant response
        assistant_msg = ChatMessage(
            session_id=session_id,
            user_id=user_id,
            role="assistant",
            content=answer,
            metadata_json={
                "citations": [{"source": d["source"], "title": d["title"]} for d in docs],
                "had_analysis_context": analysis_context is not None,
            },
        )
        db.add(assistant_msg)
        db.commit()

        return {
            "answer": answer,
            "citations": [{"source": d["source"], "title": d["title"]} for d in docs],
            "has_analysis_context": analysis_context is not None,
        }
