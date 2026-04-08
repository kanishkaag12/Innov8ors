# 🚀 ML Ranking System - Setup Guide

Complete step-by-step guide to implement the ML ranking system.

---

## Phase 1: Prerequisites

### 1.1 System Requirements
- Python 3.10+
- PostgreSQL 13+
- 8GB+ RAM (for embeddings)
- 50GB+ disk space (for models & data)

### 1.2 Software Installation

```bash
# Install PostgreSQL (if not already installed)
# macOS:
brew install postgresql
brew services start postgresql

# Ubuntu:
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql

# Windows:
# Download from https://www.postgresql.org/download/windows/
```

### 1.3 Python Setup

```bash
# Create virtual environment
python -m venv venv

# Activate
# Linux/macOS:
source venv/bin/activate

# Windows:
venv\Scripts\activate

# Verify Python version
python --version  # Should be 3.10+
```

---

## Phase 2: Database Setup

### 2.1 Create Database

```bash
# Create PostgreSQL database
createdb synapescrow_ml

# Verify creation
psql -l | grep synapescrow_ml
```

### 2.2 Apply Schema

```bash
# Navigate to project directory
cd ml-ranking-system

# Apply schema
psql synapescrow_ml < 01_schema.sql

# Verify tables created
psql synapescrow_ml -c "\dt"
# Should list: users, freelancer_profiles, jobs, proposals, etc.
```

### 2.3 Create .env File

```bash
# Copy template
cp .env.example .env

# Edit with your credentials
# Required:
# - DB_PASSWORD=your_secure_password
# - API_PORT=8000
```

---

## Phase 3: Data Generation

### 3.1 Install Dependencies

```bash
# Install Python packages
pip install -r requirements.txt

# Verify installations
python -c "import xgboost; print(xgboost.__version__)"
python -c "import sentence_transformers; print('✓')"
```

### 3.2 Generate Synthetic Data

```bash
# Generate 1000 freelancers, 500 jobs
python 02_synthetic_data_generator.py

# Expected output:
# ✓ Generated 1000 freelancers and 200 employers
# ✓ Generated 500 skills
# ✓ Assigned skills to 1000 freelancers
# ✓ Generated 500 jobs
# ✓ Assigned skills to 500 jobs
# ✓ Generated ~4000 proposals
# ✓ Initialized metrics for 1000 freelancers
# ✓ Created 800 contracts
# ✓ Created 4000 ML feature snapshots
```

### 3.3 Verify Data

```bash
# Login to PostgreSQL
psql synapescrow_ml

# Check record counts
SELECT COUNT(*) FROM freelancer_profiles;  -- Should be 1000
SELECT COUNT(*) FROM jobs;                 -- Should be 500
SELECT COUNT(*) FROM proposals;            -- Should be ~4000
SELECT COUNT(*) FROM freelancer_metrics;   -- Should be 1000

# Exit
\q
```

---

## Phase 4: Feature Engineering

### 4.1 Run Feature Pipeline

```bash
# This step:
# - Computes embeddings (may take 5-10 minutes)
# - Calculates semantic similarities
# - Computes skill overlaps
# - Generates price fit scores
# - Saves features to PostgreSQL

python 03_feature_engineering.py

# Expected output:
# ✓ Loaded 4000 proposal-job pairs
# ✓ Computing semantic similarities...
# ✓ Computed semantic similarities
# ✓ Computing skill overlaps...
# ✓ Computed skill overlaps
# ✓ Computing price fit scores...
# ✓ Normalized features...
# ✓ Saving features to database...
# ✓ Feature engineering complete!
```

### 4.2 Verify Features

```bash
# Check feature snapshots
psql synapescrow_ml -c "
SELECT COUNT(*) as feature_snapshots, 
       AVG(semantic_similarity_job_proposal) as avg_similarity
FROM ml_feature_snapshots
WHERE semantic_similarity_job_proposal IS NOT NULL;
"

# Should see ~4000 snapshots with >0.4 average similarity
```

---

## Phase 5: Model Training

### 5.1 Train XGBoost Model

```bash
# This step:
# - Loads feature snapshots
# - Groups by job
# - Trains LambdaMART model (100 iterations)
# - Evaluates NDCG
# - Saves model & scaler
# - Stores predictions in PostgreSQL

python 04_xgboost_training.py

# Expected output:
# ✓ Connected to PostgreSQL
# ✓ Loaded 2000 training samples
# ✓ Prepared: 2000 samples, 250 job groups
# ✓ Model trained successfully
# ✓ Top 10 Important Features: ...
# ✓ Evaluation Results: ...
# ✓ Generated 4000 ranking predictions
# ✓ Training pipeline complete!
```

