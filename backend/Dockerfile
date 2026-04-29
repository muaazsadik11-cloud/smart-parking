# ─────────────────────────────────────────────
# Smart Parking System — Dockerfile
# ─────────────────────────────────────────────
FROM python:3.11-slim

# System dependencies: Tesseract OCR + OpenCV libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create required directories
RUN mkdir -p uploads/annotated dataset models

# Expose dynamic port
ENV PORT=5000
EXPOSE $PORT

# Production server
CMD gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 app:app
