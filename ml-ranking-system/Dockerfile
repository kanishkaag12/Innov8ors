# ============================================================
# SynapEscrow ML Ranking System
# Python FastAPI + XGBoost inference server
# Port: 8000
#
# IMPORTANT: The backend also calls 08_model_predict.py as a
# child process.  Both services share the /app/ml-ranking-system
# volume so the .pkl model files are accessible to both.
# ============================================================
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        g++ \
        curl \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies (heavy – cached as its own layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the embedding model used during feature engineering
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Copy all source files
COPY . .

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

# Run the FastAPI inference server
CMD ["python", "-m", "uvicorn", "06_api_server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
