"""
FastAPI Backend for ML Ranking System
Provides REST endpoints for freelancer ranking and insights
"""

from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import psycopg2
import logging
from datetime import datetime
import json
import os
import sys
import importlib.util

from db_config import get_db_config

# Import ML pipeline
def _load_symbol_from_file(filename: str, symbol: str):
    """Load a symbol from a sibling file, including files with numeric prefixes."""
    module_path = os.path.join(os.path.dirname(__file__), filename)
    module_name = f"ml_dynamic_{os.path.splitext(filename)[0]}"
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load module spec from {filename}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    try:
        return getattr(module, symbol)
    except AttributeError as exc:
        raise ImportError(f"Symbol '{symbol}' not found in {filename}") from exc


try:
    from inference_pipeline import RankingInferencePipeline
    from feature_engineering import FeatureEngineeringPipeline
    from xgboost_training import RankingModel
except ModuleNotFoundError:
    RankingInferencePipeline = _load_symbol_from_file("05_inference_pipeline.py", "RankingInferencePipeline")
    FeatureEngineeringPipeline = _load_symbol_from_file("03_feature_engineering.py", "FeatureEngineeringPipeline")
    RankingModel = _load_symbol_from_file("04_xgboost_training.py", "RankingModel")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ========== PYDANTIC MODELS ==========

class RankingFeatures(BaseModel):
    """Feature values for a freelancer-job pair"""
    semantic_similarity_job_proposal: float
    semantic_similarity_job_freelancer_bio: float
    semantic_similarity_title_match: float
    skill_overlap_count: int
    skill_overlap_percentage: float
    required_skills_covered: int
    price_fit_score: float
    profile_completeness: int
    years_experience: int
    average_rating: float
    acceptance_rate: float
    completion_rate: float
    on_time_rate: float
    rehire_rate: float
    proposal_length: int


class MLInsight(BaseModel):
    """ML scoring insight for a freelancer"""
    top_strengths: List[str]
    top_risks: List[str]
    estimated_success_probability: float


class RankedFreelancer(BaseModel):
    """Ranked freelancer response"""
    proposal_id: int
    freelancer_id: int
    freelancer_name: Optional[str] = None
    freelancer_title: Optional[str] = None
    ml_ranking_score: float
    rank_position: int
    percentile_rank: float
    confidence_score: float
    features: RankingFeatures
    ml_insight: MLInsight


class ProjectRankingResponse(BaseModel):
    """Response for project ranking endpoint"""
    job_id: int
    job_title: Optional[str] = None
    total_proposals: int
    ranked_freelancers: List[RankedFreelancer]
    ranking_timestamp: datetime
    model_version: str


class RankingPredictionResponse(BaseModel):
    """Individual prediction response"""
    job_id: int
    freelancer_id: int
    freelancer_name: str
    freelancer_title: str
    proposal_text_preview: str
    ml_ranking_score: float
    success_probability: float
    estimated_delivery_days: int
    bid_amount: float
    features: RankingFeatures
    ml_insight: MLInsight
    comparison_context: Optional[Dict[str, Any]] = None


class RetrainingRequest(BaseModel):
    """Request to retrain model"""
    num_epochs: Optional[int] = 100
    validation_split: Optional[float] = 0.2


# ========== FASTAPI APP SETUP ==========

