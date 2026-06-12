'use client';

import { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Inbox, X, Sparkles, CheckCircle2, AlertTriangle, XCircle, Github, Play } from 'lucide-react';
import {
  fetchFreelancerDashboardSummary,
  fetchPFIByMe,
  fetchPFISuggestionsByMe,
  getJobMatches,
  fetchProjectMilestones,
  submitMilestone,
  verifyMilestone
} from '@/services/api';
import { getStoredAuth } from '@/services/auth';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { WelcomeBanner } from '@/components/dashboard/WelcomeBanner';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { PFIWidget } from '@/components/dashboard/PFIWidget';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import { ActiveProjectsSection } from '@/components/dashboard/ActiveProjectsSection';
import { AIAssistantPanel } from '@/components/dashboard/AIAssistantPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import SubmissionForm from '@/components/SubmissionForm';

const defaultState = {
  userName: 'Freelancer',
  summary: null,
  pfi: null,
  pfiSuggestions: [],
  recommendedJobs: [],
  loading: true,
  error: ''
};

function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 lg:px-8">
      <Skeleton className="h-48 w-full rounded-3xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}

export default function FreelancerDashboardPage() {
  const [state, setState] = useState(defaultState);
  const [selectedProject, setSelectedProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [milestonesLoading, setMilestonesLoading] = useState(false);
  const [milestonesError, setMilestonesError] = useState('');
  const [submittingMilestoneId, setSubmittingMilestoneId] = useState('');
  const [submissionMessage, setSubmissionMessage] = useState('');

  // Verification states
  const [repoLink, setRepoLink] = useState('');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [verificationError, setVerificationError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const auth = getStoredAuth();
        const token = auth?.token;

        if (!token) {
          setState((prev) => ({ ...prev, loading: false, error: 'Please login to view your dashboard.' }));
          return;
        }

        const [summaryRes, pfiRes, pfiSuggestionsRes, jobMatchRes] = await Promise.all([
          fetchFreelancerDashboardSummary(token),
          fetchPFIByMe(token),
          fetchPFISuggestionsByMe(token).catch(() => null),
          getJobMatches({ limit: 5 }, token).catch(() => null)
        ]);

        const summary = summaryRes?.data?.data || null;
        const pfi = pfiRes?.data?.data || null;

        const pfiSuggestions = (pfiSuggestionsRes?.data?.data?.suggestions || [])
          .map((item) => item?.title || item?.description)
          .filter(Boolean);

        // Pass full job objects (with matchScore, overlappingSkills, missingSkills)
        const recommendedJobs = (jobMatchRes?.data?.matches || []).slice(0, 5);

        setState({
          userName: auth?.user?.name || 'Freelancer',
          summary,
          pfi,
          pfiSuggestions,
          recommendedJobs,
          loading: false,
          error: ''
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error?.response?.data?.message || 'Failed to load freelancer dashboard.'
        }));
      }
    };

    run();
  }, []);

  const handleProjectClick = async (project) => {
    setSelectedProject(project);
    setMilestonesLoading(true);
    setMilestonesError('');
    setSubmissionMessage('');
    setVerificationResult(null);
    setVerificationError('');
    setSelectedMilestoneId('');
    try {
      const auth = getStoredAuth();
      const res = await fetchProjectMilestones(project.id, auth?.token);
      const list = res.data?.milestones || [];
      setMilestones(list);
      // Auto-select first pending milestone if available
      const active = list.find(m => m.status !== 'completed');
      if (active) {
        setSelectedMilestoneId(active._id);
      }
    } catch (err) {
      console.error('Failed to load milestones:', err);
      setMilestonesError(err.response?.data?.message || 'Failed to load milestones for this project.');
    } finally {
      setMilestonesLoading(false);
    }
  };

  const handleRunVerification = async () => {
    if (!repoLink.trim()) {
      setVerificationError('Please enter a GitHub repository URL.');
      return;
    }
    if (!selectedMilestoneId) {
      setVerificationError('Please select a milestone to verify.');
      return;
    }

    const milestoneObj = milestones.find(m => m._id === selectedMilestoneId);
    if (!milestoneObj) return;

    setVerificationLoading(true);
    setVerificationError('');
    setVerificationResult(null);

    const payload = {
      repoLink: repoLink.trim(),
      milestone: milestoneObj.description,
      projectTitle: selectedProject.title,
      projectId: selectedProject.id || selectedProject._id,
      milestoneId: milestoneObj._id
    };

    try {
      const res = await verifyMilestone(payload);
      if (res.data?.success) {
        setVerificationResult(res.data.result);
        
        // Refresh milestones list to display updated status
        const auth = getStoredAuth();
        const refreshedRes = await fetchProjectMilestones(selectedProject.id || selectedProject._id, auth?.token);
        setMilestones(refreshedRes.data?.milestones || []);
      } else {
        setVerificationError(res.data?.error || 'Verification failed');
      }
    } catch (err) {
      console.error('Verification error:', err);
      if (err.response?.data?.result) {
        setVerificationResult(err.response.data.result);
      }
      setVerificationError(err.response?.data?.error || err.response?.data?.message || 'Failed to run verification.');
    } finally {
      setVerificationLoading(false);
    }
  };

  const handleSubmitMilestone = async (milestoneId, payload) => {
    setSubmittingMilestoneId(milestoneId);
    setSubmissionMessage('');
    try {
      await submitMilestone(milestoneId, payload);
      setMilestones((prev) =>
        prev.map((item) =>
          item._id === milestoneId
            ? { ...item, status: 'submitted' }
            : item
        )
      );
      setSubmissionMessage('Milestone work submitted successfully!');
    } catch (err) {
      console.error('Milestone submission failed:', err);
      setSubmissionMessage(err.response?.data?.message || 'Failed to submit milestone deliverables.');
    } finally {
      setSubmittingMilestoneId('');
    }
  };

  const missingSkills = useMemo(() => {
    // Derive missing skills from the lowest-match recommended job gap
    const jobs = state.recommendedJobs;
    if (!Array.isArray(jobs) || jobs.length === 0) return [];
    const topJob = jobs[0];
    if (typeof topJob === 'string') return [];
    return topJob?.missingSkills?.slice(0, 3) || [];
  }, [state.recommendedJobs]);

  const proposalTips = useMemo(
    () => [
      'Open with one quantified outcome from your past work.',
      'Reference the client scope directly in your first 2 lines.',
      'Suggest one milestone plan to reduce delivery risk.'
    ],
    []
  );

  if (state.loading) {
    return <DashboardLoading />;
  }

  if (state.error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <Card>
          <CardContent className="py-8 text-center text-sm text-rose-600">{state.error}</CardContent>
        </Card>
      </div>
    );
  }

  const summary = state.summary;
  const stats = summary?.quickStats;
  const pfi = state.pfi || {};

  return (
    <DashboardLayout
      sidebar={
        <>
          <OnboardingChecklist
            items={summary?.onboarding?.checklist || []}
            progress={Number(summary?.onboarding?.progress || 0)}
          />

          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2"><MessageSquare size={16} /> Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-900">{summary?.messages?.unreadCount || 0}</p>
              <p className="mt-1 text-sm text-slate-500">Unread Messages</p>
              {(summary?.messages?.unreadCount || 0) === 0 ? (
                <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-2"><Inbox size={14} /> No messages yet.</span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <AIAssistantPanel
            profileSuggestions={state.pfiSuggestions}
            missingSkills={missingSkills}
            recommendedJobs={state.recommendedJobs}
            proposalTips={proposalTips}
          />
        </>
      }
    >
      <WelcomeBanner name={state.userName} />
      <StatsCards stats={stats} />
      <PFIWidget
        score={Number(pfi?.score || stats?.pfiScore || 0)}
        status={String(pfi?.status || stats?.pfiStatus || 'Getting Started')}
        factors={pfi?.factor_breakdown || {}}
      />
      <ActiveProjectsSection projects={summary?.activeProjects || []} onProjectClick={handleProjectClick} />

      {selectedProject ? (
        <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[3px] flex items-center justify-center p-4 transition-opacity duration-300">
          <div className="flex h-[90vh] w-full max-w-3xl flex-col bg-white shadow-2xl rounded-[28px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5 bg-slate-50/50">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Project Workspace</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">{selectedProject.title}</h2>
                <p className="mt-2 text-sm text-slate-500 font-medium">
                  Client: {selectedProject.employerName} • <span className="text-emerald-700 font-semibold">Budget: ₹{new Intl.NumberFormat('en-IN').format(selectedProject.budget || 0)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 pb-24">
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Project Description</h3>
                <div className="mt-2.5 rounded-2xl border border-slate-100 bg-slate-50/30 p-4 text-sm leading-6 text-slate-600 max-h-48 overflow-y-auto">
                  {selectedProject.description || 'No description provided.'}
                </div>
              </section>

              {/* Milestones Info Card style */}
              <section className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">AI-Confirmed Milestones</h3>
                {milestonesLoading ? (
                  <div className="text-sm text-slate-500 py-4">Loading project milestones...</div>
                ) : milestonesError ? (
                  <div className="text-sm text-rose-600 py-4">{milestonesError}</div>
                ) : (
                  <div className="space-y-4">
                    {milestones.map((milestone) => (
                      <div key={milestone._id} className="rounded-2xl border border-emerald-100 bg-emerald-50/20 p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-slate-900">{milestone.title}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{milestone.description}</p>
                          </div>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
                            milestone.status === 'completed' || milestone.payment_status === 'paid'
                              ? 'bg-emerald-100 text-emerald-700'
                              : milestone.status === 'submitted' || milestone.payment_status === 'requested'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {milestone.status === 'completed' || milestone.payment_status === 'paid' ? 'Completed' : milestone.status || 'Pending'}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3 grid-cols-4 bg-white/70 p-3 rounded-xl border border-emerald-100/50">
                          <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400">Payable Amount</p>
                            <p className="mt-1 text-sm font-bold text-emerald-700">₹{new Intl.NumberFormat('en-IN').format(milestone.payment_amount || 0)}</p>
                            {(milestone.amount_paid > 0 || milestone.payment_status === 'partially_paid' || milestone.payment_status === 'paid') && (
                              <div className="mt-2 space-y-1 pt-1.5 border-t border-slate-200">
                                <div className="flex justify-between text-[9px] font-extrabold">
                                  <span className="text-slate-400">PAID</span>
                                  <span className="text-emerald-600">₹{new Intl.NumberFormat('en-IN').format(milestone.amount_paid || 0)}</span>
                                </div>
                                <div className="flex justify-between text-[9px] font-extrabold">
                                  <span className="text-slate-400">LEFT</span>
                                  <span className="text-slate-700">₹{new Intl.NumberFormat('en-IN').format(milestone.amount_remaining !== undefined ? milestone.amount_remaining : Math.max(0, (milestone.payment_amount || 0) - (milestone.amount_paid || 0)))}</span>
                                </div>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400">Expected Deliverable</p>
                            <p className="mt-1 text-xs text-slate-600 line-clamp-1">{milestone.deliverable}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400">Estimated Time</p>
                            <p className="mt-1 text-xs text-slate-700 font-medium">{milestone.estimated_time || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400">Complexity</p>
                            <p className="mt-1 text-xs font-bold text-slate-600">{milestone.complexity || 'Medium'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* GitHub Quality Verification Block */}
              <section className="space-y-4 pt-2 border-t border-slate-100">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-4">
                  <div className="flex items-center gap-2.5 text-emerald-800">
                    <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />
                    <span className="font-bold text-[15px]">Your request was accepted!</span>
                  </div>
                  <p className="text-xs text-emerald-700 leading-relaxed font-medium">
                    You can now submit your work using the GitHub verification below. We will scan your files and verify requirements.
                  </p>

                  <div className="space-y-3 pt-2">
                    <label className="block">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">GitHub Repository Link</span>
                      <div className="relative">
                        <Github className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="url"
                          value={repoLink}
                          onChange={(e) => setRepoLink(e.target.value)}
                          placeholder="https://github.com/owner/repo"
                          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-500"
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Milestone Requirement For Verification</span>
                      <select
                        value={selectedMilestoneId}
                        onChange={(e) => setSelectedMilestoneId(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-500"
                      >
                        <option value="">Select active milestone</option>
                        {milestones.map((m) => (
                          <option key={m._id} value={m._id} disabled={m.status === 'completed'}>
                            {m.title} ({m.status === 'completed' ? 'Completed' : 'Active'})
                          </option>
                        ))}
                      </select>
                    </label>

                    {verificationError && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 font-semibold flex items-center gap-2">
                        <XCircle size={15} className="shrink-0" />
                        {verificationError}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleRunVerification}
                      disabled={verificationLoading || !repoLink || !selectedMilestoneId}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 text-sm shadow-md transition-all"
                    >
                      <Sparkles size={16} />
                      {verificationLoading ? 'Running Quality Verification...' : 'Run Quality Verification'}
                    </button>
                  </div>
                </div>
              </section>

              {/* Quality Verification Results Section */}
              {verificationResult && (
                <section className="space-y-4 pt-2 border-t border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Quality Check Results</h3>
                  
                  <div className={`rounded-2xl border p-5 space-y-4 ${
                    verificationResult.status === 'Fully Completed'
                      ? 'border-emerald-200 bg-emerald-50/40 text-emerald-800'
                      : verificationResult.status === 'Partially Completed'
                      ? 'border-amber-200 bg-amber-50/40 text-amber-800'
                      : 'border-rose-200 bg-rose-50/40 text-rose-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {verificationResult.status === 'Fully Completed' && <CheckCircle2 size={18} className="text-emerald-600" />}
                        {verificationResult.status === 'Partially Completed' && <AlertTriangle size={18} className="text-amber-600" />}
                        {verificationResult.status === 'Unmet' && <XCircle size={18} className="text-rose-600" />}
                        <span className="font-bold text-[15px]">{verificationResult.status}</span>
                      </div>
                      <span className="font-extrabold text-lg">{verificationResult.completion_percentage}% Completion</span>
                    </div>

                    <p className="text-sm font-semibold italic">{verificationResult.short_explanation}</p>
                    <p className="text-xs leading-relaxed opacity-90">{verificationResult.assessment}</p>
                    
                    <div className="pt-2 border-t border-slate-200/50 flex flex-wrap justify-between items-center text-xs opacity-75">
                      <span>Files Scanned: {verificationResult.metadata?.filesScanned || 0}</span>
                      <span>Files Analyzed: {verificationResult.metadata?.filesAnalyzed || 0}</span>
                      <span className="font-bold">Action: {verificationResult.recommended_action}</span>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
