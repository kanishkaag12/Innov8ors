-- ============================================================================
-- SYNAPESCROW ML RANKING SYSTEM - PostgreSQL Schema
-- ============================================================================
-- This schema is designed for:
-- 1. Pure ML-based freelancer ranking
-- 2. Relational data modeling (no MongoDB)
-- 3. Efficient JOINs for feature engineering
-- 4. ML feature extraction and training

-- ============================================================================
-- 1. USERS & FREELANCER PROFILES
-- ============================================================================

CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('freelancer', 'employer', 'admin')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

CREATE TABLE freelancer_profiles (
  freelancer_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  bio TEXT,
  expected_hourly_rate DECIMAL(10, 2),
  expected_project_rate DECIMAL(10, 2),
  location VARCHAR(255),
  timezone VARCHAR(50),
  profile_completeness INT DEFAULT 0 CHECK (profile_completeness >= 0 AND profile_completeness <= 100),
  
  -- Profile timestamps
  profile_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  profile_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Additional metadata
  years_experience INT DEFAULT 0,
  portfolio_url VARCHAR(500),
  github_url VARCHAR(500),
  badges JSONB DEFAULT '[]',
  
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_freelancer_profiles_user_id ON freelancer_profiles(user_id);
CREATE INDEX idx_freelancer_profiles_title ON freelancer_profiles(title);
CREATE INDEX idx_freelancer_profiles_location ON freelancer_profiles(location);

-- ============================================================================
-- 2. SKILLS MANAGEMENT (Relational, not arrays)
-- ============================================================================

CREATE TABLE skills (
  skill_id SERIAL PRIMARY KEY,
  skill_name VARCHAR(255) UNIQUE NOT NULL,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_skills_name ON skills(skill_name);
CREATE INDEX idx_skills_category ON skills(category);

CREATE TABLE freelancer_skills (
  freelancer_skill_id SERIAL PRIMARY KEY,
  freelancer_id INT NOT NULL,
  skill_id INT NOT NULL,
  proficiency_level VARCHAR(50) DEFAULT 'intermediate' CHECK (proficiency_level IN ('beginner', 'intermediate', 'expert')),
  years_experience_in_skill INT,
  endorsement_count INT DEFAULT 0,
  last_used_date TIMESTAMP,
  
  FOREIGN KEY (freelancer_id) REFERENCES freelancer_profiles(freelancer_id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(skill_id) ON DELETE CASCADE,
  UNIQUE(freelancer_id, skill_id)
);

CREATE INDEX idx_freelancer_skills_freelancer_id ON freelancer_skills(freelancer_id);
CREATE INDEX idx_freelancer_skills_skill_id ON freelancer_skills(skill_id);

-- ============================================================================
-- 3. JOBS & PROJECT MANAGEMENT
-- ============================================================================

CREATE TABLE jobs (
  job_id SERIAL PRIMARY KEY,
  employer_id INT NOT NULL,
  job_title VARCHAR(255) NOT NULL,
  job_description TEXT NOT NULL,
  job_category VARCHAR(100),
  budget_min DECIMAL(10, 2),
  budget_max DECIMAL(10, 2),
  budget_type VARCHAR(50) DEFAULT 'fixed' CHECK (budget_type IN ('fixed', 'hourly')),
  duration_months INT,
  experience_level VARCHAR(50) CHECK (experience_level IN ('entry', 'intermediate', 'expert')),
  
  job_status VARCHAR(50) DEFAULT 'open' CHECK (job_status IN ('draft', 'open', 'in_progress', 'completed', 'cancelled')),
  visibility VARCHAR(50) DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'invitation')),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  published_at TIMESTAMP,
  deadline TIMESTAMP,
  
  FOREIGN KEY (employer_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_jobs_employer_id ON jobs(employer_id);
CREATE INDEX idx_jobs_status ON jobs(job_status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX idx_jobs_category ON jobs(job_category);

CREATE TABLE job_skills (
  job_skill_id SERIAL PRIMARY KEY,
  job_id INT NOT NULL,
  skill_id INT NOT NULL,
  proficiency_required VARCHAR(50) DEFAULT 'intermediate' CHECK (proficiency_required IN ('beginner', 'intermediate', 'expert')),
  
  FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(skill_id) ON DELETE CASCADE,
  UNIQUE(job_id, skill_id)
);

CREATE INDEX idx_job_skills_job_id ON job_skills(job_id);
CREATE INDEX idx_job_skills_skill_id ON job_skills(skill_id);

-- ============================================================================
-- 4. PROPOSALS & APPLICATIONS
-- ============================================================================

CREATE TABLE proposals (
  proposal_id SERIAL PRIMARY KEY,
  job_id INT NOT NULL,
  freelancer_id INT NOT NULL,
  
  proposal_text TEXT NOT NULL,
  bid_amount DECIMAL(10, 2),
  estimated_delivery_days INT,
  
  proposal_status VARCHAR(50) DEFAULT 'submitted' CHECK (proposal_status IN ('submitted', 'viewed', 'shortlisted', 'rejected', 'accepted', 'hired')),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  viewed_at TIMESTAMP,
  response_time_minutes INT,
  
  FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
  FOREIGN KEY (freelancer_id) REFERENCES freelancer_profiles(freelancer_id) ON DELETE CASCADE
);

CREATE INDEX idx_proposals_job_id ON proposals(job_id);
CREATE INDEX idx_proposals_freelancer_id ON proposals(freelancer_id);
CREATE INDEX idx_proposals_status ON proposals(proposal_status);
CREATE UNIQUE INDEX idx_proposal_unique ON proposals(job_id, freelancer_id);

-- ============================================================================
-- 5. FREELANCER METRICS & PERFORMANCE
-- ============================================================================

CREATE TABLE freelancer_metrics (
  metric_id SERIAL PRIMARY KEY,
  freelancer_id INT NOT NULL UNIQUE,
  
  -- Performance metrics
  total_completed_jobs INT DEFAULT 0,
  total_proposals_sent INT DEFAULT 0,
  total_proposals_accepted INT DEFAULT 0,
  
  acceptance_rate DECIMAL(5, 2) DEFAULT 0,
  hire_rate DECIMAL(5, 2) DEFAULT 0,
  completion_rate DECIMAL(5, 2) DEFAULT 0,
  
  -- Quality metrics
  average_rating DECIMAL(3, 2) DEFAULT 0,
  total_ratings INT DEFAULT 0,
  
  on_time_rate DECIMAL(5, 2) DEFAULT 0,
  on_budget_rate DECIMAL(5, 2) DEFAULT 0,
  dispute_rate DECIMAL(5, 2) DEFAULT 0,
  dispute_count INT DEFAULT 0,
  
  -- Engagement metrics
  average_response_time_hours INT DEFAULT 0,
  profile_views_count INT DEFAULT 0,
  repeat_hires INT DEFAULT 0,
  rehire_rate DECIMAL(5, 2) DEFAULT 0,
  
  -- Historical data
  last_job_completed_date TIMESTAMP,
  last_proposal_sent_date TIMESTAMP,
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (freelancer_id) REFERENCES freelancer_profiles(freelancer_id) ON DELETE CASCADE
);

CREATE INDEX idx_freelancer_metrics_freelancer_id ON freelancer_metrics(freelancer_id);

-- ============================================================================
-- 6. ML MODELS & FEATURES
-- ============================================================================

CREATE TABLE ml_feature_snapshots (
  snapshot_id SERIAL PRIMARY KEY,
  job_id INT NOT NULL,
  freelancer_id INT NOT NULL,
  
  -- Text embeddings (stored as vectors via pgvector)
  job_embedding BYTEA,
  freelancer_bio_embedding BYTEA,
  proposal_embedding BYTEA,
  
  -- Computed features
  semantic_similarity_job_proposal DECIMAL(5, 3),
  semantic_similarity_job_freelancer_bio DECIMAL(5, 3),
  semantic_similarity_title_match DECIMAL(5, 3),
  
  -- Skill features
  skill_overlap_count INT,
  skill_overlap_percentage DECIMAL(5, 2),
  required_skills_covered INT,
  total_required_skills INT,
  
  -- Price features
  bid_amount DECIMAL(10, 2),
  job_budget_min DECIMAL(10, 2),
  job_budget_max DECIMAL(10, 2),
  price_fit_score DECIMAL(5, 3),
  
  -- Profile features
  profile_completeness INT,
  years_experience INT,
  expected_rate DECIMAL(10, 2),
  
  -- Proposal features
  proposal_length INT,
  response_time_hours INT,
  
  -- Metrics features
  acceptance_rate DECIMAL(5, 2),
  completion_rate DECIMAL(5, 2),
  average_rating DECIMAL(3, 2),
  on_time_rate DECIMAL(5, 2),
  rehire_rate DECIMAL(5, 2),
  dispute_rate DECIMAL(5, 2),
  
  -- Engagement features
  profile_views INT,
  proposals_sent_this_month INT,
  
  -- Target labels (for training)
  target_rank_label INT CHECK (target_rank_label IN (0, 1, 2, 3, NULL)),
  target_success_score DECIMAL(5, 2),
  was_hired BOOLEAN DEFAULT FALSE,
  was_shortlisted BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
  FOREIGN KEY (freelancer_id) REFERENCES freelancer_profiles(freelancer_id) ON DELETE CASCADE
);

CREATE INDEX idx_ml_features_job_id ON ml_feature_snapshots(job_id);
CREATE INDEX idx_ml_features_freelancer_id ON ml_feature_snapshots(freelancer_id);
CREATE INDEX idx_ml_features_created_at ON ml_feature_snapshots(created_at);

-- ============================================================================
-- 7. RANKING PREDICTIONS
-- ============================================================================

CREATE TABLE ranking_predictions (
  prediction_id SERIAL PRIMARY KEY,
  job_id INT NOT NULL,
  freelancer_id INT NOT NULL,
  
  -- Ranking outputs
  ml_ranking_score DECIMAL(10, 4),
  percentile_rank DECIMAL(5, 2),
  rank_position INT,
  confidence_score DECIMAL(5, 3),
  
  -- Feature contributions (for explainability)
  semantic_score_contribution DECIMAL(5, 3),
  skill_match_contribution DECIMAL(5, 3),
  price_fit_contribution DECIMAL(5, 3),
  metrics_contribution DECIMAL(5, 3),
  
  -- Explainability
  top_strengths JSONB DEFAULT '[]',
  top_risks JSONB DEFAULT '[]',
  estimated_success_probability DECIMAL(5, 2),
  
  model_version VARCHAR(50),
  prediction_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
  FOREIGN KEY (freelancer_id) REFERENCES freelancer_profiles(freelancer_id) ON DELETE CASCADE,
  UNIQUE(job_id, freelancer_id)
);

CREATE INDEX idx_ranking_predictions_job_id ON ranking_predictions(job_id);
CREATE INDEX idx_ranking_predictions_score ON ranking_predictions(ml_ranking_score DESC);

-- ============================================================================
-- 8. MODEL METADATA
-- ============================================================================

CREATE TABLE ml_models (
  model_id SERIAL PRIMARY KEY,
  model_name VARCHAR(255) NOT NULL,
  model_version VARCHAR(50) NOT NULL,
  model_type VARCHAR(100) DEFAULT 'xgboost_lambdamart',
  
  metrics JSONB DEFAULT '{}',
  hyperparameters JSONB DEFAULT '{}',
  
  training_samples_count INT,
  feature_count INT,
  
  training_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deployment_date TIMESTAMP,
  status VARCHAR(50) DEFAULT 'trained' CHECK (status IN ('training', 'trained', 'deployed', 'archived')),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ml_models_version ON ml_models(model_version);
CREATE INDEX idx_ml_models_status ON ml_models(status);

-- ============================================================================
-- 9. INTERACTION LOG (for future retraining)
-- ============================================================================

CREATE TABLE freelancer_interactions (
  interaction_id SERIAL PRIMARY KEY,
  job_id INT NOT NULL,
  freelancer_id INT NOT NULL,
  
  interaction_type VARCHAR(100) NOT NULL CHECK (
    interaction_type IN ('proposal_sent', 'profile_viewed', 'proposal_accepted', 
                        'hire_decision', 'job_completed', 'rating_given', 'dispute_filed')
  ),
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
  FOREIGN KEY (freelancer_id) REFERENCES freelancer_profiles(freelancer_id) ON DELETE CASCADE
);

CREATE INDEX idx_interactions_job_id ON freelancer_interactions(job_id);
CREATE INDEX idx_interactions_freelancer_id ON freelancer_interactions(freelancer_id);
CREATE INDEX idx_interactions_type ON freelancer_interactions(interaction_type);

-- ============================================================================
-- 10. CONTRACTS & WORK TRACKING
-- ============================================================================

CREATE TABLE contracts (
  contract_id SERIAL PRIMARY KEY,
  job_id INT NOT NULL,
  freelancer_id INT NOT NULL,
  
  contract_status VARCHAR(50) DEFAULT 'active' CHECK (contract_status IN ('pending', 'active', 'completed', 'cancelled', 'dispute')),
  
  awarded_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  start_date TIMESTAMP,
  completion_date TIMESTAMP,
  deadline TIMESTAMP,
  
  total_amount DECIMAL(10, 2),
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  
  feedback_rating DECIMAL(3, 2),
  feedback_comment TEXT,
  
  FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
  FOREIGN KEY (freelancer_id) REFERENCES freelancer_profiles(freelancer_id) ON DELETE CASCADE,
  UNIQUE(job_id, freelancer_id)
);

CREATE INDEX idx_contracts_job_id ON contracts(job_id);
CREATE INDEX idx_contracts_freelancer_id ON contracts(freelancer_id);
CREATE INDEX idx_contracts_status ON contracts(contract_status);

-- ============================================================================
-- VIEWS FOR ML QUERIES
-- ============================================================================

-- View for easy ranking data retrieval
CREATE VIEW v_ranking_data AS
SELECT
  p.proposal_id,
  p.job_id,
  p.freelancer_id,
  j.job_title,
  j.job_description,
  j.budget_max,
  f.full_name,
  f.title,
  f.expected_hourly_rate,
  p.proposal_text,
  p.bid_amount,
  p.created_at,
  fm.average_rating,
  fm.completion_rate,
  fm.acceptance_rate,
  fm.on_time_rate,
  fm.rehire_rate,
  fm.dispute_rate
FROM proposals p
JOIN jobs j ON p.job_id = j.job_id
JOIN freelancer_profiles f ON p.freelancer_id = f.freelancer_id
JOIN freelancer_metrics fm ON f.freelancer_id = fm.freelancer_id
WHERE j.job_status IN ('open', 'in_progress');

-- View for job skill requirements
CREATE VIEW v_job_skill_matrix AS
SELECT
  j.job_id,
  j.job_title,
  STRING_AGG(s.skill_name, ', ') as required_skills,
  COUNT(s.skill_id) as skill_count
FROM jobs j
LEFT JOIN job_skills js ON j.job_id = js.job_id
LEFT JOIN skills s ON js.skill_id = s.skill_id
GROUP BY j.job_id, j.job_title;

-- View for freelancer skill matrix
CREATE VIEW v_freelancer_skill_matrix AS
SELECT
  f.freelancer_id,
  f.full_name,
  STRING_AGG(s.skill_name, ', ') as skills,
  COUNT(s.skill_id) as skill_count
FROM freelancer_profiles f
LEFT JOIN freelancer_skills fs ON f.freelancer_id = fs.freelancer_id
LEFT JOIN skills s ON fs.skill_id = s.skill_id
GROUP BY f.freelancer_id, f.full_name;

-- ============================================================================
-- STORED PROCEDURES FOR MAINTENANCE
-- ============================================================================

-- Update freelancer metrics based on contracts
CREATE OR REPLACE FUNCTION update_freelancer_metrics()
RETURNS void AS $$
DECLARE
  freelancer_id_var INT;
BEGIN
  FOR freelancer_id_var IN
    SELECT DISTINCT freelancer_id FROM contracts WHERE contract_status = 'completed'
  LOOP
    UPDATE freelancer_metrics
    SET
      total_completed_jobs = (
        SELECT COUNT(*) FROM contracts WHERE freelancer_id = freelancer_id_var AND contract_status = 'completed'
      ),
      average_rating = (
        SELECT AVG(feedback_rating) FROM contracts WHERE freelancer_id = freelancer_id_var AND feedback_rating IS NOT NULL
      ),
      updated_at = CURRENT_TIMESTAMP
    WHERE freelancer_id = freelancer_id_var;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE freelancer_profiles IS 'Core freelancer profile data - single source of truth for ranking features';
COMMENT ON TABLE ml_feature_snapshots IS 'ML training data snapshot - must exactly match production schema for training/serving consistency';
COMMENT ON TABLE ranking_predictions IS 'ML model outputs for explainability and rank serving';
