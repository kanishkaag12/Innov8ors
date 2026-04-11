'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Send,
  Briefcase,
  CheckCircle2,
  Clock,
  DollarSign,
  ChevronRight,
  MessageSquare,
  FileText,
  Users,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  UserCircle,
  BriefcaseBusiness,
  Lock,
  ArrowRight,
  X
} from 'lucide-react';
import Link from 'next/link';
import { verifyMilestone, createProposal, fetchMyProposals, listProjects, releasePartialEscrow, requestPartialEscrow, fetchWallet } from '@/services/api';
import { getStoredAuth, saveAuth } from '@/services/auth';
import PFIDashboard from '@/components/PFIDashboard';

const STORAGE_KEY = 'synapescrow_employer_projects';

function loadEmployerProjects() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEmployerProjects(projects) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
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
    status: String(project?.status || 'Active'),
    employerName:
      project?.employerName ||
      project?.ownerName ||
      project?.employer_id?.name ||
      '',
    ownerName:
      project?.ownerName ||
      project?.employerName ||
      project?.employer_id?.name ||
      '',
    ownerEmail:
      project?.ownerEmail ||
      project?.employerEmail ||
      project?.employer_id?.email ||
      '',
    employerEmail:
      project?.employerEmail ||
      project?.ownerEmail ||
      project?.employer_id?.email ||
      '',
    applicants,
    interestedCount: Number(project?.interestedCount || applicants.length || 0),
    escrowLabel: project?.escrowLabel || 'Escrow Locked',
    milestones,
    source: 'backend'
  };
}

function mergeApplicants(primaryApplicants, secondaryApplicants) {
  const applicantsByEmail = new Map();

  const mergeEntry = (applicant) => {
    const email = String(applicant?.email || '').toLowerCase().trim();
    if (!email) {
      return;
    }

    const existing = applicantsByEmail.get(email) || {};
    applicantsByEmail.set(email, {
      ...existing,
      ...applicant,
      email: applicant?.email || existing?.email || '',
      repoLink: applicant?.repoLink ?? existing?.repoLink ?? '',
      selectedMilestoneTitle:
        applicant?.selectedMilestoneTitle ?? existing?.selectedMilestoneTitle ?? '',
      verificationResult:
        applicant?.verificationResult ?? existing?.verificationResult ?? null
    });
  };

  (Array.isArray(secondaryApplicants) ? secondaryApplicants : []).forEach(mergeEntry);
  (Array.isArray(primaryApplicants) ? primaryApplicants : []).forEach(mergeEntry);

  return Array.from(applicantsByEmail.values());
}

function mergeProjects(localProjects, backendProjects) {
  const projectsById = new Map();

  const mergeProject = (project, isPrimary) => {
    const key = String(project?.id || project?._id || '').trim();
    if (!key) {
      return;
    }

    const existing = projectsById.get(key);
    if (!existing) {
      projectsById.set(key, {
        ...project,
        applicants: Array.isArray(project?.applicants) ? project.applicants : []
      });
      return;
    }

    const primary = isPrimary ? project : existing;
    const secondary = isPrimary ? existing : project;

    projectsById.set(key, {
      ...secondary,
      ...primary,
      applicants: mergeApplicants(primary?.applicants, secondary?.applicants),
      milestones:
        Array.isArray(primary?.milestones) && primary.milestones.length
          ? primary.milestones
          : secondary?.milestones || [],
      interestedCount: Math.max(
        Number(primary?.interestedCount || 0),
        Number(secondary?.interestedCount || 0),
        mergeApplicants(primary?.applicants, secondary?.applicants).length
      )
    });
  };

  (Array.isArray(localProjects) ? localProjects : []).forEach((project) => mergeProject(project, false));
  (Array.isArray(backendProjects) ? backendProjects : []).forEach((project) => mergeProject(project, true));

  return Array.from(projectsById.values());
}

