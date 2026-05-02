from app.ml.environment_service import EnvironmentAnalysisService
from app.schemas.common import EnvironmentalInput


def test_environment_heuristic_anomalous():
    svc = EnvironmentAnalysisService()
    out = svc.analyze(EnvironmentalInput(ssta=2.0, tsa=10.0, depth=4.0))
    assert out.cluster in {"Anomalous", "Stressed"}
    assert out.risk_score > 0.4
