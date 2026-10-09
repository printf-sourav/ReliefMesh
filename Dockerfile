FROM node:22-bookworm-slim AS frontend
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 RELIEFMESH_FRONTEND_DIR=/app/web
COPY requirements-backend.txt ./
RUN pip install --no-cache-dir -r requirements-backend.txt
COPY api/ api/
COPY database/ database/
COPY services/ services/
COPY utils/ utils/
COPY sample_data/ sample_data/
COPY --from=frontend /web/dist/ /app/web/
RUN mkdir -p /var/data/uploads
EXPOSE 10000
CMD ["sh", "-c", "exec uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
