"""유틸리티 함수"""
from datetime import datetime, timedelta
from typing import Optional
from passlib.context import CryptContext
from jose import jwt
import config

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, config.SECRET_KEY, algorithm=config.ALGORITHM)


def safe_float(val) -> float:
    try:
        if val is None:
            return 0.0
        return float(str(val).replace(',', ''))
    except (ValueError, AttributeError):
        return 0.0


def parse_date(date_str: Optional[str], fmt: str = "%Y-%m-%d"):
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, fmt).date()
    except (ValueError, TypeError):
        return None
