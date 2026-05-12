# 🚀 SynapEscrow - Innov8ors

> **AI-powered freelancer marketplace with intelligent ranking, semantic matching, and escrow payment system.**

A full-stack platform built on modern tech: Node.js, Next.js, Python ML, and microservices architecture.

---

## 📑 Table of Contents

- [Project Overview](#-project-overview)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Setup Instructions](#-setup-instructions)
- [Running the Project](#-running-the-project)
- [Databases](#-databases)
- [Common Issues](#-common-issues)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [Deployment](#-deployment)

---

## 🎯 Project Overview

**SynapEscrow** is an innovative freelancer marketplace that combines:

- **AI-Powered Matching**: ML ranking system using XGBoost to intelligently match freelancers with jobs
- **Semantic Search**: FastAPI embedding service for semantic understanding of job descriptions
- **Secure Escrow**: Contract-based payment system with milestone-based disbursement
- **Real-time Collaboration**: Chat and proposal systems with AI assistance
- **Quality Metrics**: Freelancer quality score tracking and reputation system

Perfect for freelancers, clients, and platforms looking to improve hiring accuracy using AI.

---

## 🛠️ Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Backend** | Node.js 18+ / Express | REST APIs, authentication, business logic |
| **Frontend** | Next.js, React, Tailwind CSS | Web UI, real-time updates |
| **Database** | MongoDB | User profiles, projects, proposals, chats |
| **ML Database** | PostgreSQL 14+ | ML ranking system data |
| **Embeddings** | FastAPI, Sentence Transformers | Semantic search & matching |
| **ML Pipeline** | Python, XGBoost, Pandas | Freelancer ranking & predictions |
| **Auth** | JWT + bcryptjs | Secure authentication |
| **AI Models** | Google Gemini, Groq, OpenAI | Content generation & analysis |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (Next.js)                     │
│              (http://localhost:3000)                     │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                   Backend (Express)                      │
│              (http://localhost:5000)                     │
│    ┌──────────────┬──────────────┬──────────────┐       │
│    │ Auth Routes  │ API Routes   │ ML Routes    │       │
│    └──────────────┴──────────────┴──────────────┘       │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
┌───────▼─────┐  ┌──▼──────┐  ┌──▼──────────────┐
│  MongoDB    │  │FastAPI  │  │PostgreSQL       │
│  (Users,    │  │(Embeddig│  │(ML Data,        │
│  Projects,  │  │Service) │  │Rankings)        │
│  Proposals) │  └─────────┘  └─────────────────┘
└─────────────┘
```

---

## 📦 Project Structure

```
Innov8ors/
├── backend/                      # Express.js API server
│   ├── controllers/              # Business logic
│   ├── models/                   # Mongoose schemas
│   ├── routes/                   # API endpoints
│   ├── middleware/               # Auth, error handling
│   ├── services/                 # Reusable services
│   ├── config/                   # Database configs
│   ├── prisma/                   # PostgreSQL schema
│   └── server.js                 # Entry point
├── frontend/                     # Next.js React app
│   ├── components/               # Reusable components
│   ├── pages/                    # Next.js routes
│   ├── services/                 # API client
│   ├── styles/                   # Tailwind CSS
│   └── next.config.js            # Config
├── embedding-service/            # FastAPI embedding microservice
│   ├── main.py                   # FastAPI app
│   └── requirements.txt           # Python dependencies
├── ml-ranking-system/            # ML ranking pipeline
│   ├── 01_schema.sql             # PostgreSQL schema
│   ├── 02_synthetic_data_generator.py
│   ├── 03_feature_engineering.py
│   ├── 04_xgboost_training.py
│   ├── 05_inference_pipeline.py
│   ├── 06_api_server.py          # Optional ML API
│   └── requirements.txt           # Python dependencies
└── README.md                     # This file
```

---

## 📋 Prerequisites

Install these before starting:

- **Node.js 18+** (LTS recommended) - [Download](https://nodejs.org/)
- **npm 9+** or **yarn** - Comes with Node.js
- **Python 3.10 or 3.11** - [Download](https://www.python.org/)
- **MongoDB** (local or Atlas) - [Installation Guide](https://docs.mongodb.com/manual/installation/)
- **PostgreSQL 14+** - [Download](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/)

### Verify Installation

```bash
node -v           # Should be v18.x.x or higher
npm -v            # Should be 9.x.x or higher
python --version  # Should be 3.10 or 3.11
psql --version    # Should be 14 or higher
```

---

## 🔧 Installation

## 🔧 Installation

### Step 1: Clone Repository

```bash
git clone <your-repo-url>
cd Innov8ors
```

### Step 2: Install Root Dependencies

```bash
npm install
```

### Step 3: Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

### Step 4: Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

---

## ⚙️ Setup Instructions

### 1️⃣ Backend Setup (Node.js + MongoDB + Express)

#### 1.1 Create Backend Environment File

Create `backend/.env`:

```env
# ====== Server Configuration ======
PORT=5000
NODE_ENV=development

# ====== MongoDB Configuration ======
# For local MongoDB:
MONGO_URI=mongodb://127.0.0.1:27017/synapescrow
# OR for MongoDB Atlas (cloud):
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/synapescrow

# ====== Authentication ======
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRY=7d

# ====== AI API Keys ======
GEMINI_API_KEY=your_gemini_key_here
GROQ_API_KEY=your_groq_key_here
OPENAI_API_KEY=your_openai_key_here

# ====== Microservices URLs ======
EMBEDDING_SERVICE_URL=http://127.0.0.1:8001
ML_API_URL=http://127.0.0.1:8000

# ====== ML System Configuration ======
ML_PYTHON_PATH=python
ML_MODEL_PATH=../ml-ranking-system/ranking_model.pkl
ML_SCALER_PATH=../ml-ranking-system/scaler.pkl

# ====== Database URLs (Optional - for Prisma/PostgreSQL) ======
DATABASE_URL=postgresql://user:password@localhost:5432/synapescrow

# ====== Payment Gateway (Optional) ======
RAZORPAY_API_KEY=your_razorpay_key
RAZORPAY_API_SECRET=your_razorpay_secret

# ====== Frontend URL ======
FRONTEND_URL=http://localhost:3000
API_BASE_URL=http://localhost:5000
```

#### 1.2 Setup MongoDB

**Option A: Local MongoDB**
```bash
# Windows
mongod

# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

**Option B: MongoDB Atlas (Cloud)**
1. Create account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster and get connection URI
3. Add to `backend/.env` as `MONGO_URI`

#### 1.3 Start Backend Server

```bash
cd backend
npm run dev
```

Expected output:
```
✅ Server running on http://localhost:5000
✅ MongoDB connected
```

**Health Check:**
```bash
curl http://localhost:5000/health
```

---

### 2️⃣ Frontend Setup (Next.js)

### 2️⃣ Frontend Setup (Next.js)

#### 2.1 Create Frontend Environment File

Create `frontend/.env.local`:

```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
NEXT_PUBLIC_EMBEDDING_SERVICE_URL=http://127.0.0.1:8001

# Payment Gateway (Optional)
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_public_key

# Analytics (Optional)
NEXT_PUBLIC_GA_ID=your_google_analytics_id

# Feature Flags
NEXT_PUBLIC_ENABLE_ML_RANKING=true
```

#### 2.2 Start Frontend Server

```bash
cd frontend
npm run dev
```

Expected output:
```
➜ Local: http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### 3️⃣ Embedding Service Setup (FastAPI + Python)

### 3️⃣ Embedding Service Setup (FastAPI + Python)

This service provides semantic embeddings for job/freelancer matching.

#### 3.1 Create Python Virtual Environment

Open a **new terminal**:

```bash
cd embedding-service
python -m venv .venv
```

#### 3.2 Activate Virtual Environment

**Windows PowerShell:**
```powershell
.\.venv\Scripts\Activate.ps1
```

**macOS/Linux:**
```bash
source .venv/bin/activate
```

#### 3.3 Install Dependencies & Run

```bash
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```

Expected output:
```
INFO: Uvicorn running on http://127.0.0.1:8001
```

**Health Check:**
```bash
curl http://127.0.0.1:8001/health
```

---

### 4️⃣ ML Ranking System Setup (Python + PostgreSQL)

### 4️⃣ ML Ranking System Setup (Python + PostgreSQL)

This system uses XGBoost to intelligently rank freelancers for job matches.

#### 4.1 Create PostgreSQL Database

**Option A: Using psql command**
```bash
createdb synapescrow_ml
```

**Option B: Using SQL directly**
```bash
psql -U postgres
CREATE DATABASE synapescrow_ml;
\q
```

**Option C: Using pgAdmin GUI**
1. Open pgAdmin
2. Right-click Databases → Create → Database
3. Name: `synapescrow_ml`

#### 4.2 Create Python Virtual Environment

Open a **new terminal**:

```bash
cd ml-ranking-system
python -m venv .venv
```

Activate venv (same commands as embedding service).

#### 4.3 Create ML Environment File

Copy example:

**Windows:**
```powershell
Copy-Item .env.example .env
```

**macOS/Linux:**
```bash
cp .env.example .env
```

Edit `ml-ranking-system/.env`:

```env
# ====== PostgreSQL Configuration ======
DB_HOST=localhost
DB_PORT=5432
DB_NAME=synapescrow_ml
DB_USER=postgres
DB_PASSWORD=your_password

# OR use connection string:
# DATABASE_URL=postgresql://postgres:password@localhost:5432/synapescrow_ml

# ====== Model Paths ======
ML_MODEL_PATH=./ranking_model.pkl
ML_SCALER_PATH=./scaler.pkl

# ====== API Configuration ======
ML_API_HOST=127.0.0.1
ML_API_PORT=8000
```

#### 4.4 Initialize Database Schema

```bash
psql -d synapescrow_ml -f 01_schema.sql
```

You should see:
```
CREATE TABLE
CREATE INDEX
...
```

#### 4.5 Choose Your Path

**🎯 Option A: Quick Start (Recommended for beginners)**

Use included pre-trained model artifacts:

```bash
# Models already exist:
# - ranking_model.pkl
# - scaler.pkl
# No training needed!
```

**🔬 Option B: Train From Scratch**

Only do this if you want to regenerate models:

```bash
pip install -r requirements.txt

# Generate synthetic training data
python 02_synthetic_data_generator.py

# Engineer features
python 03_feature_engineering.py

# Train XGBoost model
python 04_xgboost_training.py

# Creates: ranking_model.pkl, scaler.pkl
```

#### 4.6 (Optional) Run ML API Server

To expose ranking via REST API:

```bash
python 06_api_server.py
```

API docs: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)

---

## 🚀 Running the Project

## 🚀 Running the Project

### All 4 Services Together

Open **4 separate terminals** and run these commands in order:

**Terminal 1 - Backend**
```bash
cd backend
npm run dev
# Output: Server running on http://localhost:5000
```

**Terminal 2 - Frontend**
```bash
cd frontend
npm run dev
# Output: ➜ Local: http://localhost:3000
```

**Terminal 3 - Embedding Service**
```bash
cd embedding-service
source .venv/bin/activate  # or .\.venv\Scripts\Activate.ps1 on Windows
uvicorn main:app --host 127.0.0.1 --port 8001 --reload
# Output: Uvicorn running on http://127.0.0.1:8001
```

**Terminal 4 - ML System (Optional)**
```bash
cd ml-ranking-system
source .venv/bin/activate  # or .\.venv\Scripts\Activate.ps1 on Windows
python 06_api_server.py
# Output: Uvicorn running on http://127.0.0.1:8000
```

### Quick Smoke Test

Verify everything is running:

```bash
# Backend health
curl http://localhost:5000/health

# Embedding service health
curl http://127.0.0.1:8001/health

# ML API health (if running)
curl http://127.0.0.1:8000/api/health
```

**You're done!** Open [http://localhost:3000](http://localhost:3000) and explore.

---

## 📊 Databases

### MongoDB (Main Database)

Stores user data, projects, proposals, chats, etc.

**Connection String Examples:**
- Local: `mongodb://127.0.0.1:27017/synapescrow`
- Atlas: `mongodb+srv://user:pass@cluster.mongodb.net/synapescrow`

**Useful Tools:**
- MongoDB Compass (GUI): [mongodb.com/products/compass](https://www.mongodb.com/products/compass)
- VS Code Extension: "MongoDB for VS Code"

### PostgreSQL (ML System Data)

Stores freelancer profiles, features, and ranking data.

**Connection String:**
```
postgresql://user:password@localhost:5432/synapescrow_ml
```

**Schema Files:**
- `ml-ranking-system/01_schema.sql` - All tables and indexes

**Useful Tools:**
- pgAdmin (GUI): [pgadmin.org](https://www.pgadmin.org/)
- DBeaver: [dbeaver.io](https://dbeaver.io/)

---

## ⚠️ Common Issues & Solutions

## ⚠️ Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| `MongoDB connection error` | Mongo not running or wrong URI | Start MongoDB: `mongod` or verify Atlas connection string |
| `Port 5000 already in use` | Another process using port | Change port: `PORT=5001 npm run dev` in backend/.env |
| `Port 3000 already in use` | Another process using port | Kill process: `lsof -ti:3000 \| xargs kill -9` (macOS/Linux) |
| `Embedding service unavailable` | FastAPI not running | Start embedding service on port 8001 |
| `ModuleNotFoundError: No module...` | Missing Python packages | Run: `pip install -r requirements.txt` in relevant directory |
| `psql: command not found` | PostgreSQL not in PATH | Add PostgreSQL bin to PATH or use pgAdmin |
| `EADDRINUSE: address already in use` | Port conflict | Check and kill process on that port |
| `JWT_SECRET not set` | Missing env variable | Add `JWT_SECRET=your_secret` to backend/.env |
| `ML model not found` | Model artifacts missing | Run training scripts: `python 04_xgboost_training.py` |
| `CORS error in frontend` | Backend not accessible | Check `NEXT_PUBLIC_API_BASE_URL` in frontend/.env.local |

### Detailed Troubleshooting

**🔴 Backend Won't Start**
```bash
# Check logs for errors
cd backend
npm run dev

# If port issue:
PORT=5001 npm run dev

# If dependency issue:
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**🔴 Frontend Shows "API Unreachable"**
```bash
# Verify backend is running
curl http://localhost:5000/health

# Check frontend env file
cat frontend/.env.local

# Ensure NEXT_PUBLIC_API_BASE_URL matches backend port
```

**🔴 Python Virtual Environment Issues**
```bash
# Reinstall venv
rm -rf .venv
python -m venv .venv
source .venv/bin/activate  # or .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**🔴 PostgreSQL Connection Failed**
```bash
# Test connection
psql -h localhost -U postgres -d synapescrow_ml

# If password issues, check .env
# Verify DATABASE_URL format: postgresql://user:password@host:port/dbname
```

---

## 🧪 Testing

### Backend API Testing

**Using Postman:**
1. Import `backend/` routes from VS Code
2. Update base URL to `http://localhost:5000`
3. Test endpoints with sample data

**Using curl:**
```bash
# Health check
curl http://localhost:5000/health

# Get projects (requires auth token)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:5000/api/projects
```

### Running Tests

```bash
# Backend tests (if setup)
cd backend
npm test

# ML system tests
cd ml-ranking-system
pytest tests/
```

---

## 🤝 Contributing

### Code Style

- **Backend**: Follow Express.js conventions
- **Frontend**: Use Tailwind CSS for styling
- **Python**: Follow PEP 8 standards

### Making Changes

1. Create a feature branch:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes and commit:
```bash
git add .
git commit -m "feat: add your feature description"
```

3. Push and create a pull request:
```bash
git push origin feature/your-feature-name
```

### Commit Message Format

```
feat: add new feature
fix: fix bug in component
docs: update README
refactor: improve code structure
style: fix formatting
test: add test cases
```

---

## 🌍 Deployment

### Environment Setup for Production

Update environment variables for production:

**Backend (.env)**
```env
NODE_ENV=production
PORT=5000
JWT_SECRET=use_strong_secret_key_here
MONGO_URI=mongodb+srv://production:creds@cluster.mongodb.net/synapescrow
```

**Frontend (.env.production.local)**
```env
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
```

### Deployment Platforms

**Backend (Node.js)**
- Heroku
- Railway.app
- DigitalOcean
- AWS EC2 / Elastic Beanstalk

**Frontend (Next.js)**
- Vercel (recommended)
- Netlify
- AWS Amplify

**Databases**
- MongoDB Atlas (cloud)
- AWS RDS (PostgreSQL)

**Microservices**
- Deploy embedding-service and ml-ranking-system on separate Python hosting

---

## 📚 Additional Resources

- [Express.js Docs](https://expressjs.com/)
- [Next.js Docs](https://nextjs.org/docs)
- [MongoDB Docs](https://docs.mongodb.com/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [XGBoost Docs](https://xgboost.readthedocs.io/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

## 📄 License & Support

**License**: MIT (or your preferred license)

**Questions?** Open an issue on GitHub or contact the dev team.

**Found a bug?** Create an issue with:
- Steps to reproduce
- Error message/logs
- Environment details (OS, Node version, etc.)

---

## 🎉 Quick Reference

| Command | Purpose |
|---------|---------|
| `npm install` | Install root dependencies |
| `cd backend && npm run dev` | Start backend server |
| `cd frontend && npm run dev` | Start frontend |
| `cd embedding-service && uvicorn main:app --reload` | Start embeddings |
| `cd ml-ranking-system && python 06_api_server.py` | Start ML API |
| `createdb synapescrow_ml` | Create ML database |
| `psql -d synapescrow_ml -f 01_schema.sql` | Initialize ML schema |

---

**Happy coding! 🚀**
