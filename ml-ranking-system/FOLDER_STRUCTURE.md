# 📁 ML Ranking System - Folder Structure

Complete organization of the ML ranking system components.

```
ml-ranking-system/
│
├── 📄 Core Documentation
│   ├── README.md                        # Main documentation & architecture
│   ├── SETUP_GUIDE.md                   # Step-by-step setup instructions
│   ├── MIGRATION_PLAN.md                # MongoDB → PostgreSQL migration
│   └── FOLDER_STRUCTURE.md              # This file
│
├── 🗄️ Database Layer
│   ├── 01_schema.sql                    # PostgreSQL relational schema
│   │   ├── users
│   │   ├── freelancer_profiles
│   │   ├── freelancer_skills
│   │   ├── jobs
│   │   ├── job_skills
│   │   ├── proposals
│   │   ├── freelancer_metrics
│   │   ├── ml_feature_snapshots
│   │   ├── ranking_predictions
│   │   ├── ml_models
│   │   └── [10 tables total]
│   │
│   └── Migration Support
│       ├── migrate-from-mongodb.sql    # ETL scripts (in MIGRATION_PLAN)
│       └── integrity-checks.sql        # Validation queries
│
├── 🤖 ML Training Pipeline
│   ├── 02_synthetic_data_generator.py  # Generates realistic training data
│   │   ├── SyntheticDataGenerator class
│   │   ├── generate_users_and_freelancers()
│   │   ├── generate_skills()
│   │   ├── generate_jobs()
│   │   ├── generate_proposals()
│   │   └── Output: Populates PostgreSQL directly
│   │
│   ├── 03_feature_engineering.py       # Computes ML features
│   │   ├── FeatureEngineeringPipeline class
│   │   ├── compute_embeddings()        # Sentence Transformers
│   │   ├── compute_semantic_similarities()
│   │   ├── compute_skill_overlap()
│   │   ├── compute_price_fit()
│   │   ├── normalize_features()
│   │   └── Output: ml_feature_snapshots table
│   │
│   ├── 04_xgboost_training.py          # Trains ranking model
│   │   ├── RankingModel class
│   │   ├── load_training_data()
│   │   ├── prepare_ranking_data()
│   │   ├── train_model()               # LambdaMART objective
│   │   ├── evaluate_model()             # NDCG metrics
│   │   ├── predict_rankings()
│   │   └── Output: ranking_model.pkl, scaler.pkl, ranking_predictions
│   │
│   └── Model Artifacts
│       ├── ranking_model.pkl           # Trained XGBoost model (2-5 MB)
│       └── scaler.pkl                  # Feature scaler (100 KB)
│
├── 🔮 Inference Layer
│   ├── 05_inference_pipeline.py        # Real-time ranking service
│   │   ├── RankingInferencePipeline class
│   │   ├── load_model()
│   │   ├── extract_features()          # on-the-fly feature computation
│   │   ├── rank_freelancers_for_job()
│   │   ├── rank_single_freelancer()
│   │   └── _generate_explanations()    # Explainability
│   │
│   └── Used by: 06_api_server.py
│
├── 🌐 Backend API
│   ├── 06_api_server.py                # FastAPI server
│   │   ├── Pydantic Models
│   │   ├── RankedFreelancer
│   │   ├── MLInsight
│   │   ├── ProjectRankingResponse
│   │   │
│   │   ├── Endpoints
│   │   ├── GET  /api/health
│   │   ├── GET  /api/projects/{job_id}/interested-freelancers-ranked
│   │   ├── POST /api/projects/{job_id}/freelancers/{freelancer_id}/rank
│   │   ├── GET  /api/freelancers/{freelancer_id}/ml-insights
│   │   ├── POST /api/ml/recompute-ranking/{job_id}
│   │   ├── POST /api/ml/retrain
│   │   ├── GET  /api/model-info
│   │   │
│   │   └── Runs on: localhost:8000
│   │       Docs at: localhost:8000/api/docs
│   │
│   └── Used by: Frontend components
│
├── 🎨 Frontend Components
│   ├── 07_RankedFreelancersDashboard.jsx
│   │   ├── RankedFreelancersDashboard component
│   │   │   ├── Ranked freelancers grid
│   │   │   ├── Rank badge (1st, 2nd, 3rd)
│   │   │   ├── Success probability circle
│   │   │   ├── ML score display
│   │   │   ├── Top strengths/risks
│   │   │   └── Select freelancer modal
│   │   │
│   │   ├── SelectedFreelancerPanel component
│   │   │   ├── Detailed insights
│   │   │   ├── Feature breakdown
│   │   │   ├── Strength/risk analysis
│   │   │   └── Action buttons
│   │   │
│   │   └── Props: jobId, onFreelancerSelect
│   │
│   └── 07_RankedFreelancersDashboard.css
│       ├── Responsive grid layout
│       ├── Card styling & animations
│       ├── Success probability gauge
│       ├── Feature bars
│       ├── Dark overlay for modal
│       └── Mobile optimizations
│
├── 📦 Configuration & Dependencies
│   ├── requirements.txt                # Python package versions
│   │   ├── xgboost==2.0.3
│   │   ├── sentence-transformers==2.2.2
│   │   ├── fastapi==0.109.0
│   │   ├── psycopg2==2.9.9
│   │   ├── pandas==2.1.3
│   │   ├── scikit-learn==1.3.2
│   │   └── [25+ packages total]
│   │
│   ├── .env.example                    # Environment template
│   │   ├── Database credentials
│   │   ├── API configuration
│   │   ├── Feature engineering params
│   │   └── Security settings
│   │
│   ├── package.json                    # Frontend dependencies (if separate)
│   │   └── axios, react, tailwindcss
│   │
│   └── Dockerfile                      # Container image (optional)
│
├── 📚 Documentation
│   ├── API_EXAMPLES.md                 # Example API calls & responses
│   ├── ARCHITECTURE.md                 # Detailed system design
│   ├── FEATURE_ENGINEERING.md          # Feature computation details
│   ├── MODEL_TRAINING.md               # Training process & metrics
│   ├── DEPLOYMENT.md                   # Production deployment
│   └── TROUBLESHOOTING.md              # Common issues & fixes
│
└── 🧪 Testing & Validation
    ├── tests/
    │   ├── test_feature_engineering.py
    │   ├── test_inference_pipeline.py
    │   ├── test_api_endpoints.py
    │   └── test_model_performance.py
    │
    ├── data/
    │   ├── sample_jobs.json            # Test data
    │   ├── sample_proposals.json
    │   └── expected_outputs.json
    │
    └── notebooks/
        ├── 01_exploratory_analysis.ipynb
        ├── 02_feature_visualization.ipynb
        ├── 03_model_evaluation.ipynb
        └── 04_debugging.ipynb
```

