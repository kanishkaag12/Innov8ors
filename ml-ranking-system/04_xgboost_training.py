"""
XGBoost LambdaMART Ranking Model
- Pure ML learning-to-rank approach
- Trained on feature snapshots from PostgreSQL
- Produces ranking scores for freelancers per job
"""

import psycopg2
from psycopg2.extras import execute_values
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.preprocessing import StandardScaler
import joblib
import logging
from datetime import datetime
import os
import json
import subprocess
import sys
from db_config import get_db_config

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class RankingModel:
    """XGBoost LambdaMART ranking model for freelancer ranking"""
    
    # Core features for model
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
    
    def __init__(self, db_config, model_name='freelancer_ranker_v1'):
        """Initialize ranking model"""
        self.db_config = db_config
        self.conn = None
        self.model = None
        self.scaler = StandardScaler()
        self.model_name = model_name
        self.feature_names = None
    
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

    def reconnect(self):
        """Reconnect to PostgreSQL when the existing connection is stale."""
        self.close()
        self.connect()
    
    # ========== DATA LOADING ==========
    
    def load_training_data(self):
        """Load training data from PostgreSQL"""
        logger.info("📥 Loading training data from database...")
        
        columns = ['job_id', 'freelancer_id'] + self.CORE_FEATURES + ['target_rank_label', 'was_hired']
        data = None

        for attempt in range(2):
            try:
                cursor = self.conn.cursor()

                # Fetch feature snapshots and derive fallback labels when explicit rank labels are missing.
                cursor.execute(f"""
                    SELECT
                        job_id,
                        freelancer_id,
                        {', '.join(self.CORE_FEATURES)},
                        COALESCE(
                            target_rank_label,
                            CASE
                                WHEN was_hired = TRUE AND was_shortlisted = TRUE THEN 2
                                WHEN was_hired = TRUE THEN 1
                                ELSE 0
                            END
                        ) AS target_rank_label,
                        was_hired
                    FROM ml_feature_snapshots
                    ORDER BY job_id
                """)

                data = cursor.fetchall()
                break
            except (psycopg2.OperationalError, psycopg2.InterfaceError) as exc:
                if attempt == 1:
                    raise
                logger.warning(f"⚠️ Database connection dropped while loading data. Reconnecting... ({exc})")
                self.reconnect()
        
        df = pd.DataFrame(data, columns=columns)

        if df.empty:
            raise ValueError(
                "No training rows found in ml_feature_snapshots. Run data generation/feature engineering first."
            )
        
        # Handle missing values
        for col in self.CORE_FEATURES:
            df[col] = df[col].fillna(0)
        
        logger.info(f"✓ Loaded {len(df)} training samples")
        logger.info(f"   Job groups: {df['job_id'].nunique()}")
        logger.info(f"   Positive samples (hired): {(df['was_hired'] == 1).sum()}")
        logger.info(f"   Label distribution:\n{df['target_rank_label'].value_counts()}")
        
        return df

    def _run_pipeline_script(self, script_name):
        """Run a local pipeline script using the current Python executable."""
        script_path = os.path.join(os.path.dirname(__file__), script_name)
        if not os.path.exists(script_path):
            raise FileNotFoundError(f"Required script not found: {script_path}")

        logger.info(f"🛠️ Running bootstrap step: {script_name}")
        subprocess.run([sys.executable, script_path], check=True)

    def bootstrap_training_data(self):
        """Create and populate training snapshots when source table is empty."""
        logger.warning(
            "No rows found in ml_feature_snapshots. Bootstrapping synthetic data and feature engineering..."
        )
        self._run_pipeline_script('02_synthetic_data_generator.py')
        self.reconnect()

        # If snapshots were created, only skip feature engineering when rows contain meaningful engineered values.
        # Some schemas default feature columns to 0 (non-null), which would otherwise look "ready" and produce a constant model.
        cursor = self.conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM ml_feature_snapshots")
        snapshot_count = cursor.fetchone()[0]

        if snapshot_count == 0:
            raise ValueError(
                "Bootstrap failed: synthetic data generator did not create ml_feature_snapshots rows."
            )

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM ml_feature_snapshots
            WHERE
                COALESCE(semantic_similarity_job_proposal, 0) <> 0
                OR COALESCE(semantic_similarity_job_freelancer_bio, 0) <> 0
                OR COALESCE(semantic_similarity_title_match, 0) <> 0
                OR COALESCE(skill_overlap_percentage, 0) <> 0
                OR COALESCE(price_fit_score, 0) <> 0
                OR COALESCE(profile_completeness, 0) <> 0
                OR COALESCE(years_experience, 0) <> 0
                OR COALESCE(average_rating, 0) <> 0
                OR COALESCE(acceptance_rate, 0) <> 0
                OR COALESCE(completion_rate, 0) <> 0
                OR COALESCE(on_time_rate, 0) <> 0
                OR COALESCE(rehire_rate, 0) <> 0
                OR COALESCE(proposal_length, 0) <> 0
            """
        )
        ready_count = cursor.fetchone()[0]

        if ready_count == 0:
            self._run_pipeline_script('03_feature_engineering.py')
        else:
            logger.info(
                f"⏭️ Skipping feature engineering ({ready_count}/{snapshot_count} rows already contain engineered features)"
            )
    
    def prepare_ranking_data(self, df):
        """Prepare data for ranking model (group by job)"""
        logger.info("📊 Preparing ranking data...")
        
        if df.empty:
            raise ValueError("Training dataframe is empty. No ranking data is available.")

        # Features
        X = df[self.CORE_FEATURES].values
        
        # Labels (ranking: 0=worst, 1=medium, 2=best)
        y = df['target_rank_label'].values
        
        # Group sizes (number of freelancers per job)
        group_sizes = df.groupby('job_id').size().values

        if len(group_sizes) == 0:
            raise ValueError("No job groups found for training.")
        
        logger.info(f"✓ Prepared: {X.shape[0]} samples, {len(group_sizes)} job groups")
        logger.info(f"   Avg freelancers per job: {group_sizes.mean():.1f}")
        logger.info(f"   Max group size: {group_sizes.max()}")
        
        return X, y, group_sizes
    
    # ========== MODEL TRAINING ==========
    
    def train_model(self, df):
        """Train XGBoost LambdaMART model"""
        logger.info("🤖 Training LambdaMART model...")
        
        # Prepare data
        X, y, group_sizes = self.prepare_ranking_data(df)
        
        # Fit scaler
        X_scaled = self.scaler.fit_transform(X)
        
        # Create DMatrix for XGBoost
        dtrain = xgb.DMatrix(X_scaled, label=y, group=group_sizes)
        
        # Hyperparameters for LambdaMART
        params = {
            'objective': 'rank:ndcg',
            'eval_metric': 'ndcg',
            'ndcg_eval_at': [1, 5, 10],
            'max_depth': 6,
            'eta': 0.1,
            'subsample': 0.8,
            'colsample_bytree': 0.8,
            'min_child_weight': 1,
            'tree_method': 'hist',
            'seed': 42,
        }
        
        # Train
        self.model = xgb.train(
            params,
            dtrain,
            num_boost_round=100,
            verbose_eval=10
        )
        
        logger.info("✓ Model trained successfully")
        
        # Feature importance
        self.log_feature_importance()
    
    def log_feature_importance(self):
        """Log feature importance"""
        importance = self.model.get_score(importance_type='weight')
        sorted_features = sorted(importance.items(), key=lambda x: x[1], reverse=True)
        
        logger.info("📊 Top 10 Important Features:")
        for i, (feature, importance_score) in enumerate(sorted_features[:10], 1):
            logger.info(f"   {i}. {feature}: {importance_score}")
    
    # ========== MODEL PREDICTION ==========
    
    def predict_rankings(self, df):
        """Predict ranking scores for freelancers"""
        logger.info("🔮 Computing ranking predictions...")
        
        X = df[self.CORE_FEATURES].values
        X_scaled = self.scaler.transform(X)
        
        # Create DMatrix
        dtest = xgb.DMatrix(X_scaled)
        
        # Predict
        scores = self.model.predict(dtest)
        
        df['ml_ranking_score'] = scores
        
        # Add ranking position by job
        df['rank_position'] = df.groupby('job_id')['ml_ranking_score'].rank(method='dense', ascending=False)
        df['percentile_rank'] = df.groupby('job_id')['ml_ranking_score'].rank(pct=True) * 100
        
        logger.info(f"✓ Generated {len(df)} ranking predictions")
        logger.info(f"   Score range: [{df['ml_ranking_score'].min():.3f}, {df['ml_ranking_score'].max():.3f}]")
        
        return df
    
    # ========== MODEL EVALUATION ==========
    
    def evaluate_model(self, df):
        """Evaluate model performance"""
        logger.info("📈 Evaluating model...")
        
        # Prepare data
        X, y, group_sizes = self.prepare_ranking_data(df)
        X_scaled = self.scaler.transform(X)
        
        dtest = xgb.DMatrix(X_scaled, label=y, group=group_sizes)
        
        # Predict
        predictions = self.model.predict(dtest)

        def _ndcg_at_k(y_true, y_score, k):
            if len(y_true) == 0:
                return 0.0

            order = np.argsort(y_score)[::-1]
            ranked_true = np.asarray(y_true)[order][:k]
            ideal_true = np.sort(np.asarray(y_true))[::-1][:k]

            discounts = 1.0 / np.log2(np.arange(2, ranked_true.size + 2))
            dcg = float(np.sum((2 ** ranked_true - 1) * discounts))

            ideal_discounts = 1.0 / np.log2(np.arange(2, ideal_true.size + 2))
            ideal_dcg = float(np.sum((2 ** ideal_true - 1) * ideal_discounts))
            return dcg / ideal_dcg if ideal_dcg > 0 else 0.0

        ndcg_at_5 = []
        ndcg_at_10 = []
        start = 0
        for group_size in group_sizes:
            end = start + int(group_size)
            group_labels = y[start:end]
            group_predictions = predictions[start:end]
            ndcg_at_5.append(_ndcg_at_k(group_labels, group_predictions, 5))
            ndcg_at_10.append(_ndcg_at_k(group_labels, group_predictions, 10))
            start = end
        
        metrics = {
            'num_samples': len(df),
            'num_groups': len(group_sizes),
            'avg_group_size': float(group_sizes.mean()),
            'predictions_mean': float(predictions.mean()),
            'predictions_std': float(predictions.std()),
            'ndcg_at_5': float(np.mean(ndcg_at_5)) if ndcg_at_5 else 0.0,
            'ndcg_at_10': float(np.mean(ndcg_at_10)) if ndcg_at_10 else 0.0,
            'label_distribution': df['target_rank_label'].value_counts().to_dict(),
            'hired_rate': float((df['was_hired'] == 1).sum() / len(df))
        }
        
        logger.info(f"✓ Evaluation Results:")
        for key, value in metrics.items():
            logger.info(f"   {key}: {value}")
        
        return metrics
    
    # ========== SAVE MODEL ==========
    
    def save_model(self, model_path='ranking_model.pkl', scaler_path='scaler.pkl'):
        """Save model and scaler"""
        logger.info(f"💾 Saving model to {model_path}...")
        
        joblib.dump(self.model, model_path)
        joblib.dump(self.scaler, scaler_path)
        
        logger.info("✓ Model saved")
    
    def save_model_metadata_to_db(self, metrics):
        """Save model metadata to database"""
        logger.info("💾 Saving model metadata to database...")
        
        cursor = self.conn.cursor()
        
        cursor.execute("""
            INSERT INTO ml_models 
            (model_name, model_version, model_type, metrics, hyperparameters, 
             feature_count, training_samples_count, status, deployment_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            self.model_name,
            f"v{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            'xgboost_lambdamart',
            json.dumps(metrics),
            json.dumps({
                'objective': 'rank:ndcg',
                'max_depth': 6,
                'eta': 0.1,
                'num_boost_round': 100
            }),
            len(self.CORE_FEATURES),
            metrics.get('num_samples', 0),
            'deployed',
            datetime.now()
        ))
        
        self.conn.commit()
        logger.info("✓ Model metadata saved")
    
    # ========== SAVE PREDICTIONS ==========
    
    def save_predictions_to_db(self, df):
        """Save ranking predictions to database"""
        logger.info("💾 Saving predictions to database...")
        
        cursor = self.conn.cursor()

        updates = []
        for idx, row in df.iterrows():
            semantic_similarity_job_proposal = float(row['semantic_similarity_job_proposal'])
            skill_overlap_percentage = float(row['skill_overlap_percentage'])
            average_rating = float(row['average_rating'])
            completion_rate = float(row['completion_rate'])
            on_time_rate = float(row['on_time_rate'])
            price_fit_score = float(row['price_fit_score'])

            # Parse explanations
            top_strengths = []
            top_risks = []
            
            if semantic_similarity_job_proposal > 0.7:
                top_strengths.append("Strong proposal-job match")
            if skill_overlap_percentage > 70:
                top_strengths.append(f"High skill overlap ({skill_overlap_percentage:.0f}%)")
            if average_rating > 4.5:
                top_strengths.append(f"Highly rated ({average_rating:.1f}★)")
            if completion_rate > 90:
                top_strengths.append(f"Excellent completion rate ({completion_rate:.0f}%)")
            
            if semantic_similarity_job_proposal < 0.4:
                top_risks.append("Poor proposal-job alignment")
            if skill_overlap_percentage < 30:
                top_risks.append(f"Limited skill overlap ({skill_overlap_percentage:.0f}%)")
            if average_rating < 3.5:
                top_risks.append(f"Low rating ({average_rating:.1f}★)")
            if completion_rate < 70:
                top_risks.append(f"Low completion rate ({completion_rate:.0f}%)")
            
            success_prob = (
                semantic_similarity_job_proposal * 0.3 +
                (skill_overlap_percentage / 100.0) * 0.2 +
                (average_rating / 5.0) * 0.2 +
                (completion_rate / 100.0) * 0.2 +
                price_fit_score * 0.1
            )
            
            updates.append((
                row['ml_ranking_score'],
                row['percentile_rank'],
                int(row['rank_position']),
                0.95,  # confidence_score
                semantic_similarity_job_proposal,
                skill_overlap_percentage / 100.0,
                price_fit_score,
                float((average_rating + completion_rate / 100.0 + on_time_rate / 100.0) / 3.0),
                json.dumps(top_strengths[:3]),
                json.dumps(top_risks[:3]),
                float(np.clip(success_prob, 0, 1)),
                self.model_name,
                row['job_id'],
                row['freelancer_id']
            ))

        execute_values(
            cursor,
            """
                INSERT INTO ranking_predictions
                (ml_ranking_score, percentile_rank, rank_position, confidence_score,
                 semantic_score_contribution, skill_match_contribution, price_fit_contribution,
                 metrics_contribution, top_strengths, top_risks, estimated_success_probability,
                 model_version, job_id, freelancer_id)
                VALUES %s
                ON CONFLICT (job_id, freelancer_id) DO UPDATE SET
                    ml_ranking_score = EXCLUDED.ml_ranking_score,
                    percentile_rank = EXCLUDED.percentile_rank,
                    rank_position = EXCLUDED.rank_position,
                    confidence_score = EXCLUDED.confidence_score,
                    semantic_score_contribution = EXCLUDED.semantic_score_contribution,
                    skill_match_contribution = EXCLUDED.skill_match_contribution,
                    price_fit_contribution = EXCLUDED.price_fit_contribution,
                    metrics_contribution = EXCLUDED.metrics_contribution,
                    top_strengths = EXCLUDED.top_strengths,
                    top_risks = EXCLUDED.top_risks,
                    estimated_success_probability = EXCLUDED.estimated_success_probability,
                    prediction_timestamp = CURRENT_TIMESTAMP
            """,
            updates,
            page_size=500,
        )
        
        self.conn.commit()
        logger.info(f"✓ Saved {len(updates)} predictions")
    
    # ========== MAIN PIPELINE ==========
    
    def run_training_pipeline(self):
        """Execute complete training pipeline"""
        try:
            self.connect()
            
            logger.info("🚀 Starting model training pipeline...")
            
            # Load data
            try:
                df = self.load_training_data()
            except ValueError as e:
                if "No training rows found in ml_feature_snapshots" not in str(e):
                    raise

                self.bootstrap_training_data()
                self.reconnect()
                df = self.load_training_data()
            
            # Train model
            self.train_model(df)
            
            # Evaluate
            metrics = self.evaluate_model(df)
            
            # Make predictions
            df_with_preds = self.predict_rankings(df)
            
            # Save model
            self.save_model()
            self.save_model_metadata_to_db(metrics)
            
            # Save predictions
            self.save_predictions_to_db(df_with_preds)
            
            logger.info("✅ Training pipeline complete!")
            
        except Exception as e:
            logger.error(f"❌ Pipeline failed: {e}")
            raise
        finally:
            self.close()


def main():
    """Main entry point"""
    db_config = get_db_config()
    
    model = RankingModel(db_config)
    model.run_training_pipeline()


if __name__ == "__main__":
    main()
