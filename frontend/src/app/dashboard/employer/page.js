'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
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
import { generateMilestones } from '@/services/api';
import { getStoredAuth } from '@/services/auth';

const STORAGE_KEY = 'synapescrow_employer_projects';
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

function loadStoredProjects() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
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

function saveStoredProjects(projects) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
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

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth) {
      setUser(auth.user);
    }

    const storedProjects = loadStoredProjects();
    setPostedProjects(storedProjects);
    saveStoredProjects(storedProjects);
  }, []);

  const projects = useMemo(() => [...postedProjects, ...sampleProjects], [postedProjects]);

  const persistPostedProjects = (updater) => {
    const nextProjects = updater(postedProjects);
    setPostedProjects(nextProjects);
    saveStoredProjects(nextProjects);

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
      handler: (response) => {
        const nextProjects = [projectRecord, ...postedProjects];
        setPostedProjects(nextProjects);
        saveStoredProjects(nextProjects);
        setPaymentSuccess({
          ...projectRecord,
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

  const handleApplicantStatus = (projectId, email, status) => {
    persistPostedProjects((currentProjects) =>
      currentProjects.map((project) => {
        if (project.id !== projectId) {
          return project;
        }

        const applicants = (project.applicants || []).map((applicant) =>
          applicant.email === email ? { ...applicant, status } : applicant
        );

        return {
          ...project,
          applicants,
          interestedCount: applicants.length
        };
      })
    );
  };

  const handleApplicantMessage = (applicant, project) => {
    if (typeof window === 'undefined' || !applicant?.email) {
      return;
    }

    const subject = encodeURIComponent(`Regarding your request for ${project.title}`);
    const body = encodeURIComponent(`Hi ${applicant.name || 'there'},\n\nI reviewed your interest in "${project.title}". Let's discuss the next steps.\n\nThanks.`);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(applicant.email)}&su=${subject}&body=${body}`;
    window.open(gmailUrl, '_blank');
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
                <button
                  key={proj.id}
                  onClick={() => setSelectedProject(proj)}
                  className="flex w-full flex-wrap items-center justify-between rounded-[1.6rem] border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:border-emerald-200 hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
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
                  </div>

                  <div className="mt-4 flex flex-col items-end gap-3 sm:mt-0">
                    <p className="text-[1.1rem] font-bold text-slate-900">{formatCurrency(proj.budget)}</p>
                    <p className="flex items-center gap-2 text-sm font-bold text-emerald-600">
                      <ShieldCheck size={15} /> {proj.escrowLabel || 'Escrow Locked'}
                    </p>
                  </div>
                </button>
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
                    <h3 className="text-lg font-extrabold">AI-Confirmed Milestones</h3>
                  </div>
                  <p className="text-sm font-extrabold text-emerald-700">
                    Escrow Locked · {formatCurrency(selectedProject.budget)}
                  </p>
                </div>

                <div className="hidden items-center gap-3 text-emerald-700">
                  <CheckCircle2 size={20} />
                  <h3 className="text-xl font-extrabold">AI-Generated Milestones</h3>
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
                  <div className="flex items-center justify-between">
                    <h4 className="text-[1.05rem] font-extrabold text-slate-900">Interested Freelancers</h4>
                    <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-emerald-100 px-2 text-sm font-bold text-emerald-600">
                      {selectedProject.applicants?.length || 0}
                    </span>
                  </div>
                  {selectedProject.applicants?.length ? (
                    <div className="mt-4 space-y-4">
                      {selectedProject.applicants.map((applicant, index) => (
                        <div key={`${applicant.email}-${index}`} className="rounded-[1.1rem] border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h5 className="text-lg font-extrabold text-slate-900">{applicant.name}</h5>
                              <p className="mt-1 text-sm font-bold text-violet-600">↗ PFI {applicant.pfiScore || 0}</p>
                              <p className="mt-1 text-sm text-slate-600">{applicant.email}</p>
                              <p className="mt-1 text-sm text-slate-400">
                                Requested: {new Date(applicant.requestedAt).toLocaleDateString()} , {new Date(applicant.requestedAt).toLocaleTimeString()}
                              </p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-sm font-bold ${
                              applicant.status === 'accepted'
                                ? 'bg-emerald-100 text-emerald-700'
                                : applicant.status === 'rejected'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-amber-100 text-amber-700'
                            }`}>
                              {String(applicant.status || 'pending').toUpperCase()}
                            </span>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-3">
                            {applicant.status !== 'accepted' ? (
                              <button
                                onClick={() => handleApplicantStatus(selectedProject.id, applicant.email, 'accepted')}
                                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
                              >
                                Accept
                              </button>
                            ) : null}
                            {applicant.status !== 'rejected' && applicant.status !== 'accepted' ? (
                              <button
                                onClick={() => handleApplicantStatus(selectedProject.id, applicant.email, 'rejected')}
                                className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-600"
                              >
                                Reject
                              </button>
                            ) : null}
                            <button
                              onClick={() => handleApplicantMessage(applicant, selectedProject)}
                              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                            >
                              Message
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-base text-slate-500">No freelancer requests yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
