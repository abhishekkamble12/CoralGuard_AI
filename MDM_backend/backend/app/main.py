import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import analyze, auth, chat_rag_alerts, predict
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.init_db import init_db
from app.utils.rate_limiter import InMemoryRateLimiter

configure_logging()
logger = logging.getLogger(__name__)
settings = get_settings()
limiter = InMemoryRateLimiter(settings.rate_limit_per_minute)
cors_origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]

app = FastAPI(title=settings.app_name)

# CORS middleware must be registered BEFORE any custom middleware so that
# preflight OPTIONS requests receive the correct headers even when the
# rate-limiter or error handler short-circuits the response.
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all handler that logs the error and returns a JSON 500.

    FastAPI's internal ServerErrorMiddleware generates the 500 response *before*
    CORSMiddleware can add headers, so the browser sees a CORS block instead of
    the real error.  Registering an explicit exception_handler here runs inside
    the app (after CORS middleware) and ensures the response always carries the
    correct Access-Control-Allow-Origin header.
    """
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)},
    )


@app.middleware("http")
async def request_logger(request: Request, call_next):
    logger.info("Request %s %s", request.method, request.url.path)
    # Skip rate-limiting for CORS preflight requests so OPTIONS always succeeds.
    if request.method != "OPTIONS" and not limiter.allowed(
        request.client.host if request.client else "unknown"
    ):
        return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})
    response = await call_next(request)
    return response


@app.on_event("startup")
def startup() -> None:
    init_db()
    logger.info("Database initialized")


app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(predict.router, prefix=settings.api_prefix)
app.include_router(analyze.router, prefix=settings.api_prefix)
app.include_router(chat_rag_alerts.router, prefix=settings.api_prefix)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "coralguard-backend"}
