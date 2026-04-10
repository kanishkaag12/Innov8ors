'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  DollarSign,
  FileText,
  MessageSquare,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  X
} from 'lucide-react';
import Link from 'next/link';
import {
  generateMilestones,
  acceptProposal,
  rejectProposal,
  fetchRankedFreelancersForProject,
  fetchFreelancerMlInsight,
  recomputeProjectRanking,
  listProjects,
  createProject,
  deleteProject as deleteProjectRequest
} from '@/services/api';
import { getStoredAuth } from '@/services/auth';

const STORAGE_KEY_PREFIX = 'synapescrow_employer_projects';
const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_SQqAVOFu5bhmIk';

const sampleProjects = [
  {
    id: 'sample-1',
    title: 'Full-Stack Tic-Tac-Toe Game Development',
    description: 'build a tic-tac-toe full stack game app',
    budget: 10000,
    createdAt: '2026-03-03T00:00:00.000Z',
    status: 'Active',
    interestedCount: 0,
    escrowLabel: 'Escrow Locked',
    source: 'sample',
    milestones: [
      {
        title: 'Game Architecture & Setup',
        description: 'Set up the frontend and backend foundations for the multiplayer tic-tac-toe platform, including authentication and project structure.',
        deliverable: 'Initial codebase, auth flow, and project setup.',
        estimated_time: '1-2 weeks',
        complexity: 'Medium',
        payout_percentage: 25,
        payment_amount: 2500
      },
      {
        title: 'Gameplay Logic & Match Flow',
        description: 'Build the real-time gameplay engine, match state handling, scorekeeping, and player turn synchronization.',
        deliverable: 'Playable multiplayer game with stable match flow.',
        estimated_time: '2-3 weeks',
        complexity: 'High',
        payout_percentage: 30,
        payment_amount: 3000
      },
      {
        title: 'Leaderboard, Error Handling & Polish',
        description: 'Add rankings, edge-case handling, performance tuning, responsive improvements, and deployment prep.',
        deliverable: 'Production-ready game with polish and leaderboard support.',
        estimated_time: '1-2 weeks',
        complexity: 'Medium',
        payout_percentage: 20,
        payment_amount: 2000
      }
    ]
  },
  {
    id: 'sample-2',
    title: 'Cafe Website Development',
    description: 'build a clean cafe website with menu, gallery, and contact form',
    budget: 12000,
    createdAt: '2026-01-04T00:00:00.000Z',
    status: 'Active',
    interestedCount: 1,
    escrowLabel: 'Escrow Locked',
    source: 'sample',
    milestones: []
  }
];

const initialPlannerForm = {
  description: '',
  budget: ''
};

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number(amount || 0));
}

function formatCompactCurrency(amount) {
  const value = Number(amount || 0);
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(1)}L`;
  }

  return formatCurrency(value);
}

function formatPostedDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return 'Posted recently';
  }

  return `Posted ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

function formatRelativeDate(dateString) {
  const createdAt = new Date(dateString);
  if (Number.isNaN(createdAt.getTime())) {
    return 'Just now';
  }

  const hours = Math.max(1, Math.round((Date.now() - createdAt.getTime()) / (1000 * 60 * 60)));
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  const days = Math.max(1, Math.round(hours / 24));
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function getProjectStorageKey(user) {
  const identity = String(user?._id || user?.id || user?.email || 'anonymous').trim().toLowerCase();
  return `${STORAGE_KEY_PREFIX}:${identity}`;
}

function loadStoredProjects(storageKey) {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.map((project) => {
          const applicants = Array.isArray(project?.applicants) ? project.applicants : [];
          return {
            ...project,
            applicants,
            interestedCount: applicants.length
          };
        })
      : [];
  } catch {
    return [];
  }
}

function saveStoredProjects(storageKey, projects) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(projects));
}

function parseMilestones(responseData, budgetValue) {
  const budget = Number(budgetValue || 0);
  const rawMilestones = Array.isArray(responseData?.milestones) ? responseData.milestones : [];
  const sanitized = rawMilestones
    .map((milestone) => ({
      title: String(milestone?.title || '').trim(),
      description: String(milestone?.description || '').trim(),
      deliverable: String(milestone?.deliverable || '').trim(),
      estimated_time: String(milestone?.estimated_time || '').trim(),
      complexity: String(milestone?.complexity || 'Medium').trim(),
      payout_percentage: Number(milestone?.payout_percentage || 0)
    }))
    .filter((milestone) => milestone.title && milestone.description);

  const withAmounts = sanitized.map((milestone, index) => {
    const isLast = index === sanitized.length - 1;
    const amount = isLast
      ? budget - sanitized
          .slice(0, index)
          .reduce((sum, item) => sum + Math.round((budget * item.payout_percentage) / 100), 0)
      : Math.round((budget * milestone.payout_percentage) / 100);

    return {
      ...milestone,
      payment_amount: Math.max(0, amount)
    };
  });

  return {
    projectTitle: String(responseData?.project_title || 'AI Generated Project Plan').trim(),
    milestones: withAmounts
  };
}

