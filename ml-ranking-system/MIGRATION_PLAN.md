# MongoDB → PostgreSQL Migration Plan

## Overview
This document outlines the strategy to migrate from MongoDB to PostgreSQL while preserving all functional data and improving normalized schema design.

## Phase 1: Assessment & Preparation

### 1.1 Current MongoDB Structure Analysis
- [ ] Audit current MongoDB collections and document shapes
- [ ] Identify field types and relationships
- [ ] Document array fields and nested structures
- [ ] Identify indexing strategy

### 1.2 Schema Mapping
Map MongoDB collections to PostgreSQL tables:

| MongoDB Collection | PostgreSQL Tables | Notes |
|---|---|---|
| users | users | Denormalized user accounts |
| freelancers | freelancer_profiles | Extended freelancer data |
| jobs | jobs | Job/project listings |
| proposals | proposals | Freelancer applications |
| contracts | contracts | Active work agreements |
| skills | skills + freelancer_skills | Denormalized skill arrays → normalized M2M |
| jobSkills | job_skills | Job skill requirements |
| metrics | freelancer_metrics | Aggregated performance data |

## Phase 2: Database Setup

### 2.1 PostgreSQL Provisioning
```bash
# Create database
createdb synapescrow_ml
psql synapescrow_ml < 01_schema.sql
```

### 2.2 Initial Schema Validation
- [ ] Verify all tables created
- [ ] Verify indexes created
- [ ] Test foreign key constraints

## Phase 3: Data Migration

### 3.1 ETL Pipeline Components

#### Step 1: Extract from MongoDB
- Connect to MongoDB
- Query each collection
- Export as JSON/CSV

#### Step 2: Transform Data
Apply transformations:
- Denormalized arrays → Normalized relationships
- ObjectId → Serial integers
- Nested objects → JSONB (where justified)
- Timestamps: MongoDB UTCDate → PostgreSQL TIMESTAMP

#### Step 3: Load into PostgreSQL
- Batch insert with error handling
- Verify row counts
- Check referential integrity

### 3.2 Migration Order (CRITICAL - respects foreign keys)

**Order of execution:**

1. **Users** (no dependencies)
   ```sql
   INSERT INTO users (email, password_hash, user_type, created_at, updated_at)
   SELECT email, password_hash, user_type, created_at, updated_at FROM mongodb.users;
   ```

2. **Skills** (no dependencies)
   ```sql
   INSERT INTO skills (skill_name, category)
   SELECT name, category FROM mongodb.skills;
   ```

3. **Freelancer Profiles** (depends on users)
   ```sql
   INSERT INTO freelancer_profiles (user_id, full_name, title, bio, ...)
   SELECT users.user_id, f.name, f.title, f.bio, ...
   FROM mongodb.freelancers f
   JOIN users ON f.user_email = users.email;
   ```

4. **Freelancer Skills** (depends on freelancer_profiles, skills)
   - Unnest MongoDB skill arrays
   - Create M2M relationships

5. **Jobs** (depends on users)
   - Map employer_id via user lookup

6. **Job Skills** (depends on jobs, skills)
   - Unnest MongoDB skill arrays

7. **Proposals** (depends on jobs, freelancer_profiles)

8. **Contracts** (depends on jobs, freelancer_profiles)

9. **Freelancer Metrics** (depends on freelancer_profiles)
   - Initialize with computed values from contracts

10. **Interactions Log** (depends on jobs, freelancer_profiles)
    - Reconstruct from proposal/contract history

### 3.3 Array Denormalization Strategy

**Problem:** MongoDB stores skills as arrays

```javascript
// MongoDB: denormalized array
{
  freelancer_id: "507f1f77bcf86cd799439011",
  skills: [
    { name: "Python", proficiency: "expert", years: 5 },
    { name: "Node.js", proficiency: "intermediate", years: 3 }
  ]
}
```

**Solution:** Normalize to M2M table

```sql
-- Step 1: Ensure all skills exist
INSERT INTO skills (skill_name) 
SELECT DISTINCT skill_data->>'name' 
FROM ( SELECT jsonb_array_elements(skills) as skill_data FROM mongodb_freelancers )
ON CONFLICT DO NOTHING;

-- Step 2: Create M2M relationships
INSERT INTO freelancer_skills (freelancer_id, skill_id, proficiency_level, years_experience_in_skill)
SELECT 
  f.freelancer_id,
  s.skill_id,
  (skill_data->>'proficiency')::varchar,
  (skill_data->>'years')::int
FROM freelancer_profiles f
JOIN mongodb_freelancers mf ON f.user_id = mf.user_id
JOIN LATERAL jsonb_array_elements(mf.skills) AS skill_data ON true
JOIN skills s ON s.skill_name = skill_data->>'name';
```

