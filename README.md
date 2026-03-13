# SynapEscrow Backend

Node.js + Express backend for an autonomous AI intermediary between employers and freelancers.

## Tech Stack

- Node.js
- Express
- MongoDB (Mongoose)
- OpenAI API

## Folder Structure

```
Innov8ors/
├── package.json
├── .env.example
├── .gitignore
├── README.md
└── src/
    ├── app.js
    ├── server.js
    ├── config/
    │   └── db.js
    ├── controllers/
    │   ├── aiController.js
    │   ├── freelancerController.js
    │   ├── milestoneController.js
    │   ├── paymentController.js
    │   └── projectController.js
    ├── models/
    │   ├── Freelancer.js
    │   ├── Milestone.js
    │   ├── Payment.js
    │   ├── Project.js
    │   └── Submission.js
    ├── routes/
    │   ├── aiRoutes.js
    │   ├── freelancerRoutes.js
    │   ├── milestoneRoutes.js
    │   ├── paymentRoutes.js
    │   └── projectRoutes.js
    ├── services/
    │   └── openaiService.js
    └── utils/
        └── asyncHandler.js
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env
```

3. Start server:

```bash
npm run dev
```

## APIs

### 1) Project Creation

`POST /api/projects`

Request body:

```json
{
  "employer_id": "emp_001",
  "freelancer_id": "fr_001",
  "title": "Build AI SaaS Landing Page",
  "description": "Create responsive landing page with auth and analytics integration.",
  "budget": 1500,
  "deadline": "2026-04-10T00:00:00.000Z"
}
```

### 2) AI Milestone Generator

`POST /api/ai/generate-milestones`

Option A (from existing project):

```json
{
  "project_id": "PROJECT_OBJECT_ID"
}
```

Option B (direct input):

```json
{
  "title": "Build AI SaaS Landing Page",
  "description": "Create responsive landing page with auth and analytics integration.",
  "budget": 1500,
  "deadline": "2026-04-10T00:00:00.000Z"
}
```

### 3) Milestone Submission

`POST /api/milestones/:id/submit`

Request body:

```json
{
  "freelancer_id": "fr_001",
  "text": "Implemented auth, dashboard, and tests",
  "github_link": "https://github.com/example/repo/pull/10",
  "file_url": "https://files.example.com/submissions/m1.zip"
}
```

### 4) AI Quality Verification

`POST /api/ai/verify-milestone`

Request body:

```json
{
  "milestone_id": "MILESTONE_OBJECT_ID",
  "submission_id": "SUBMISSION_OBJECT_ID"
}
```

Response includes:

- status: `completed | partial | not_completed`
- feedback
- quality_score

### 5) Escrow Payment Logic

`POST /api/payments/release`

Request body:

```json
{
  "milestone_id": "MILESTONE_OBJECT_ID"
}
```

Behavior:

- `completed` → full payment release
- `partial` → 50% payment release
- `not_completed` → employer refund

### 6) Professional Fidelity Index (PFI)

`GET /api/freelancers/:id/pfi`

PFI formula:

- milestone success rate (40%)
- deadline adherence (30%)
- AI quality score (30%)
