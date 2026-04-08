"""
Synthetic Data Generator for ML Ranking System
- Generates realistic freelancers, jobs, proposals
- Stores directly in PostgreSQL
- Supports cold-start training
"""

import psycopg2
from psycopg2.extras import execute_values
import random
import uuid
from datetime import datetime, timedelta
import json
from faker import Faker
import logging
import os
from db_config import get_db_config

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SyntheticDataGenerator:
    """Generate realistic training data for ML ranking system"""
    
    # Skill pool (comprehensive)
    SKILLS_POOL = [
        # Web Development
        'Python', 'JavaScript', 'React', 'Vue.js', 'Angular', 'Node.js', 'FastAPI', 'Django',
        'PostgreSQL', 'MongoDB', 'MySQL', 'Redis', 'Elasticsearch',
        'HTML5', 'CSS3', 'TypeScript', 'PHP', 'Ruby',
        
        # Data Science & ML
        'TensorFlow', 'PyTorch', 'Scikit-learn', 'Pandas', 'NumPy', 'XGBoost',
        'Machine Learning', 'Deep Learning', 'Data Science', 'Statistics', 'R',
        'Data Analysis', 'Business Intelligence', 'Tableau', 'Power BI',
        
        # DevOps & Infrastructure
        'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'CI/CD', 'Jenkins',
        'Linux', 'Terraform', 'Git', 'DevOps',
        
        # Mobile
        'Swift', 'Kotlin', 'React Native', 'Flutter', 'iOS', 'Android',
        
        # Other
        'UI/UX Design', 'Graphic Design', 'Video Editing', 'Content Writing',
        'SEO', 'Digital Marketing', 'Project Management', 'Agile', 'Scrum',
        'Java', 'C++', 'Go', 'Rust', 'Solidity', 'Web3', 'Blockchain',
    ]
    
    SKILL_CATEGORIES = {
        'Backend': ['Python', 'Node.js', 'FastAPI', 'Django', 'PHP', 'Java', 'Go', 'Rust'],
        'Frontend': ['React', 'Vue.js', 'Angular', 'JavaScript', 'TypeScript', 'HTML5', 'CSS3'],
        'Database': ['PostgreSQL', 'MongoDB', 'MySQL', 'Redis', 'Elasticsearch'],
        'ML/Data': ['TensorFlow', 'PyTorch', 'Machine Learning', 'Data Science', 'Pandas', 'NumPy'],
        'DevOps': ['Docker', 'Kubernetes', 'AWS', 'Azure', 'CI/CD', 'Terraform'],
        'Mobile': ['React Native', 'Flutter', 'Swift', 'Kotlin'],
        'Design': ['UI/UX Design', 'Graphic Design', 'Video Editing'],
    }
    
    JOB_CATEGORIES = ['Web Development', 'Data Science', 'Mobile Development', 'DevOps', 'UI/UX Design']
    
    def __init__(self, db_config):
        """Initialize database connection"""
        self.db_config = db_config
        self.conn = None
        self.faker = Faker()
        
    def connect(self):
        """Connect to PostgreSQL"""
        try:
            self.conn = psycopg2.connect(**self.db_config)
            logger.info("✓ Connected to PostgreSQL")
        except Exception as e:
            logger.error(f"✗ Failed to connect to PostgreSQL: {e}")
            raise
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
    
    def execute_query(self, query, params=None):
        """Execute query and return cursor"""
        cursor = self.conn.cursor()
        cursor.execute(query, params)
        return cursor
    
    def commit_changes(self):
        """Commit changes"""
        self.conn.commit()
    
    # ========== PHASE 1: USER & FREELANCER GENERATION ==========
    
    def generate_users_and_freelancers(self, num_freelancers=1000, num_employers=200):
        """Generate freelancers and employers"""
        logger.info(f"📝 Generating {num_freelancers} freelancers and {num_employers} employers...")
        
        cursor = self.conn.cursor()
        
        # Generate freelancer users
        freelancer_data = []
        for i in range(num_freelancers):
            email = f"freelancer_{i}@example.com"
            password_hash = f"hashed_pwd_{uuid.uuid4().hex[:16]}"
            freelancer_data.append((email, password_hash, 'freelancer', datetime.now(), datetime.now()))
        
        # Generate employer users
        employer_data = []
        for i in range(num_employers):
            email = f"employer_{i}@example.com"
            password_hash = f"hashed_pwd_{uuid.uuid4().hex[:16]}"
            employer_data.append((email, password_hash, 'employer', datetime.now(), datetime.now()))
        
        # Insert users
        execute_values(cursor, """
            INSERT INTO users (email, password_hash, user_type, created_at, updated_at)
            VALUES %s RETURNING user_id
        """, freelancer_data + employer_data)
        self.conn.commit()
        
        # Get inserted user IDs
        cursor.execute("SELECT user_id FROM users WHERE user_type = 'freelancer' ORDER BY user_id")
        freelancer_user_ids = [row[0] for row in cursor.fetchall()]
        
        # Generate freelancer profiles
        prof_data = []
        titles = ['Senior Developer', 'Full-Stack Engineer', 'Data Scientist', 'DevOps Engineer', 
                  'UI/UX Designer', 'Mobile Developer', 'Machine Learning Engineer', 'Cloud Architect']
        
        for user_id in freelancer_user_ids:
            profile = (
                user_id,
                self.faker.name(),
                random.choice(titles),
                self.faker.text(max_nb_chars=200),
                random.uniform(25, 200),  # hourly rate
                random.uniform(500, 10000),  # project rate
                self.faker.city(),
                'UTC',
                random.randint(40, 100),  # profile completeness
                datetime.now() - timedelta(days=random.randint(1, 730)),
                datetime.now(),
                random.randint(1, 15),  # years experience
                f"https://github.com/{self.faker.user_name()}",
                self.faker.url(),
                json.dumps(['Top Rated', 'Expert']) if random.random() > 0.7 else json.dumps([]),
            )
            prof_data.append(profile)
        
        execute_values(cursor, """
            INSERT INTO freelancer_profiles 
            (user_id, full_name, title, bio, expected_hourly_rate, expected_project_rate,
             location, timezone, profile_completeness, profile_created_at, profile_updated_at,
             years_experience, github_url, portfolio_url, badges)
            VALUES %s RETURNING freelancer_id
        """, prof_data)
        self.conn.commit()
        
        logger.info(f"✓ Generated {len(freelancer_data)} freelancers and {len(employer_data)} employers")
        return freelancer_user_ids
    
    # ========== PHASE 2: SKILLS GENERATION ==========
    
    def generate_skills(self):
        """Generate skills master table"""
        logger.info(f"📝 Generating {len(self.SKILLS_POOL)} skills...")
        
        cursor = self.conn.cursor()
        skill_data = []
        
        for skill_name in self.SKILLS_POOL:
            # Find category
            category = None
            for cat, skills in self.SKILL_CATEGORIES.items():
                if skill_name in skills:
                    category = cat
                    break
            
            skill_data.append((skill_name, category, datetime.now()))
        
        execute_values(cursor, """
            INSERT INTO skills (skill_name, category, created_at)
            VALUES %s ON CONFLICT DO NOTHING
        """, skill_data)
        self.conn.commit()
        
        logger.info(f"✓ Generated {len(self.SKILLS_POOL)} skills")
    
    # ========== PHASE 3: ASSIGN FREELANCER SKILLS ==========
    
    def assign_freelancer_skills(self):
        """Assign random skills to freelancers"""
        logger.info("📝 Assigning skills to freelancers...")
        
        cursor = self.conn.cursor()
        
        # Get all freelancers and skills
        cursor.execute("SELECT freelancer_id FROM freelancer_profiles")
        freelancer_ids = [row[0] for row in cursor.fetchall()]
        
        cursor.execute("SELECT skill_id, skill_name FROM skills")
        skill_rows = cursor.fetchall()
        skill_map = {row[1]: row[0] for row in skill_rows}
        
        freelancer_skill_data = []
        for freelancer_id in freelancer_ids:
            # Assign 3-8 random skills
            num_skills = random.randint(3, 8)
            selected_skills = random.sample(self.SKILLS_POOL, min(num_skills, len(self.SKILLS_POOL)))
            
            for skill_name in selected_skills:
                proficiency = random.choice(['beginner', 'intermediate', 'expert'])
                years_exp = random.randint(1, 15)
                endorsements = random.randint(0, 50)
                
                freelancer_skill_data.append((
                    freelancer_id,
                    skill_map[skill_name],
                    proficiency,
                    years_exp,
                    endorsements,
                    datetime.now() - timedelta(days=random.randint(1, 365))
                ))
        
        execute_values(cursor, """
            INSERT INTO freelancer_skills 
            (freelancer_id, skill_id, proficiency_level, years_experience_in_skill, endorsement_count, last_used_date)
            VALUES %s ON CONFLICT DO NOTHING
        """, freelancer_skill_data)
        self.conn.commit()
        
        logger.info(f"✓ Assigned skills to {len(freelancer_ids)} freelancers")
    
    # ========== PHASE 4: JOB GENERATION ==========
    
    def generate_jobs(self, num_jobs=500):
        """Generate jobs with realistic data"""
        logger.info(f"📝 Generating {num_jobs} jobs...")
        
        cursor = self.conn.cursor()
        
        # Get employer IDs
        cursor.execute("SELECT user_id FROM users WHERE user_type = 'employer'")
        employer_ids = [row[0] for row in cursor.fetchall()]
        
        job_data = []
        for i in range(num_jobs):
            employer_id = random.choice(employer_ids)
            job_data.append((
                employer_id,
                f"{self.faker.word().title()} {random.choice(['Build', 'Develop', 'Create', 'Design'])} Project {i}",
                self.faker.text(max_nb_chars=500),
                random.choice(self.JOB_CATEGORIES),
                random.uniform(500, 5000),  # budget_min
                random.uniform(5000, 50000),  # budget_max
                random.choice(['fixed', 'hourly']),
                random.randint(1, 6),
                random.choice(['entry', 'intermediate', 'expert']),
                'open',
                'public',
                datetime.now(),
                datetime.now(),
                datetime.now() - timedelta(days=random.randint(0, 60)),
                datetime.now() + timedelta(days=random.randint(7, 90))
            ))
        
        execute_values(cursor, """
            INSERT INTO jobs 
            (employer_id, job_title, job_description, job_category, budget_min, budget_max,
             budget_type, duration_months, experience_level, job_status, visibility,
             created_at, updated_at, published_at, deadline)
            VALUES %s RETURNING job_id
        """, job_data)
        self.conn.commit()
        
        logger.info(f"✓ Generated {num_jobs} jobs")
    
    # ========== PHASE 5: ASSIGN JOB SKILLS ==========
    
    def assign_job_skills(self):
        """Assign skill requirements to jobs"""
        logger.info("📝 Assigning skills to jobs...")
        
        cursor = self.conn.cursor()
        
        cursor.execute("SELECT job_id FROM jobs")
        job_ids = [row[0] for row in cursor.fetchall()]
        
        cursor.execute("SELECT skill_id, skill_name FROM skills")
        skill_map = {row[1]: row[0] for row in cursor.fetchall()}
        
        job_skill_data = []
        for job_id in job_ids:
            # Assign 2-5 required skills
            num_skills = random.randint(2, 5)
            selected_skills = random.sample(self.SKILLS_POOL, min(num_skills, len(self.SKILLS_POOL)))
            
            for skill_name in selected_skills:
                proficiency_required = random.choice(['beginner', 'intermediate', 'expert'])
                job_skill_data.append((job_id, skill_map[skill_name], proficiency_required))
        
        execute_values(cursor, """
            INSERT INTO job_skills (job_id, skill_id, proficiency_required)
            VALUES %s ON CONFLICT DO NOTHING
        """, job_skill_data)
        self.conn.commit()
        
        logger.info(f"✓ Assigned skills to {len(job_ids)} jobs")
    
    # ========== PHASE 6: GENERATE PROPOSALS ==========
    
    def generate_proposals(self, proposals_per_job=8):
        """Generate proposals (5-20 per job)"""
        logger.info(f"📝 Generating {proposals_per_job} proposals per job...")
        
        cursor = self.conn.cursor()
        
        cursor.execute("SELECT job_id, budget_max FROM jobs")
        jobs = cursor.fetchall()
        
        cursor.execute("SELECT freelancer_id FROM freelancer_profiles")
        freelancer_ids = [row[0] for row in cursor.fetchall()]
        
        proposal_data = []
        for job_id, budget_max in jobs:
            num_proposals = random.randint(5, proposals_per_job)
            selected_freelancers = random.sample(freelancer_ids, 
                                                min(num_proposals, len(freelancer_ids)))
            
            # Convert Decimal to float for calculations
            budget_max_float = float(budget_max)
            
            for freelancer_id in selected_freelancers:
                # Avoid duplicates
                proposal_data.append((
                    job_id,
                    freelancer_id,
                    self.faker.text(max_nb_chars=300),
                    random.uniform(budget_max_float * 0.7, budget_max_float * 1.3),
                    random.randint(5, 60),
                    random.choice(['submitted', 'viewed', 'shortlisted', 'rejected']),
                    datetime.now() - timedelta(days=random.randint(1, 30)),
                    datetime.now(),
                    datetime.now() - timedelta(days=random.randint(1, 10)) if random.random() > 0.5 else None,
                    random.randint(1, 1440)
                ))
        
        execute_values(cursor, """
            INSERT INTO proposals 
            (job_id, freelancer_id, proposal_text, bid_amount, estimated_delivery_days,
             proposal_status, created_at, updated_at, viewed_at, response_time_minutes)
            VALUES %s ON CONFLICT DO NOTHING
        """, proposal_data)
        self.conn.commit()
        
        total_proposals = len(proposal_data)
        logger.info(f"✓ Generated {total_proposals} proposals")
    
    # ========== PHASE 7: INITIALIZE METRICS ==========
    
    def initialize_metrics(self):
        """Initialize freelancer metrics"""
        logger.info("📝 Initializing freelancer metrics...")
        
        cursor = self.conn.cursor()
        
        cursor.execute("SELECT freelancer_id FROM freelancer_profiles")
        freelancer_ids = [row[0] for row in cursor.fetchall()]
        
        metrics_data = []
        for freelancer_id in freelancer_ids:
            metrics_data.append((
                freelancer_id,
                random.randint(5, 100),  # total_completed_jobs
                random.randint(10, 200),  # total_proposals_sent
                random.randint(5, 100),  # total_proposals_accepted
                round(random.uniform(0.3, 0.9), 2) * 100,  # acceptance_rate
                round(random.uniform(0.2, 0.8), 2) * 100,  # hire_rate
                round(random.uniform(0.7, 0.98), 2) * 100,  # completion_rate
                round(random.uniform(3.5, 5.0), 2),  # average_rating
                random.randint(10, 500),  # total_ratings
                round(random.uniform(0.8, 0.99), 2) * 100,  # on_time_rate
                round(random.uniform(0.7, 0.99), 2) * 100,  # on_budget_rate
                round(random.uniform(0.0, 0.05), 4) * 100,  # dispute_rate
                random.randint(0, 5),  # dispute_count
                random.randint(24, 72),  # avg_response_time_hours
                random.randint(100, 5000),  # profile_views
                random.randint(0, 20),  # repeat_hires
                round(random.uniform(0.0, 0.5), 2) * 100 if random.random() > 0.7 else 0,  # rehire_rate
                datetime.now() - timedelta(days=random.randint(1, 60)),
                datetime.now() - timedelta(days=random.randint(1, 30))
            ))
        
        execute_values(cursor, """
            INSERT INTO freelancer_metrics 
            (freelancer_id, total_completed_jobs, total_proposals_sent, total_proposals_accepted,
             acceptance_rate, hire_rate, completion_rate, average_rating, total_ratings,
             on_time_rate, on_budget_rate, dispute_rate, dispute_count, average_response_time_hours,
             profile_views_count, repeat_hires, rehire_rate, last_job_completed_date, last_proposal_sent_date)
            VALUES %s ON CONFLICT DO NOTHING
        """, metrics_data)
        self.conn.commit()
        
        logger.info(f"✓ Initialized metrics for {len(freelancer_ids)} freelancers")
    
    # ========== PHASE 8: CREATE CONTRACTS (for training labels) ==========
    
    def create_contracts_with_labels(self):
        """Create contracts with hiring outcomes (for training labels)"""
        logger.info("📝 Creating contracts and training labels...")
        
        cursor = self.conn.cursor()
        
        # Sample 20% of proposals to be "hired"
        cursor.execute("""
            SELECT proposal_id, job_id, freelancer_id FROM proposals 
            WHERE proposal_status != 'rejected'
            LIMIT (SELECT COUNT(*) * 0.2 FROM proposals)
        """)
        hired_proposals = cursor.fetchall()
        
        contract_data = []
        for proposal_id, job_id, freelancer_id in hired_proposals:
            # Get proposal and job data
            cursor.execute("""
                SELECT bid_amount FROM proposals WHERE proposal_id = %s
            """, (proposal_id,))
            bid_amount = cursor.fetchone()[0]
            
            contract_data.append((
                job_id,
                freelancer_id,
                'completed' if random.random() > 0.3 else 'active',
                datetime.now() - timedelta(days=random.randint(5, 60)),
                datetime.now() - timedelta(days=random.randint(10, 50)),
                datetime.now(),
                datetime.now() + timedelta(days=random.randint(5, 45)),
                bid_amount,
                bid_amount if random.random() > 0.05 else 0,  # amount_paid
                round(random.uniform(3.5, 5.0), 2) if random.random() > 0.1 else None,
                self.faker.text(max_nb_chars=100) if random.random() > 0.3 else None
            ))
        
        execute_values(cursor, """
            INSERT INTO contracts 
            (job_id, freelancer_id, contract_status, awarded_date, start_date, completion_date,
             deadline, total_amount, amount_paid, feedback_rating, feedback_comment)
            VALUES %s ON CONFLICT DO NOTHING
        """, contract_data)
        self.conn.commit()
        
        logger.info(f"✓ Created {len(contract_data)} contracts")
    
    # ========== PHASE 9: CREATE ML FEATURE SNAPSHOTS (Training Data) ==========
    
    def create_ml_training_snapshots(self):
        """Create ml_feature_snapshots for training (this will be populated by feature engineering)"""
        logger.info("📝 Creating ML feature snapshot records...")
        
        cursor = self.conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM ml_feature_snapshots")
        existing_snapshot_count = cursor.fetchone()[0]
        if existing_snapshot_count > 0:
            logger.info(f"⏭️ Skipping snapshot creation (already exists: {existing_snapshot_count})")
            return
        
        # Create snapshots for all proposals (to be populated with features)
        cursor.execute("""
            SELECT p.proposal_id, p.job_id, p.freelancer_id, c.contract_id, c.feedback_rating
            FROM proposals p
            LEFT JOIN contracts c ON p.job_id = c.job_id AND p.freelancer_id = c.freelancer_id
        """)
        proposals = cursor.fetchall()
        
        snapshot_data = []
        for proposal_id, job_id, freelancer_id, contract_id, rating in proposals:
            # Assign training labels
            was_hired = contract_id is not None
            was_shortlisted = random.random() > 0.7
            target_rank_label = 0 if not was_hired else random.randint(1, 3) if was_shortlisted else 1
            
            snapshot_data.append((
                job_id,
                freelancer_id,
                None,  # embeddings to be populated
                None,
                None,
                None,  # similarity scores to be computed
                None,
                None,
                None,  # skill features to be computed
                0,
                0,
                0,
                0,
                0,  # bid details (to be populated)
                None,
                None,
                0,  # profile features (to be populated)
                0,
                None,
                0,  # proposal features (to be computed)
                0,  # metrics features (already available)
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                target_rank_label if was_hired else None,
                None,  # success score
                was_hired,
                was_shortlisted,
                datetime.now()
            ))
        
        try:
            execute_values(cursor, """
                INSERT INTO ml_feature_snapshots 
                (job_id, freelancer_id, job_embedding, freelancer_bio_embedding, proposal_embedding,
                 semantic_similarity_job_proposal, semantic_similarity_job_freelancer_bio,
                 semantic_similarity_title_match, skill_overlap_count, skill_overlap_percentage,
                 required_skills_covered, total_required_skills, bid_amount, job_budget_min,
                 job_budget_max, price_fit_score, profile_completeness, years_experience,
                 expected_rate, proposal_length, response_time_hours, acceptance_rate,
                 completion_rate, average_rating, on_time_rate, rehire_rate, dispute_rate,
                 profile_views, proposals_sent_this_month, target_rank_label, target_success_score,
                 was_hired, was_shortlisted, created_at)
                VALUES %s
            """, snapshot_data)
            self.conn.commit()
            logger.info(f"✓ Created {len(snapshot_data)} ML feature snapshots")
        except Exception as e:
            logger.error(f"✗ Error creating ML feature snapshots: {e}")
            self.conn.rollback()
            raise
    
    # ========== EXECUTION ==========
    
    def generate_all(self, num_freelancers=1000, num_jobs=500):
        """Generate complete synthetic dataset with smart skipping"""
        try:
            self.connect()
            
            logger.info("🚀 Starting synthetic data generation...")
            logger.info(f"Target: {num_freelancers} freelancers, {num_jobs} jobs")
            
            # Check existing data
            cursor = self.conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM users WHERE user_type = 'freelancer'")
            existing_freelancers = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM jobs")
            existing_jobs = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM proposals")
            existing_proposals = cursor.fetchone()[0]
            
            logger.info(f"Existing data: {existing_freelancers} freelancers, {existing_jobs} jobs, {existing_proposals} proposals")
            
            # Generate missing data
            if existing_freelancers == 0:
                self.generate_users_and_freelancers(num_freelancers=num_freelancers)
                self.generate_skills()
                self.assign_freelancer_skills()
            else:
                logger.info("⏭️ Skipping freelancer/skill generation (already exists)")
                
            if existing_jobs == 0:
                self.generate_jobs(num_jobs=num_jobs)
                self.assign_job_skills()
            else:
                logger.info("⏭️ Skipping job generation (already exists)")
                
            if existing_proposals == 0:
                self.generate_proposals(proposals_per_job=8)
            else:
                logger.info("⏭️ Skipping proposal generation (already exists)")
                
            # Always initialize metrics (safe to rerun)
            self.initialize_metrics()
            self.create_contracts_with_labels()
            self.create_ml_training_snapshots()
            
            logger.info("✅ Synthetic data generation complete!")
            
        except Exception as e:
            logger.error(f"❌ Generation failed: {e}")
            raise
        finally:
            self.close()


def main():
    """Main entry point"""
    db_config = get_db_config()
    
    generator = SyntheticDataGenerator(db_config)
    generator.generate_all(num_freelancers=1000, num_jobs=500)


if __name__ == "__main__":
    main()
