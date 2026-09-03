# --- Production Dockerfile for FastAPI Backend ---
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PYTHONPATH=/app/backend

WORKDIR /app

# Install system dependencies (including compiler tools, curl, LibreOffice, and Gujarati fonts)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    curl \
    libreoffice-nogui \
    fonts-gargi \
    fonts-noto-core \
    fonts-samyak-gujr \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir gunicorn uvicorn psutil

# Copy backend application code
COPY backend/ ./backend/

# Create necessary directories
RUN mkdir -p backend/uploads/templates_storage \
             backend/uploads/outputs \
             backend/uploads/temp_renders \
             backend/uploads/temp_previews \
             backend/backups \
             backend/data

# Expose port
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

# Start script
CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "backend.main:app"]