app = FastAPI(
    title="SynapEscrow ML Ranking API",
    description="Pure ML-based freelancer ranking system",
    version="1.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== GLOBALS ==========

DB_CONFIG = get_db_config()

# Initialize pipelines at startup
inference_pipeline: RankingInferencePipeline = None


@app.on_event("startup")
async def startup_event():
    """Initialize ML pipeline on startup"""
    global inference_pipeline
    try:
        inference_pipeline = RankingInferencePipeline(DB_CONFIG)
        inference_pipeline.connect()
        logger.info("✓ ML Ranking Pipeline initialized")
    except Exception as e:
        logger.error(f"Failed to initialize pipeline: {e}")
        raise


@app.on_event("shutdown")
async def shutdown_event():
    """Close connections on shutdown"""
    global inference_pipeline
    if inference_pipeline:
        inference_pipeline.close()
        logger.info("✓ ML Pipeline closed")


# ========== HELPER FUNCTIONS ==========

def fetch_freelancer_details(freelancer_id: int) -> Dict:
    """Fetch freelancer details from database"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT full_name, title FROM freelancer_profiles WHERE freelancer_id = %s
        """, (freelancer_id,))
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return {'name': result[0], 'title': result[1]}
        return {'name': 'Unknown', 'title': 'Freelancer'}
    except Exception as e:
        logger.error(f"Error fetching freelancer: {e}")
        return {'name': 'Unknown', 'title': 'Freelancer'}


def fetch_job_details(job_id: int) -> Dict:
    """Fetch job details from database"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT job_title FROM jobs WHERE job_id = %s
        """, (job_id,))
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return {'title': result[0]}
        return {'title': 'Unknown Job'}
    except Exception as e:
        logger.error(f"Error fetching job: {e}")
        return {'title': 'Unknown Job'}


def fetch_proposal_details(proposal_id: int) -> Dict:
    """Fetch proposal details"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT proposal_text, bid_amount, estimated_delivery_days 
            FROM proposals WHERE proposal_id = %s
        """, (proposal_id,))
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return {
                'text_preview': result[0][:150] if result[0] else '',
                'bid_amount': result[1],
                'delivery_days': result[2]
            }
        return {'text_preview': '', 'bid_amount': 0, 'delivery_days': 0}
    except Exception as e:
        logger.error(f"Error fetching proposal: {e}")
        return {'text_preview': '', 'bid_amount': 0, 'delivery_days': 0}


# ========== API ENDPOINTS ==========

@app.get("/api/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "ML Ranking API"
    }


@app.get("/api/projects/{job_id}/interested-freelancers-ranked", 
         response_model=ProjectRankingResponse,
         tags=["Ranking"])
async def rank_freelancers_for_project(
    job_id: int,
    top_n: int = Query(10, ge=1, le=100, description="Number of top freelancers to return")
):
    """
    Rank freelancers for a specific project/job.
    
    Returns ranked list with ML scores, explanations, and estimated success probability.
    """
    if not inference_pipeline:
        raise HTTPException(status_code=503, detail="ML pipeline not initialized")
    
    try:
        # Get rankings
        rankings = inference_pipeline.rank_freelancers_for_job(job_id)
        
        if not rankings:
            raise HTTPException(status_code=404, detail=f"No proposals found for job {job_id}")
        
        # Take top N
        top_rankings = rankings[:top_n]
        
        # Build response
        ranked_list = []
        for ranking in top_rankings:
            freelancer_details = fetch_freelancer_details(ranking['freelancer_id'])
            proposal_details = fetch_proposal_details(ranking['proposal_id'])
            job_details = fetch_job_details(job_id)
            
            ranked_freelancer = RankedFreelancer(
                proposal_id=ranking['proposal_id'],
                freelancer_id=ranking['freelancer_id'],
                freelancer_name=freelancer_details['name'],
                freelancer_title=freelancer_details['title'],
                ml_ranking_score=ranking['ml_ranking_score'],
                rank_position=ranking['rank_position'],
                percentile_rank=ranking['percentile_rank'],
                confidence_score=ranking['confidence_score'],
                features=RankingFeatures(**ranking['features']),
                ml_insight=MLInsight(
                    top_strengths=ranking['top_strengths'],
                    top_risks=ranking['top_risks'],
                    estimated_success_probability=ranking['estimated_success_probability']
                )
            )
            ranked_list.append(ranked_freelancer)
        
        return ProjectRankingResponse(
            job_id=job_id,
            job_title=job_details['title'],
            total_proposals=len(rankings),
            ranked_freelancers=ranked_list,
            ranking_timestamp=datetime.now(),
            model_version="v20240407_lambdamart"
        )
    
    except Exception as e:
        logger.error(f"Ranking error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/projects/{job_id}/freelancers/{freelancer_id}/rank",
          response_model=RankingPredictionResponse,
          tags=["Ranking"])
