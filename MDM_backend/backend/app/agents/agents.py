from dataclasses import dataclass
from sqlalchemy.orm import Session

from app.ml.environment_service import EnvironmentAnalysisService
from app.ml.fusion_service import FusionEngineService
from app.ml.vision_service import VisionInferenceService
from app.rag.qdrant_service import RAGService
from app.schemas.common import EnvironmentalInput, VisionResponse, AnalystReport, ValidationResult
from app.services.alert_service import AlertService
from app.services.llm_service import LLMService


@dataclass
class AgentContext:
    session_id: int
    user_id: int


class VisionAgent:
    def __init__(self) -> None:
        self.service = VisionInferenceService()

    def run(self, image_bytes: bytes) -> VisionResponse:
        result = self.service.predict(image_bytes)
        return VisionResponse(
            class_name=result.class_name,
            confidence=result.confidence,
            probabilities=result.probabilities,
            low_confidence=result.low_confidence,
            gradcam_hint=result.gradcam_hint,
        )


class EnvironmentAgent:
    def __init__(self) -> None:
        self.service = EnvironmentAnalysisService()

    def run(self, data: EnvironmentalInput):
        return self.service.analyze(data)


class RAGAgent:
    def __init__(self) -> None:
        self.service = RAGService()

    def run(self, query: str, top_k: int = 5) -> list[dict]:
        return self.service.search(query, top_k=top_k)


class FusionAgent:
    def __init__(self) -> None:
        self.service = FusionEngineService()

    def run(self, vision: VisionResponse, env):
        return self.service.fuse(vision, env)


class ReportAgent:
    def __init__(self) -> None:
        self.service = LLMService()

    async def run(self, prompt: str, rag_service, feedback: str | None = None) -> AnalystReport:
        return await self.service.run_analyst_agent(prompt, rag_service, feedback=feedback)


class CriticAgent:
    def __init__(self) -> None:
        self.service = LLMService()

    async def run(self, report: AnalystReport, original_data: str) -> ValidationResult:
        return await self.service.run_critic_agent(report, original_data)


class AlertAgent:
    def __init__(self) -> None:
        self.service = AlertService()

    async def run(
        self,
        db: Session,
        analysis_id: int,
        risk_level: str,
        confidence: float,
        payload: dict,
        vision_class: str | None = None,
    ):
        return await self.service.dispatch(
            db, analysis_id, risk_level, confidence, payload, vision_class=vision_class
        )
