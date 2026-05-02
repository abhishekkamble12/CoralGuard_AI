import io
import os
from dataclasses import dataclass
import numpy as np
from PIL import Image
import tensorflow as tf

from app.core.config import get_settings

CLASSES = ["Healthy", "Bleached", "Dead"]


@dataclass
class VisionResult:
    class_name: str
    confidence: float
    probabilities: dict[str, float]
    low_confidence: bool
    gradcam_hint: str


class VisionInferenceService:
    """Singleton-style lazy model loader for image inference."""

    _model: tf.keras.Model | None = None

    def __init__(self) -> None:
        self.settings = get_settings()

    def _load_model(self) -> tf.keras.Model:
        if VisionInferenceService._model is None:
            path = self.settings.model_path
            if not os.path.exists(path):
                raise FileNotFoundError(f"Vision model not found: {path}")
            VisionInferenceService._model = tf.keras.models.load_model(path)
        return VisionInferenceService._model

    def _preprocess(self, image_bytes: bytes) -> np.ndarray:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB").resize((224, 224))
        arr = np.array(image, dtype=np.float32) / 255.0
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        arr = (arr - mean) / std
        return np.expand_dims(arr, axis=0)

    def predict(self, image_bytes: bytes, threshold: float = 0.65) -> VisionResult:
        model = self._load_model()
        inp = self._preprocess(image_bytes)
        preds = model.predict(inp, verbose=0)[0]
        if np.any(preds < 0) or not np.isclose(np.sum(preds), 1.0, atol=1e-3):
            ex = np.exp(preds - np.max(preds))
            preds = ex / ex.sum()
        idx = int(np.argmax(preds))
        confidence = float(preds[idx])
        class_name = CLASSES[idx]
        probs = {name: float(preds[i]) for i, name in enumerate(CLASSES)}
        return VisionResult(
            class_name=class_name,
            confidence=confidence,
            probabilities=probs,
            low_confidence=confidence < threshold,
            gradcam_hint="Use /predict/image?explain=true to fetch heatmap from future hook.",
        )
