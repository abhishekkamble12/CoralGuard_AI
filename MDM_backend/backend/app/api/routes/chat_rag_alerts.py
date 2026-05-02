from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_id
from app.db.session import get_db
from app.models.entities import Alert, Analysis, ChatMessage
from app.rag.qdrant_service import RAGService
from app.schemas.common import AlertTestRequest, ChatRequest, RagSearchRequest
from app.services.alert_service import AlertService
from app.services.chat_service import ChatService

router = APIRouter(tags=["chat-rag-alerts"])
chat_service = ChatService()
rag_service = RAGService()
alert_service = AlertService()


@router.post("/chat")
async def chat(payload: ChatRequest, db: Session = Depends(get_db), _: int = Depends(get_current_user_id)):
    return chat_service.chat(db, payload.session_id, payload.user_id, payload.message)


@router.post("/rag/search")
async def rag_search(payload: RagSearchRequest, _: int = Depends(get_current_user_id)):
    results = rag_service.search(payload.query, top_k=payload.top_k)
    return {"results": results, "summary": f"Retrieved {len(results)} documents."}


@router.get("/rag/categories")
async def rag_categories(_: int = Depends(get_current_user_id)):
    """Return available knowledge base categories with their documents."""
    categories = [
        "Standard Operating Procedures",
        "Authority Contacts",
        "Precautionary Measures",
        "Reef Ecology",
        "Emergency Response",
    ]
    result = {}
    for cat in categories:
        docs = rag_service.search_by_category(cat, top_k=20)
        if docs:
            result[cat] = docs
    return {"categories": result}


@router.post("/alerts/test")
async def alerts_test(payload: AlertTestRequest, db: Session = Depends(get_db), _: int = Depends(get_current_user_id)):
    events = await alert_service.dispatch(
        db=db,
        analysis_id=payload.analysis_id,
        risk_level=payload.risk_level,
        confidence=payload.confidence,
        payload={"source": "manual_test"},
    )
    return {"alerts": [{"id": e.id, "status": e.status, "channel": e.channel} for e in events]}


@router.get("/alerts")
async def get_alerts(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    """Get all alerts for the authenticated user."""
    return {"alerts": alert_service.get_alerts_for_user(db, user_id)}


@router.get("/dashboard/stats")
async def dashboard_stats(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    """Get real-time dashboard statistics."""
    return alert_service.get_dashboard_stats(db, user_id)


@router.get("/history/{session_id}")
async def history(session_id: int, db: Session = Depends(get_db), _: int = Depends(get_current_user_id)):
    msgs = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()).all()
    analyses = db.query(Analysis).filter(Analysis.session_id == session_id).order_by(Analysis.created_at.desc()).all()
    return {
        "session_id": session_id,
        "messages": [{"id": m.id, "role": m.role, "content": m.content, "created_at": m.created_at.isoformat()} for m in msgs],
        "analyses": [{"id": a.id, "fusion": a.fusion_output, "report": a.report_output, "created_at": a.created_at.isoformat()} for a in analyses],
    }


@router.get("/reports/{analysis_id}")
async def report(analysis_id: int, db: Session = Depends(get_db), _: int = Depends(get_current_user_id)):
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        return {"error": "Analysis not found"}
    return {"analysis_id": analysis.id, "created_at": analysis.created_at.isoformat(), "report": analysis.report_output}
