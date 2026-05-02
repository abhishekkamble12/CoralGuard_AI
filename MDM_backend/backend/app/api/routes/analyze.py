from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.agents.orchestrator import OrchestratorAgent
from app.api.deps import get_current_user_id
from app.db.session import get_db
from app.schemas.common import EnvironmentalInput

router = APIRouter(tags=["analyze"])
orchestrator = OrchestratorAgent()


@router.post("/analyze")
async def analyze(
    session_id: int = Form(...),
    ssta: float = Form(...),
    tsa: float = Form(...),
    depth: float = Form(...),
    file: UploadFile | None = File(default=None),
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    env = EnvironmentalInput(ssta=ssta, tsa=tsa, depth=depth)
    image_bytes = await file.read() if file else None
    result = await orchestrator.analyze(
        db=db,
        session_id=session_id,
        user_id=user_id,
        environment=env,
        image_bytes=image_bytes,
    )
    return result
