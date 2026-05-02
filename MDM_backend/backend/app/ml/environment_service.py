import os
import pickle
from datetime import datetime
import numpy as np

from app.core.config import get_settings
from app.schemas.common import EnvironmentalInput, EnvironmentResponse

# Feature order must match what the scaler/HDBSCAN model was trained on.
_FEATURE_NAMES = [
    "Longitude_Degrees",
    "Latitude_Degrees",
    "Cyclone_Frequency",
    "Thermal_Stress",
    "Turbidity",
    "SST_Total",
    "TSA",
    "Date_Year",
    "ClimSST",
    "SSTA",
    "Light_Index",
    "Percent_Cover",
    "Depth_m",
]

# Median/typical values used as defaults for features not supplied by the user.
_FEATURE_DEFAULTS = {
    "Longitude_Degrees": 0.0,
    "Latitude_Degrees": 0.0,
    "Cyclone_Frequency": 0.0,
    "Thermal_Stress": 0.0,
    "Turbidity": 1.0,
    "SST_Total": 28.0,
    "TSA": 0.0,
    "Date_Year": float(datetime.utcnow().year),
    "ClimSST": 28.0,
    "SSTA": 0.0,
    "Light_Index": 1.0,
    "Percent_Cover": 50.0,
    "Depth_m": 10.0,
}


class EnvironmentAnalysisService:
    _cluster_model = None
    _scaler = None

    def __init__(self) -> None:
        self.settings = get_settings()
        self._load_models()

    def _load_models(self) -> None:
        if EnvironmentAnalysisService._cluster_model is None and os.path.exists(self.settings.hdbscan_model_path):
            with open(self.settings.hdbscan_model_path, "rb") as f:
                raw = pickle.load(f)
                # The pkl may be a plain dict wrapping the actual sklearn model.
                if isinstance(raw, dict) and "model" in raw:
                    EnvironmentAnalysisService._cluster_model = raw["model"]
                else:
                    EnvironmentAnalysisService._cluster_model = raw
        if EnvironmentAnalysisService._scaler is None and os.path.exists(self.settings.scaler_path):
            with open(self.settings.scaler_path, "rb") as f:
                EnvironmentAnalysisService._scaler = pickle.load(f)

    def _build_feature_vector(self, data: EnvironmentalInput) -> np.ndarray:
        """Build the full 13-feature vector the scaler expects, using defaults for missing fields."""
        values = dict(_FEATURE_DEFAULTS)
        # Map the fields we actually receive to their trained feature names.
        values["SSTA"] = data.ssta
        values["TSA"] = data.tsa
        values["Thermal_Stress"] = data.tsa          # same signal, different column name
        values["Depth_m"] = data.depth
        if data.turbidity is not None:
            values["Turbidity"] = data.turbidity
        row = [values[name] for name in _FEATURE_NAMES]
        return np.array([row], dtype=np.float32)

    def analyze(self, data: EnvironmentalInput) -> EnvironmentResponse:
        risk = 0.0
        notes = []
        if data.ssta > 1.5:
            risk += 0.35
            notes.append("Elevated sea surface temperature anomaly.")
        if data.tsa > 8:
            risk += 0.45
            notes.append("Thermal stress indicates high bleaching pressure.")
        if data.depth < 5:
            risk += 0.1
            notes.append("Shallow depth increases stress exposure.")

        cluster_label = 0
        if self._cluster_model is not None and self._scaler is not None:
            try:
                arr = self._build_feature_vector(data)
                scaled = self._scaler.transform(arr)
                # Support both HDBSCAN (approximate_predict) and sklearn DBSCAN (fit_predict).
                model = self._cluster_model
                if hasattr(model, "approximate_predict"):
                    import hdbscan as hdbscan_lib
                    labels, strengths = hdbscan_lib.approximate_predict(model, scaled)
                    cluster_label = int(labels[0])
                    notes.append(f"HDBSCAN label={cluster_label}, strength={float(strengths[0]):.3f}")
                else:
                    # sklearn DBSCAN: predict by finding the nearest core point.
                    labels = model.fit_predict(scaled)
                    cluster_label = int(labels[0])
                    notes.append(f"DBSCAN label={cluster_label}")
                risk += 0.2 if cluster_label == -1 else 0.1 if cluster_label >= 1 else 0
            except Exception as exc:
                notes.append(f"Clustering unavailable: {exc}")
                # Rule-based fallback.
                if data.ssta > 1.5 and data.tsa > 8:
                    cluster_label = -1
                elif data.ssta > 0.7 or data.tsa > 4:
                    cluster_label = 1
        else:
            if data.ssta > 1.5 and data.tsa > 8:
                cluster_label = -1
            elif data.ssta > 0.7 or data.tsa > 4:
                cluster_label = 1

        cluster = "Anomalous" if cluster_label == -1 else "Stressed" if cluster_label >= 1 else "Safe"
        return EnvironmentResponse(cluster=cluster, risk_score=min(risk, 1.0), notes=" ".join(notes) or "Nominal conditions.")
