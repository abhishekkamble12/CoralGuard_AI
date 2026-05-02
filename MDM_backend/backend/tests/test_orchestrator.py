from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.agents.orchestrator import OrchestratorAgent
from app.db.base import Base
from app.schemas.common import EnvironmentalInput, VisionResponse


def test_orchestrator_with_override():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    db = sessionmaker(bind=engine)()

    orch = OrchestratorAgent()
    vision = VisionResponse(
        class_name="Bleached",
        confidence=0.88,
        probabilities={"Healthy": 0.05, "Bleached": 0.88, "Dead": 0.07},
        low_confidence=False,
        gradcam_hint=None,
    )
    result = __import__("asyncio").run(
        orch.analyze(
            db=db,
            session_id=1,
            user_id=1,
            environment=EnvironmentalInput(ssta=1.8, tsa=8.5, depth=6),
            vision_override=vision,
        )
    )
    assert "analysis_id" in result
    assert result["fusion"]["final_risk"] in {"Elevated", "Critical"}