function applyProposalStatusToProjects(projects, proposals, currentUser) {
  const userEmail = String(currentUser?.email || '').toLowerCase();
  if (!userEmail) {
    return projects;
  }

  const proposalByProjectId = new Map(
    (Array.isArray(proposals) ? proposals : [])
      .filter((proposal) => String(proposal?.freelancerEmail || '').toLowerCase() === userEmail)
      .map((proposal) => [String(proposal?.projectId || ''), proposal])
  );

  return (Array.isArray(projects) ? projects : []).map((project) => {
    const projectId = String(project?.id || project?._id || '');
    const proposal = proposalByProjectId.get(projectId);
    const applicants = Array.isArray(project?.applicants) ? [...project.applicants] : [];
    const applicantIndex = applicants.findIndex(
      (applicant) => String(applicant?.email || '').toLowerCase() === userEmail
    );

    if (!proposal && applicantIndex < 0) {
      return {
        ...project,
        applicants,
        interestedCount: applicants.length
      };
    }

    const nextApplicant = {
      ...(applicantIndex >= 0 ? applicants[applicantIndex] : {}),
      name: applicants[applicantIndex]?.name || currentUser?.name || 'Freelancer',
      email: currentUser?.email || applicants[applicantIndex]?.email || '',
      proposalId: proposal?._id || applicants[applicantIndex]?.proposalId || null,
      status: String(proposal?.status || applicants[applicantIndex]?.status || 'pending').toLowerCase(),
      acceptedByName:
        proposal?.employerName ||
        applicants[applicantIndex]?.acceptedByName ||
        project?.ownerName ||
        project?.employerName ||
        '',
      acceptedAt: proposal?.updatedAt || applicants[applicantIndex]?.acceptedAt || null,
      conversationId: proposal?.conversationId || applicants[applicantIndex]?.conversationId || null
    };

    if (applicantIndex >= 0) {
      applicants[applicantIndex] = nextApplicant;
    } else {
      applicants.push(nextApplicant);
    }

    return {
      ...project,
      applicants,
      interestedCount: applicants.length
    };
  });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number(amount || 0));
}

function formatPostedDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return 'Recently posted';
  }

  return `Posted ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
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

function getVerificationTone(status) {
  const value = String(status || '').toLowerCase();
  if (value.includes('fully')) {
    return {
      badge: 'bg-emerald-100 text-emerald-700',
      panel: 'border-emerald-200 bg-emerald-50',
      heading: 'Fully completed and ready for payout.',
      helper: 'The submitted repository satisfies this milestone and can trigger an immediate release.'
    };
  }
  if (value.includes('partially')) {
    return {
      badge: 'bg-amber-100 text-amber-700',
      panel: 'border-amber-200 bg-amber-50',
      heading: 'Partially completed and needs review.',
      helper: 'The agent found meaningful progress, but this milestone still needs feedback or a pro-rated release.'
    };
  }
  return {
    badge: 'bg-rose-100 text-rose-700',
    panel: 'border-rose-200 bg-rose-50',
    heading: 'Milestone requirements were not met.',
    helper: 'The agent could not verify enough implementation to satisfy this milestone and recommends employer refund handling.'
  };
}

function normalizeVerificationResult(result) {
  if (!result) {
    return null;
  }

  const completionValue = Number(
    result?.completion_percentage ?? result?.completion ?? result?.completionPercentage ?? 0
  );
  const completion = Number.isFinite(completionValue) ? Math.min(100, Math.max(0, Math.round(completionValue))) : 0;
  const rawStatus = String(result?.status ?? result?.result ?? '').toLowerCase().trim();

  let status = 'Unmet';
  if (rawStatus.includes('fully')) {
    status = 'Fully Completed';
  } else if (rawStatus.includes('partial')) {
    status = 'Partially Completed';
  } else if (rawStatus.includes('unmet') || rawStatus.includes('not completed') || rawStatus.includes('incomplete')) {
    status = 'Unmet';
  } else if (!rawStatus) {
    if (completion >= 85) {
      status = 'Fully Completed';
    } else if (completion >= 25) {
      status = 'Partially Completed';
    }
  }

  let recommendedAction = String(
    result?.recommended_action ?? result?.recommendedAction ?? ''
  ).trim();

  if (!recommendedAction) {
    recommendedAction =
      status === 'Fully Completed'
        ? 'Trigger immediate payment'
        : status === 'Partially Completed'
          ? 'Trigger feedback or pro-rated release'
          : 'Initiate employer refund protocol';
  }

  const assessment = String(
    result?.assessment ?? result?.ai_assessment ?? result?.short_explanation ?? ''
  ).trim();

  return {
    ...result,
    status,
    completion_percentage: completion,
    recommended_action: recommendedAction,
    assessment
  };
}

export default function FreelancerDashboardPage() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [requestingProjectId, setRequestingProjectId] = useState(null);
  const [repoLink, setRepoLink] = useState('');
  const [selectedMilestoneTitle, setSelectedMilestoneTitle] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [isReleasingPayment, setIsReleasingPayment] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState('');

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth) {
      setUser(auth.user);
    }

    const syncWithBackend = async () => {
      const localProjects = loadEmployerProjects();

      if (!auth?.token || !auth?.user) {
        setProjects(localProjects);
        return;
      }

      try {
        const userId = auth.user.id || auth.user._id;
        const [proposalResponse, projectResponse, walletRes] = await Promise.all([
          fetchMyProposals(auth.token),
          listProjects({}, auth.token),
          fetchWallet(userId, auth.token)
        ]);

        if (walletRes.data) {
          const updatedUser = { 
            ...auth.user, 
            balance: walletRes.data.balance, 
            escrowLocked: walletRes.data.escrowLocked 
          };
          setUser(updatedUser);
          saveAuth({ token: auth.token, user: updatedUser });
        }

        const proposals = Array.isArray(proposalResponse?.data?.proposals) ? proposalResponse.data.proposals : [];
        const backendProjects = Array.isArray(projectResponse?.data?.projects)
          ? projectResponse.data.projects.map(normalizeBackendProject)
          : [];
        const visibleProjects = mergeProjects(localProjects, backendProjects);
        const mergedProjects = applyProposalStatusToProjects(visibleProjects, proposals, auth.user);
        setProjects(mergedProjects);
        setSelectedProject((current) =>
          current ? mergedProjects.find((project) => project.id === current.id) || null : null
        );
        saveEmployerProjects(mergedProjects);
      } catch {
        setProjects(localProjects);
        setSelectedProject((current) =>
          current ? localProjects.find((project) => project.id === current.id) || null : null
        );
      }
    };

    syncWithBackend();

    const syncProjects = () => {
      syncWithBackend();
    };

    const intervalId = window.setInterval(syncWithBackend, 10000);

    window.addEventListener('storage', syncProjects);
    window.addEventListener('focus', syncProjects);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('storage', syncProjects);
      window.removeEventListener('focus', syncProjects);
    };
  }, []);

  const stats = useMemo(() => {
    return [
      { label: 'Active Contracts', value: String(projects.length), icon: BriefcaseBusiness, trend: projects.length ? `+${projects.length}` : '0', color: 'bg-blue-500' },
      { label: 'Pending Reviews', value: '0', icon: Clock, trend: '0', color: 'bg-amber-500' },
      { label: 'Total Earnings', value: formatCurrency(user?.balance || 0), icon: TrendingUp, trend: '0%', color: 'bg-emerald-500' },
      { label: 'Escrow Locked', value: formatCurrency(user?.escrowLocked || 0), icon: ShieldCheck, trend: 'Stable', color: 'bg-indigo-500' }
    ];
  }, [projects, user]);

  const selectedProjectRequest = useMemo(() => {
    if (!selectedProject || !user) {
      return null;
    }

    return (selectedProject.applicants || []).find(
      (applicant) => applicant.email === user.email
    ) || null;
  }, [selectedProject, user]);

  const normalizedVerificationResult = useMemo(
    () => normalizeVerificationResult(selectedProjectRequest?.verificationResult),
    [selectedProjectRequest]
  );

  const selectedRequestStatus = String(
    selectedProjectRequest?.status || selectedProjectRequest?.proposalStatus || ''
  ).toLowerCase();

  const acceptedByName =
    selectedProjectRequest?.acceptedByName ||
    selectedProjectRequest?.employerName ||
    selectedProject?.ownerName ||
    selectedProject?.employerName ||
    'the client';

  useEffect(() => {
    if (!selectedProject) {
      setRepoLink('');
      setSelectedMilestoneTitle('');
      setVerificationError('');
      setIsVerifying(false);
      return;
    }

    const request = (selectedProject.applicants || []).find(
      (applicant) => applicant.email === user?.email
    );

    setRepoLink(request?.repoLink || '');
    setSelectedMilestoneTitle(request?.selectedMilestoneTitle || selectedProject.milestones?.[0]?.title || '');
    setVerificationError('');
  }, [selectedProject, user]);

  const handleRequestToJoin = async () => {
    if (!selectedProject || !user) {
      return;
    }

    setRequestingProjectId(selectedProject.id);

    let proposalId = null;
    const auth = getStoredAuth();
    const token = auth?.token;
    console.log('📝 Submitting proposal for project:', selectedProject.id, 'with freelancer:', user.email);

    if (token) {
      try {
        const response = await createProposal(
          {
            projectId: selectedProject.id,
            projectTitle: selectedProject.title,
            employerEmail: selectedProject.ownerEmail,
            employerName: selectedProject.ownerName
          },
          token
        );
        proposalId = response?.data?.proposal?._id || null;
        console.log('✅ Proposal created with ID:', proposalId, 'full response:', response.data);
      } catch (error) {
        console.warn('❌ Unable to create backend proposal:', error?.response?.data || error?.message || error);
      }
    } else {
      console.warn('❌ No auth token available');
    }

    window.setTimeout(() => {
      const nextProjects = projects.map((project) => {
        if (project.id !== selectedProject.id) {
          return project;
        }

        const applicants = Array.isArray(project.applicants) ? [...project.applicants] : [];
        const existingIndex = applicants.findIndex((applicant) => applicant.email === user.email);
        const requestPayload = {
          name: user.name || 'Freelancer',
          email: user.email || '',
          status: 'pending',
          requestedAt: new Date().toISOString(),
          pfiScore: 0,
          proposalId
        };
        console.log('📝 Storing applicant payload:', requestPayload);

        if (existingIndex >= 0) {
          applicants[existingIndex] = {
            ...applicants[existingIndex],
            ...requestPayload
          };
        } else {
          applicants.push(requestPayload);
        }

        return {
          ...project,
          applicants,
          interestedCount: applicants.length
        };
      });

      setProjects(nextProjects);
      saveEmployerProjects(nextProjects);
      const updatedSelectedProject = nextProjects.find((project) => project.id === selectedProject.id) || null;
      setSelectedProject(updatedSelectedProject);
      setRequestingProjectId(null);
    }, 900);
  };

  const updateProjectApplicant = (projectId, applicantEmail, updater) => {
    const nextProjects = projects.map((project) => {
      if (project.id !== projectId) {
        return project;
      }

      const applicants = (project.applicants || []).map((applicant) =>
        applicant.email === applicantEmail ? updater(applicant, project) : applicant
      );

      return {
        ...project,
        applicants,
        interestedCount: applicants.length
      };
    });

    setProjects(nextProjects);
    saveEmployerProjects(nextProjects);
    setSelectedProject(nextProjects.find((project) => project.id === projectId) || null);
  };

  const handleRunVerification = async () => {
    if (!selectedProject || !user || !repoLink.trim() || !selectedMilestoneTitle) {
      setVerificationError('Add a GitHub repo link and select a milestone first.');
      return;
    }

    const gitHubRepoRegex = /^https:\/\/github\.com\/[^\/]+\/[^\/]+(?:\/.*)?$/i;
    if (!gitHubRepoRegex.test(repoLink.trim())) {
      setVerificationError('Invalid GitHub repository URL format. Use https://github.com/owner/repo.');
      return;
    }

    const milestone = (selectedProject.milestones || []).find((item) => item.title === selectedMilestoneTitle);
    if (!milestone) {
      setVerificationError('Selected milestone could not be found.');
      return;
    }

    try {
      setIsVerifying(true);
      setVerificationError('');
      updateProjectApplicant(selectedProject.id, user.email, (applicant) => ({
        ...applicant,
        repoLink: repoLink.trim(),
        selectedMilestoneTitle,
        verificationResult: null
      }));

      const response = await verifyMilestone({
        repoLink: repoLink.trim(),
        projectTitle: selectedProject.title,
        milestone: `${milestone.title}\nDescription: ${milestone.description}\nDeliverable: ${milestone.deliverable}`
      });

      updateProjectApplicant(selectedProject.id, user.email, (applicant) => ({
        ...applicant,
        repoLink: repoLink.trim(),
        selectedMilestoneTitle,
        verificationResult: response.data?.result || null
      }));
    } catch (error) {
      updateProjectApplicant(selectedProject.id, user.email, (applicant) => ({
        ...applicant,
        repoLink: repoLink.trim(),
        selectedMilestoneTitle,
        verificationResult: null
      }));
      setVerificationError(error?.response?.data?.error || 'Quality verification failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReleasePayment = async () => {
    if (!selectedProject || !user || !selectedMilestoneTitle) return;
    const milestone = (selectedProject.milestones || []).find((item) => item.title === selectedMilestoneTitle);
    if (!milestone) return;

    try {
      setIsReleasingPayment(true);
      setPaymentMessage('');
      const auth = getStoredAuth();
      const payload = {
        projectId: selectedProject.id || selectedProject._id,
        amountToRelease: milestone.payment_amount || 0
      };
      
      const response = await releasePartialEscrow(payload, auth?.token);
      setPaymentMessage('Payment released successfully! Funds added to your wallet.');
    } catch (error) {
      setPaymentMessage(error?.response?.data?.error || 'Failed to release payment.');
    } finally {
      setIsReleasingPayment(false);
    }
  };

  const handleRequestPartialPayment = async () => {
    if (!selectedProject || !user || !selectedMilestoneTitle) return;
    const milestone = (selectedProject.milestones || []).find((item) => item.title === selectedMilestoneTitle);
    if (!milestone) return;

    try {
      setIsReleasingPayment(true);
      setPaymentMessage('');
      const auth = getStoredAuth();
      
      const applicant = (selectedProject.applicants || []).find(a => a.email === user.email);
      const completionPercentage = applicant?.verificationResult?.completion_percentage || 0;

      const payload = {
        projectId: selectedProject.id || selectedProject._id,
        milestoneId: milestone._id || milestone.id,
        completionPercentage
      };
      
      await requestPartialEscrow(payload, auth?.token);
      setPaymentMessage(`Partial payment (${completionPercentage}%) requested successfully! The client will review your request.`);
    } catch (error) {
      setPaymentMessage(error?.response?.data?.error || 'Failed to request payment.');
    } finally {
      setIsReleasingPayment(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-0 py-4 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 px-8 py-12 text-white shadow-2xl">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute left-0 bottom-0 -ml-16 -mb-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Welcome, {user?.name || 'Freelancer'}!
          </h1>
          <p className="mt-4 text-xl text-slate-300 font-medium">
            Your next big opportunity is waiting. Explore jobs and build your reputation.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <button className="flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 font-bold text-white shadow-lg transition hover:bg-emerald-600 hover:scale-105 active:scale-95">
              <Sparkles size={18} />
              Find work with AI
            </button>
            <button className="rounded-full bg-white/10 px-6 py-3 font-bold text-white backdrop-blur-sm transition hover:bg-white/20">
              Boost my profile
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
        <PFIDashboard />
      </section>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="group rounded-2xl bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md hover:border-emerald-100">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-xl ${stat.color} bg-opacity-10 text-white`}>
                <stat.icon className={`h-5 w-5 ${stat.color.replace('bg-', 'text-')}`} />
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stat.trend.includes('+') ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {stat.trend}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-sm font-medium text-slate-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Active Projects */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <h2 className="text-2xl font-bold text-slate-900">Your Active Projects</h2>
            <Link href="#" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              View all <ChevronRight size={16} />
            </Link>
          </div>

          <div className="space-y-4">
            {projects.length === 0 ? (
              <div className="rounded-2xl border border-slate-100 bg-white p-6 text-sm text-slate-500 shadow-sm">
                No real client projects yet. New employer-posted jobs will appear here automatically.
              </div>
            ) : projects.map((proj) => (
              <div key={proj.id} className="flex flex-wrap items-center justify-between rounded-2xl bg-white p-6 shadow-sm border border-slate-100 transition hover:border-emerald-200">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <Briefcase size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg hover:text-emerald-600 cursor-pointer">{proj.title}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-sm text-slate-500 font-medium flex items-center gap-1">
                        <Users size={14} /> {proj.employerName || 'Client'}
                      </p>
                      <span className="text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-bold">{proj.status || 'Active'}</span>
                      <span className="text-xs text-slate-400 font-medium">{formatPostedDate(proj.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 mt-4 sm:mt-0">
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(proj.budget)}</p>
                  <p className="text-xs font-bold text-orange-500 flex items-center gap-1">
                    <Clock size={12} /> Latest employer posting
                  </p>
                  <button
                    onClick={() => setSelectedProject(proj)}
                    className="text-xs font-bold text-slate-400 hover:text-emerald-600 transition"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <ArrowUpRight size={18} className="text-emerald-600" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <button className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-sm transition group">
                <div className="flex items-center gap-3">
                  <Send size={18} className="text-slate-400 group-hover:text-emerald-600" />
                  Submit Your Work
                </div>
                <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <button className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-sm transition group">
                <div className="flex items-center gap-3">
                  <MessageSquare size={18} className="text-slate-400 group-hover:text-emerald-600" />
                  Check Messages
                </div>
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">2</span>
              </button>
              <button className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-sm transition group">
                <div className="flex items-center gap-3">
                  <Lock size={18} className="text-slate-400 group-hover:text-emerald-600" />
                  Escrow Balance
                </div>
                <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-lg overflow-hidden relative">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 bg-white/10 rounded-full blur-2xl" />
            <h3 className="text-lg font-bold mb-2">Build Influence</h3>
            <p className="text-sm text-emerald-100 mb-6">Complete your profile to 100% and get noticed by premium clients.</p>
            <button className="w-full bg-white text-emerald-700 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-50 transition shadow-sm">
              Complete Profile
            </button>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Onboarding Completion</h3>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
              <span>Profile Progress</span>
              <span className="text-emerald-600">65%</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '65%' }} />
            </div>
            <p className="mt-4 text-xs text-slate-500 font-medium">Add skills and category to reach 100%.</p>
          </div>
        </div>
      </div>
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
                    <h3 className="text-lg font-extrabold">AI-Confirmed Milestones</h3>
                  </div>
                  <p className="text-sm font-extrabold text-emerald-700">
                    Escrow Locked · {formatCurrency(
                      selectedProject.milestones?.reduce((sum, m) => sum + (m.amount_remaining !== undefined ? m.amount_remaining : m.payment_amount), 0) || selectedProject.budget
                    )}
                  </p>
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
                          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                            <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Total Budget</p>
                            <p className="mt-2 text-base font-extrabold text-emerald-700">{formatCurrency(milestone.payment_amount)}</p>
                            {(milestone.amount_paid > 0 || milestone.payment_status === 'partially_paid') && (
                              <div className="mt-2 space-y-1 pt-2 border-t border-slate-200">
                                <div className="flex justify-between text-[10px] font-bold">
                                  <span className="text-slate-500">AMOUNT RECEIVED</span>
                                  <span className="text-emerald-600">{formatCurrency(milestone.amount_paid)}</span>
                                </div>
                                <div className="flex justify-between text-[10px] font-bold">
                                  <span className="text-slate-500">LEFT STATUS</span>
                                  <span className="text-slate-700">{formatCurrency(milestone.amount_remaining)}</span>
                                </div>
                              </div>
                            )}
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
                {selectedRequestStatus === 'pending' ? (
                  <div className="rounded-[1.2rem] border border-amber-200 bg-amber-50 p-5">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 text-amber-500">
                        <Clock size={20} />
                      </div>
                      <div>
                        <h4 className="text-[1.05rem] font-extrabold text-amber-700">Request Pending</h4>
                        <p className="mt-2 text-base text-amber-700/80">
                          Waiting for employer to review your request. GitHub submission unlocks once accepted.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : selectedRequestStatus === 'accepted' ? (
                  <>
                    <div className="rounded-[1.2rem] border border-emerald-200 bg-emerald-50 p-5">
                      <div className="flex items-start gap-4">
                        <div className="mt-1 text-emerald-500">
                          <CheckCircle2 size={20} />
                        </div>
                        <div>
                          <h4 className="text-[1.05rem] font-extrabold text-emerald-700">Your request was accepted!</h4>
                          <p className="mt-2 text-base text-emerald-700/80">
                            Accepted by {acceptedByName}. You can now submit your work using the GitHub verification below and continue the conversation with the client.
                          </p>
                        </div>
                      </div>
                      <div className="mt-5">
                        <Link href="/dashboard/messages" className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-base font-bold text-white transition hover:bg-emerald-700">
                          <MessageSquare size={18} />
                          Open Project Chat
                        </Link>
                      </div>
                    </div>

                    <div className="rounded-[1.2rem] border border-slate-200 bg-white p-5">
                      <div>
                        <label className="mb-2 block text-[1.05rem] font-bold text-slate-900">GitHub Repository Link</label>
                        <input
                          value={repoLink}
                          onChange={(event) => {
                            setRepoLink(event.target.value);
                            setVerificationError('');
                          }}
                          placeholder="https://github.com/owner/repo"
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none transition focus:border-emerald-400"
                        />
                      </div>

                      <div className="mt-5">
                        <label className="mb-2 block text-[1.05rem] font-bold text-slate-900">Milestone Requirement For Verification</label>
                        <select
                          value={selectedMilestoneTitle}
                          onChange={(event) => {
                            setSelectedMilestoneTitle(event.target.value);
                            setVerificationError('');
                          }}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base outline-none transition focus:border-emerald-400"
                        >
                          {(selectedProject.milestones || []).map((milestone) => (
                            <option key={milestone.title} value={milestone.title}>
                              {milestone.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={handleRunVerification}
                        disabled={isVerifying}
                        className="mt-5 rounded-2xl bg-emerald-500 px-6 py-3 text-base font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isVerifying ? 'Running Verification...' : 'Run Quality Verification'}
                      </button>
                    </div>

                    {verificationError ? (
                      <div className="rounded-[1.2rem] border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-600">
                        {verificationError}
                      </div>
                    ) : null}

                    {normalizedVerificationResult ? (
                      <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-5">
                        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">Verification Result</p>
                        <div className={`mt-4 rounded-2xl border p-4 ${getVerificationTone(normalizedVerificationResult.status).panel}`}>
                          <div className="flex flex-wrap items-center gap-3">
                            <span className={`rounded-full px-3 py-1 text-sm font-bold ${getVerificationTone(normalizedVerificationResult.status).badge}`}>
                              {normalizedVerificationResult.status}
                            </span>
                            <p className="text-sm font-bold text-slate-900">
                              {getVerificationTone(normalizedVerificationResult.status).heading}
                            </p>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {getVerificationTone(normalizedVerificationResult.status).helper}
                          </p>
                        </div>
                        <div className="mt-4 grid gap-4 md:grid-cols-3">
                          <div className="rounded-2xl bg-white p-4">
                            <p className="text-sm font-extrabold text-slate-400">Status</p>
                            <p className="mt-2 text-[1.05rem] font-extrabold text-slate-900">{normalizedVerificationResult.status}</p>
                          </div>
                          <div className="rounded-2xl bg-white p-4">
                            <p className="text-sm font-extrabold text-slate-400">Completion</p>
                            <p className="mt-2 text-[1.05rem] font-extrabold text-slate-900">{normalizedVerificationResult.completion_percentage}%</p>
                          </div>
                          <div className="rounded-2xl bg-white p-4">
                            <p className="text-sm font-extrabold text-slate-400">Recommended Action</p>
                            <p className="mt-2 text-[1.05rem] font-extrabold text-slate-900">{normalizedVerificationResult.recommended_action}</p>
                          </div>
                        </div>
                        <div className="mt-4 rounded-2xl bg-white p-4">
                          <p className="text-sm font-extrabold text-slate-400">AI Assessment</p>
                          <p className="mt-2 text-base leading-7 text-slate-700">{normalizedVerificationResult.assessment || normalizedVerificationResult.short_explanation}</p>
                        </div>
                        <div className="mt-6 flex flex-col gap-4">
                          {paymentMessage && (
                            <div className={`rounded-[1.2rem] border p-4 text-sm font-semibold ${paymentMessage.includes('success') ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-600'}`}>
                              {paymentMessage}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-4">
                            {normalizedVerificationResult.status === 'Fully Completed' && (
                              <button 
                                onClick={handleReleasePayment}
                                disabled={isReleasingPayment}
                                className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 font-bold text-white shadow-lg transition hover:bg-emerald-600 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                <CheckCircle2 size={18} />
                                {isReleasingPayment ? 'Releasing...' : 'Release Milestone Payment'}
                              </button>
                            )}
                            {normalizedVerificationResult.status === 'Partially Completed' && (
                              <button 
                                onClick={handleRequestPartialPayment}
                                disabled={isReleasingPayment}
                                className="flex items-center gap-2 rounded-2xl bg-amber-500 px-6 py-3 font-bold text-white shadow-lg transition hover:bg-amber-600 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                <DollarSign size={18} />
                                {isReleasingPayment ? 'Requesting...' : 'Request Partial Payout'}
                              </button>
                            )}
                            <button className="flex items-center gap-2 rounded-2xl bg-slate-100 px-6 py-3 font-bold text-slate-700 transition hover:bg-slate-200">
                              <MessageSquare size={18} />
                              Submit Feedback
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="flex flex-col gap-4 rounded-[1.2rem] border border-slate-200 bg-white p-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h4 className="text-[1.05rem] font-extrabold text-slate-900">Interested in this project?</h4>
                      <p className="mt-2 text-base text-slate-500">Send a request so employer can review your interest.</p>
                    </div>
                    <button
                      onClick={handleRequestToJoin}
                      disabled={requestingProjectId === selectedProject.id || selectedRequestStatus === 'accepted'}
                      className="rounded-2xl bg-emerald-500 px-6 py-3 text-base font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {requestingProjectId === selectedProject.id
                        ? 'Sending...'
                        : selectedRequestStatus === 'accepted'
                          ? 'Request Accepted'
                          : 'Request to Join Project'}
                    </button>
                  </div>
                )}

                <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 text-slate-400">
                      <Lock size={20} />
                    </div>
                    <div>
                      <h4 className="text-[1.05rem] font-extrabold text-slate-900">
                        {selectedRequestStatus === 'accepted' ? 'GitHub Submission Unlocked' : 'GitHub Submission Locked'}
                      </h4>
                      <p className="mt-2 text-base text-slate-500">
                        {selectedRequestStatus === 'accepted'
                          ? 'Employer accepted your request. You can now coordinate and prepare your submission workflow.'
                          : 'Employer must accept your request before you can submit work and run AI verification.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
