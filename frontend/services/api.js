import axios from 'axios';
import { clearAuth, getStoredAuth } from './auth';

const api = axios.create({
  baseURL: 'http://localhost:5000/api'
});

const getAuthHeaders = (token) => {
  const authToken = token || getStoredAuth()?.token;

  return authToken
    ? { Authorization: `Bearer ${authToken}` }
    : {};
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message = String(error?.response?.data?.message || '').toLowerCase();

    if (
      typeof window !== 'undefined' &&
      status === 401 &&
      (message.includes('expired') || message.includes('invalid token') || message.includes('unauthorized'))
    ) {
      clearAuth();

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export const createProject = (payload, token) =>
  api.post('/projects', payload, { headers: getAuthHeaders(token) });
export const listProjects = (params, token) =>
  api.get('/projects', { params, headers: getAuthHeaders(token) });
export const deleteProject = (projectId, token) =>
  api.delete(`/projects/${projectId}`, { headers: getAuthHeaders(token) });
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
export const fetchPFIByMe = (token) =>
  api.get('/freelancers/me/pfi', { headers: getAuthHeaders(token) });
export const fetchPFISuggestions = (freelancerId) =>
  api.get(`/freelancers/${freelancerId}/pfi/suggestions`);
export const listJobs = (params, token) =>
  api.get('/jobs/list', { params, headers: getAuthHeaders(token) });
export const getJobMatches = (params, token) =>
  api.get('/jobs/matches', { params, headers: getAuthHeaders(token) });
export const generateProposal = (payload, token) =>
  api.post('/ai/generate-proposal', payload, { headers: getAuthHeaders(token) });
export const saveJob = (payload, token) =>
  api.post('/jobs/save', payload, { headers: getAuthHeaders(token) });
export const unsaveJob = (payload, token) =>
  api.delete('/jobs/save', { data: payload, headers: getAuthHeaders(token) });
export const getSavedJobs = (freelancerId, token) =>
  api.get(`/jobs/saved/${freelancerId}`, { headers: getAuthHeaders(token) });
export const trackJobInteraction = (payload, token) =>
  api.post('/jobs/interactions', payload, { headers: getAuthHeaders(token) });
export const fetchPFISuggestionsByMe = (token) =>
  api.get('/freelancers/me/pfi/suggestions', { headers: getAuthHeaders(token) });
export const fetchPFIHistory = (freelancerId, limit = 10) =>
  api.get(`/freelancers/${freelancerId}/pfi/history`, { params: { limit } });
export const fetchPFIHistoryByMe = (token, limit = 10) =>
  api.get('/freelancers/me/pfi/history', { params: { limit }, headers: getAuthHeaders(token) });

export const createProposal = (payload, token) =>
  api.post('/proposals', payload, { headers: getAuthHeaders(token) });
export const fetchMyProposals = (token) =>
  api.get('/proposals/me', { headers: getAuthHeaders(token) });
export const acceptProposal = (proposalId, payload, token) =>
  api.post(`/proposals/${proposalId}/accept`, payload, { headers: getAuthHeaders(token) });
export const rejectProposal = (proposalId, token) =>
  api.post(`/proposals/${proposalId}/reject`, {}, { headers: getAuthHeaders(token) });

export const fetchConversations = (token) =>
  api.get('/conversations', { headers: getAuthHeaders(token) });
export const fetchConversation = (conversationId, token) =>
  api.get(`/conversations/${conversationId}`, { headers: getAuthHeaders(token) });
export const fetchUnreadCount = (token) =>
  api.get('/conversations/unread-count', { headers: getAuthHeaders(token) });
export const sendConversationMessage = (conversationId, payload, token) =>
  api.post(`/conversations/${conversationId}/messages`, payload, { headers: getAuthHeaders(token) });
export const markConversationAsRead = (conversationId, token) =>
  api.patch(`/conversations/${conversationId}/read`, {}, { headers: getAuthHeaders(token) });

export const loginUser = (payload) => api.post('/auth/login', payload);
export const signupUser = (payload) => api.post('/auth/signup', payload);
export const onboardUser = (payload) => api.post('/auth/onboarding', payload);
export const saveCategoriesAndSkills = (payload) => api.post('/profile/categories-skills', payload);
export const completeProfile = (payload) => api.post('/profile/complete', payload);
export const getProfile = (token) =>
  api.get('/profile/me', { headers: getAuthHeaders(token) });
export const updateProfile = (payload, token) =>
  api.patch('/profile/me', payload, { headers: getAuthHeaders(token) });

export const fetchProjectById = (projectId, token) =>
  api.get(`/projects/${projectId}`, { headers: getAuthHeaders(token) });
export const fetchProjectMilestones = (projectId) =>
  api.get(`/projects/${projectId}/milestones`);
export const fetchProjectPayments = (projectId) =>
  api.get(`/payments/project/${projectId}`);
export const fetchEscrowDashboard = (projectId) =>
  api.get(`/payments/project/${projectId}/dashboard`);

export const fetchRankedFreelancersForProject = (projectId, token) =>
  api.get(`/projects/${projectId}/interested-freelancers-ranked`, { headers: getAuthHeaders(token) });

export const fetchFreelancerMlInsight = (projectId, freelancerId, token) =>
  api.get(`/projects/${projectId}/freelancers/${freelancerId}/ml-insight`, {
    headers: getAuthHeaders(token)
  });

export const recomputeProjectRanking = (projectId, token) =>
  api.post(`/ml/recompute-ranking/${projectId}`, {}, { headers: getAuthHeaders(token) });

export default api;