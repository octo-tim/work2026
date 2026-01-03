FROM python:3.9-slim

# Non-root 사용자 생성
RUN useradd -m -u 1000 appuser && \
    mkdir -p /app /app/uploads && \
    chown -R appuser:appuser /app

WORKDIR /app

# Root로 패키지 설치 (시스템 레벨)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 파일 복사
COPY --chown=appuser:appuser . .

# Non-root 사용자로 전환
USER appuser

# 포트 노출
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
