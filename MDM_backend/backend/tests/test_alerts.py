from app.services.alert_service import AlertService


def test_alert_decision_logic():
    svc = AlertService()
    assert svc.should_alert("Critical", 0.2) is True
    assert svc.should_alert("Elevated", 0.9) is True
    assert svc.should_alert("Elevated", 0.5) is False
    assert svc.should_alert("Low", 0.99) is False