async def rank_single_freelancer(
    job_id: int,
    freelancer_id: int,
    proposal_text: Optional[str] = None
):
    """
    Get ML ranking and insights for a specific freelancer-job pair.
    """
    if not inference_pipeline:
        raise HTTPException(status_code=503, detail="ML pipeline not initialized")
    
    try:
        # Use provided proposal text or fetch from database
        if not proposal_text:
            conn = psycopg2.connect(**DB_CONFIG)
            cursor = conn.cursor()
            cursor.execute("""
                SELECT proposal_text FROM proposals 
                WHERE job_id = %s AND freelancer_id = %s 
                LIMIT 1
            """, (job_id, freelancer_id))
            result = cursor.fetchone()
            conn.close()
            
            if result:
                proposal_text = result[0]
            else:
                proposal_text = ""
        
        # Get ranking
        ranking = inference_pipeline.rank_single_freelancer(job_id, freelancer_id, proposal_text)
        
        # Get all freelancers for context
        all_rankings = inference_pipeline.rank_freelancers_for_job(job_id)
        freelancer_rank = next(
            (r['rank_position'] for r in all_rankings if r['freelancer_id'] == freelancer_id),
            None
        )
        
        # Fetch details
        freelancer_details = fetch_freelancer_details(freelancer_id)
        proposal_details = fetch_proposal_details(
            next((r['proposal_id'] for r in all_rankings if r['freelancer_id'] == freelancer_id), 0)
        )
        job_details = fetch_job_details(job_id)
        
        return RankingPredictionResponse(
            job_id=job_id,
            freelancer_id=freelancer_id,
            freelancer_name=freelancer_details['name'],
            freelancer_title=freelancer_details['title'],
            proposal_text_preview=proposal_details['text_preview'],
            ml_ranking_score=ranking['ml_ranking_score'],
            success_probability=ranking['estimated_success_probability'],
            estimated_delivery_days=proposal_details['delivery_days'],
            bid_amount=proposal_details['bid_amount'],
            features=RankingFeatures(**ranking['features']),
            ml_insight=MLInsight(
                top_strengths=ranking['top_strengths'],
                top_risks=ranking['top_risks'],
                estimated_success_probability=ranking['estimated_success_probability']
            ),
            comparison_context={
                'rank_position': freelancer_rank,
                'total_proposals': len(all_rankings),
                'percentile': (freelancer_rank / len(all_rankings)) * 100 if freelancer_rank else 0
            } if freelancer_rank else None
        )
    
    except Exception as e:
        logger.error(f"Ranking error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/freelancers/{freelancer_id}/ml-insights",
         tags=["Insights"])
