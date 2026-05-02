import json
import logging
from sqlalchemy.orm import Session
from groq import Groq

from app.alerting.notifier import Notifier
from app.core.config import get_settings
from app.models.entities import Alert

logger = logging.getLogger(__name__)


class AlertService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.notifier = Notifier()
        self.groq_client = Groq(api_key=self.settings.groq_api_key) if self.settings.groq_api_key else None

    def should_alert(self, risk_level: str, confidence: float, vision_class: str | None = None) -> bool:
        """Alert on Critical/Elevated risk OR if vision directly detected Bleached/Dead coral."""
        if risk_level == "Critical":
            return True
        if risk_level == "Elevated":
            return True
        # Always alert when coral is visually confirmed as Bleached or Dead
        if vision_class and vision_class.lower() in ("bleached", "dead"):
            return True
        return False

    async def dispatch(
        self,
        db: Session,
        analysis_id: int,
        risk_level: str,
        confidence: float,
        payload: dict,
        vision_class: str | None = None,
    ) -> list[Alert]:
        """Autonomous Dispatch Agent deciding how to route alerts using tool calling."""
        # Always alert for Bleached/Dead coral or Elevated/Critical risk
        force_alert = self.should_alert(risk_level, confidence, vision_class)

        if not self.groq_client:
            if not force_alert:
                return []
            return await self._legacy_dispatch(db, analysis_id, risk_level, confidence, payload, vision_class)

        # If conditions don't warrant an alert, skip LLM entirely
        if not force_alert:
            return []

        system_prompt = (
            "You are an autonomous Dispatch Agent for CoralGuard AI. Your task is to review the "
            "validated Analyst Report and decide the best way to notify stakeholders. "
            "You MUST call `dispatch_slack`, `dispatch_email`, or both — NEVER `log_silently` — "
            "because this analysis has already been confirmed as requiring an alert. "
            "If the risk is Critical or coral is Dead, call both dispatch_slack AND dispatch_email. "
            "If the risk is Elevated or coral is Bleached, call dispatch_email."
        )

        tools = [
            {
                "type": "function",
                "function": {
                    "name": "dispatch_slack",
                    "description": "Send a webhook message to the Slack channel.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "message": {"type": "string", "description": "The formatted slack message"}
                        },
                        "required": ["message"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "dispatch_email",
                    "description": "Send an email alert.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "subject": {"type": "string", "description": "Email subject"},
                            "body": {"type": "string", "description": "Email body content"}
                        },
                        "required": ["subject", "body"],
                    },
                },
            },
            {
                "type": "function",
                "function": {
                    "name": "log_silently",
                    "description": "Do not send any external alerts. Just log it silently.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "reason": {"type": "string", "description": "Reason for silent logging"}
                        },
                        "required": ["reason"],
                    },
                },
            }
        ]

        user_prompt = (
            f"--- ANALYSIS PAYLOAD ---\n{json.dumps(payload, indent=2)}\n\n"
            f"Vision Classification: {vision_class or 'Unknown'}\n"
            f"Risk Level: {risk_level} | Confidence: {confidence:.2f}\n\n"
            "This alert has been pre-approved for dispatch. Choose the appropriate channel(s)."
        )
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        alerts: list[Alert] = []
        idempotency_base = f"{analysis_id}:{risk_level}"

        # Prevent duplicate alerts across runs
        existing = db.query(Alert).filter(Alert.idempotency_key.like(f"{idempotency_base}%")).all()
        if existing:
            return existing

        try:
            response = self.groq_client.chat.completions.create(
                model=self.settings.groq_model,
                messages=messages,
                tools=tools,
                tool_choice="auto",
                temperature=0.1,
                max_tokens=500,
            )
            message = response.choices[0].message

            if message.tool_calls:
                for tool_call in message.tool_calls:
                    fn_name = tool_call.function.name
                    args = json.loads(tool_call.function.arguments)

                    if fn_name == "dispatch_slack":
                        target = self.settings.alert_webhook_url
                        idem = f"{idempotency_base}:webhook"
                        event = Alert(
                            analysis_id=analysis_id, risk_level=risk_level, confidence=confidence,
                            channel="webhook", target=target, status="pending", payload=payload, idempotency_key=idem
                        )
                        db.add(event)
                        db.flush()
                        ok = await self.notifier.send_webhook(target, {"text": args.get("message", "")})
                        event.status = "sent" if ok else "failed"
                        alerts.append(event)

                    elif fn_name == "dispatch_email":
                        target = self.settings.alert_email_to
                        idem = f"{idempotency_base}:email"
                        event = Alert(
                            analysis_id=analysis_id, risk_level=risk_level, confidence=confidence,
                            channel="email", target=target, status="pending", payload=payload, idempotency_key=idem
                        )
                        db.add(event)
                        db.flush()
                        ok = await self.notifier.send_email(
                            sender=self.settings.alert_email_from, target=target,
                            subject=args.get("subject", "Alert"), body=args.get("body", "")
                        )
                        event.status = "sent" if ok else "failed"
                        alerts.append(event)

                    elif fn_name == "log_silently":
                        logger.info(f"Dispatch Agent chose log_silently: {args.get('reason')}")
                        # No alert created

        except Exception as e:
            logger.warning("Dispatch Agent failed: %s", e)
            return await self._legacy_dispatch(db, analysis_id, risk_level, confidence, payload, vision_class)

        db.commit()
        return alerts

    async def _legacy_dispatch(
        self,
        db: Session,
        analysis_id: int,
        risk_level: str,
        confidence: float,
        payload: dict,
        vision_class: str | None = None,
    ) -> list[Alert]:
        if not self.should_alert(risk_level, confidence, vision_class):
            return []

        idempotency_base = f"{analysis_id}:{risk_level}"
        existing = db.query(Alert).filter(Alert.idempotency_key.like(f"{idempotency_base}%")).first()
        if existing:
            return [existing]

        alerts: list[Alert] = []
        for channel, target in [
            ("email", self.settings.alert_email_to),
            ("webhook", self.settings.alert_webhook_url),
        ]:
            idem = f"{idempotency_base}:{channel}"
            event = Alert(
                analysis_id=analysis_id,
                risk_level=risk_level,
                confidence=confidence,
                channel=channel,
                target=target,
                status="pending",
                payload=payload,
                idempotency_key=idem,
            )
            db.add(event)
            db.flush()

            if channel == "email":
                ok = await self.notifier.send_email(
                    sender=self.settings.alert_email_from,
                    target=target,
                    subject=f"[CoralGuard] {risk_level} Reef Alert — Analysis #{analysis_id}",
                    body=str(payload),
                )
            else:
                ok = await self.notifier.send_webhook(target, payload)

            event.status = "sent" if ok else "failed"
            alerts.append(event)

        db.commit()
        return alerts

    # ── Query methods for the frontend ─────────────────────────────────────

    def get_alerts_for_user(self, db: Session, user_id: int, limit: int = 50) -> list[dict]:
        """Get all alerts for analyses belonging to a specific user."""
        from app.models.entities import Analysis

        alerts = (
            db.query(Alert)
            .join(Analysis, Alert.analysis_id == Analysis.id)
            .filter(Analysis.user_id == user_id)
            .order_by(Alert.created_at.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "id": a.id,
                "analysis_id": a.analysis_id,
                "risk_level": a.risk_level,
                "confidence": round(a.confidence, 2),
                "channel": a.channel,
                "target": a.target,
                "status": a.status,
                "created_at": a.created_at.isoformat(),
            }
            for a in alerts
        ]

    def get_dashboard_stats(self, db: Session, user_id: int) -> dict:
        """Compute real dashboard statistics for the authenticated user."""
        from app.models.entities import Analysis
        from sqlalchemy import func

        total_analyses = db.query(func.count(Analysis.id)).filter(Analysis.user_id == user_id).scalar() or 0

        active_alerts = (
            db.query(func.count(Alert.id))
            .join(Analysis, Alert.analysis_id == Analysis.id)
            .filter(Analysis.user_id == user_id, Alert.status == "sent")
            .scalar() or 0
        )

        # Get recent analyses for the activity feed
        recent = (
            db.query(Analysis)
            .filter(Analysis.user_id == user_id)
            .order_by(Analysis.created_at.desc())
            .limit(5)
            .all()
        )

        recent_analyses = []
        for a in recent:
            fusion = a.fusion_output or {}
            vision = a.vision_output or {}
            recent_analyses.append({
                "id": a.id,
                "risk_level": fusion.get("final_risk", "Unknown"),
                "confidence": round(fusion.get("confidence", 0), 2),
                "class_name": vision.get("class_name", "Unknown"),
                "created_at": a.created_at.isoformat(),
            })

        return {
            "total_analyses": total_analyses,
            "active_alerts": active_alerts,
            "recent_analyses": recent_analyses,
        }
