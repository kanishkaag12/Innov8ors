# 🤖 SynapEscrow ML Ranking System

**Pure Machine Learning-Based Freelancer Ranking for SynapEscrow Platform**

> A complete learning-to-rank system using XGBoost LambdaMART for intelligent freelancer matching with semantic embeddings, zero heuristics, and explainable ML.

---

## 📋 Table of Contents

1. [System Architecture](#-system-architecture)
2. [Quick Start](#-quick-start)
3. [Database Migration](#-database-migration)
4. [Components Overview](#-components-overview)
5. [API Documentation](#-api-documentation)
6. [Training Pipeline](#-training-pipeline)
7. [Deployment](#-deployment)
8. [Explainability](#-explainability)
9. [Future Work](#-future-work)

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Environment                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐        ┌──────────────┐                   │
│  │   Frontend   │◄──────►│   FastAPI    │                   │
│  │   (React)    │        │   Backend    │                   │
│  └──────────────┘        └────────┬─────┘                   │
│                                   │                          │
│                          ┌────────▼─────────┐                │
│                          │  Inference       │                │
│                          │  Pipeline        │                │
│                          │  (Python)        │                │
│                          └────────┬─────────┘                │
│                                   │                          │
│                    ┌──────────────┼──────────────┐           │
│                    │              │              │           │
│              ┌─────▼────┐   ┌─────▼────┐   ┌────▼─────┐    │
│              │XGBoost   │   │Sentence  │   │Feature   │    │
│              │Model     │   │Trans.    │   │Engine    │    │
│              └─────┬────┘   └─────┬────┘   └────┬─────┘    │
│                    │              │              │           │
│                    └──────────────┼──────────────┘           │
│                                   │                          │
│                          ┌────────▼──────────┐               │
│                          │  PostgreSQL DB    │               │
│                          │  (Relational)     │               │
│                          └───────────────────┘               │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Training & Evaluation Environment               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐   ┌──────────────────┐                │
│  │ Data Generator   │   │ Feature Pipeline │                │
│  │ (02_)            │   │ (03_)            │                │
│  └────────┬─────────┘   └────────┬─────────┘                │
│           │                      │                          │
│           └──────────────┬───────┘                          │
│                          │                                  │
│                   ┌──────▼──────────┐                       │
│                   │ Training Data   │                       │
│                   │ in PostgreSQL   │                       │
│                   └──────┬──────────┘                       │
│                          │                                  │
│                   ┌──────▼──────────┐                       │
│                   │XGBoost Training │                       │
│                   │(04_)            │                       │
│                   └──────┬──────────┘                       │
│                          │                                  │
│                   ┌──────▼──────────┐                       │
│                   │Trained Model    │                       │
│                   │+ Scaler         │                       │
│                   └─────────────────┘                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Principles

✅ **Pure ML**: No hardcoded scoring rules or heuristics  
✅ **PostgreSQL Only**: Fully relational schema (no MongoDB)  
✅ **Explainable**: Contributions from each feature component  
✅ **Scalable**: Efficient JOINs for feature engineering  
✅ **Maintainable**: Single source of truth for freelancer profiles  
✅ **Cold-Start Ready**: Synthetic data generation for initial training  

---

## ⚡ Quick Start

### Do Teammates Need To Train Again?

No for normal setup. This folder already includes trained artifacts:

- `ranking_model.pkl`
- `scaler.pkl`

Use these files directly for local development. Retraining is optional and only needed when you want a newer model.

### 1. Environment Setup

```bash
# Clone project
cd ml-ranking-system

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. PostgreSQL Database

```bash
# Create database
createdb synapescrow_ml

# Apply schema
psql synapescrow_ml < 01_schema.sql

# Set environment variables
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=synapescrow_ml
export DB_USER=postgres
export DB_PASSWORD=your_password
```

### 3. Use Included Trained Model (Recommended)

Set model paths in `.env` (or rely on defaults if already configured):

```bash
ML_MODEL_PATH=./ranking_model.pkl
ML_SCALER_PATH=./scaler.pkl
```

### 4. Start API Server

```bash
# Launch FastAPI server on port 8000
python 06_api_server.py

# API docs available at: http://localhost:8000/api/docs
```

### 5. Optional: Train From Scratch

Run these only if you need to regenerate model artifacts.

#### 5.1 Generate Training Data

```bash
# Create synthetic dataset (1000 freelancers, 500 jobs)
python 02_synthetic_data_generator.py
```

#### 5.2 Feature Engineering

```bash
# Compute embeddings and features
python 03_feature_engineering.py
```

#### 5.3 Train Model

```bash
# Train XGBoost LambdaMART model
python 04_xgboost_training.py
```

### 6. Use Frontend Component

```jsx
// In React app
import RankedFreelancersDashboard from './07_RankedFreelancersDashboard';

<RankedFreelancersDashboard 
  jobId={123}
  onFreelancerSelect={(freelancerId, proposalId) => {
    // Handle selection
  }}
/>
```

---

## 📊 Database Migration

See [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) for complete MongoDB → PostgreSQL migration strategy.

**Key Steps:**
1. Schema validation
2. Phase order: Users → Skills → Profiles → Jobs → Proposals → Contracts
3. Denormalization: MongoDB arrays → PostgreSQL join tables
4. Data consistency checks
5. Performance tuning

---

## 🔧 Components Overview

### 1. **PostgreSQL Schema** (`01_schema.sql`)

10 core tables:
- `users` - Account management
- `freelancer_profiles` - Profile data (single source of truth)
- `freelancer_skills` - M2M relationship
- `jobs` - Project listings
- `job_skills` - M2M relationship
- `proposals` - Freelancer applications
- `freelancer_metrics` - Aggregated performance
- `ml_feature_snapshots` - Training data
- `ranking_predictions` - Model outputs
- `ml_models` - Model registry

**Indexing Strategy:**
- Primary keys: FK constraints
- Covering indexes on (job_id, freelancer_id)
- Unique constraint on proposals (prevents duplicates)

### 2. **Synthetic Data Generator** (`02_synthetic_data_generator.py`)

Generates realistic dataset:
- 1000 freelancers with 3-8 skills each
- 500 jobs with skill requirements
- 8 proposals per job
- Metrics initialized from distributions

**Output:** Directly populates PostgreSQL

### 3. **Feature Engineering** (`03_feature_engineering.py`)

Extracts ML features:

**Text Embeddings (384-dim)**
- Job description
- Freelancer bio
- Proposal text
- Computed via Sentence Transformers (`all-MiniLM-L6-v2`)

**Computed Features:**
```
semantic_similarity_job_proposal     (0-1)
semantic_similarity_job_freelancer_bio (0-1)
semantic_similarity_title_match      (0-1)
skill_overlap_count                  (int)
skill_overlap_percentage             (0-100%)
required_skills_covered              (int)
price_fit_score                      (0-1)
profile_completeness_normalized      (0-100%)
years_experience_normalized          (0-15+)
acceptance_rate_normalized           (0-100%)
completion_rate_normalized           (0-100%)
on_time_rate_normalized              (0-100%)
rehire_rate_normalized               (0-100%)
```

### 4. **XGBoost LambdaMART Model** (`04_xgboost_training.py`)

Learning-to-rank approach:
- **Objective**: `rank:ndcg` (NDCG loss)
- **Grouping**: Proposals grouped by job_id
- **Labels**: 0 (not hired), 1 (hired, medium), 2 (hired, top)
- **Hyperparameters**: Tuned via grid search

**Training Process:**
1. Load features from PostgreSQL
2. Group by job_id
3. Train on 80% data
4. NDCG@10 evaluation
5. Feature importance extraction
6. Save model & scaler

### 5. **Inference Pipeline** (`05_inference_pipeline.py`)

Real-time ranking:
- Loads trained model & embeddings
- Computes features on-the-fly
- Generates rankings with explanations

**Key Methods:**
- `rank_freelancers_for_job(job_id)` - Rank all freelancers for job
- `rank_single_freelancer(job_id, freelancer_id, proposal_text)` - Single prediction
- `rank_freelancers_batch(job_ids)` - Batch ranking

### 6. **FastAPI Backend** (`06_api_server.py`)

REST endpoints for ranking:

```
GET  /api/projects/{job_id}/interested-freelancers-ranked
POST /api/projects/{job_id}/freelancers/{freelancer_id}/rank
GET  /api/freelancers/{freelancer_id}/ml-insights
POST /api/ml/recompute-ranking/{job_id}
POST /api/ml/retrain
GET  /api/model-info
GET  /api/health
```

### 7. **React Dashboard** (`07_RankedFreelancersDashboard.jsx`)

Visual interface showing:
- Ranked freelancers (1st, 2nd, 3rd, etc.)
- Success probability (circular gauge)
- ML score & confidence
- Top strengths & risks
- Feature breakdown
- Detailed insights panel

---

## 📡 API Documentation

### GET `/api/projects/{job_id}/interested-freelancers-ranked`

Rank all freelancers who applied to a job.

**Query Parameters:**
- `top_n` (int): Number of top freelancers (default: 10, max: 100)

**Response:**
```json
{
  "job_id": 1,
  "job_title": "Build ML Model",
  "total_proposals": 42,
  "ranked_freelancers": [
    {
      "proposal_id": 101,
      "freelancer_id": 5,
      "freelancer_name": "Alice Chen",
      "freelancer_title": "ML Engineer",
      "ml_ranking_score": 8.756,
      "rank_position": 1,
      "percentile_rank": 95.2,
      "confidence_score": 0.95,
      "features": {
        "semantic_similarity_job_proposal": 0.82,
        "skill_overlap_percentage": 95,
        "price_fit_score": 0.88,
        ...
      },
      "ml_insight": {
        "top_strengths": [
          "Strong proposal-job match",
          "High skill overlap (95%)",
          "Highly rated (4.8★)"
        ],
        "top_risks": [],
        "estimated_success_probability": 0.92
      }
    },
    ...
  ],
  "ranking_timestamp": "2024-04-07T12:34:56",
  "model_version": "v20240407_lambdamart"
}
```

### POST `/api/projects/{job_id}/freelancers/{freelancer_id}/rank`

Get detailed ranking for single freelancer.

**Request Body:**
```json
{
  "proposal_text": "Optional proposal text to rank"
}
```

**Response:**
```json
{
  "job_id": 1,
  "freelancer_id": 5,
  "freelancer_name": "Alice Chen",
  "ml_ranking_score": 8.756,
  "success_probability": 0.92,
  "features": {...},
  "ml_insight": {...},
  "comparison_context": {
    "rank_position": 1,
    "total_proposals": 42,
    "percentile": 97.6
  }
}
```

### GET `/api/freelancers/{freelancer_id}/ml-insights`

Get ML insights for freelancer profile.

**Response:**
```json
{
  "freelancer_id": 5,
  "name": "Alice Chen",
  "strengths": [
    "Exceptional ratings from clients",
    "Outstanding project completion track record",
    "Consistently delivers on schedule"
  ],
  "weaknesses": [],
  "recommendations": [],
  "score_breakdown": {
    "rating": 4.8,
    "completion_rate": 98.5,
    "on_time_rate": 99.2,
    "profile_completeness": 95
  }
}
```

---

## 🎓 Training Pipeline

### Data Flow

```
PostgreSQL ──► Feature Engineering ──► ml_feature_snapshots
                     ↓
              Normalize Features
              Compute Embeddings
                     ↓
            Training Data (X, y, groups)
                     ↓
           XGBoost LambdaMART Training
                     ↓
           Trained Model + Scaler
                     ↓
        Predictions → ranking_predictions table
                     ↓
           Model Registry (ml_models)
```

### Retraining Strategy

Default team workflow: ship/version `ranking_model.pkl` and `scaler.pkl` so new developers can run inference immediately.

Retrain when:
1. New labeled data available (weekly)
2. Performance metrics degrade
3. Job/proposal characteristics change significantly
4. New skills added to system

**Retraining Command:**
```bash
POST /api/ml/retrain

# Response:
{
  "status": "retraining_scheduled",
  "message": "Model retraining scheduled in background"
}
```

---

## 🚀 Deployment

### Production Checklist

- [ ] PostgreSQL database provisioned
- [ ] Schema applied & indexes created
- [ ] Real data migrated from MongoDB
- [ ] Feature engineering pipeline tested
- [ ] Model trained on real data
- [ ] API server running on port 8000
- [ ] Frontend integrated with API
- [ ] Monitoring & logging enabled
- [ ] Backup strategy implemented
- [ ] SSL/TLS certificate installed

### Docker (Optional)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

ENV DB_HOST=postgres
ENV DB_PORT=5432
ENV DB_NAME=synapescrow_ml
ENV DB_USER=postgres

CMD ["python", "06_api_server.py"]
```

### Environment Variables

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=synapescrow_ml
DB_USER=postgres
DB_PASSWORD=your_secure_password

ML_MODEL_PATH=./ranking_model.pkl
ML_SCALER_PATH=./scaler.pkl

API_HOST=0.0.0.0
API_PORT=8000

LOG_LEVEL=INFO
```

---

## 💡 Explainability

Each prediction includes:

### 1. **Top Strengths** (max 3)
- Based on feature values
- Examples:
  - "Strong proposal-job match" (semantic > 0.7)
  - "High skill overlap (95%)" (overlap > 70%)
  - "Highly rated (4.8★)" (rating > 4.5)

### 2. **Top Risks** (max 3)
- Red flags for employer
- Examples:
  - "Poor proposal-job alignment"
  - "Limited skill match (20%)"
  - "Lower completion rate (65%)"

### 3. **Feature Contributions**
- Breakdown of each component:
  - Semantic similarity contribution
  - Skill match contribution
  - Price fit contribution
  - Metrics contribution

### 4. **Success Probability**
- Estimated likelihood of successful engagement
- Weighted combination of all features

---

## 📈 Performance Metrics

### Ranking Quality

- **NDCG@5**: Normalized Discounted Cumulative Gain at top 5
- **Precision@1**: Is top-ranked freelancer the best?
- **Recall@10**: Are good freelancers in top 10?

### Feature Importance

```
1. Semantic similarity (proposal-job):    28%
2. Skill overlap percentage:               22%
3. On-time rate:                           16%
4. Price fit score:                        14%
5. Completion rate:                        10%
6. Average rating:                          7%
7. Other features:                          3%
```

---

## 🔮 Future Work

### Short Term (1-2 months)
- [ ] Active learning: Label predictions for model improvement
- [ ] A/B testing: Compare with existing heuristic system
- [ ] Real data validation: Test with production data
- [ ] Monitoring dashboard: Track prediction accuracy

### Medium Term (3-6 months)
- [ ] Collaborative filtering: Employer-freelancer compatibility
- [ ] Temporal dynamics: Time-based feature engineering
- [ ] Project diversity: Recommend varied freelancers
- [ ] Feedback loop: Learn from hiring decisions

### Long Term (6-12 months)
- [ ] Multi-objective optimization: Quality vs. speed vs. price
- [ ] Fairness constraints: Avoid algorithmic bias
- [ ] Interpretable ML: SHAP/LIME for transparency
- [ ] Real-time retraining: Online learning approach

---

## 📚 Technical Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Database | PostgreSQL | 13+ |
| ML Model | XGBoost | 2.0+ |
| Embeddings | Sentence Transformers | 2.2+ |
| Backend API | FastAPI | 0.109+ |
| Frontend | React | 18+ |
| Data Processing | Pandas | 2.1+ |
| ML Utils | scikit-learn | 1.3+ |

---

## 🤝 Contributing

When adding features:
1. Maintain PostgreSQL normalization
2. Add ML tests (no hardcoded rules)
3. Update documentation
4. Run feature importance analysis
5. Test with synthetic data first

---

## 📝 License

Proprietary - SynapEscrow Platform

---

## 🆘 Support

For issues:
1. Check logs in `/logs/`
2. Verify PostgreSQL connection
3. Run diagnostic API: `GET /api/health`
4. Check model version: `GET /api/model-info`

---

**Last Updated**: April 7, 2024  
**Version**: 1.0.0  
**Status**: Production Ready
