# Profile Production System TODO

## 1. Backend API ✅ In Progress
- [ ] Add GET /profile/me to profileRoutes.js (auth, return req.user w/ profiles)
- [ ] api.js: export getProfile(token)

## 2. Frontend Dashboard Profile
- [ ] Enhance /src/app/dashboard/profile/page.js: Fetch /profile/me, interests/categories inputs (comma/multi)

## 3. Old Page Cleanup
- [x] Replaced frontend/pages/profile.jsx w/ redirect to /dashboard/profile

## 4. Test
- [ ] Login → /dashboard/profile → auto-load no ID input

