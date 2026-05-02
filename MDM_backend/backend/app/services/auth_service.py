from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.entities import User
from app.schemas.common import LoginRequest, RegisterRequest


class AuthService:
    def register(self, db: Session, payload: RegisterRequest) -> User:
        existing = db.query(User).filter(User.email == payload.email).first()
        if existing:
            raise ValueError("Email already registered")
        user = User(email=payload.email, password_hash=hash_password(payload.password), full_name=payload.full_name)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    def login(self, db: Session, payload: LoginRequest) -> str:
        user = db.query(User).filter(User.email == payload.email).first()
        if not user or not verify_password(payload.password, user.password_hash):
            raise ValueError("Invalid credentials")
        return create_access_token(str(user.id))
