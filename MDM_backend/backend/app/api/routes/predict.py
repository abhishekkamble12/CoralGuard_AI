from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.deps import get_current_user_id
from app.ml.environment_service import EnvironmentAnalysisService
from app.ml.vision_service import VisionInferenceService
from app.schemas.common import EnvironmentalInput, EnvironmentResponse, VisionResponse

router = APIRouter(prefix="/predict", tags=["predict"])
vision_service = VisionInferenceService()
env_service = EnvironmentAnalysisService()


@router.post("/image", response_model=VisionResponse)
async def predict_image(
    file: UploadFile = File(...),
    _: int = Depends(get_current_user_id),
):
    if file.content_type not in {"image/jpeg", "image/png", "image/jpg"}:
        raise HTTPException(status_code=400, detail="Only JPEG/PNG images are accepted")
    data = await file.read()
    try:
        out = vision_service.predict(data)
        return VisionResponse(
            class_name=out.class_name,
            confidence=out.confidence,
            probabilities=out.probabilities,
            low_confidence=out.low_confidence,
            gradcam_hint=out.gradcam_hint,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Vision inference failed: {exc}") from exc


@router.post("/environment", response_model=EnvironmentResponse)
async def predict_environment(
    payload: EnvironmentalInput,
    _: int = Depends(get_current_user_id),
):
    return env_service.analyze(payload)