### 5.2 Check Model Artifacts

```bash
# Verify model files created
ls -lh ranking_model.pkl scaler.pkl

# Should be:
# - ranking_model.pkl: 2-5 MB
# - scaler.pkl: ~100 KB
```

---

## Phase 6: Start API Server

### 6.1 Launch FastAPI Server

```bash
# Start the API server
python 06_api_server.py

# Expected output:
# INFO:     Uvicorn running on http://0.0.0.0:8000
# INFO:     Application startup complete
# ✓ ML Ranking Pipeline initialized
```

### 6.2 Access API Documentation

```
# In browser:
http://localhost:8000/api/docs

# You should see interactive Swagger UI with all endpoints
```

### 6.3 Test Health Endpoint

```bash
# In another terminal
curl http://localhost:8000/api/health

# Expected response:
# {"status": "healthy", "timestamp": "...", "service": "ML Ranking API"}
```

---

## Phase 7: Test Ranking Endpoints

### 7.1 Get Model Info

```bash
curl http://localhost:8000/api/model-info

# Expected response:
# {
#   "model_name": "freelancer_ranker_v1",
#   "model_version": "v20240407_...",
#   "status": "deployed",
#   "training_samples": 2000,
#   "feature_count": 15
# }
```

### 7.2 Rank Freelancers for Job

```bash
# Rank top 10 freelancers for job_id=1
curl "http://localhost:8000/api/projects/1/interested-freelancers-ranked?top_n=10"

# Expected response (sample):
# {
#   "job_id": 1,
#   "total_proposals": 8,
#   "ranked_freelancers": [
#     {
#       "proposal_id": 101,
#       "freelancer_id": 5,
#       "freelancer_name": "Alice Chen",
#       "ml_ranking_score": 8.756,
#       "rank_position": 1,
#       "percentile_rank": 95.2,
#       "ml_insight": {
#         "top_strengths": ["Strong proposal-job match", ...],
#         "estimated_success_probability": 0.92
#       }
#     },
#     ...
#   ]
# }
```

### 7.3 Get Freelancer Insights

```bash
# Get ML insights for freelancer #5
curl http://localhost:8000/api/freelancers/5/ml-insights

# Expected response:
# {
#   "freelancer_id": 5,
#   "name": "Alice Chen",
#   "strengths": ["Outstanding ratings", ...],
#   "weaknesses": [],
#   "recommendations": []
# }
```

---

## Phase 8: Frontend Integration

### 8.1 Copy React Component

```bash
# Copy to your frontend project
cp 07_RankedFreelancersDashboard.jsx ../frontend/components/
cp 07_RankedFreelancersDashboard.css ../frontend/components/
```

### 8.2 Add to React App

```jsx
// In your project page (e.g., employer-dashboard.jsx)

import RankedFreelancersDashboard from '@/components/RankedFreelancersDashboard';

export default function EmployerDashboard() {
  const jobId = useParams().jobId;
  
  return (
    <>
      {/* Other dashboard content */}
      <RankedFreelancersDashboard 
        jobId={jobId}
        onFreelancerSelect={(freelancerId, proposalId) => {
          // Handle freelancer selection
        }}
      />
    </>
  );
}
```

### 8.3 Set API Endpoint

```bash
# In .env.local for frontend
REACT_APP_ML_API=http://localhost:8000
```

### 8.4 Test Frontend

```bash
# Start frontend dev server
cd ../frontend
npm run dev

# Navigate to project page
# Should see "ML-Ranked Freelancers" section with ranked list
```

---

## Phase 9: Production Deployment

### 9.1 PostgreSQL Production Setup

```bash
# Use managed PostgreSQL (AWS RDS, DigitalOcean, etc.)
# Required:
# - SSL/TLS enabled
# - Automatic backups
# - Read replicas for scaling
# - Connection pooling (PgBouncer)

# Update DB_HOST and credentials in .env
```

### 9.2 API Server Deployment

#### Option A: Docker (Recommended)

```bash
# Build Docker image
docker build -t synapescrow-ml-api .

# Run container
docker run -d \
  --name ml-api \
  -p 8000:8000 \
  -e DB_HOST=postgres.example.com \
  -e DB_PASSWORD=secure_password \
  synapescrow-ml-api
```

#### Option B: Systemd Service (Linux)

