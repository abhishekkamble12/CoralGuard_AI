from datetime import datetime
from typing import Literal
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=2, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class EnvironmentalInput(BaseModel):
    ssta: float = Field(ge=-8, le=8)
    tsa: float = Field(ge=0, le=24)
    depth: float = Field(ge=0, le=200)
    salinity: float | None = Field(default=None, ge=0, le=50)
    turbidity: float | None = Field(default=None, ge=0, le=500)
    chlorophyll: float | None = Field(default=None, ge=0, le=100)
    ph: float | None = Field(default=None, ge=6.0, le=9.5)


class VisionResponse(BaseModel):
    class_name: Literal["Healthy", "Bleached", "Dead"]
    confidence: float
    probabilities: dict[str, float]
    low_confidence: bool = False
    gradcam_hint: str | None = None


class EnvironmentResponse(BaseModel):
    cluster: Literal["Safe", "Stressed", "Anomalous"]
    risk_score: float
    notes: str


class FusionResponse(BaseModel):
    final_risk: Literal["Low", "Elevated", "Critical"]
    confidence: float
    reasoning: str
    recommended_action: str


class AnalyzeRequest(BaseModel):
    session_id: int
    user_id: int
    environment: EnvironmentalInput
    vision_override: VisionResponse | None = None


class ReportResponse(BaseModel):
    risk_level: str
    summary: str
    scientific_reasoning: str
    recommended_action: str
    confidence: float
    citations: list[dict] = []


class ChatRequest(BaseModel):
    session_id: int
    user_id: int
    message: str


class RagSearchRequest(BaseModel):
    session_id: int
    query: str
    top_k: int = Field(default=5, ge=1, le=20)


class RagSearchResponse(BaseModel):
    results: list[dict]
    summary: str


class AlertTestRequest(BaseModel):
    analysis_id: int
    risk_level: str = "Critical"
    confidence: float = 0.95


class HistoryResponse(BaseModel):
    session_id: int
    messages: list[dict]
    analyses: list[dict]


class ReportEntityResponse(BaseModel):
    analysis_id: int
    created_at: datetime
    report: dict


class AnalystReport(BaseModel):
    summary: str
    scientific_reasoning: str
    recommended_action: str
    precautionary_measures: str
    authority_action_needed: bool
    confidence: float


class ValidationResult(BaseModel):
    is_valid: bool
    feedback: str
    suggested_revisions: list[str] = []


class ReasoningStep(BaseModel):
    agent_name: str
    action: str
    output: str
    timestamp: datetime = Field(default_factory=datetime.now)


class MultiAgentAnalysisResponse(BaseModel):
    analysis_id: int
    vision: VisionResponse
    environment: EnvironmentResponse
    fusion: FusionResponse
    report: AnalystReport
    validation: ValidationResult
    reasoning_log: list[ReasoningStep]
    alerts: list[dict]