---

## Module Dependency Graph

```
Frontend (React)
    ↓ (API calls)
API Server (FastAPI)
    │
    ├─→ Inference Pipeline (05_)
    │      ├─→ Trained Model (ranking_model.pkl)
    │      ├─→ Scaler (scaler.pkl)
    │      ├─→ Sentence Transformers
    │      └─→ PostgreSQL (features on-the-fly)
    │
    └─→ PostgreSQL Database
           ├─→ freelancer_profiles
           ├─→ jobs
           ├─→ proposals
           ├─→ freelancer_metrics
           ├─→ ranking_predictions
           └─→ ml_models

Training Pipeline (offline)
    ├─→ Synthetic Data Generator (02_)
    │      └─→ PostgreSQL (writes)
    │
    ├─→ Feature Engineering (03_)
    │      ├─→ PostgreSQL (reads data)
    │      ├─→ Sentence Transformers
    │      └─→ PostgreSQL (writes ml_feature_snapshots)
    │
    └─→ XGBoost Training (04_)
           ├─→ PostgreSQL (reads ml_feature_snapshots)
           ├─→ XGBoost LambdaMART (training)
           ├─→ Save model artifacts
           └─→ PostgreSQL (writes ranking_predictions)
```

---

## File Sizes (Typical)

```
Code Files:
  02_synthetic_data_generator.py    ~8 KB
  03_feature_engineering.py         ~12 KB
  04_xgboost_training.py            ~15 KB
  05_inference_pipeline.py          ~18 KB
  06_api_server.py                  ~20 KB
  07_RankedFreelancersDashboard.jsx ~12 KB
  07_RankedFreelancersDashboard.css ~8 KB

Model Artifacts:
  ranking_model.pkl                 2-5 MB (trained XGBoost)
  scaler.pkl                        ~100 KB

Generated Data:
  PostgreSQL database               ~500 MB-1 GB (with 1000 freelancers)

Documentation:
  Total docs                        ~100 KB
```

