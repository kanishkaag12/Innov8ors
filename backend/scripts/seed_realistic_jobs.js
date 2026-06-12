require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { Pool } = require('pg');
const axios = require('axios');

const JobMongo = require('../models/Job');
const UserMongo = require('../models/User');

const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || 'http://127.0.0.1:8001';

async function generateEmbedding(text) {
  try {
    const response = await axios.post(`${EMBEDDING_SERVICE_URL}/embed`, { text }, { timeout: 10000 });
    return response.data.embedding;
  } catch (error) {
    console.warn(`[WARNING] Failed to fetch embedding, generating mock embedding: ${error.message}`);
    // Fallback: generate a mock 384-dimensional vector of small random floats
    return Array.from({ length: 384 }, () => (Math.random() - 0.5) * 0.1);
  }
}

function parseBudget(budgetString) {
  // e.g. "$1500 - $3000" or "$200" or "$150"
  const clean = budgetString.replace(/[^0-9\-]/g, '');
  if (clean.includes('-')) {
    const parts = clean.split('-');
    return {
      min: parseFloat(parts[0]) || 100,
      max: parseFloat(parts[1]) || 1000
    };
  }
  const val = parseFloat(clean) || 500;
  return { min: val, max: val };
}

function parseDurationMonths(durationStr) {
  // e.g. "2 months", "3 weeks", "1 week"
  const val = parseInt(durationStr) || 1;
  if (durationStr.toLowerCase().includes('week')) {
    return Math.max(1, Math.round(val / 4));
  }
  return val;
}

function buildJobMatchingText(job) {
  return [
    job.title,
    job.description,
    job.requiredSkills.join(', '),
    job.category,
    job.experienceLevel
  ].join(' | ');
}

