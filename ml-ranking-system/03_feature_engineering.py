"""
Feature Engineering Pipeline for ML Ranking System
- Computes embeddings using Sentence Transformers
- Extracts structured features from PostgreSQL
- Creates feature vectors for XGBoost training
"""

import psycopg2
import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer
import logging
from datetime import datetime
from decimal import Decimal
import json
import os
from db_config import get_db_config

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class FeatureEngineeringPipeline:
    """Extract and compute features for ML model"""
    
    def __init__(self, db_config, embedding_model='all-MiniLM-L6-v2'):
        """Initialize feature pipeline"""
        self.db_config = db_config
        self.conn = None
        self.job_skills_cache = {}
        self.freelancer_skills_cache = {}
        self.embedding_model = SentenceTransformer(embedding_model)
        logger.info(f"✓ Loaded embedding model: {embedding_model}")
    
    def connect(self):
        """Connect to PostgreSQL"""
        try:
            self.conn = psycopg2.connect(**self.db_config)
            logger.info("✓ Connected to PostgreSQL")
        except Exception as e:
            logger.error(f"✗ Failed to connect: {e}")
            raise
    
    def close(self):
        """Close connection"""
        if self.conn:
            self.conn.close()

    def ensure_connection(self):
        """Reconnect if PostgreSQL connection was dropped."""
        if self.conn is None or self.conn.closed:
            logger.warning("PostgreSQL connection was closed. Reconnecting...")
            self.connect()
    
    # ========== TEXT EMBEDDINGS ==========
    
    def compute_embeddings(self, texts, batch_size=32):
        """Compute embeddings for list of texts"""
        if not texts or all(t is None or t == '' for t in texts):
            return np.zeros((len(texts), 384))  # MiniLM size
        
        embeddings = self.embedding_model.encode(texts, batch_size=batch_size)
        return embeddings
    
    def embeddings_to_bytes(self, embedding_array):
        """Convert numpy array to bytes for storage"""
        return embedding_array.astype(np.float32).tobytes()

    def safe_float(self, value):
        """Convert DB/pandas numeric values to float for feature calculations."""
        if value is None or pd.isna(value):
            return None
        if isinstance(value, Decimal):
            return float(value)

        try:
            return float(value)
        except (TypeError, ValueError):
            return None
    
    # ========== FEATURE EXTRACTION ==========
    
    def fetch_proposal_job_data(self):
        """Fetch all proposal-job pairs with necessary data"""
        self.ensure_connection()
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT
                p.proposal_id,
                p.job_id,
                p.freelancer_id,
                j.job_title,
                j.job_description,
                j.budget_min,
                j.budget_max,
                j.experience_level,
                p.proposal_text,
                p.bid_amount,
                p.estimated_delivery_days,
                p.response_time_minutes,
                p.created_at,
                f.full_name,
                f.title as freelancer_title,
                f.bio as freelancer_bio,
                f.years_experience,
                f.profile_completeness,
                f.expected_hourly_rate,
                f.expected_project_rate,
                fm.average_rating,
                fm.total_completed_jobs,
                fm.acceptance_rate,
                fm.completion_rate,
                fm.on_time_rate,
                fm.rehire_rate,
                fm.dispute_rate,
                fm.total_proposals_sent,
                fm.profile_views_count
            FROM proposals p
            JOIN jobs j ON p.job_id = j.job_id
            JOIN freelancer_profiles f ON p.freelancer_id = f.freelancer_id
            JOIN freelancer_metrics fm ON f.freelancer_id = fm.freelancer_id
            WHERE j.job_status IN ('open', 'in_progress', 'completed')
            ORDER BY p.job_id
        """)
        
        columns = [
            'proposal_id', 'job_id', 'freelancer_id', 'job_title', 'job_description',
            'budget_min', 'budget_max', 'experience_level', 'proposal_text', 'bid_amount',
            'estimated_delivery_days', 'response_time_minutes', 'created_at',
            'freelancer_name', 'freelancer_title', 'freelancer_bio', 'years_experience',
            'profile_completeness', 'expected_hourly_rate', 'expected_project_rate',
            'average_rating', 'total_completed_jobs', 'acceptance_rate', 'completion_rate',
            'on_time_rate', 'rehire_rate', 'dispute_rate', 'total_proposals_sent', 'profile_views'
        ]
        
        df = pd.DataFrame(cursor.fetchall(), columns=columns)
        logger.info(f"✓ Fetched {len(df)} proposal-job pairs")
        return df
    
    def fetch_proposal_job_data_batch(self, offset=0, limit=100):
        """Fetch batch of proposal-job pairs with necessary data"""
        self.ensure_connection()
        self.ensure_connection()
        cursor = self.conn.cursor()
        cursor.execute(f"""
            SELECT
                p.proposal_id,
                p.job_id,
                p.freelancer_id,
                j.job_title,
                j.job_description,
                j.budget_min,
                j.budget_max,
                j.experience_level,
                p.proposal_text,
                p.bid_amount,
                p.estimated_delivery_days,
                p.response_time_minutes,
                p.created_at,
                f.full_name,
                f.title as freelancer_title,
                f.bio as freelancer_bio,
                f.years_experience,
                f.profile_completeness,
                f.expected_hourly_rate,
                f.expected_project_rate,
                fm.average_rating,
                fm.total_completed_jobs,
                fm.acceptance_rate,
                fm.completion_rate,
                fm.on_time_rate,
                fm.rehire_rate,
                fm.dispute_rate,
                fm.total_proposals_sent,
                fm.profile_views_count
            FROM proposals p
            JOIN jobs j ON p.job_id = j.job_id
            JOIN freelancer_profiles f ON p.freelancer_id = f.freelancer_id
            JOIN freelancer_metrics fm ON f.freelancer_id = fm.freelancer_id
            WHERE j.job_status IN ('open', 'in_progress', 'completed')
            ORDER BY p.job_id
            OFFSET {offset} LIMIT {limit}
        """)
        
        columns = [
            'proposal_id', 'job_id', 'freelancer_id', 'job_title', 'job_description',
            'budget_min', 'budget_max', 'experience_level', 'proposal_text', 'bid_amount',
            'estimated_delivery_days', 'response_time_minutes', 'created_at',
            'freelancer_name', 'freelancer_title', 'freelancer_bio', 'years_experience',
            'profile_completeness', 'expected_hourly_rate', 'expected_project_rate',
            'average_rating', 'total_completed_jobs', 'acceptance_rate', 'completion_rate',
            'on_time_rate', 'rehire_rate', 'dispute_rate', 'total_proposals_sent', 'profile_views'
        ]
        
        df = pd.DataFrame(cursor.fetchall(), columns=columns)
        return df
    
    def get_job_required_skills(self, job_id):
        """Get required skills for a job"""
        if job_id in self.job_skills_cache:
            return self.job_skills_cache[job_id]

        query = """
            SELECT s.skill_id, s.skill_name, js.proficiency_required
            FROM job_skills js
            JOIN skills s ON js.skill_id = s.skill_id
            WHERE js.job_id = %s
        """

        for attempt in range(2):
            try:
                self.ensure_connection()
                cursor = self.conn.cursor()
                cursor.execute(query, (job_id,))
                skills = {row[1]: row[2] for row in cursor.fetchall()}
                self.job_skills_cache[job_id] = skills
                return skills
            except psycopg2.Error:
                if attempt == 1:
                    raise
                logger.warning(f"Retrying job skill lookup for job {job_id} after reconnect")
                self.connect()
    
    def get_freelancer_skills(self, freelancer_id):
        """Get freelancer skills"""
        if freelancer_id in self.freelancer_skills_cache:
            return self.freelancer_skills_cache[freelancer_id]

        query = """
            SELECT s.skill_id, s.skill_name, fs.proficiency_level
            FROM freelancer_skills fs
            JOIN skills s ON fs.skill_id = s.skill_id
            WHERE fs.freelancer_id = %s
        """

        for attempt in range(2):
            try:
                self.ensure_connection()
                cursor = self.conn.cursor()
                cursor.execute(query, (freelancer_id,))
                skills = {row[1]: row[2] for row in cursor.fetchall()}
                self.freelancer_skills_cache[freelancer_id] = skills
                return skills
            except psycopg2.Error:
                if attempt == 1:
                    raise
                logger.warning(
                    f"Retrying freelancer skill lookup for freelancer {freelancer_id} after reconnect"
                )
                self.connect()
    
    # ========== SEMANTIC SIMILARITY ==========
    
    def compute_semantic_similarities(self, df):
        """Compute semantic similarity scores"""
        logger.info("📊 Computing semantic similarities...")
        
        # Prepare texts
        job_descriptions = df['job_description'].fillna('').tolist()
        job_titles = df['job_title'].fillna('').tolist()
        proposal_texts = df['proposal_text'].fillna('').tolist()
        freelancer_bios = df['freelancer_bio'].fillna('').tolist()
        freelancer_titles = df['freelancer_title'].fillna('').tolist()
        
        # Compute embeddings
        job_desc_embeddings = self.compute_embeddings(job_descriptions)
        proposal_embeddings = self.compute_embeddings(proposal_texts)
        bio_embeddings = self.compute_embeddings(freelancer_bios)
        job_title_embeddings = self.compute_embeddings(job_titles)
        freelancer_title_embeddings = self.compute_embeddings(freelancer_titles)
        
        # Compute cosine similarities
        job_proposal_similarity = np.array([
            float(np.dot(job_desc_embeddings[i], proposal_embeddings[i]) / 
                  (np.linalg.norm(job_desc_embeddings[i]) * np.linalg.norm(proposal_embeddings[i]) + 1e-8))
            for i in range(len(df))
        ])
        
        job_bio_similarity = np.array([
            float(np.dot(job_desc_embeddings[i], bio_embeddings[i]) / 
                  (np.linalg.norm(job_desc_embeddings[i]) * np.linalg.norm(bio_embeddings[i]) + 1e-8))
            for i in range(len(df))
        ])
        
        title_match_similarity = np.array([
            float(np.dot(job_title_embeddings[i], freelancer_title_embeddings[i]) / 
                  (np.linalg.norm(job_title_embeddings[i]) * np.linalg.norm(freelancer_title_embeddings[i]) + 1e-8))
            for i in range(len(df))
        ])
        
        df['semantic_similarity_job_proposal'] = np.clip(job_proposal_similarity * 0.5 + 0.5, 0, 1)
        df['semantic_similarity_job_bio'] = np.clip(job_bio_similarity * 0.5 + 0.5, 0, 1)
        df['semantic_similarity_title_match'] = np.clip(title_match_similarity * 0.5 + 0.5, 0, 1)
        
        # Store embeddings
        df['job_embedding'] = [self.embeddings_to_bytes(emb) for emb in job_desc_embeddings]
        df['proposal_embedding'] = [self.embeddings_to_bytes(emb) for emb in proposal_embeddings]
        df['bio_embedding'] = [self.embeddings_to_bytes(emb) for emb in bio_embeddings]
        
        logger.info("✓ Computed semantic similarities")
    
    # ========== SKILL OVERLAP ==========
    
    def compute_skill_overlap(self, df):
        """Compute skill overlap between freelancer and job"""
        logger.info("📊 Computing skill overlaps...")
        
        skill_overlaps = []
        
        for idx, row in df.iterrows():
            job_id = row['job_id']
            freelancer_id = row['freelancer_id']
            
            try:
                job_skills = self.get_job_required_skills(job_id)
                freelancer_skills = self.get_freelancer_skills(freelancer_id)
                
                # Count matches
                matched = sum(1 for skill in job_skills if skill in freelancer_skills)
                total = len(job_skills) if job_skills else 1
                percentage = (matched / total) * 100 if total > 0 else 0
                
                skill_overlaps.append({
                    'skill_overlap_count': matched,
                    'skill_overlap_percentage': percentage,
                    'required_skills_covered': matched,
                    'total_required_skills': total
                })
            except Exception as e:
                logger.warning(f"Error computing skills for job {job_id}: {e}")
                skill_overlaps.append({
                    'skill_overlap_count': 0,
                    'skill_overlap_percentage': 0,
                    'required_skills_covered': 0,
                    'total_required_skills': 0
                })
        
        overlap_df = pd.DataFrame(skill_overlaps)
        for col in overlap_df.columns:
            df[col] = overlap_df[col]
        
        logger.info("✓ Computed skill overlaps")
    
    # ========== PRICE FIT ==========
    
    def compute_price_fit(self, df):
        """Compute price fit score"""
        logger.info("📊 Computing price fit scores...")
        
        price_fits = []
        
        for idx, row in df.iterrows():
            bid = self.safe_float(row['bid_amount'])
            budget_min = self.safe_float(row['budget_min'])
            budget_max = self.safe_float(row['budget_max'])
            
            if bid is None or budget_min is None or budget_max is None:
                price_fits.append(0.5)  # Neutral score
                continue
            
            # Score based on how well bid fits within budget
            if budget_min <= bid <= budget_max:
                # Perfectly within budget
                score = 0.9
            elif bid < budget_min * 0.8:
                # Too cheap (might indicate low quality)
                score = 0.5 + (bid / (budget_min * 0.8)) * 0.4
            elif bid > budget_max * 1.2:
                # Too expensive
                score = 0.9 - ((bid - budget_max) / (budget_max * 0.2)) * 0.4
            else:
                # Close to budget
                score = 0.8
            
            price_fits.append(float(np.clip(score, 0, 1)))
        
        df['price_fit_score'] = price_fits
        logger.info("✓ Computed price fit scores")
    
    # ========== PROPOSAL QUALITY ==========
    
    def compute_proposal_quality_features(self, df):
        """Compute proposal-level features"""
        logger.info("📊 Computing proposal quality features...")
        
        # Proposal length
        df['proposal_length'] = df['proposal_text'].fillna('').apply(len)
        
        # Response time in hours
        df['response_time_hours'] = df['response_time_minutes'].fillna(24*60) / 60
        
        logger.info("✓ Computed proposal quality features")
    
    # ========== NORMALIZE FEATURES ==========
    
    def normalize_features(self, df):
        """Normalize numeric features to 0-1 range"""
        logger.info("📊 Normalizing features...")
        
        # Features to normalize
        normalize_cols = [
            'years_experience', 'profile_completeness', 'expected_hourly_rate',
            'average_rating', 'total_completed_jobs', 'acceptance_rate',
            'completion_rate', 'on_time_rate', 'rehire_rate', 'proposal_length',
            'response_time_hours', 'total_proposals_sent', 'profile_views'
        ]
        
        for col in normalize_cols:
            if col in df.columns:
                max_val = df[col].max()
                if max_val > 0:
                    df[f'{col}_normalized'] = df[col] / max_val
                else:
                    df[f'{col}_normalized'] = 0
        
        logger.info("✓ Normalized features")
    
    # ========== SAVE TO DATABASE ==========
    
    def save_features_to_db(self, df):
        """Save computed features to ml_feature_snapshots"""
        logger.info("💾 Saving features to database...")
        
        self.ensure_connection()
        cursor = self.conn.cursor()
        updated_rows = 0
        
        for idx, row in df.iterrows():
            try:
                cursor.execute("""
                    UPDATE ml_feature_snapshots
                    SET
                        job_embedding = %s,
                        freelancer_bio_embedding = %s,
                        proposal_embedding = %s,
                        semantic_similarity_job_proposal = %s,
                        semantic_similarity_job_freelancer_bio = %s,
                        semantic_similarity_title_match = %s,
                        skill_overlap_count = %s,
                        skill_overlap_percentage = %s,
                        required_skills_covered = %s,
                        total_required_skills = %s,
                        bid_amount = %s,
                        job_budget_min = %s,
                        job_budget_max = %s,
                        price_fit_score = %s,
                        profile_completeness = %s,
                        years_experience = %s,
                        expected_rate = %s,
                        proposal_length = %s,
                        response_time_hours = %s,
                        acceptance_rate = %s,
                        completion_rate = %s,
                        average_rating = %s,
                        on_time_rate = %s,
                        rehire_rate = %s,
                        dispute_rate = %s,
                        profile_views = %s,
                        proposals_sent_this_month = %s,
                        updated_at = %s
                    WHERE job_id = %s AND freelancer_id = %s
                """, (
                    row['job_embedding'],
                    row['bio_embedding'],
                    row['proposal_embedding'],
                    row['semantic_similarity_job_proposal'],
                    row['semantic_similarity_job_bio'],
                    row['semantic_similarity_title_match'],
                    row['skill_overlap_count'],
                    row['skill_overlap_percentage'],
                    row['required_skills_covered'],
                    row['total_required_skills'],
                    row['bid_amount'],
                    row['budget_min'],
                    row['budget_max'],
                    row['price_fit_score'],
                    row['profile_completeness'],
                    row['years_experience'],
                    row['expected_hourly_rate'],
                    row['proposal_length'],
                    row['response_time_hours'],
                    row['acceptance_rate'],
                    row['completion_rate'],
                    row['average_rating'],
                    row['on_time_rate'],
                    row['rehire_rate'],
                    row['dispute_rate'],
                    row['profile_views'],
                    row['total_proposals_sent'],
                    datetime.now(),
                    row['job_id'],
                    row['freelancer_id']
                ))
                updated_rows += cursor.rowcount
            except Exception as e:
                logger.error(f"Error updating row {idx}: {e}")
                raise
        
        self.conn.commit()
        logger.info(f"✓ Updated {updated_rows} feature rows in ml_feature_snapshots")
    
    # ========== MAIN PIPELINE ==========
    
    def run_pipeline(self, batch_size=100):
        """Execute complete feature engineering pipeline with batching"""
        try:
            self.connect()
            
            logger.info("🚀 Starting feature engineering pipeline...")
            
            # Fetch data in batches
            total_processed = 0
            offset = 0
            
            while True:
                # Fetch batch of data
                df_batch = self.fetch_proposal_job_data_batch(offset, batch_size)
                if df_batch.empty:
                    break
                
                logger.info(f"📦 Processing batch {offset//batch_size + 1}: {len(df_batch)} proposals")
                
                # Compute features for this batch
                self.compute_semantic_similarities(df_batch)
                self.compute_skill_overlap(df_batch)
                self.compute_price_fit(df_batch)
                self.compute_proposal_quality_features(df_batch)
                self.normalize_features(df_batch)
                
                # Save batch to database
                self.save_features_to_db(df_batch)
                
                total_processed += len(df_batch)
                offset += batch_size
                
                logger.info(f"✅ Batch complete. Total processed: {total_processed}")
                
                # Progress update
                if total_processed % 500 == 0:
                    logger.info(f"📊 Progress: {total_processed} proposals processed")
            
            logger.info("✅ Feature engineering complete!")
            logger.info(f"📊 Total proposals processed: {total_processed}")
            
        except Exception as e:
            logger.error(f"❌ Pipeline failed: {e}")
            raise
        except Exception as e:
            logger.error(f"❌ Pipeline failed: {e}")
            raise
        finally:
            self.close()


def main():
    """Main entry point"""
    db_config = get_db_config()
    
    pipeline = FeatureEngineeringPipeline(db_config)
    pipeline.run_pipeline(batch_size=50)  # Process in smaller batches


if __name__ == "__main__":
    main()
