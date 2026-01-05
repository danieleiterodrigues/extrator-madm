# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
# Set empty API URL for production build (relative path)
ENV VITE_API_URL=""
RUN npm run build

# Stage 2: Backend Runtime
FROM python:3.10-slim
WORKDIR /app

# Install system dependencies if needed (for psycopg2, etc)
# RUN apt-get update && apt-get install -y libpq-dev gcc

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
# Check directory structure: app/main.py is expected
COPY backend/app ./app

# Copy built frontend to static folder
COPY --from=frontend-build /app/frontend/dist ./static

# Expose port (Railway uses PORT env var)
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