async function seed() {
  console.log('Starting DB Seeding...');

  // 1. Connect to MongoDB
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI/MONGODB_URI not found in env');
  }
  await mongoose.connect(mongoUri);
  console.log('✓ Connected to MongoDB');

  // 2. Connect to PostgreSQL
  const pgUrl = process.env.DATABASE_URL;
  if (!pgUrl) {
    throw new Error('DATABASE_URL not found in env');
  }
  const pgPool = new Pool({ connectionString: pgUrl });
  console.log('✓ Connected to PostgreSQL');

  // 3. Ensure a Seed Employer exists in PostgreSQL and MongoDB
  let employerUserId = null;
  
  // Find or create employer in MongoDB
  let mongoEmployer = await UserMongo.findOne({ role: 'employer' });
  if (!mongoEmployer) {
    console.log('Creating seed employer in MongoDB...');
    mongoEmployer = await UserMongo.create({
      name: 'SynapEscrow Enterprise',
      email: 'employer@synapescrow.com',
      password: '$2a$10$X8O9v78y8n5yD987654321u8n9v8y8n5yD987654321u8n9v8y8n5y', // mock hashed password
      role: 'employer',
      companyName: 'SynapEscrow Solutions',
      onboardingCompleted: true
    });
  }

  // Check if employer exists in PostgreSQL
  const pgUserCheck = await pgPool.query("SELECT user_id FROM users WHERE user_type = 'employer' LIMIT 1;");
  if (pgUserCheck.rows.length > 0) {
    employerUserId = pgUserCheck.rows[0].user_id;
    console.log(`✓ Found existing PostgreSQL employer (ID: ${employerUserId})`);
  } else {
    console.log('Creating seed employer in PostgreSQL...');
    const insertUserRes = await pgPool.query(
      "INSERT INTO users (email, password_hash, user_type) VALUES ($1, $2, $3) RETURNING user_id;",
      ['employer@synapescrow.com', 'mock_password_hash', 'employer']
    );
    employerUserId = insertUserRes.rows[0].user_id;

    // Create profile
    await pgPool.query(
      "INSERT INTO freelancer_profiles (user_id, full_name, title, bio, expected_hourly_rate, profile_completeness) VALUES ($1, $2, $3, $4, $5, $6);",
      [employerUserId, 'SynapEscrow Enterprise', 'Hiring Manager', 'Enterprise account for escrow coordination.', 0.00, 100]
    );
    console.log(`✓ Created seed PostgreSQL employer (ID: ${employerUserId})`);
  }

  // 4. Load the generated 100 jobs
  const jobsPath = path.resolve(__dirname, '..', 'data', 'realistic_jobs.json');
  if (!fs.existsSync(jobsPath)) {
    throw new Error(`Generated jobs file not found at ${jobsPath}. Run generate_jobs_json.js first.`);
  }
  const rawJobs = JSON.parse(fs.readFileSync(jobsPath, 'utf-8'));
  console.log(`Loaded ${rawJobs.length} jobs to seed.`);

  // 5. Cleanup previous runs
  console.log('Cleaning up previous seed runs...');
  await JobMongo.deleteMany({ title: /Ref: #1\d{3}/ });
  await pgPool.query("DELETE FROM jobs WHERE job_title LIKE '%(Ref: #1___)%';");
  console.log('Cleanup complete.');

  // 6. Seed process
  let successCount = 0;
  for (let i = 0; i < rawJobs.length; i++) {
    const job = rawJobs[i];
    const matchingText = buildJobMatchingText(job);
    
    // Generate AI Embeddings
    console.log(`[${i + 1}/100] Embedding & Seeding: "${job.title}"...`);
    const embedding = await generateEmbedding(matchingText);

    const parsedBudget = parseBudget(job.budget);
    const durationMonths = parseDurationMonths(job.duration);
    const postedDaysAgoNum = parseInt(job.postedDaysAgo) || 1;
    const createdAtDate = new Date();
    createdAtDate.setDate(createdAtDate.getDate() - postedDaysAgoNum);

    // Map experience level:
    // MongoDB: junior, mid, senior
    const mongoExperience = job.experienceLevel === 'Beginner' ? 'junior' : (job.experienceLevel === 'Intermediate' ? 'mid' : 'senior');
    // PostgreSQL: entry, intermediate, expert
    const pgExperience = job.experienceLevel === 'Beginner' ? 'entry' : (job.experienceLevel === 'Intermediate' ? 'intermediate' : 'expert');

    // --- MongoDB INSERT ---
    await JobMongo.create({
      title: job.title,
      description: job.description,
      requiredSkills: job.requiredSkills,
      category: job.category,
      experienceLevel: mongoExperience,
      budgetMin: parsedBudget.min,
      budgetMax: parsedBudget.max,
      projectType: 'fixed',
      location: job.country,
      employerName: job.clientName,
      isRemote: true,
      status: 'open',
      createdAt: createdAtDate,
      jobEmbedding: embedding,
      matchingText: matchingText
    });

    // --- PostgreSQL INSERT ---
    const pgJobInsertRes = await pgPool.query(
      `INSERT INTO jobs (
        employer_id, job_title, job_description, job_category, 
        budget_min, budget_max, budget_type, duration_months, 
        experience_level, job_status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING job_id;`,
      [
        employerUserId, job.title, job.description, job.category,
        parsedBudget.min, parsedBudget.max, 'fixed', durationMonths,
        pgExperience, 'open', createdAtDate, createdAtDate
      ]
    );
    const pgJobId = pgJobInsertRes.rows[0].job_id;

    // Add skills and associate with jobs in PostgreSQL
    for (const skillName of job.requiredSkills) {
      // Find or insert skill
      let skillId = null;
      const findSkillRes = await pgPool.query("SELECT skill_id FROM skills WHERE skill_name = $1;", [skillName]);
      if (findSkillRes.rows.length > 0) {
        skillId = findSkillRes.rows[0].skill_id;
      } else {
        const insertSkillRes = await pgPool.query(
          "INSERT INTO skills (skill_name, category) VALUES ($1, $2) RETURNING skill_id;",
          [skillName, job.category]
        );
        skillId = insertSkillRes.rows[0].skill_id;
      }

      // Link job and skill
      const pgProficiency = pgExperience === 'entry' ? 'beginner' : pgExperience;
      await pgPool.query(
        "INSERT INTO job_skills (job_id, skill_id, proficiency_required) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING;",
        [pgJobId, skillId, pgProficiency]
      );
    }

    successCount++;
  }

  console.log(`\n🎉 Successfully seeded ${successCount} jobs to both MongoDB & PostgreSQL!`);

  // Disconnect
  await mongoose.disconnect();
  await pgPool.end();
  console.log('Disconnected databases.');
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