---

## Typical Runtime Execution Flow

```
User accesses employer dashboard
    ↓
Frontend calls: GET /api/projects/{job_id}/interested-freelancers-ranked
    ↓
API Server receives request
    ↓
Inference Pipeline loads:
  - Trained model (ranking_model.pkl)
  - Scaler (scaler.pkl)
    ↓
Query database for all proposals on job
    ↓
For each proposal:
  1. Extract freelancer & job data
  2. Compute embeddings (Sentence Transformers)
  3. Compute 15 features on-the-fly
  4. Scale features
  5. Predict ranking score
    ↓
Sort by score (descending)
    ↓
Add explanations (strengths/risks)
    ↓
Return JSON response to frontend
    ↓
Frontend renders ranked list with:
  - Position badge
  - Success probability
  - Top strengths/risks
  - Detailed insights panel
```

**Typical latency**: 500ms-2s per job (depending on # proposals)

---

## Data Flow During Training

```
PostgreSQL
  ├─ users & profiles
  ├─ jobs & proposals
  └─ metrics
      ↓
Synthetic Data Generator (02_)
  Creates realistic dataset
    ↓
PostgreSQL
  ├─ 1000 freelancers
  ├─ 500 jobs
  ├─ 4000 proposals
  └─ initialized metrics
      ↓
Feature Engineering (03_)
  Computes:
  - Embeddings (job, proposal, bio)
  - Semantic similarities
  - Skill overlaps
  - Price fit scores
    ↓
PostgreSQL
  └─ ml_feature_snapshots table
        (4000 rows × 25 features each)
      ↓
XGBoost Training (04_)
  Trains on:
  - X (features): 15 numerical columns
  - y (labels): target_rank_label (0/1/2)
  - groups: grouped by job_id
    ↓
Model Artifacts
  ├─ ranking_model.pkl
  ├─ scaler.pkl
  └─ PostgreSQL: ml_models & ranking_predictions
```

---

## Deployment Architecture (Production)

```
┌─────────────────────────────────────────────────────┐
│ Load Balancer (Nginx/HAProxy)                       │
└──────────────────────┬────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
    API Pod 1     API Pod 2     API Pod 3
    (FastAPI)     (FastAPI)     (FastAPI)
    Port 8000     Port 8000     Port 8000
        │              │              │
        └──────────────┼──────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ↓                             ↓
  PostgreSQL Primary        Redis Cache
  (Primary DB)              (Feature cache)
        │
        └─→ PostgreSQL Replica (read-only)
```

---

## Environment Variables by Context

### Local Development
```bash
DB_HOST=localhost
DB_PORT=5432
DEBUG=true
LOG_LEVEL=DEBUG
```

### Production
```bash
DB_HOST=postgres.aws.rds.amazonaws.com
DB_PORT=5432
DEBUG=false
LOG_LEVEL=INFO
ENABLE_MONITORING=true
```

---

## Quick Reference

| Component | Purpose | Technology | Input | Output |
|-----------|---------|-----------|-------|--------|
| 01_schema.sql | Database setup | PostgreSQL | Schema DDL | 10 tables |
| 02_synthetic.py | Data generation | Faker + Pandas | Config | Database rows |
| 03_features.py | Feature computation | Transformers | PostgreSQL | ml_feature_snapshots |
| 04_training.py | Model training | XGBoost | ml_feature_snapshots | Model pkl files |
| 05_inference.py | Ranking inference | Pickle + NumPy | Job ID + Proposals | Ranking scores |
| 06_api.py | REST API | FastAPI | HTTP requests | JSON responses |
| 07_dashboard.jsx | UI display | React | API responses | Ranked list |

---

**For more details, see individual file docstrings and README.md**