async def get_freelancer_ml_insights(freelancer_id: int):
    """
    Get ML-based insights for a freelancer's profile.
    Includes strengths, weaknesses, and recommendations.
    """
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                full_name, title, average_rating, completion_rate, 
                acceptance_rate, on_time_rate, profile_completeness, years_experience
            FROM freelancer_profiles f
            JOIN freelancer_metrics fm ON f.freelancer_id = fm.freelancer_id
            WHERE f.freelancer_id = %s
        """, (freelancer_id,))
        
        result = cursor.fetchone()
        conn.close()
        
        if not result:
            raise HTTPException(status_code=404, detail=f"Freelancer {freelancer_id} not found")
        
        name, title, rating, completion, acceptance, on_time, profile_comp, years_exp = result
        
        # Generate insights
        strengths = []
        weaknesses = []
        
        if rating > 4.7:
            strengths.append("Exceptional ratings from clients")
        elif rating < 3.5:
            weaknesses.append("Consider improving profile and proposal quality")
        
        if completion >= 95:
            strengths.append("Outstanding project completion track record")
        elif completion < 70:
            weaknesses.append("Focus on completing projects successfully")
        
        if on_time >= 95:
            strengths.append("Consistently delivers on schedule")
        elif on_time < 70:
            weaknesses.append("Improve on-time delivery performance")
        
        if profile_comp >= 90:
            strengths.append("Comprehensive profile fills employer confidence")
        elif profile_comp < 70:
            weaknesses.append("Complete profile to attract more opportunities")
        
        recommendations = []
        if profile_comp < 90:
            recommendations.append("Complete profile sections (portfolio, work samples, testimonials)")
        if acceptance < 0.4:
            recommendations.append("Review and improve proposal writing")
        if rating < 4.0:
            recommendations.append("Request feedback from clients and address issues")
        
        return {
            'freelancer_id': freelancer_id,
            'name': name,
            'title': title,
            'strengths': strengths,
            'weaknesses': weaknesses,
            'recommendations': recommendations,
            'score_breakdown': {
                'rating': float(rating),
                'completion_rate': float(completion),
                'acceptance_rate': float(acceptance),
                'on_time_rate': float(on_time),
                'profile_completeness': int(profile_comp),
                'years_experience': int(years_exp)
            }
        }
    
    except Exception as e:
        logger.error(f"Error getting insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ml/recompute-ranking/{job_id}",
          tags=["Model Management"])
async def recompute_ranking(job_id: int, background_tasks: BackgroundTasks):
    """
    Trigger recomputation of rankings for a job (e.g., after new proposals).
    """
    if not inference_pipeline:
        raise HTTPException(status_code=503, detail="ML pipeline not initialized")
    
    try:
        # Add to background tasks
        background_tasks.add_task(
            lambda: inference_pipeline.rank_freelancers_for_job(job_id)
        )
        
        return {
            'status': 'recomputation_scheduled',
            'job_id': job_id,
            'message': 'Rankings will be recomputed in the background'
        }
    
    except Exception as e:
        logger.error(f"Error scheduling recomputation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ml/retrain", tags=["Model Management"])
async def retrain_model(request: RetrainingRequest, background_tasks: BackgroundTasks):
    """
    Trigger model retraining with current data.
    This runs asynchronously in the background.
    """
    try:
        def train_background():
            logger.info("🤖 Starting background model retraining...")
            
            # Feature engineering
            fe_pipeline = FeatureEngineeringPipeline(DB_CONFIG)
            fe_pipeline.run_pipeline()
            
            # Model training
            model = RankingModel(DB_CONFIG)
            model.run_training_pipeline()
            
            logger.info("✅ Retraining complete")
        
        background_tasks.add_task(train_background)
        
        return {
            'status': 'retraining_scheduled',
            'message': 'Model retraining scheduled in background',
            'timestamp': datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error scheduling retraining: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/model-info", tags=["Model Management"])
async def get_model_info():
    """
    Get information about the current deployed model.
    """
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT model_name, model_version, status, training_date, deployment_date, 
                   training_samples_count, feature_count, metrics
            FROM ml_models
            WHERE status = 'deployed'
            ORDER BY deployment_date DESC
            LIMIT 1
        """)
        
        result = cursor.fetchone()
        conn.close()
        
        if not result:
            raise HTTPException(status_code=404, detail="No deployed model found")
        
        return {
            'model_name': result[0],
            'model_version': result[1],
            'status': result[2],
            'training_date': result[3].isoformat() if result[3] else None,
            'deployment_date': result[4].isoformat() if result[4] else None,
            'training_samples': result[5],
            'feature_count': result[6],
            'metrics': json.loads(result[7]) if result[7] else {}
        }
    
    except Exception as e:
        logger.error(f"Error getting model info: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ========== ERROR HANDLERS ==========

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Global HTTP exception handler"""
    return {
        "error": True,
        "status_code": exc.status_code,
        "detail": exc.detail,
        "timestamp": datetime.now().isoformat()
    }


# ========== MAIN ==========

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