function loadRazorpayScript() {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function getComplexityTone(complexity) {
  const value = String(complexity || '').toLowerCase();
  if (value.includes('high')) {
    return 'bg-orange-50 text-orange-700';
  }
  if (value.includes('low')) {
    return 'bg-sky-50 text-sky-700';
  }
  return 'bg-slate-50 text-slate-700';
}

function resolveProjectId(project) {
  return (
    project?.job_id ||
    project?.project_id ||
    project?._id ||
    project?.id ||
    null
  );
}

function resolveFreelancerId(entry) {
  return (
    entry?.freelancer_id ||
    entry?.freelancerId ||
    entry?.id ||
    null
  );
}

function normalizeRankedFreelancersResponse(payload) {
  const raw =
    payload?.rankedFreelancers ||
    payload?.freelancers ||
    payload?.results ||
    [];

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((entry, index) => {
    const profile = entry?.freelancerProfile || entry?.freelancer || {};
    const metrics = entry?.metrics || {};
    const successProbability = Number(
      entry?.estimated_success_probability ?? entry?.success_probability ?? 0
    );
    const mlScore = Number(entry?.ml_ranking_score ?? entry?.ml_score ?? entry?.score ?? 0);
    const matchScore = successProbability > 0
      ? Math.round(successProbability * 100)
      : Math.round(Math.max(0, Math.min(1, (mlScore + 1) / 2)) * 100);

    const rawStrengths = Array.isArray(entry?.top_strengths) ? entry.top_strengths : [];
    const highlightMap = {
      'High semantic match with job description': 'Strong match with your project requirements',
      'Strong title/domain alignment': 'Relevant domain experience',
      'Strong required skill coverage': 'Required skills are well covered',
      'Competitive pricing fit': 'Good fit for your budget',
      'Reliable milestone completion history': 'Strong delivery track record'
    };

    const highlights = rawStrengths.map((item) => highlightMap[item] || item).slice(0, 3);

    return {
      freelancerId: resolveFreelancerId(entry),
      proposalId: entry?.proposal_id || null,
      proposalStatus: String(entry?.proposal_status || 'pending').toLowerCase(),
      conversationId: entry?.conversation_id || null,
      freelancerEmail: entry?.freelancer_email || '',
      name: profile?.full_name || profile?.name || entry?.freelancer_name || 'Freelancer',
      title: profile?.title || entry?.freelancer_title || 'Professional Freelancer',
      avatar: profile?.avatar_url || profile?.avatar || null,
      rank: Number(entry?.rank_position || entry?.rank || index + 1),
      matchScore,
      semanticScore: Number(entry?.semantic_score_contribution ?? entry?.semantic_score ?? 0),
      priceFit: Number(entry?.price_fit_contribution ?? entry?.price_fit ?? 0),
      reliability: Number(entry?.metrics_contribution ?? metrics?.reliability ?? 0),
      successProbability,
      strengths: Array.isArray(entry?.top_strengths) ? entry.top_strengths : [],
      highlights,
      risks: Array.isArray(entry?.top_risks) ? entry.top_risks : [],
      percentile: Number(entry?.percentile_rank ?? 0)
    };
  });
}

function normalizeApplicantToCandidate(applicant, index) {
  return {
    freelancerId: applicant?.freelancerId || null,
    proposalId: applicant?.proposalId || null,
    proposalStatus: String(applicant?.status || applicant?.proposalStatus || 'pending').toLowerCase(),
    conversationId: applicant?.conversationId || null,
    freelancerEmail: applicant?.email || '',
    name: applicant?.name || 'Freelancer',
    title: applicant?.title || 'Project applicant',
    avatar: null,
    rank: index + 1,
    matchScore: null,
    semanticScore: 0,
    priceFit: 0,
    reliability: 0,
    successProbability: 0,
    strengths: [],
    highlights: [],
    risks: [],
    percentile: 0,
    requestedAt: applicant?.requestedAt || null,
    pfiScore: Number(applicant?.pfiScore || 0),
    isLegacyApplicant: true
  };
}

function mergeCandidateLists(rankedFreelancers, applicants) {
  const candidatesByKey = new Map();

  const buildKey = (candidate) =>
    String(
      candidate?.proposalId ||
      candidate?.freelancerId ||
      candidate?.freelancerEmail ||
      candidate?.email ||
      candidate?.name ||
      ''
    ).trim().toLowerCase();

  const mergeCandidate = (candidate, isRanked) => {
    const key = buildKey(candidate);
    if (!key) {
      return;
    }

    const existing = candidatesByKey.get(key);
    if (!existing) {
      candidatesByKey.set(key, candidate);
      return;
    }

    const primary = isRanked ? candidate : existing;
    const secondary = isRanked ? existing : candidate;

    candidatesByKey.set(key, {
      ...secondary,
      ...primary,
      proposalStatus: String(
        primary?.proposalStatus ||
        primary?.status ||
        secondary?.proposalStatus ||
        secondary?.status ||
        'pending'
      ).toLowerCase(),
      conversationId: primary?.conversationId || secondary?.conversationId || null,
      requestedAt: primary?.requestedAt || secondary?.requestedAt || null,
      pfiScore: Number(primary?.pfiScore ?? secondary?.pfiScore ?? 0),
      highlights:
        Array.isArray(primary?.highlights) && primary.highlights.length
          ? primary.highlights
          : secondary?.highlights || []
    });
  };

  (Array.isArray(applicants) ? applicants : []).forEach((applicant, index) =>
    mergeCandidate(normalizeApplicantToCandidate(applicant, index), false)
  );
  (Array.isArray(rankedFreelancers) ? rankedFreelancers : []).forEach((candidate) =>
    mergeCandidate(candidate, true)
  );

  return Array.from(candidatesByKey.values()).map((candidate, index) => ({
    ...candidate,
    rank: Number(candidate?.rank || index + 1)
  }));
}

function normalizeInsightResponse(payload) {
  const insight = payload || {};

  const successProbability = Number(
    insight?.predicted_success_probability ?? insight?.estimated_success_probability ?? insight?.success_probability ?? 0
  );
  const risks = Array.isArray(insight?.risks)
    ? insight.risks
    : Array.isArray(insight?.top_risks)
      ? insight.top_risks
      : [];

  let recommendation = 'Consider with caution';
  if (successProbability >= 0.65 && risks.length <= 1) {
    recommendation = 'Recommended';
  } else if (successProbability < 0.45 || risks.length >= 3) {
    recommendation = 'Not recommended';
  }

  const relevanceLabel = successProbability >= 0.75
    ? 'Strong match with your project requirements'
    : successProbability >= 0.55
      ? 'Reasonable match for this project'
      : 'Limited alignment with this project scope';

  const budgetFitLabel = Number(insight?.price_fit_score ?? insight?.price_fit_contribution ?? insight?.price_fit ?? 0) >= 0.75
    ? 'Budget is well aligned'
    : Number(insight?.price_fit_score ?? insight?.price_fit_contribution ?? insight?.price_fit ?? 0) >= 0.5
      ? 'Budget is acceptable'
      : 'Budget appears less aligned';

  const trackRecordLabel = Number(insight?.reliability_score ?? insight?.metrics_contribution ?? insight?.reliability ?? 0) >= 0.75
    ? 'Strong delivery track record'
    : Number(insight?.reliability_score ?? insight?.metrics_contribution ?? insight?.reliability ?? 0) >= 0.5
      ? 'Moderate track record'
      : 'Track record needs closer review';

  return {
    modelVersion: insight?.model_version || insight?.modelVersion || 'latest',
    mlScore: Number(insight?.overall_score ?? insight?.ml_ranking_score ?? insight?.ml_score ?? 0),
    rank: Number(insight?.rank_position ?? insight?.rank ?? 0),
    semanticScore: Number(insight?.semantic_similarity_score ?? insight?.semantic_score_contribution ?? insight?.semantic_score ?? 0),
    proposalQuality: Number(insight?.proposal_quality_score ?? 0),
    priceFit: Number(insight?.price_fit_score ?? insight?.price_fit_contribution ?? insight?.price_fit ?? 0),
    reliability: Number(insight?.reliability_score ?? insight?.metrics_contribution ?? insight?.reliability ?? 0),
    successProbability,
    strengths: Array.isArray(insight?.strengths)
      ? insight.strengths
      : Array.isArray(insight?.top_strengths)
        ? insight.top_strengths
        : [],
    risks,
    recommendation,
    relevanceLabel,
    budgetFitLabel,
    trackRecordLabel
  };
}

function normalizeBackendProject(project) {
  const applicants = Array.isArray(project?.applicants) ? project.applicants : [];
  const milestones = Array.isArray(project?.milestones) ? project.milestones : [];

  return {
    id: String(project?._id || project?.id || ''),
    _id: project?._id,
    title: String(project?.title || 'Untitled Project'),
    description: String(project?.description || ''),
    budget: Number(project?.budget || 0),
    createdAt: project?.createdAt || new Date().toISOString(),
    status: 'Active',
    applicants,
    interestedCount: Number(project?.interestedCount || applicants.length || 0),
    escrowLabel: 'Escrow Locked',
    milestones,
    source: 'backend'
  };
}

export default function EmployerDashboardPage() {
  const [user, setUser] = useState(null);
  const [postedProjects, setPostedProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  const [plannerStep, setPlannerStep] = useState(1);
  const [plannerForm, setPlannerForm] = useState(initialPlannerForm);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [plannerError, setPlannerError] = useState('');
  const [rankedFreelancers, setRankedFreelancers] = useState([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingError, setRankingError] = useState('');
  const [recomputingRanking, setRecomputingRanking] = useState(false);
  const [insightLoadingId, setInsightLoadingId] = useState('');
  const [insightFreelancer, setInsightFreelancer] = useState(null);
  const [mlInsight, setMlInsight] = useState(null);
  const [mlInsightError, setMlInsightError] = useState('');
  const [backendProjects, setBackendProjects] = useState([]);
  const [projectStorageKey, setProjectStorageKey] = useState(() => getProjectStorageKey(null));

  const refreshBackendProjects = async (token) => {
    if (!token) {
      setBackendProjects([]);
      return;
    }

    const response = await listProjects({}, token);
    const rawProjects = Array.isArray(response?.data?.projects) ? response.data.projects : [];
    setBackendProjects(rawProjects.map(normalizeBackendProject));
  };

  useEffect(() => {
    const auth = getStoredAuth();
    const storageKey = getProjectStorageKey(auth?.user);
    setProjectStorageKey(storageKey);

    if (auth) {
      setUser(auth.user);
    }

    const storedProjects = loadStoredProjects(storageKey);
    setPostedProjects(storedProjects);
    saveStoredProjects(storageKey, storedProjects);

    const loadBackendProjects = async () => {
      try {
        await refreshBackendProjects(auth?.token);
      } catch {
        setBackendProjects([]);
      }
    };

    loadBackendProjects();
  }, []);

  useEffect(() => {
    const loadProjectRanking = async () => {
      const projectId = resolveProjectId(selectedProject);
      if (!selectedProject || !projectId || selectedProject?.source === 'sample') {
        setRankedFreelancers([]);
        setRankingError('');
        return;
      }

      try {
        setRankingLoading(true);
        setRankingError('');
        const auth = getStoredAuth();
        const response = await fetchRankedFreelancersForProject(projectId, auth?.token);
        setRankedFreelancers(normalizeRankedFreelancersResponse(response.data));
      } catch (error) {
        setRankedFreelancers([]);
        setRankingError(
          error?.response?.data?.message ||
            'Candidate matching is unavailable for this project right now.'
        );
      } finally {
        setRankingLoading(false);
      }
    };

    setMlInsight(null);
    setInsightFreelancer(null);
    setMlInsightError('');
    setInsightLoadingId('');
    loadProjectRanking();
  }, [selectedProject]);

  const projects = useMemo(() => {
    const merged = [...backendProjects, ...postedProjects];
    const seen = new Set();
    const backendTitles = new Set(
      backendProjects
        .map((project) => String(project?.title || '').trim().toLowerCase())
        .filter(Boolean)
    );

    return merged.filter((project) => {
      const titleKey = String(project?.title || '').trim().toLowerCase();
      if (project?.source !== 'backend' && titleKey && backendTitles.has(titleKey)) {
        return false;
      }

      const key = resolveProjectId(project) || project?.id;
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [backendProjects, postedProjects]);

  const persistPostedProjects = (updater) => {
    const nextProjects = updater(postedProjects);
    setPostedProjects(nextProjects);
    saveStoredProjects(projectStorageKey, nextProjects);

    if (selectedProject && selectedProject.source !== 'sample') {
      const refreshed = nextProjects.find((project) => project.id === selectedProject.id) || null;
      setSelectedProject(refreshed);
    }

    return nextProjects;
  };

  const stats = useMemo(() => {
    const totalEscrow = projects.reduce((sum, project) => sum + Number(project?.budget || 0), 0);
    const totalInterested = projects.reduce((sum, project) => sum + Number(project?.interestedCount || 0), 0);

    return [
      { label: 'Active Jobs', value: String(projects.length), icon: Briefcase, trend: `+${postedProjects.length}`, color: 'bg-blue-500' },
      { label: 'Proposals', value: String(Math.max(10, totalInterested + 9)), icon: Users, trend: `+${Math.max(4, postedProjects.length)} new`, color: 'bg-emerald-500' },
      { label: 'Escrow Locked', value: formatCompactCurrency(totalEscrow || 500000), icon: ShieldCheck, trend: 'Stable', color: 'bg-indigo-500' },
      { label: 'Weekly Spend', value: formatCompactCurrency(Math.max(236550, totalEscrow / 2)), icon: TrendingUp, trend: '+12%', color: 'bg-orange-500' }
    ];
  }, [postedProjects, projects]);

  const combinedCandidates = useMemo(
    () => mergeCandidateLists(rankedFreelancers, selectedProject?.applicants || []),
    [rankedFreelancers, selectedProject]
  );

  const openPlanner = () => {
    setPlannerError('');
    setPlannerStep(1);
    setGeneratedPlan(null);
    setPaymentSuccess(null);
    setPlannerForm(initialPlannerForm);
    setIsPlannerOpen(true);
  };

  const closePlanner = () => {
    setIsPlannerOpen(false);
    setPlannerStep(1);
    setGeneratedPlan(null);
    setPaymentSuccess(null);
    setPlannerForm(initialPlannerForm);
    setPlannerError('');
    setIsGenerating(false);
    setIsPaying(false);
  };

  const handlePlannerChange = (event) => {
    const { name, value } = event.target;
    setPlannerForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleGeneratePlan = async () => {
    if (!plannerForm.description.trim() || !Number(plannerForm.budget)) {
      setPlannerError('Please add a project description and budget first.');
      return;
    }

    try {
      setIsGenerating(true);
      setPlannerError('');

      const response = await generateMilestones({
        description: plannerForm.description.trim(),
        budget: Number(plannerForm.budget)
      });

      const parsedPlan = parseMilestones(response.data, plannerForm.budget);

      if (parsedPlan.milestones.length === 0) {
        throw new Error('AI did not return usable milestones.');
      }

      setGeneratedPlan(parsedPlan);
      setPlannerStep(2);
    } catch (error) {
      setPlannerError(error?.response?.data?.error || error?.message || 'Failed to generate milestones.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePayment = async () => {
    if (!generatedPlan) {
      return;
    }

    setIsPaying(true);
    setPlannerError('');

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded || typeof window === 'undefined' || !window.Razorpay) {
      setPlannerError('Razorpay checkout failed to load.');
      setIsPaying(false);
      return;
    }

    const amount = Number(plannerForm.budget) * 100;
    const projectRecord = {
      id: `project-${Date.now()}`,
      title: generatedPlan.projectTitle,
      description: plannerForm.description.trim(),
      employerName: user?.name || 'Client',
      budget: Number(plannerForm.budget),
      createdAt: new Date().toISOString(),
      status: 'Active',
      applicants: [],
      interestedCount: 0,
      escrowLabel: 'Escrow Locked',
      milestones: generatedPlan.milestones
    };

    const razorpay = new window.Razorpay({
      key: RAZORPAY_KEY_ID,
      amount,
      currency: 'INR',
      name: 'SynapEscrow',
      description: generatedPlan.projectTitle,
      image: undefined,
      handler: async (response) => {
        const auth = getStoredAuth();
        let finalizedProject = projectRecord;

        try {
          if (auth?.token) {
            const created = await createProject(
              {
                title: projectRecord.title,
                description: projectRecord.description,
                budget: projectRecord.budget,
                deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
                milestones: generatedPlan?.milestones || []
              },
              auth.token
            );

            const createdProject = created?.data?.project;
            if (createdProject?._id) {
              finalizedProject = {
                ...projectRecord,
                id: String(createdProject._id),
                _id: createdProject._id,
                source: 'backend'
              };
            }

            try {
              await refreshBackendProjects(auth.token);
            } catch {
              // Keep local state if refresh fails.
            }
          }
        } catch {
          // Fallback to local-only project record when backend create fails.
        }

        const nextProjects = [finalizedProject, ...postedProjects];
        setPostedProjects(nextProjects);
        saveStoredProjects(projectStorageKey, nextProjects);
        setPaymentSuccess({
          ...finalizedProject,
          paymentId: response?.razorpay_payment_id || 'test_payment'
        });
        setIsPaying(false);
      },
      prefill: {
        name: user?.name || 'Client',
        email: user?.email || '',
        contact: user?.phone || ''
      },
      theme: {
        color: '#10b981'
      },
      modal: {
        ondismiss: () => {
          setIsPaying(false);
        }
      }
    });

    razorpay.open();
  };

  const handleApplicantStatus = async (projectId, email, status) => {
    const auth = getStoredAuth();
    const token = auth?.token;
    const project = postedProjects.find((project) => project.id === projectId);
    const applicant = project?.applicants?.find((entry) => entry.email === email);
    let updatedProposal = null;
    
    console.log('📝 handleApplicantStatus called:', { projectId, email, status, applicantProposalId: applicant?.proposalId });

    if (token && applicant?.proposalId) {
      try {
        if (status === 'accepted') {
          console.log('✅ Accepting proposal:', applicant.proposalId, 'with budget:', project?.budget);
          const response = await acceptProposal(applicant.proposalId, { budget: project?.budget || 0 }, token);
          updatedProposal = response?.data?.proposal || null;
          console.log('✅ Accept response:', response.data);
        } else if (status === 'rejected') {
          console.log('❌ Rejecting proposal:', applicant.proposalId);
          const response = await rejectProposal(applicant.proposalId, token);
          updatedProposal = response?.data?.proposal || null;
        }
      } catch (error) {
        console.warn('❌ Proposal status update failed:', error?.response?.data || error?.message || error);
      }
    } else {
      console.warn('⚠️  Missing token or proposalId:', { hasToken: !!token, proposalId: applicant?.proposalId });
    }

    persistPostedProjects((currentProjects) =>
      currentProjects.map((project) => {
        if (project.id !== projectId) {
          return project;
        }

        const applicants = (project.applicants || []).map((entry) => (
          entry.email === email
            ? {
                ...entry,
                status,
                acceptedByName:
                  updatedProposal?.employerName ||
                  project?.employerName ||
                  user?.name ||
                  entry?.acceptedByName ||
                  '',
                acceptedAt: updatedProposal?.updatedAt || new Date().toISOString(),
                conversationId: updatedProposal?.conversationId || entry?.conversationId || null
              }
            : entry
        ));

        return {
          ...project,
          applicants,
          interestedCount: applicants.length
        };
      })
    );
  };

  const handleApplicantMessage = (applicant, project) => {
    if (typeof window === 'undefined' || !applicant?.email || applicant.status !== 'accepted') {
      return;
    }

    window.location.href = '/dashboard/messages';
  };

  const handleRecomputeRanking = async () => {
    const projectId = resolveProjectId(selectedProject);
    if (!projectId) {
      return;
    }

    try {
      setRecomputingRanking(true);
      setRankingError('');
      const auth = getStoredAuth();
      await recomputeProjectRanking(projectId, auth?.token);

      const refreshed = await fetchRankedFreelancersForProject(projectId, auth?.token);
      setRankedFreelancers(normalizeRankedFreelancersResponse(refreshed.data));
    } catch (error) {
      setRankingError(
        error?.response?.data?.message ||
          'Could not refresh candidate matches for this project.'
      );
    } finally {
      setRecomputingRanking(false);
    }
  };

  const handleRankedDecision = async (freelancer, decision) => {
    if (!freelancer?.proposalId) {
      return;
    }

    try {
      const auth = getStoredAuth();
      const token = auth?.token;

      if (!token) {
        return;
      }

      if (decision === 'accepted') {
        await acceptProposal(freelancer.proposalId, { budget: selectedProject?.budget || 0 }, token);
      } else {
        await rejectProposal(freelancer.proposalId, token);
      }

      const projectId = resolveProjectId(selectedProject);
      if (projectId) {
        const refreshed = await fetchRankedFreelancersForProject(projectId, token);
        setRankedFreelancers(normalizeRankedFreelancersResponse(refreshed.data));
      }

      await refreshBackendProjects(token);
    } catch (error) {
      setRankingError(error?.response?.data?.message || 'Could not update proposal status.');
    }
  };

  const handleContactByEmail = (freelancer) => {
    if (typeof window === 'undefined' || !freelancer?.freelancerEmail) {
      return;
    }

    const subject = encodeURIComponent(`SynapEscrow: ${selectedProject?.title || 'Project'} collaboration`);
    const body = encodeURIComponent(
      `Hi ${freelancer.name},\n\nYour application for "${selectedProject?.title || 'this project'}" has been accepted. Let's align on next steps.\n\nThanks,\n${user?.name || 'Employer'}`
    );

    window.location.href = `mailto:${freelancer.freelancerEmail}?subject=${subject}&body=${body}`;
  };

  const handleMessageInPlatform = (freelancer) => {
    if (typeof window === 'undefined') {
      return;
    }

    const query = freelancer?.conversationId ? `?conversationId=${freelancer.conversationId}` : '';
    window.location.href = `/dashboard/messages${query}`;
  };

  const handleOpenInsight = async (freelancer) => {
    const projectId = resolveProjectId(selectedProject);
    if (!projectId || !freelancer?.freelancerId) {
      return;
    }

    try {
      setInsightLoadingId(String(freelancer.freelancerId));
      setMlInsightError('');
      const auth = getStoredAuth();
      const response = await fetchFreelancerMlInsight(
        projectId,
        freelancer.freelancerId,
        auth?.token
      );
      setInsightFreelancer(freelancer);
      setMlInsight(normalizeInsightResponse(response.data));
    } catch (error) {
      setMlInsight(null);
      setInsightFreelancer(null);
      setMlInsightError(
        error?.response?.data?.message ||
          'Unable to load candidate details right now.'
      );
    } finally {
      setInsightLoadingId('');
    }
  };

  const handleDeleteProject = async (project) => {
    const projectId = resolveProjectId(project);
    if (!projectId) {
      return;
    }

    if (typeof window !== 'undefined') {
      const shouldDelete = window.confirm(`Delete project "${project.title}"? This cannot be undone.`);
      if (!shouldDelete) {
        return;
      }
    }

    const auth = getStoredAuth();

    try {
      if (project?.source === 'backend' && auth?.token) {
        await deleteProjectRequest(projectId, auth.token);
        await refreshBackendProjects(auth.token);
      }
    } catch (error) {
      window.alert(error?.response?.data?.message || 'Unable to delete this project right now.');
      return;
    }

    persistPostedProjects((currentProjects) =>
      currentProjects.filter((item) => resolveProjectId(item) !== String(projectId))
    );

    if (resolveProjectId(selectedProject) === String(projectId)) {
      setSelectedProject(null);
    }
  };

  const plannerModalWidth = paymentSuccess ? 'max-w-2xl' : plannerStep === 1 ? 'max-w-2xl' : 'max-w-4xl';

  return (
    <>
      <div className="mx-auto max-w-7xl px-6 py-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <section className="relative overflow-hidden rounded-3xl bg-slate-900 px-8 py-12 text-white shadow-2xl">
          <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-16 -ml-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative z-10 max-w-2xl">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Welcome, {user?.name || 'Client'}!
            </h1>
            <p className="mt-4 text-xl font-medium text-slate-300">
              Let's start with your first job post. It's the fastest way to meet top talent.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                onClick={openPlanner}
                className="flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 font-bold text-white shadow-lg transition hover:scale-105 hover:bg-emerald-600 active:scale-95"
              >
                <Sparkles size={18} />
                Get started using AI
              </button>
              <button
                onClick={openPlanner}
                className="rounded-full bg-white/10 px-6 py-3 font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                I'll do it without AI
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, idx) => (
            <div key={idx} className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:border-emerald-100 hover:shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <div className={`rounded-xl p-3 ${stat.color} bg-opacity-10 text-white`}>
                  <stat.icon className={`h-5 w-5 ${stat.color.replace('bg-', 'text-')}`} />
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${String(stat.trend).includes('+') ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {stat.trend}
                </span>
              </div>
              <p className="text-[2rem] font-bold text-slate-900">{stat.value}</p>
              <p className="mt-1 text-sm font-medium text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-[1.9rem] font-bold text-slate-900">Your Active Projects</h2>
                <span className="rounded-full bg-rose-50 px-4 py-1.5 text-sm font-bold text-rose-600">
                  {Math.max(4, postedProjects.length)} new requests
                </span>
              </div>
              <button onClick={openPlanner} className="flex items-center gap-2 text-sm font-bold text-emerald-600 hover:text-emerald-700">
                View all <ChevronRight size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {projects.map((proj) => (
                <div
                  key={resolveProjectId(proj) || proj.id}
                  className="rounded-[1.6rem] border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:border-emerald-200 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <button
                      onClick={() => setSelectedProject(proj)}
                      className="flex min-w-0 flex-1 items-start gap-4 text-left"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500">
                        <Briefcase size={26} />
                      </div>
                      <div>
                        <h3 className="text-[1.1rem] font-bold text-slate-900">{proj.title}</h3>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-sm font-bold text-emerald-700">
                            {proj.status}
                          </span>
                          <span className="text-sm text-slate-400">{formatPostedDate(proj.createdAt)}</span>
                          <span className="rounded-md bg-blue-50 px-2.5 py-1 text-sm font-bold text-blue-600">
                            Interested: {proj.interestedCount || 0}
                          </span>
                        </div>
                      </div>
                    </button>

                    <div className="flex flex-col items-end gap-3">
                      <p className="text-[1.1rem] font-bold text-slate-900">{formatCurrency(proj.budget)}</p>
                      <p className="flex items-center gap-2 text-sm font-bold text-emerald-600">
                        <ShieldCheck size={15} /> {proj.escrowLabel || 'Escrow Locked'}
                      </p>
                      <button
                        onClick={() => handleDeleteProject(proj)}
                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
                      >
                        Delete Project
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={openPlanner}
                className="group flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-4 text-base font-bold text-slate-400 transition-all hover:border-emerald-400 hover:text-emerald-600"
              >
                <Plus size={18} className="transition-transform duration-300 group-hover:rotate-90" />
                Post a new job
              </button>
            </div>
          </div>

          <div className="space-y-8">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-900">
                <ArrowUpRight size={18} className="text-emerald-600" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <button onClick={openPlanner} className="group flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700">
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-slate-400 group-hover:text-emerald-600" />
                    Create a Manual Contract
                  </div>
                  <ChevronRight size={14} className="opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
                <Link href="/dashboard/messages" className="group flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700">
                  <div className="flex items-center gap-3">
                    <MessageSquare size={18} className="text-slate-400 group-hover:text-emerald-600" />
                    Check Messages
                  </div>
                  <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">3</span>
                </Link>
                <button onClick={openPlanner} className="group flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700">
                  <div className="flex items-center gap-3">
                    <DollarSign size={18} className="text-slate-400 group-hover:text-emerald-600" />
                    Release Next Milestone
                  </div>
                  <ChevronRight size={14} className="opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-lg">
              <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <h3 className="mb-2 text-lg font-bold">Pro Package</h3>
              <p className="mb-6 text-sm text-emerald-100">Unlock dedicated account managers and premium talent search.</p>
              <button className="w-full rounded-xl bg-white py-2.5 text-sm font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-50">
                Upgrade Now
              </button>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-slate-900">Onboarding Completion</h3>
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-400">
                <span>Profile Progress</span>
                <span className="text-emerald-600">85%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: '85%' }} />
              </div>
              <p className="mt-4 text-xs font-medium text-slate-500">Add payment method to reach 100%.</p>
            </div>
          </div>
        </div>
      </div>

      {isPlannerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className={`w-full ${plannerModalWidth} overflow-hidden rounded-[1.7rem] bg-white shadow-2xl`}>
            <div className="flex items-start justify-between bg-slate-950 px-5 py-4 text-white">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                  {paymentSuccess ? <CheckCircle2 size={21} /> : <Sparkles size={20} />}
                </div>
                <div>
                  <h2 className="text-[2.2rem] font-extrabold tracking-tight">AI Job Planner</h2>
                  <p className="mt-1 text-base text-slate-300">
                    {paymentSuccess ? 'Done!' : plannerStep === 1 ? 'Step 1 of 2 — Describe Project' : 'Step 2 of 2 — Review & Pay'}
                  </p>
                </div>
              </div>
              <button onClick={closePlanner} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-slate-200 transition hover:bg-white/20">
                <X size={20} />
              </button>
            </div>

            <div className={`${paymentSuccess || plannerStep === 1 ? 'max-h-[74vh]' : 'max-h-[82vh]'} overflow-y-auto px-5 py-5`}>
              {paymentSuccess ? (
                <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 size={52} />
                  </div>
                  <h3 className="mt-8 text-[3rem] font-extrabold tracking-tight text-slate-900">Payment Successful!</h3>
                  <p className="mt-4 text-xl text-slate-500">
                    Your project budget of <span className="font-bold text-slate-900">{formatCurrency(paymentSuccess.budget)}</span> has been locked in escrow.
                  </p>
                  <p className="mt-2 text-lg text-slate-400">
                    The milestones are ready — freelancers can now apply to your project.
                  </p>
                  <button
                    onClick={closePlanner}
                    className="mt-8 rounded-2xl bg-emerald-500 px-10 py-4 text-xl font-bold text-white transition hover:bg-emerald-600"
                  >
                    Back to Dashboard
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-8 flex items-center gap-4">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${plannerStep >= 1 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>1</div>
                    <div className={`h-1 flex-1 rounded-full ${plannerStep >= 2 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${plannerStep >= 2 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>2</div>
                  </div>

                  {plannerStep === 1 ? (
                    <div className="space-y-5">
                      <div>
                        <label className="mb-2 block text-[1.35rem] font-bold text-slate-800">Project Description <span className="text-emerald-600">*</span></label>
                        <textarea
                          className="min-h-32 w-full rounded-[1.25rem] border border-slate-200 bg-slate-50 px-5 py-4 text-base text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white"
                          name="description"
                          value={plannerForm.description}
                          onChange={handlePlannerChange}
                          placeholder="e.g. Build a full-stack e-commerce app with React frontend, Node.js backend, payment integration, and admin dashboard..."
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-[1.35rem] font-bold text-slate-800">Project Budget (INR) <span className="text-emerald-600">*</span></label>
                        <div className="flex items-center rounded-[1.25rem] border border-slate-200 bg-slate-50 px-5 py-4 text-base text-slate-700 transition focus-within:border-emerald-400 focus-within:bg-white">
                          <span className="mr-3 text-lg text-slate-400">₹</span>
                          <input
                            className="w-full bg-transparent outline-none"
                            name="budget"
                            type="number"
                            min="1"
                            value={plannerForm.budget}
                            onChange={handlePlannerChange}
                            placeholder="e.g. 50000"
                          />
                        </div>
                      </div>

                      {plannerError ? <p className="text-lg font-semibold text-red-500">{plannerError}</p> : null}

                      <button
                        onClick={handleGeneratePlan}
                        disabled={isGenerating}
                        className="flex w-full items-center justify-center gap-3 rounded-[1.15rem] bg-emerald-500 px-6 py-4 text-lg font-extrabold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-80"
                      >
                        <Sparkles size={19} />
                        {isGenerating ? 'AI is analyzing your project...' : 'Generate Milestones with AI'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-5 py-4">
                        <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-slate-400">AI Generated Project Title</p>
                        <h3 className="mt-2 text-2xl font-extrabold text-slate-900">{generatedPlan?.projectTitle}</h3>
                      </div>

                      <div className="rounded-[1.4rem] border border-emerald-100 bg-emerald-50/45 p-5">
                        <div className="mb-5 flex items-center gap-3 text-emerald-700">
                          <CheckCircle2 size={21} />
                          <h4 className="text-xl font-extrabold">AI-Generated Milestones</h4>
                        </div>

                        <div className="space-y-5">
                          {generatedPlan?.milestones.map((milestone, index) => (
                            <article key={`${milestone.title}-${index}`} className="rounded-[1.4rem] border border-emerald-100 bg-white p-4 shadow-sm">
                              <h5 className="text-xl font-extrabold text-slate-900">{milestone.title}</h5>
                              <p className="mt-3 text-base leading-7 text-slate-500">{milestone.description}</p>

                              <div className="mt-4 inline-flex rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-extrabold text-emerald-700">
                                {milestone.payout_percentage}% payout
                              </div>

                              <div className="mt-5 grid gap-3 md:grid-cols-4">
                                <div className="rounded-xl bg-slate-50 p-3.5">
                                  <p className="text-sm font-extrabold uppercase tracking-wide text-slate-400">Payable Amount</p>
                                  <p className="mt-2 text-xl font-extrabold text-emerald-700">{formatCurrency(milestone.payment_amount)}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3.5">
                                  <p className="text-sm font-extrabold uppercase tracking-wide text-slate-400">Expected Deliverable</p>
                                  <p className="mt-2 text-sm leading-6 text-slate-600">{milestone.deliverable}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3.5">
                                  <p className="text-sm font-extrabold uppercase tracking-wide text-slate-400">Estimated Time</p>
                                  <p className="mt-2 text-lg font-bold text-slate-700">{milestone.estimated_time}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3.5">
                                  <p className="text-sm font-extrabold uppercase tracking-wide text-slate-400">Complexity</p>
                                  <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-bold ${getComplexityTone(milestone.complexity)}`}>
                                    {milestone.complexity}
                                  </p>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-5 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <p className="text-xl font-extrabold text-slate-700">Total Budget to Deposit</p>
                          <p className="text-3xl font-extrabold text-slate-900">{formatCurrency(plannerForm.budget)}</p>
                        </div>
                      </div>

                      {plannerError ? <p className="text-lg font-semibold text-red-500">{plannerError}</p> : null}

                      <div className="flex flex-col gap-4 md:flex-row">
                        <button
                          onClick={() => setPlannerStep(1)}
                          className="flex flex-1 items-center justify-center gap-2 rounded-[1.2rem] border border-slate-200 px-6 py-4 text-lg font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                          <ArrowLeft size={18} />
                          Edit
                        </button>
                        <button
                          onClick={handlePayment}
                          disabled={isPaying}
                          className="flex flex-[1.7] items-center justify-center gap-3 rounded-[1.2rem] bg-emerald-500 px-6 py-4 text-lg font-extrabold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-80"
                        >
                          <ShieldCheck size={19} />
                          {isPaying ? `Opening Razorpay...` : `Continue & Pay ${formatCurrency(plannerForm.budget)}`}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {selectedProject ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="max-h-[78vh] w-full max-w-[840px] overflow-hidden rounded-[1.65rem] bg-white shadow-2xl">
            <div className="flex items-start justify-between bg-slate-950 px-5 py-4 text-white">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                  <Briefcase size={20} />
                </div>
                <div>
                  <h2 className="text-[1.55rem] font-extrabold leading-tight">{selectedProject.title}</h2>
                  <p className="mt-1 text-sm text-slate-300">
                    {formatPostedDate(selectedProject.createdAt)} · Budget {formatCurrency(selectedProject.budget)}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedProject(null)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-slate-200 transition hover:bg-white/20">
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[calc(78vh-72px)] overflow-y-auto px-5 py-4">
              <div className="mb-4 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-5 py-4">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">Project Description</p>
                <p className="mt-2 text-base text-slate-800">{selectedProject.description || 'No description available.'}</p>
              </div>

              <div className="rounded-[1.2rem] border border-emerald-100 bg-emerald-50/40 p-5">
                <div className="mb-4 flex items-center justify-between gap-3 text-emerald-700">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={20} />
                    <h3 className="text-lg font-extrabold">Project Milestones</h3>
                  </div>
                  <p className="text-sm font-extrabold text-emerald-700">
                    Escrow Locked · {formatCurrency(selectedProject.budget)}
                  </p>
                </div>

                <div className="hidden items-center gap-3 text-emerald-700">
                  <CheckCircle2 size={20} />
                    <h3 className="text-xl font-extrabold">Milestones</h3>
                </div>

                {selectedProject.milestones?.length ? (
                  <div className="space-y-4">
                    {selectedProject.milestones.map((milestone, index) => (
                      <article key={`${selectedProject.id}-${index}`} className="rounded-[1.2rem] border border-emerald-100 bg-white p-4 shadow-sm">
                        <h4 className="text-[1.05rem] font-extrabold text-slate-900">{milestone.title}</h4>
                        <p className="mt-2 text-sm leading-7 text-slate-600">{milestone.description}</p>

                        <div className="mt-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-extrabold text-emerald-700">
                          {milestone.payout_percentage}% payout
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-4">
                          <div className="rounded-xl bg-slate-50 p-3.5">
                            <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Payable Amount</p>
                            <p className="mt-2 text-base font-extrabold text-emerald-700">{formatCurrency(milestone.payment_amount)}</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3.5">
                            <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Expected Deliverable</p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">{milestone.deliverable}</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3.5">
                            <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Estimated Time</p>
                            <p className="mt-2 text-sm font-bold text-slate-700">{milestone.estimated_time}</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3.5">
                            <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Complexity</p>
                            <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-bold ${getComplexityTone(milestone.complexity)}`}>
                              {milestone.complexity}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white p-5 text-base text-slate-500 shadow-sm">
                    No milestone plan is available yet for this project.
                  </div>
                )}
              </div>

              <div className="mt-5 space-y-4">
                <div className="rounded-[1.2rem] border border-blue-100 bg-blue-50/45 p-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[1.05rem] font-extrabold text-slate-900">Paid Milestones History</h4>
                    <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-blue-100 px-2 text-sm font-bold text-blue-600">
                      0
                    </span>
                  </div>
                  <p className="mt-4 text-base text-slate-500">No auto-released milestone payments yet.</p>
                </div>

                <div className="rounded-[1.2rem] border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[1.05rem] font-extrabold text-slate-900">Top Candidates</h4>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-emerald-100 px-2 text-sm font-bold text-emerald-600">
                        {combinedCandidates.length}
                      </span>
                      <button
                        onClick={handleRecomputeRanking}
                        disabled={recomputingRanking || !resolveProjectId(selectedProject)}
                        className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {recomputingRanking ? 'Refreshing...' : 'Refresh Matches'}
                      </button>
                    </div>
                  </div>

                  {rankingError ? (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      {rankingError}
                    </div>
                  ) : null}

                  {rankingLoading ? (
                    <p className="mt-4 text-sm text-slate-500">Loading ranked freelancers...</p>
                  ) : combinedCandidates.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {combinedCandidates.map((freelancer) => (
                        <div
                          key={`candidate-${freelancer.proposalId || freelancer.freelancerId || freelancer.freelancerEmail || freelancer.name}`}
                          className="rounded-[1.1rem] border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="inline-flex rounded-full bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
                                  #{freelancer.rank}
                                </span>
                                <h5 className="text-base font-extrabold text-slate-900">{freelancer.name}</h5>
                              </div>
                              <p className="mt-1 text-sm text-slate-600">
                                {freelancer.title || freelancer.freelancerEmail || 'Professional Freelancer'}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              {typeof freelancer.matchScore === 'number' && Number.isFinite(freelancer.matchScore) ? (
                                <p className="text-sm font-bold text-violet-700">
                                  Match Score {freelancer.matchScore}%
                                </p>
                              ) : (
                                <p className="text-sm font-bold text-slate-500">
                                  Awaiting ML match display
                                </p>
                              )}
                              <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                                freelancer.proposalStatus === 'accepted'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : freelancer.proposalStatus === 'rejected'
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-amber-100 text-amber-700'
                              }`}>
                                {String(freelancer.proposalStatus || 'pending').toUpperCase()}
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                            {(freelancer.highlights || []).length > 0 ? (
                              freelancer.highlights.map((highlight, idx) => (
                                <p key={`${freelancer.freelancerId}-${idx}`} className="rounded-lg bg-white px-2 py-1">{highlight}</p>
                              ))
                            ) : freelancer.requestedAt ? (
                              <>
                                <p className="rounded-lg bg-white px-2 py-1">
                                  Requested {formatRelativeDate(freelancer.requestedAt)}
                                </p>
                                <p className="rounded-lg bg-white px-2 py-1">
                                  PFI Score {Number(freelancer.pfiScore || 0)}
                                </p>
                              </>
                            ) : (
                              <p className="rounded-lg bg-white px-2 py-1">Promising fit for this project</p>
                            )}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              onClick={() => handleOpenInsight(freelancer)}
                              disabled={
                                insightLoadingId === String(freelancer.freelancerId) ||
                                !freelancer.freelancerId
                              }
                              className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {insightLoadingId === String(freelancer.freelancerId)
                                ? 'Loading...'
                                : 'Why this candidate'}
                            </button>

                            {freelancer.proposalStatus !== 'accepted' ? (
                              <button
                                onClick={() => handleRankedDecision(freelancer, 'accepted')}
                                disabled={!freelancer.proposalId}
                                className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Accept
                              </button>
                            ) : null}

                            {freelancer.proposalStatus !== 'rejected' && freelancer.proposalStatus !== 'accepted' ? (
                              <button
                                onClick={() => handleRankedDecision(freelancer, 'rejected')}
                                disabled={!freelancer.proposalId}
                                className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Reject
                              </button>
                            ) : null}

                            {freelancer.proposalStatus === 'accepted' ? (
                              <>
                                <button
                                  onClick={() => handleContactByEmail(freelancer)}
                                  className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-white"
                                >
                                  Contact via Email
                                </button>
                                <button
                                  onClick={() => handleMessageInPlatform(freelancer)}
                                  className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-white"
                                >
                                  Message in Platform
                                </button>
                              </>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-base text-slate-500">
                      No ranked freelancers available yet for this project.
                    </p>
                  )}

                  {mlInsightError ? (
                    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      {mlInsightError}
                    </div>
                  ) : null}

                  {mlInsight && insightFreelancer ? (
                    <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h5 className="text-sm font-extrabold text-slate-900">
                          Why {insightFreelancer.name} is a fit
                        </h5>
                      </div>

                      <div className="mt-3 grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
                        <p className="rounded-lg bg-white px-2 py-1">Candidate rank: #{mlInsight.rank}</p>
                        <p className="rounded-lg bg-white px-2 py-1">Match confidence: {(mlInsight.successProbability * 100).toFixed(1)}%</p>
                        <p className="rounded-lg bg-white px-2 py-1">Relevance: {mlInsight.relevanceLabel}</p>
                        <p className="rounded-lg bg-white px-2 py-1">Budget fit: {mlInsight.budgetFitLabel}</p>
                        <p className="rounded-lg bg-white px-2 py-1">Track record: {mlInsight.trackRecordLabel}</p>
                      </div>

                      <p className="mt-3 text-xs font-extrabold text-slate-800">
                        Assignment recommendation: {mlInsight.recommendation}
                      </p>

                      {mlInsight.strengths.length > 0 ? (
                        <p className="mt-3 text-xs text-emerald-700">
                          Strengths: {mlInsight.strengths.join(', ')}
                        </p>
                      ) : null}
                      {mlInsight.risks.length > 0 ? (
                        <p className="mt-1 text-xs text-rose-700">Risks: {mlInsight.risks.join(', ')}</p>
                      ) : null}
                    </div>
                  ) : null}

                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
