# Find Work Real Feature - Complete Testing Guide ✅

## 🚀 Setup (1 min)
```
cd backend && npm start  # port 5000
cd frontend && npm run dev  # port 3000
node backend/seed.js  # Create users + jobs
```

## 🤖 ML Ranking Test Seeder (Synthetic Freelancers)
Use this to create realistic freelancer profiles, proposals, and metrics for ranking validation.

```powershell
# Terminal A: embedding service (required)
Set-Location embedding-service
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8001

# Terminal B: backend with ML python env
Set-Location backend
$env:ML_PYTHON_PATH = "C:\Users\msi\Desktop\SynapEscrow_Project\Innov8ors\ml-ranking-system\.venv\Scripts\python.exe"
npm run dev

# Terminal C: seed + validate ranking/insights
Set-Location backend
npm run seed:ml:test -- --validate-api
```

Notes:
- If no project exists, the seeder auto-creates: `Autonomous AI Payment & Project Agent`.
- The seeder is idempotent for the 4 test freelancers (`expert`, `mid`, `low`, `outlier`).
- It does not hardcode ranking; it only creates data and then calls ranking endpoints.

## 👥 Test Accounts
**Freelancers:**
- alice@example.com / password123 (Web Dev, mid, $50-100/hr)
- bob@example.com / password123 (Data Science, senior, $80-150 fixed)

**Employers:**
- employer1@example.com / password123 (Finflow Labs - Sarah)
- employer2@example.com / password123 (ProposalPilot - Mike)

## 🧪 E2E Flow (Complete)
1. **Login Freelancer** → alice → /dashboard/find-work
   - See 3 jobs ranked by profile match (90%+ Web Dev jobs)
   - Toggle AI/Latest, filter category='Web Development'
   - New: Match reasons box ("2 skills match", "Preferred category")

2. **Real Employer Job** → Login employer1 → POST /jobs via curl/Insomnia:
   ```
   curl -X POST http://localhost:5000/api/jobs \\
   -H "Authorization: Bearer <employer token>" \\
   -H "Content-Type: application/json" \\
   -d '{"title":"React Fintech App", "category":"Web Development", "requiredSkills":["React"]} '
   ```
   - Refresh find-work → New job appears w/ "Sarah Chen" (Finflow Labs)

3. **Profile Edit** → /dashboard/profile → Add skills "Next.js"
   - Save → Instant re-rank (higher Web Dev scores)

4. **Quick Apply** → Click any job → AI proposal generated

## 🔍 Debug Commands
```
# Backend health
curl http://localhost:5000/health

# All jobs/freelancers
curl http://localhost:5000/api/jobs/list

# Test matching (Alice ID)
curl "http://localhost:5000/api/jobs/matches?freelancerId=<alice_id>"

# Clear for fresh test
rm -rf backend/dev.db  # if SQLite
```

**Success Metrics:**
- Real client names on cards (not demo placeholders)
- Match scores react to profile edits
- Employer-posted jobs auto-rank/appear
- All features (save/filter/AI proposal) work w/ real DB

## 🔑 Test Credentials

### Freelancer 1 (Full Stack Developer)
- **Email:** alice@example.com
- **Password:** password123
- **Skills:** JavaScript, React, Node.js, MongoDB
- **Category:** Web Development
- **Experience:** Mid-level

### Freelancer 2 (Data Scientist)
- **Email:** bob@example.com
- **Password:** password123
- **Skills:** Python, TensorFlow, Pandas, SQL
- **Category:** Data Science
- **Experience:** Senior

## 📋 Available Jobs

1. **Build a React Dashboard**
   - Skills: JavaScript, React, Chart.js
   - Budget: $500-$1000
   - Type: Fixed

2. **Data Analysis Project**
   - Skills: Python, Pandas, SQL
   - Budget: $200-$500
   - Type: Fixed

3. **Node.js API Development**
   - Skills: Node.js, Express, MongoDB
   - Budget: $30-$50 (hourly)
   - Type: Hourly

## 🚀 How to Test

1. **Clear existing session:**
   - Open browser DevTools (F12)
   - Go to Application → Local Storage
   - Clear all data for localhost

2. **Log in as a seeded freelancer:**
   - Go to http://localhost:3000/login
   - Use alice@example.com / password123
   - Or bob@example.com / password123

3. **Navigate to Find Work:**
   - Click "Find Work" in the sidebar (or http://localhost:3000/dashboard/find-work)
   - You should see AI-ranked job recommendations with match scores

4. **Test AI-Powered Features:**
   - Click "Quick Apply" on any job
   - Click "Draft with AI" to generate a proposal using Gemini API

## 🔍 Debug Endpoints

- `GET http://localhost:5000/health` - Check backend health
- `GET http://localhost:5000/debug/jobs-data` - View all freelancers and jobs
- Check browser console for API call logs (console.log messages)

## ⚙️ Troubleshooting

If you don't see jobs:
1. Check that you're logged in as alice@example.com or bob@example.com
2. Open browser DevTools → Network tab → check `/api/jobs/matches` request
3. Check Console for error messages
4. Verify backend is running: `GET http://localhost:5000/health` should return `{"status":"ok"}`