```bash
# Create systemd service
sudo nano /etc/systemd/system/ml-ranking-api.service

# Add:
[Unit]
Description=SynapEscrow ML Ranking API
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/ml-ranking-system
ExecStart=/home/ubuntu/ml-ranking-system/venv/bin/python 06_api_server.py
Restart=always

[Install]
WantedBy=multi-user.target

# Start service
sudo systemctl daemon-reload
sudo systemctl start ml-ranking-api
sudo systemctl enable ml-ranking-api
```

#### Option C: Heroku

```bash
# Create Procfile
echo "web: gunicorn -w 4 -b 0.0.0.0:\$PORT '06_api_server:app'" > Procfile

# Deploy
git push heroku main
```

### 9.3 Monitoring Setup

```bash
# Enable Prometheus metrics
# Endpoint: http://localhost:8000/metrics

# Setup monitoring:
# - Prometheus for metrics collection
# - Grafana for visualization
# - AlertManager for alerts
```

### 9.4 Setup Logging

```bash
# Logs go to:
# - stdout (container logs)
# - File: logs/ml-ranking-api.log (if running locally)

# Configure in production:
# - ELK Stack (Elasticsearch, Logstash, Kibana)
# - CloudWatch (AWS)
# - Stackdriver (GCP)
```

---

## Phase 10: Retraining Pipeline

### 10.1 Weekly Retraining

```bash
# Create cron job
crontab -e

# Add (runs every Sunday at 2 AM):
0 2 * * 0 cd /path/to/ml-ranking-system && python 04_xgboost_training.py >> /var/log/ml-retrain.log 2>&1
```

### 10.2 Monitor Retraining

```bash
# Trigger retraining via API
curl -X POST http://localhost:8000/api/ml/retrain

# Check model version
curl http://localhost:8000/api/model-info

# Verify in PostgreSQL
psql synapescrow_ml -c "SELECT * FROM ml_models ORDER BY training_date DESC LIMIT 1;"
```

---

## Troubleshooting

### Issue: "Connection refused" to PostgreSQL

```bash
# Check if PostgreSQL is running
systemctl status postgresql  # Linux
brew services list           # macOS
services.msc                 # Windows (Services)

# Start PostgreSQL if not running
systemctl start postgresql   # Linux
brew services start postgresql  # macOS
```

### Issue: ModuleNotFoundError for sentence_transformers

```bash
# Reinstall dependencies
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall

# Clear pip cache if needed
pip cache purge
```

### Issue: Out of memory during embeddings

```bash
# Reduce batch size in 03_feature_engineering.py
# Change: BATCH_SIZE = 32 -> 8

# Or process in smaller chunks
```

### Issue: Model accuracy is low

```bash
# Check feature distribution
psql synapescrow_ml -c "
SELECT 
  semantic_similarity_job_proposal,
  skill_overlap_percentage,
  price_fit_score
FROM ml_feature_snapshots
LIMIT 100;
"

# Verify training labels
psql synapescrow_ml -c "
SELECT target_rank_label, COUNT(*) 
FROM ml_feature_snapshots 
WHERE target_rank_label IS NOT NULL 
GROUP BY target_rank_label;
"
```

---

## Performance Tuning

### 1. Database Queries

```sql
-- Check slow queries
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();

-- Analyze query plans
EXPLAIN ANALYZE SELECT ... FROM ml_feature_snapshots WHERE job_id = 1;
```

### 2. API Performance

```python
# Add caching decorator
from functools import lru_cache

@lru_cache(maxsize=1000)
def rank_freelancers_for_job(job_id: int):
    ...
```

### 3. Embedding Caching

```python
# Cache embeddings in Redis
# Reduces recomputation by 90%
```

---

## Validation Checklist

- [ ] PostgreSQL database online
- [ ] Schema applied (10 tables created)
- [ ] Synthetic data generated (1000+ freelancers)
- [ ] Features computed & stored
- [ ] Model trained & artifacts created
- [ ] API server running on port 8000
- [ ] API endpoints responding (>200ms)
- [ ] React component rendering
- [ ] Rankings reflecting ML scores
- [ ] Explainability working (strengths/risks)
- [ ] Production database configured
- [ ] Monitoring & logging enabled
- [ ] Retraining scheduled
- [ ] Documentation updated

---

## Next Steps

1. ✅ Complete setup (see above)
2. 📊 Run diagnostics: `GET /api/health`
3. 🧪 Test with real data (small sample first)
4. 📈 Compare ML rankings vs. old heuristics
5. 🚀 A/B test with real users
6. 🔄 Setup automated retraining
7. 📱 Deploy to production
8. 👁️ Monitor rankings quality

---

**Setup Time Estimate**: 1-2 hours (with dependencies preinstalled)

**Questions?** Check README.md or API docs at `/api/docs`