### 3.4 Timestamp Normalization

```sql
-- MongoDB uses UTC dates; PostgreSQL uses TIMESTAMP
-- Handle timezone conversions if needed
SELECT 
  EXTRACT(EPOCH FROM created_at) * 1000 as mongodb_millis,
  created_at::timestamp as postgres_timestamp
FROM users;
```

### 3.5 Metrics Computation

**Challenge:** Metrics must be computed from historical data

```sql
-- Rebuild freelancer_metrics from contracts
INSERT INTO freelancer_metrics 
  (freelancer_id, total_completed_jobs, average_rating, on_time_rate, etc.)
SELECT
  f.freelancer_id,
  COUNT(CASE WHEN c.contract_status = 'completed' THEN 1 END),
  AVG(c.feedback_rating),
  COUNT(CASE WHEN c.completion_date <= c.deadline THEN 1 END)::numeric / COUNT(*),
  ...
FROM freelancer_profiles f
LEFT JOIN contracts c ON f.freelancer_id = c.freelancer_id
GROUP BY f.freelancer_id;
```

## Phase 4: Validation & QA

### 4.1 Row Count Verification
```sql
-- Verify migration completeness
SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'freelancer_profiles', COUNT(*) FROM freelancer_profiles
UNION ALL
SELECT 'jobs', COUNT(*) FROM jobs
UNION ALL
SELECT 'proposals', COUNT(*) FROM proposals
UNION ALL
SELECT 'contracts', COUNT(*) FROM contracts;
```

### 4.2 Referential Integrity Tests

```bash
# Test foreign key relationships
psql -f integrity_tests.sql
```

### 4.3 Data Consistency Checks

- [ ] No NULL foreign keys (except allowed cases)
- [ ] All metrics in valid ranges (0-100%)
- [ ] Timestamps correctly ordered (created < updated)
- [ ] Skill overlap calculations validate

## Phase 5: Performance Tuning

### 5.1 Index Creation
- Already included in schema
- Monitor slow queries during testing

### 5.2 Query Analysis

```sql
-- EXPLAIN ANALYZE critical queries
EXPLAIN ANALYZE
SELECT j.job_id, COUNT(p.proposal_id) 
FROM jobs j
LEFT JOIN proposals p ON j.job_id = p.job_id
WHERE j.job_status = 'open'
GROUP BY j.job_id;
```

## Phase 6: Cutover Strategy

### 6.1 Dual-Write Period (if needed)
- New code writes to both MongoDB and PostgreSQL
- Verify data consistency
- Duration: 1-2 weeks

### 6.2 Read Migration
- Phase 1: Read critical paths from PostgreSQL
- Phase 2: Gradual migration of remaining reads
- Fallback: Read from MongoDB if PostgreSQL fails

### 6.3 Switchover
- Disable MongoDB writes
- Verify all data migrated
- Update application to use PostgreSQL only
- Archive MongoDB (keep for 30 days as backup)

## Phase 7: Post-Migration

### 7.1 Monitoring
- Monitor query performance
- Alert on any NULL metrics
- Track error rates

### 7.2 Cleanup
- Drop MongoDB collections
- Archive database
- Update documentation

## Rollback Plan

If migration fails:

1. Stop all writes
2. Revert application to MongoDB
3. Investigate issues
4. Re-run migration with fixes

**Rollback duration:** < 15 minutes (with prepared fallback)

## Timeline Estimate

- **Phase 1:** 1-2 days
- **Phase 2:** 1 day
- **Phase 3:** 2-3 days (bulk migration + validation)
- **Phase 4:** 1 day (testing)
- **Phase 5:** 1 day (optimization)
- **Phase 6:** 1 week (dual-write + gradual migration)
- **Phase 7:** 1 day (monitoring + cleanup)

**Total: 2-3 weeks**

## Key Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Data loss during migration | Full backup before starting; verify row counts |
| Foreign key violations | Migrate in correct order; use transactions |
| Performance degradation | Pre-build indexes; ANALYZE tables; test queries |
| Schema incompatibilities | Test with sample data first; validate edge cases |
| Timezone issues | Explicitly handle UTC conversions; test DST boundary cases |
| Metrics calculation errors | Audit computed metrics against historical data |

## Success Criteria

- ✅ 100% data migrated (zero row loss)
- ✅ All foreign keys valid
- ✅ Query performance within 10% of original
- ✅ Metrics calculations validated
- ✅ Zero application errors in production
- ✅ Setup ready for ML feature engineering
