from app.ml.fusion_service import FusionEngineService
from app.schemas.common import EnvironmentResponse, VisionResponse


def test_fusion_critical_for_dead_and_anomalous():
    service = FusionEngineService()
    vision = VisionResponse(
        class_name="Dead",
        confidence=0.9,
        probabilities={"Healthy": 0.01, "Bleached": 0.09, "Dead": 0.9},
        low_confidence=False,
        gradcam_hint=None,
    )
    env = EnvironmentResponse(cluster="Anomalous", risk_score=0.7, notes="High anomaly")
    result = service.fuse(vision, env)
    assert result.final_risk == "Critical"
    assert result.confidence >= 0.75
