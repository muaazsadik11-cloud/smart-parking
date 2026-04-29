# ─────────────────────────────────────────────
# Smart Parking System — Dockerfile (FIXED)
# ─────────────────────────────────────────────
FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive

# System dependencies: Tesseract OCR + OpenCV libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create required directories
RUN mkdir -p uploads/annotated dataset models

# Environment
ENV PORT=5000
EXPOSE 5000

# Production server
CMD gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 app:app