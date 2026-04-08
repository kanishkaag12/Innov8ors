# Innov8ors (SynapEscrow)

Full-stack project with:

- `backend/`: Node.js + Express + MongoDB APIs
- `frontend/`: Next.js web app
- `embedding-service/`: FastAPI sentence embedding microservice
- `ml-ranking-system/`: Python ML ranking pipeline + optional FastAPI serving API

This guide is written so a new developer can set up everything on a laptop from scratch.

## 1) Prerequisites

Install these first:

- Node.js 18+ (LTS recommended)
- npm 9+
- Python 3.10 or 3.11
- MongoDB (local or Atlas URI)
- PostgreSQL 14+ (needed for ML ranking system)
- Git

Verify:

```bash
node -v
npm -v
python --version
psql --version
```

## 2) Clone And Move Into Project

```bash
git clone <your-repo-url>
cd Innov8ors
```

## 3) Install Node Dependencies

Install root, backend, and frontend dependencies:

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

## 4) Backend Setup (Mongo + APIs)

Create `backend/.env` with this template:

```env
# Server
PORT=5000

# MongoDB (required)
MONGO_URI=mongodb://127.0.0.1:27017/synapescrow
# or use MONGODB_URI instead of MONGO_URI

# Auth
JWT_SECRET=replace_with_a_strong_secret

# AI keys
GEMINI_API_KEY=replace_with_your_key
GROQ_API_KEY=replace_with_your_key

# Optional integrations
GITHUB_TOKEN=

# Embedding microservice
EMBEDDING_SERVICE_URL=http://127.0.0.1:8001

# Optional ML runtime overrides
ML_PYTHON_PATH=python
ML_MODEL_PATH=
ML_SCALER_PATH=

# Optional (used by some scripts)
API_BASE_URL=http://localhost:5000

# Optional (Prisma/Postgres utilities)
DATABASE_URL=
```

Start backend:

```bash
cd backend
npm run dev
```

Health check: `http://localhost:5000/health`

## 5) Frontend Setup (Next.js)

Create `frontend/.env.local`:

```env
# Optional (code has a default test key fallback)
NEXT_PUBLIC_RAZORPAY_KEY_ID=
```

Start frontend:

```bash
cd frontend
npm run dev
```

Open: `http://localhost:3000`

## 6) Embedding Service Setup (Python + FastAPI)

In a new terminal:

```bash
cd embedding-service
python -m venv .venv
```

Activate venv:

- Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

- macOS/Linux:

```bash
source .venv/bin/activate
```

Install and run:

```bash
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```

Health check: `http://127.0.0.1:8001/health`

## 7) ML Ranking System Setup (Python + PostgreSQL)

### 7.1 Create PostgreSQL Database

```bash
createdb synapescrow_ml
```

If `createdb` is unavailable, create it using pgAdmin or SQL:

```sql
CREATE DATABASE synapescrow_ml;
```

### 7.2 Python Environment

In another terminal:

```bash
cd ml-ranking-system
python -m venv .venv
```

Activate venv (same commands as above), then:

```bash
pip install -r requirements.txt
```

### 7.3 Environment File

Copy env template:

- Windows:

```powershell
Copy-Item .env.example .env
```

- macOS/Linux:

```bash
cp .env.example .env
```

Edit `.env` and set Postgres credentials (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` or `DATABASE_URL`).

### 7.4 Initialize ML DB And Train Model

```bash
psql -d synapescrow_ml -f 01_schema.sql
python 02_synthetic_data_generator.py
python 03_feature_engineering.py
python 04_xgboost_training.py
```

This should generate model artifacts (for example `ranking_model.pkl` and `scaler.pkl`) used by ranking logic.

### 7.5 Optional: Run ML API Server

```bash
python 06_api_server.py
```

Docs: `http://localhost:8000/api/docs`

## 8) Recommended Run Order (Full Project)

Use 4 terminals:

1. `backend/` -> `npm run dev`
2. `frontend/` -> `npm run dev`
3. `embedding-service/` -> `uvicorn main:app --host 127.0.0.1 --port 8001 --reload`
4. `ml-ranking-system/` -> run training scripts once; optionally run `python 06_api_server.py`

## 9) Quick Smoke Test

1. Backend health: `GET http://localhost:5000/health`
2. Embedding health: `GET http://127.0.0.1:8001/health`
3. Frontend opens at `http://localhost:3000`
4. ML API health (if running): `GET http://localhost:8000/api/health`

## 10) Common Issues

- `MongoDB connection error`: verify `MONGO_URI` or `MONGODB_URI` and ensure MongoDB is reachable.
- `Port 5000 already in use`: stop existing process or set `PORT` in `backend/.env`.
- `Embedding service unavailable`: ensure FastAPI service is running on port `8001` and `EMBEDDING_SERVICE_URL` matches.
- `ML predictor exited with code ...`: confirm ML venv has dependencies and model files were created by `04_xgboost_training.py`.
- `psql command not found`: add PostgreSQL bin directory to PATH or use pgAdmin.

## 11) Useful Scripts

From repo root:

- `npm run dev` -> starts backend dev server (`backend/server.js`)
- `npm run frontend-dev` -> starts frontend dev server

From `backend/`:

- `npm run dev` -> backend with nodemon
- `npm run seed:ml:test` -> seed ML ranking test data

---

If you want, I can also add ready-to-use `backend/.env.example` and `frontend/.env.example` files so setup becomes copy/paste only.
