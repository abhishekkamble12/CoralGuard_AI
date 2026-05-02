import logging
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


def _create_engine_with_fallback():
    primary = create_engine(settings.database_url, pool_pre_ping=True)
    try:
        with primary.connect():
            logger.info("Connected to primary database.")
        return primary
    except OperationalError as exc:
        fallback_url = "sqlite:///./coralguard.db"
        logger.warning(
            "Primary database unavailable (%s). Falling back to local SQLite at %s",
            exc,
            fallback_url,
        )
        fallback = create_engine(fallback_url, pool_pre_ping=True)
        with fallback.connect():
            logger.info("Connected to fallback SQLite database.")
        return fallback


engine = _create_engine_with_fallback()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
