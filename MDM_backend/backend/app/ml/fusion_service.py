from app.schemas.common import EnvironmentResponse, FusionResponse, VisionResponse


class FusionEngineService:
    def fuse(self, vision: VisionResponse, env: EnvironmentResponse) -> FusionResponse:
        score = env.risk_score
        if vision.class_name == "Dead":
            score += 0.6
        elif vision.class_name == "Bleached":
            score += 0.35
        else:
            score -= 0.1

        if vision.low_confidence:
            score -= 0.1

        score = max(0.0, min(score, 1.0))
        if score >= 0.75:
            risk = "Critical"
            action = "Notify marine authority immediately and initiate emergency reef intervention."
        elif score >= 0.45:
            risk = "Elevated"
            action = "Increase monitoring cadence and deploy preventive field checks."
        else:
            risk = "Low"
            action = "Continue baseline monitoring and periodic validation."

        reasoning = (
            f"Fusion combined vision='{vision.class_name}' (conf={vision.confidence:.2f}) "
            f"with env='{env.cluster}' (risk_score={env.risk_score:.2f})."
        )
        return FusionResponse(final_risk=risk, confidence=score, reasoning=reasoning, recommended_action=action)
