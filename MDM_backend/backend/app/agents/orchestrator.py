from sqlalchemy.orm import Session

from app.agents.agents import AlertAgent, CriticAgent, EnvironmentAgent, FusionAgent, RAGAgent, ReportAgent, VisionAgent
from app.models.entities import Analysis, Session as MonitoringSession
from app.schemas.common import EnvironmentalInput, VisionResponse, ReasoningStep


class OrchestratorAgent:
    """Coordinates all agents with an autonomous, iterative reasoning loop."""

    def __init__(self) -> None:
        self.vision = VisionAgent()
        self.environment = EnvironmentAgent()
        self.rag = RAGAgent()
        self.fusion = FusionAgent()
        self.report = ReportAgent()
        self.critic = CriticAgent()
        self.alert = AlertAgent()

    def _ensure_session(self, db: Session, session_id: int, user_id: int) -> int:
        """Return session_id if it exists, otherwise create it."""
        existing = db.get(MonitoringSession, session_id)
        if existing:
            return existing.id
        new_session = MonitoringSession(id=session_id, user_id=user_id)
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        return new_session.id

    async def analyze(
        self,
        db: Session,
        session_id: int,
        user_id: int,
        environment: EnvironmentalInput,
        image_bytes: bytes | None = None,
        vision_override: VisionResponse | None = None,
    ) -> dict:
        session_id = self._ensure_session(db, session_id, user_id)
        reasoning_log: list[ReasoningStep] = []

        # ── Step 1: Perception (Vision & Environment) ────────────────────────
        vision = vision_override or (
            self.vision.run(image_bytes) if image_bytes else VisionResponse(
                class_name="Healthy",
                confidence=0.5,
                probabilities={"Healthy": 0.5, "Bleached": 0.25, "Dead": 0.25},
                low_confidence=True,
                gradcam_hint=None,
            )
        )
        reasoning_log.append(ReasoningStep(
            agent_name="VisionAgent", 
            action="Classification", 
            output=f"Detected {vision.class_name} with {vision.confidence:.2f} confidence."
        ))

        env = self.environment.run(environment)
        reasoning_log.append(ReasoningStep(
            agent_name="EnvironmentAgent", 
            action="Clustering", 
            output=f"Environment state: {env.cluster} (Risk Score: {env.risk_score:.2f})"
        ))

        fusion = self.fusion.run(vision, env)
        reasoning_log.append(ReasoningStep(
            agent_name="FusionAgent", 
            action="Data Fusion", 
            output=f"Synthesized Risk: {fusion.final_risk} | Confidence: {fusion.confidence:.2f}"
        ))

        # ── Step 2: Iterative Reasoning (Analyst & Critic) ───────────────────
        raw_data_prompt = (
            f"## Vision Analysis\n{vision.model_dump()}\n\n"
            f"## Environmental Analysis\n{env.model_dump()}\n\n"
            f"## Fusion Analysis\nRisk Level: {fusion.final_risk} | Confidence: {fusion.confidence:.2f}\n"
            f"Reasoning: {fusion.reasoning}\n"
        )
        
        max_retries = 3
        current_attempt = 0
        feedback = None
        report_obj = None
        validation_obj = None

        while current_attempt < max_retries:
            current_attempt += 1
            
            # Analyst generates/revises report
            action = "Generating Report" if current_attempt == 1 else f"Revising Report (Attempt {current_attempt})"
            report_obj = await self.report.run(raw_data_prompt, self.rag.service, feedback=feedback)
            reasoning_log.append(ReasoningStep(
                agent_name="AnalystAgent", 
                action=action, 
                output=report_obj.summary
            ))

            # Critic validates
            validation_obj = await self.critic.run(report_obj, raw_data_prompt)
            reasoning_log.append(ReasoningStep(
                agent_name="CriticAgent", 
                action="Validation", 
                output=f"Valid: {validation_obj.is_valid}. Feedback: {validation_obj.feedback}"
            ))

            if validation_obj.is_valid:
                break
            
            # Prepare feedback for next iteration
            feedback = f"Your previous report was rejected by the Critic. Feedback: {validation_obj.feedback}. "
            if validation_obj.suggested_revisions:
                feedback += f"Suggestions: {', '.join(validation_obj.suggested_revisions)}"

        # ── Step 3: Persistence & Action (Dispatch) ──────────────────────────
        report_dict = report_obj.model_dump()
        report_dict["risk_level"] = fusion.final_risk
        report_dict["validation"] = validation_obj.model_dump()

        analysis = Analysis(
            session_id=session_id,
            user_id=user_id,
            vision_output=vision.model_dump(),
            environment_output=env.model_dump(),
            fusion_output=fusion.model_dump(),
            report_output=report_dict,
        )
        db.add(analysis)
        db.commit()
        db.refresh(analysis)

        # Dispatch alerts autonomously — always fire for Bleached/Dead coral
        alerts = await self.alert.run(
            db=db,
            analysis_id=analysis.id,
            risk_level=fusion.final_risk,
            confidence=fusion.confidence,
            payload={"analysis_id": analysis.id, "report": report_dict},
            vision_class=vision.class_name,
        )
        
        for alert in alerts:
            reasoning_log.append(ReasoningStep(
                agent_name="DispatchAgent",
                action="Alert Routing",
                output=f"Dispatched {alert.channel} alert to {alert.target} (Status: {alert.status})"
            ))

        return {
            "analysis_id": analysis.id,
            "vision": vision.model_dump(),
            "environment": env.model_dump(),
            "fusion": fusion.model_dump(),
            "report": report_dict,
            "validation": validation_obj.model_dump(),
            "reasoning_log": [step.model_dump() for step in reasoning_log],
            "alerts": [
                {"id": a.id, "channel": a.channel, "status": a.status, "target": a.target}
                for a in alerts
            ],
        }
