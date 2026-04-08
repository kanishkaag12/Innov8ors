"""
ML Inference Pipeline for Real-time Freelancer Ranking
- Loads trained model and scaler
- Computes features on-the-fly for new proposals
- Serves rankings via API
"""

import psycopg2
import numpy as np
import pandas as pd
import xgboost as xgb
from sentence_transformers import SentenceTransformer
import joblib
import logging
from datetime import datetime
import os
import json
from typing import List, Dict, Tuple
from db_config import get_db_config

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class RankingInferencePipeline:
    """Real-time inference for freelancer ranking"""
    
    CORE_FEATURES = [
        'semantic_similarity_job_proposal',
        'semantic_similarity_job_freelancer_bio',
        'semantic_similarity_title_match',
        'skill_overlap_count',
        'skill_overlap_percentage',
        'required_skills_covered',
        'price_fit_score',
        'profile_completeness',
        'years_experience',
        'average_rating',
        'acceptance_rate',
        'completion_rate',
        'on_time_rate',
        'rehire_rate',
        'proposal_length',
    ]
    
    def __init__(self, db_config, model_path='ranking_model.pkl', scaler_path='scaler.pkl'):
        """Initialize inference pipeline"""
        self.db_config = db_config
        self.conn = None
        self.model = None
        self.scaler = None
        self.embedding_model = None
        self.load_model(model_path, scaler_path)
    
    def connect(self):
        """Connect to PostgreSQL"""
        try:
            self.conn = psycopg2.connect(**self.db_config)
        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL: {e}")
            raise
    
    def close(self):
        """Close connection"""
        if self.conn:
            self.conn.close()
    
    def load_model(self, model_path, scaler_path):
        """Load trained model and scaler"""
        try:
            self.model = joblib.load(model_path)
            self.scaler = joblib.load(scaler_path)
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("✓ Loaded model, scaler, and embeddings")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
    
    # ========== FEATURE COMPUTATION ==========
    
    def compute_embedding(self, text):
        """Compute embedding for text"""
        if not text or text == '':
            return np.zeros(384)
        return self.embedding_model.encode(text)
    
    def compute_cosine_similarity(self, emb1, emb2):
        """Compute cosine similarity between two embeddings"""
        norm1 = np.linalg.norm(emb1)
        norm2 = np.linalg.norm(emb2)
        if norm1 == 0 or norm2 == 0:
            return 0.5
        return float(np.clip(np.dot(emb1, emb2) / (norm1 * norm2) * 0.5 + 0.5, 0, 1))
    
    def get_job_data(self, job_id: int) -> Dict:
        """Fetch job data from database"""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT job_id, job_title, job_description, budget_min, budget_max, experience_level
            FROM jobs WHERE job_id = %s
        """, (job_id,))
        
        result = cursor.fetchone()
        if not result:
            return None
        
        return {
            'job_id': result[0],
            'job_title': result[1],
            'job_description': result[2],
            'budget_min': result[3],
            'budget_max': result[4],
            'experience_level': result[5]
        }
    
    def get_job_required_skills(self, job_id: int) -> Dict[str, str]:
        """Get required skills for job"""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT s.skill_name, js.proficiency_required
            FROM job_skills js
            JOIN skills s ON js.skill_id = s.skill_id
            WHERE js.job_id = %s
        """, (job_id,))
        
        return {row[0]: row[1] for row in cursor.fetchall()}
    
    def get_freelancer_data(self, freelancer_id: int) -> Dict:
        """Fetch freelancer profile and metrics"""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT
                f.freelancer_id,
                f.full_name,
                f.title,
                f.bio,
                f.expected_hourly_rate,
                f.expected_project_rate,
                f.years_experience,
                f.profile_completeness,
                fm.average_rating,
                fm.total_completed_jobs,
                fm.acceptance_rate,
                fm.completion_rate,
                fm.on_time_rate,
                fm.rehire_rate,
                fm.dispute_rate,
                fm.total_proposals_sent,
                fm.profile_views_count
            FROM freelancer_profiles f
            JOIN freelancer_metrics fm ON f.freelancer_id = fm.freelancer_id
            WHERE f.freelancer_id = %s
        """, (freelancer_id,))
        
        result = cursor.fetchone()
        if not result:
            return None
        
        return {
            'freelancer_id': result[0],
            'full_name': result[1],
            'title': result[2],
            'bio': result[3],
            'expected_hourly_rate': result[4],
            'expected_project_rate': result[5],
            'years_experience': result[6],
            'profile_completeness': result[7],
            'average_rating': result[8],
            'total_completed_jobs': result[9],
            'acceptance_rate': result[10],
            'completion_rate': result[11],
            'on_time_rate': result[12],
            'rehire_rate': result[13],
            'dispute_rate': result[14],
            'total_proposals_sent': result[15],
            'profile_views': result[16]
        }
    
    def get_freelancer_skills(self, freelancer_id: int) -> Dict[str, str]:
        """Get freelancer skills"""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT s.skill_name, fs.proficiency_level
            FROM freelancer_skills fs
            JOIN skills s ON fs.skill_id = s.skill_id
            WHERE fs.freelancer_id = %s
        """, (freelancer_id,))
        
        return {row[0]: row[1] for row in cursor.fetchall()}
    
    def get_proposal_data(self, proposal_id: int) -> Dict:
        """Fetch proposal data"""
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT proposal_id, proposal_text, bid_amount, estimated_delivery_days, response_time_minutes
            FROM proposals WHERE proposal_id = %s
        """, (proposal_id,))
        
        result = cursor.fetchone()
        if not result:
            return None
        
        return {
            'proposal_id': result[0],
            'proposal_text': result[1],
            'bid_amount': result[2],
            'estimated_delivery_days': result[3],
            'response_time_minutes': result[4]
        }
    
    # ========== FEATURE EXTRACTION ==========
    
    def extract_features(self, job_id: int, freelancer_id: int, proposal_text: str) -> Tuple[np.ndarray, Dict]:
        """Extract features for ranking"""
        
        job = self.get_job_data(job_id)
        freelancer = self.get_freelancer_data(freelancer_id)
        
        if not job or not freelancer:
            raise ValueError(f"Could not find job {job_id} or freelancer {freelancer_id}")
        
        # Compute embeddings
        job_emb = self.compute_embedding(job['job_description'])
        freelancer_bio_emb = self.compute_embedding(freelancer['bio'])
        proposal_emb = self.compute_embedding(proposal_text)
        job_title_emb = self.compute_embedding(job['job_title'])
        freelancer_title_emb = self.compute_embedding(freelancer['title'] or '')
        
        # Semantic similarities
        semantic_sim_proposal = self.compute_cosine_similarity(job_emb, proposal_emb)
        semantic_sim_bio = self.compute_cosine_similarity(job_emb, freelancer_bio_emb)
        semantic_sim_title = self.compute_cosine_similarity(job_title_emb, freelancer_title_emb)
        
        # Skill overlap
        job_skills = self.get_job_required_skills(job_id)
        freelancer_skills = self.get_freelancer_skills(freelancer_id)
        
        skill_matches = sum(1 for skill in job_skills if skill in freelancer_skills)
        skill_total = len(job_skills) if job_skills else 1
        skill_overlap_count = skill_matches
        skill_overlap_percentage = (skill_matches / skill_total) * 100 if skill_total > 0 else 0
        required_skills_covered = skill_matches
        
        # Price fit
        bid = None  # We'll estimate or use from proposal if available
        if 'bid_amount' in locals():  # If bid was provided
            bid = bid
        
        # Assume freelancer bid at their expected rate
        if freelancer['expected_project_rate']:
            bid = freelancer['expected_project_rate']
        elif freelancer['expected_hourly_rate']:
            bid = freelancer['expected_hourly_rate'] * 40 * (job.get('duration_months', 1))
        else:
            bid = job['budget_min']
        
        budget_min = job['budget_min'] or 1000
        budget_max = job['budget_max'] or 10000
        
        if budget_min <= bid <= budget_max:
            price_fit = 0.9
        elif bid < budget_min * 0.8:
            price_fit = 0.5 + (bid / (budget_min * 0.8)) * 0.4
        elif bid > budget_max * 1.2:
            price_fit = 0.9 - ((bid - budget_max) / (budget_max * 0.2)) * 0.4
        else:
            price_fit = 0.8
        
        price_fit_score = float(np.clip(price_fit, 0, 1))
        
        # Proposal quality
        proposal_length = len(proposal_text) if proposal_text else 0
        response_time_hours = 24  # Default
        
        # Build feature vector
        features = {
            'semantic_similarity_job_proposal': semantic_sim_proposal,
            'semantic_similarity_job_freelancer_bio': semantic_sim_bio,
            'semantic_similarity_title_match': semantic_sim_title,
            'skill_overlap_count': skill_overlap_count,
            'skill_overlap_percentage': skill_overlap_percentage,
            'required_skills_covered': required_skills_covered,
            'price_fit_score': price_fit_score,
            'profile_completeness': freelancer['profile_completeness'],
            'years_experience': freelancer['years_experience'],
            'average_rating': freelancer['average_rating'],
            'acceptance_rate': freelancer['acceptance_rate'],
            'completion_rate': freelancer['completion_rate'],
            'on_time_rate': freelancer['on_time_rate'],
            'rehire_rate': freelancer['rehire_rate'],
            'proposal_length': proposal_length,
        }
        
        # Create feature vector in correct order
        feature_vector = np.array([features[f] for f in self.CORE_FEATURES]).reshape(1, -1)
        
        return feature_vector, features
    
    # ========== RANKING ==========
    
    def rank_freelancers_for_job(self, job_id: int) -> List[Dict]:
        """Rank all freelancers who have applied to a job"""
        logger.info(f"🔮 Ranking freelancers for job {job_id}...")
        
        cursor = self.conn.cursor()
        
        # Get all proposals for job
        cursor.execute("""
            SELECT p.proposal_id, p.freelancer_id, p.proposal_text, p.bid_amount
            FROM proposals p
            WHERE p.job_id = %s AND p.proposal_status != 'rejected'
            ORDER BY p.created_at DESC
        """, (job_id,))
        
        proposals = cursor.fetchall()
        
        rankings = []
        scores = []
        
        for proposal_id, freelancer_id, proposal_text, bid_amount in proposals:
            try:
                # Extract features
                feature_vector, features = self.extract_features(job_id, freelancer_id, proposal_text)
                
                # Scale features
                scaled_features = self.scaler.transform(feature_vector)
                
                # Predict score
                dtest = xgb.DMatrix(scaled_features)
                score = float(self.model.predict(dtest)[0])
                
                scores.append(score)
                
                rankings.append({
                    'proposal_id': proposal_id,
                    'freelancer_id': freelancer_id,
                    'ml_ranking_score': score,
                    'features': features
                })
            
            except Exception as e:
                logger.warning(f"Error ranking proposal {proposal_id}: {e}")
                continue
        
        # Sort by score (descending)
        rankings.sort(key=lambda x: x['ml_ranking_score'], reverse=True)
        
        # Add rank position and percentile
        for i, ranking in enumerate(rankings, 1):
            ranking['rank_position'] = i
            ranking['percentile_rank'] = (i / max(len(rankings), 1)) * 100
            ranking['confidence_score'] = 0.95
            
            # Add explainability
            ranking['top_strengths'], ranking['top_risks'] = self._generate_explanations(ranking['features'])
            ranking['estimated_success_probability'] = self._compute_success_probability(ranking['features'])
        
        logger.info(f"✓ Ranked {len(rankings)} freelancers")
        return rankings
    
    def rank_single_freelancer(self, job_id: int, freelancer_id: int, proposal_text: str) -> Dict:
        """Rank a single freelancer for a job"""
        logger.info(f"🔮 Ranking freelancer {freelancer_id} for job {job_id}...")
        
        try:
            feature_vector, features = self.extract_features(job_id, freelancer_id, proposal_text)
            
            scaled_features = self.scaler.transform(feature_vector)
            dtest = xgb.DMatrix(scaled_features)
            score = float(self.model.predict(dtest)[0])
            
            ranking = {
                'job_id': job_id,
                'freelancer_id': freelancer_id,
                'ml_ranking_score': score,
                'features': features,
                'confidence_score': 0.95,
                'top_strengths': [],
                'top_risks': [],
                'estimated_success_probability': 0.0
            }
            
            ranking['top_strengths'], ranking['top_risks'] = self._generate_explanations(features)
            ranking['estimated_success_probability'] = self._compute_success_probability(features)
            
            logger.info(f"✓ Computed ranking score: {score:.4f}")
            return ranking
        
        except Exception as e:
            logger.error(f"Error ranking freelancer: {e}")
            raise
    
    # ========== EXPLAINABILITY ==========
    
    def _generate_explanations(self, features: Dict) -> Tuple[List[str], List[str]]:
        """Generate human-readable explanations"""
        strengths = []
        risks = []
        
        # Strengths
        if features['semantic_similarity_job_proposal'] > 0.7:
            strengths.append("Strong proposal-job match")
        if features['skill_overlap_percentage'] > 70:
            strengths.append(f"High skill overlap ({features['skill_overlap_percentage']:.0f}%)")
        if features['average_rating'] > 4.5:
            strengths.append(f"Highly rated ({features['average_rating']:.1f}★)")
        if features['completion_rate'] > 90:
            strengths.append(f"Excellent completion rate ({features['completion_rate']:.0f}%)")
        if features['on_time_rate'] > 90:
            strengths.append(f"Outstanding on-time delivery ({features['on_time_rate']:.0f}%)")
        if features['price_fit_score'] > 0.85:
            strengths.append("Competitive pricing")
        
        # Risks
        if features['semantic_similarity_job_proposal'] < 0.4:
            risks.append("Poor proposal-job alignment")
        if features['skill_overlap_percentage'] < 30:
            risks.append(f"Limited skill match ({features['skill_overlap_percentage']:.0f}%)")
        if features['average_rating'] < 3.5:
            risks.append(f"Lower ratings ({features['average_rating']:.1f}★)")
        if features['completion_rate'] < 70:
            risks.append(f"Lower completion rate ({features['completion_rate']:.0f}%)")
        if features['years_experience'] < 2:
            risks.append("Limited experience")
        if features['price_fit_score'] < 0.5:
            risks.append("Price significantly outside budget")
        
        return strengths[:3], risks[:3]
    
    def _compute_success_probability(self, features: Dict) -> float:
        """Compute estimated success probability"""
        success_prob = (
            features['semantic_similarity_job_proposal'] * 0.3 +
            (features['skill_overlap_percentage'] / 100) * min(0.2, 1) +
            (features['average_rating'] / 5) * 0.2 +
            (features['completion_rate'] / 100) * 0.2 +
            features['price_fit_score'] * 0.1
        )
        return float(np.clip(success_prob, 0, 1))
    
    # ========== BATCH RANKING ==========
    
    def rank_freelancers_batch(self, job_ids: List[int]) -> Dict[int, List[Dict]]:
        """Rank freelancers for multiple jobs"""
        logger.info(f"🔮 Batch ranking {len(job_ids)} jobs...")
        
        all_rankings = {}
        for job_id in job_ids:
            try:
                all_rankings[job_id] = self.rank_freelancers_for_job(job_id)
            except Exception as e:
                logger.error(f"Error ranking job {job_id}: {e}")
                all_rankings[job_id] = []
        
        logger.info(f"✓ Completed batch ranking")
        return all_rankings


def main():
    """Test inference pipeline"""
    db_config = get_db_config()
    
    pipeline = RankingInferencePipeline(db_config)
    pipeline.connect()
    
    # Test: rank freelancers for job_id=1
    rankings = pipeline.rank_freelancers_for_job(1)
    
    logger.info("\n📊 Top 5 Ranked Freelancers:")
    for ranking in rankings[:5]:
        logger.info(f"   #{ranking['rank_position']}: freelancer_{ranking['freelancer_id']} "
                   f"(score: {ranking['ml_ranking_score']:.4f}, "
                   f"success: {ranking['estimated_success_probability']:.1%})")
    
    pipeline.close()


if __name__ == "__main__":
    main()
