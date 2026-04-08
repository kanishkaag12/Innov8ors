# SynapEscrow Proposal & Messaging - Debug Guide

## Test Endpoints

### Check Database State
```
GET http://localhost:5000/debug/proposals
GET http://localhost:5000/debug/conversations
```

## Flow Verification Checklist

### Step 1: Submit Proposal (Freelancer)
- Open browser DevTools Console (F12)
- Go to freelancer dashboard
- Click "Request to Join" on a project
- Check logs for:
  - `✅ Proposal created with ID: [proposalId]`
  - proposalId should NOT be null/undefined
  - Console should show: `✅ Proposal created with ID: ...`

### Step 2: Accept Proposal (Employer)
- Employer dashboard should show the freelancer  
- Click Accept button
- Check backend logs for:
  - `📝 acceptProposal called with params: ...`
  - `✅ Contract created: [contractId]`
  - `✅ Conversation created: [conversationId] with participants: ...`
  - If you don't see these logs, the API never reached the backend

### Step 3: Verify in Database
- Open: http://localhost:5000/debug/proposals
- Should see a proposal with status: "accepted", has contractId and conversationId
- Open: http://localhost:5000/debug/conversations  
- Should see a conversation with the proposal and both users in participants array

### Step 4: Check Messages Page
- Navigate to Messages page
- Should see conversation listed
- Click on it to load messages
- If no conversations show: the query isn't finding them (participants mismatch)

## Common Issues & Solutions

### Issue: proposalId is null after createProposal
**Cause**: Backend didn't return proposal with _id
**Solution**: Check createProposal logs - if 403 error, user role is wrong
**Fix**: Ensure freelancer account has role: "freelancer" in database

### Issue: acceptProposal never called
**Cause**: applicant?.proposalId is undefined in handleApplicantStatus
**Solution**: Check if proposal was created (Step 1)
**Fix**: localStorage might not be syncing - check freelancer page logs

### Issue: Conversation created but not visible
**Cause**: Logged-in user not in participants array
**Solution**: Check /debug/conversations - verify participant IDs match logged-in user._id
**Fix**Front: Check auth token - `getStoredAuth()` might be returning wrong user

### Issue: Real-time updates not working
**Cause**: Currently using polling, not WebSockets
**Current**: Messages page loads conversations once on mount
**Solution**: Add WebSocket listener or polling interval
**Workaround**: Refresh page to see new messages

## Logging Overview

Current logging level: VERBOSE (logs all requests and detailed flow)

Key log prefixes:
- 📝 = Action started
- ✅ = Success
- ❌ = Error
- 🔐 = Auth-related
- 📡 = HTTP request
- 🔍 = Debug/Query
