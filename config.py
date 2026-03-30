"""애플리케이션 설정"""
import os

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "윤경식")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "changeme123!")

TARGET_YEAR = 2026

# 부서 목록 (한글 통일)
DEPARTMENTS = ["시스템사업부", "유통사업부", "경영지원팀"]

# Division 키 (DB 내부용, OctoVision)
DIVISIONS = {
    "시스템사업부": "System",
    "유통사업부": "Distribution",
    "경영지원팀": "Management",
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
