import logging
import httpx

logger = logging.getLogger(__name__)


class Notifier:
    async def send_email(self, sender: str, target: str, subject: str, body: str) -> bool:
        logger.info("📧 Email alert dispatched: sender=%s target=%s subject=%s", sender, target, subject)
        # In production, integrate with SendGrid/SES/SMTP here
        return True

    async def send_webhook(self, url: str, payload: dict) -> bool:
        """Send a formatted alert to a webhook endpoint (Slack/Teams/custom)."""
        report = payload.get("report", {})
        risk_level = report.get("risk_level", payload.get("risk_level", "Unknown"))
        summary = report.get("summary", "No summary available.")
        action = report.get("recommended_action", "Review manually.")
        precautions = report.get("precautionary_measures", "Follow standard protocols.")
        confidence = report.get("confidence", 0)

        # Slack Block Kit formatted message
        slack_payload = {
            "blocks": [
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": f"🚨 CoralGuard Alert: {risk_level} Risk Detected",
                        "emoji": True,
                    },
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": (
                            f"*Summary:* {summary}\n\n"
                            f"*Confidence:* {confidence:.0%}\n\n"
                            f"*Recommended Action:* {action}\n\n"
                            f"*Precautionary Measures:* {precautions}"
                        ),
                    },
                },
                {"type": "divider"},
                {
                    "type": "context",
                    "elements": [
                        {
                            "type": "mrkdwn",
                            "text": "📡 Sent by CoralGuard AI Automated Alert System",
                        }
                    ],
                },
            ]
        }

        if not url or url == "https://example.com/webhook":
            logger.info(
                "🔔 Webhook alert (no real URL configured — logged only):\n"
                "  Risk: %s | Summary: %s | Action: %s",
                risk_level, summary[:100], action[:100],
            )
            return True

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(url, json=slack_payload)
                if 200 <= resp.status_code < 300:
                    logger.info("✅ Webhook alert sent successfully to %s", url)
                    return True
                else:
                    logger.warning("⚠️ Webhook returned %s: %s", resp.status_code, resp.text[:200])
                    return False
        except Exception as e:
            logger.error("❌ Webhook dispatch failed: %s", e)
            return False
