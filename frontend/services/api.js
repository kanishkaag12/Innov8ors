import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api'
});

export const createProject = (payload) => api.post('/projects', payload);
export const listProjects = (params) => api.get('/projects', { params });
export const approveProjectMilestones = (projectId, payload) =>
  api.post(`/projects/${projectId}/milestones/approval`, payload);
export const generateMilestones = (payload) =>
  api.post('/ai/generate-milestones', payload);
export const verifyMilestone = (payload) =>
  api.post('/ai/verify-milestone', payload);
export const submitMilestone = (milestoneId, payload) =>
  api.post(`/milestones/${milestoneId}/submit`, payload);
export const fetchMilestonesByFreelancer = (freelancerId) =>
  api.get(`/milestones/freelancer/${freelancerId}`);
export const fetchMilestonesByProject = (projectId) =>
  api.get(`/milestones/project/${projectId}`);
export const releaseEscrowPayment = (payload) => api.post('/payments/release', payload);
export const fetchFreelancerPFI = (freelancerId) =>
  api.get(`/freelancers/${freelancerId}/pfi`);

export const loginUser = (payload) => api.post('/auth/login', payload);
export const signupUser = (payload) => api.post('/auth/signup', payload);
export const onboardUser = (payload) => api.post('/auth/onboarding', payload);
export const saveCategoriesAndSkills = (payload) => api.post('/profile/categories-skills', payload);
export const completeProfile = (payload) => api.post('/profile/complete', payload);

export const fetchProjectById = (projectId) => api.get(`/projects/${projectId}`);
export const fetchProjectMilestones = (projectId) =>
  api.get(`/projects/${projectId}/milestones`);
export const fetchProjectPayments = (projectId) =>
  api.get(`/payments/project/${projectId}`);
export const fetchEscrowDashboard = (projectId) =>
  api.get(`/payments/project/${projectId}/dashboard`);

export default api;
