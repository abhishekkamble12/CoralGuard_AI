from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db

# auto_error=False lets us return a proper 401 instead of FastAPI's default 403
# when the Authorization header is missing entirely.
security = HTTPBearer(auto_error=False)


def get_current_user_id(
    token: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> int:
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    settings = get_settings()
    try:
        payload = jwt.decode(token.credentials, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return int(payload["sub"])
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
