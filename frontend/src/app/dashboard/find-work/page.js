'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  Bookmark,
  ChevronRight,
  DollarSign,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  X
} from 'lucide-react';
import { getStoredAuth } from '@/services/auth';
import {
  generateProposal,
  getJobMatches,
  getSavedJobs,
  listJobs,
  saveJob,
  trackJobInteraction,
  unsaveJob
} from '@/services/api';

const DEFAULT_FILTERS = {
  search: '',
  category: '',
  projectType: '',
  experienceLevel: '',
  budgetMin: '',
  budgetMax: ''
};

const categories = ['Web Development', 'AI Development', 'Data Science', 'Design & Product', 'DevOps'];

function formatRelativeDate(value) {
  const date = new Date(value);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

function formatBudget(job) {
  if (job.projectType === 'hourly') {
    return `$${job.budgetMin || 0}-${job.budgetMax || 0}/hr`;
  }

  return `$${job.budgetMin || 0}-${job.budgetMax || 0}`;
}

function getMatchStyles(score) {
  if (score >= 85) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (score >= 70) return 'border-cyan-200 bg-cyan-50 text-cyan-700';
  if (score >= 55) return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-100 text-slate-600';
}

export default function FindWorkPage() {
  const [auth, setAuth] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [savedJobIds, setSavedJobIds] = useState(new Set());
  const [mode, setMode] = useState('ai');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drawerJob, setDrawerJob] = useState(null);
  const [proposalText, setProposalText] = useState('');
  const [proposalLoading, setProposalLoading] = useState(false);
  const [savingId, setSavingId] = useState('');

  useEffect(() => {
    setAuth(getStoredAuth());
  }, []);

  const freelancerId = auth?.user?._id || auth?.user?.id;
  const freelancerProfile = auth?.user?.freelancerProfile || {};

  useEffect(() => {
    const loadSavedJobs = async () => {
      if (!auth?.token || !freelancerId) return;

      try {
        const response = await getSavedJobs(freelancerId, auth.token);
        const nextSaved = new Set((response.data.savedJobs || []).map((job) => String(job._id)));
        setSavedJobIds(nextSaved);
      } catch (loadError) {
        console.error('Failed to fetch saved jobs:', loadError);
      }
    };

    loadSavedJobs();
  }, [auth, freelancerId]);

  useEffect(() => {
    const loadJobs = async () => {
      if (!auth?.token || !freelancerId) return;

      setLoading(true);
      setError('');

      const params = {
        freelancerId,
        sortBy: mode,
        limit: 24,
        ...filters
      };

      Object.keys(params).forEach((key) => {
        if (params[key] === '' || params[key] == null) {
          delete params[key];
        }
      });

      try {
        const response =
          mode === 'ai'
            ? await getJobMatches(params, auth.token)
            : await listJobs(params, auth.token);

        const collection = mode === 'ai' ? response.data.matches : response.data.jobs;
        setJobs(collection || []);
      } catch (loadError) {
        console.error('Failed to fetch jobs:', loadError);
        const message =
          loadError.response?.data?.message ||
          (mode === 'ai'
            ? 'AI ranking is unavailable until your freelancer profile and embedding service are ready.'
            : 'Unable to load jobs right now.');
        setError(message);
        setJobs([]);
      } finally {
        setLoading(false);
      }
    };

    loadJobs();
  }, [auth, freelancerId, filters, mode]);

  const summary = useMemo(() => {
    const skillCount = Array.isArray(freelancerProfile.skills) ? freelancerProfile.skills.length : 0;
    return {
      headline: freelancerProfile.headline || 'Complete your freelancer profile to improve AI ranking.',
      category: freelancerProfile.primaryCategory || 'Category not set',
      experience: freelancerProfile.experienceLevel || 'Experience not set',
      skills: skillCount
    };
  }, [freelancerProfile]);

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value
    }));
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const handleToggleSave = async (jobId) => {
    if (!auth?.token || !freelancerId || !jobId) return;

    const alreadySaved = savedJobIds.has(String(jobId));
    setSavingId(String(jobId));

    try {
      if (alreadySaved) {
        await unsaveJob({ freelancerId, jobId }, auth.token);
      } else {
        await saveJob({ freelancerId, jobId }, auth.token);
      }

      setSavedJobIds((current) => {
        const next = new Set(current);
        if (alreadySaved) {
          next.delete(String(jobId));
        } else {
          next.add(String(jobId));
        }
        return next;
      });
    } catch (saveError) {
      console.error('Failed to toggle saved job:', saveError);
    } finally {
      setSavingId('');
    }
  };

  const handleOpenQuickApply = async (job) => {
    setDrawerJob(job);
    setProposalText('');

    if (auth?.token && freelancerId) {
      try {
        await trackJobInteraction(
          { freelancerId, jobId: job._id, action: 'view', metadata: { source: 'quick-apply' } },
          auth.token
        );
      } catch (interactionError) {
        console.debug('View interaction failed:', interactionError.message);
      }
    }
  };

  const handleGenerateProposal = async () => {
    if (!auth?.token || !drawerJob) return;

    setProposalLoading(true);
    try {
      const response = await generateProposal(
        {
          job: drawerJob,
          freelancerName: auth.user?.name,
          freelancerProfile
        },
        auth.token
      );
      setProposalText(response.data.proposal || '');
    } catch (proposalError) {
      console.error('Failed to generate proposal:', proposalError);
      setProposalText('Unable to generate a proposal right now. You can still write one manually.');
    } finally {
      setProposalLoading(false);
    }
  };

  if (!auth?.user) {
    return (
      <div className="p-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
          Please sign in as a freelancer to use Find Work.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef6f2_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[28px] border border-white/60 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                <Sparkles size={14} />
                Find Work with AI
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Recommended jobs ranked against your freelancer profile
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                We build a profile embedding from your headline, bio, skills, category, and experience, then compare it
                against each job using cosine similarity.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[420px]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Headline</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{summary.headline}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{summary.category}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profile Signals</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {summary.skills} skills • {summary.experience}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
              </div>
              <button onClick={handleResetFilters} className="text-xs font-semibold text-emerald-700">
                Reset
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Search</span>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    value={filters.search}
                    onChange={(event) => handleFilterChange('search', event.target.value)}
                    placeholder="React, FastAPI, dashboard..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-emerald-400 focus:bg-white"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Category</span>
                <select
                  value={filters.category}
                  onChange={(event) => handleFilterChange('category', event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:bg-white"
                >
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Project Type</span>
                <select
                  value={filters.projectType}
                  onChange={(event) => handleFilterChange('projectType', event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:bg-white"
                >
                  <option value="">All project types</option>
                  <option value="fixed">Fixed price</option>
                  <option value="hourly">Hourly</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Experience</span>
                <select
                  value={filters.experienceLevel}
                  onChange={(event) => handleFilterChange('experienceLevel', event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:bg-white"
                >
                  <option value="">All levels</option>
                  <option value="junior">Junior</option>
                  <option value="mid">Mid</option>
                  <option value="senior">Senior</option>
                </select>
              </label>

              <div>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Budget Range</span>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={filters.budgetMin}
                    onChange={(event) => handleFilterChange('budgetMin', event.target.value)}
                    placeholder="Min"
                    type="number"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:bg-white"
                  />
                  <input
                    value={filters.budgetMax}
                    onChange={(event) => handleFilterChange('budgetMax', event.target.value)}
                    placeholder="Max"
                    type="number"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:bg-white"
                  />
                </div>
              </div>
            </div>
          </aside>

          <div className="space-y-4">
            <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Jobs</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Switch between AI Ranked and Latest to compare semantic ranking against the raw posting feed.
                </p>
              </div>

              <div className="inline-flex rounded-2xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setMode('ai')}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    mode === 'ai' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  AI Ranked
                </button>
                <button
                  type="button"
                  onClick={() => setMode('latest')}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    mode === 'latest' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Latest
                </button>
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
                Loading recommended jobs...
              </div>
            ) : jobs.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                <Briefcase className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-4 text-base font-semibold text-slate-900">No matching jobs yet</p>
                <p className="mt-2 text-sm text-slate-500">
                  {mode === 'ai' ? 'Complete your freelancer profile in Settings to get personalized recommendations.' : 'No new projects match your filters. Try Latest tab or broaden search.'}
                  <br />
                  <span className="text-emerald-600 font-semibold mt-1 block">Demo jobs available after seeding DB!</span>
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => {
                  const isSaved = savedJobIds.has(String(job._id));
                  return (
                    <article
                      key={job._id}
                      className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {job.category}
                            </span>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {job.projectType}
                            </span>
                            {job.matchScore != null ? (
                              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getMatchStyles(job.matchScore)}`}>
                                {job.matchScore}% match
                              </span>
                            ) : null}
                          </div>

                          <h3 className="mt-3 text-xl font-semibold text-slate-900">{job.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{job.description}</p>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {(job.requiredSkills || []).map((skill) => {
                              const overlapping = (job.overlappingSkills || []).some(
                                (item) => item.toLowerCase() === String(skill).toLowerCase()
                              );

                              return (
                                <span
                                  key={`${job._id}-${skill}`}
                                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                                    overlapping
                                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {skill}
                                </span>
                              );
                            })}
                          </div>

                          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                            <span className="inline-flex items-center gap-1.5">
                              <DollarSign size={15} />
                              {formatBudget(job)}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin size={15} />
                              {job.location || 'Remote'}
                            </span>
                            <span>{job.employerName || 'SynapEscrow Client'}</span>
                            <span>{formatRelativeDate(job.createdAt)}</span>
                          </div>

                          {job.overlappingSkills?.length ? (
                            <p className="mt-4 text-sm text-slate-500">
                              Skills match: <span className="font-semibold text-emerald-700">{job.overlappingSkills.join(', ')}</span>
                            </p>
                          ) : null}
                          {job.matchReasons && job.matchScore && (
                            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                              <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide mb-1">Why AI Ranked High</p>
                              <div className="space-y-1 text-xs text-emerald-700">
                                {job.matchReasons.map((reason, i) => (
                                  <p key={i}>{reason}</p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex shrink-0 flex-col gap-3 xl:w-48">
                          <button
                            type="button"
                            onClick={() => handleOpenQuickApply(job)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                          >
                            Quick Apply
                            <ChevronRight size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleSave(job._id)}
                            disabled={savingId === String(job._id)}
                            className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                              isSaved
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <Bookmark size={16} className={isSaved ? 'fill-current' : ''} />
                            {savingId === String(job._id) ? 'Saving...' : isSaved ? 'Saved' : 'Save'}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {drawerJob ? (
        <div className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-[2px]">
          <div className="ml-auto flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Quick Apply</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">{drawerJob.title}</h2>
                <p className="mt-2 text-sm text-slate-500">
                  {drawerJob.employerName || 'SynapEscrow Client'} • {formatBudget(drawerJob)} • {drawerJob.category}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerJob(null)}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Why this job may fit</h3>
                <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {drawerJob.matchScore != null ? (
                    <p>
                      AI ranked this role at <span className="font-semibold text-slate-900">{drawerJob.matchScore}%</span>{' '}
                      cosine similarity against your profile embedding.
                    </p>
                  ) : (
                    <p>This role is being shown from the latest posting feed.</p>
                  )}
                  {drawerJob.overlappingSkills?.length ? (
                    <p className="mt-3">
                      Matching skills: <span className="font-semibold text-emerald-700">{drawerJob.overlappingSkills.join(', ')}</span>
                    </p>
                  ) : null}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Job Description</h3>
                <div className="mt-3 rounded-2xl border border-slate-200 p-4 text-sm leading-6 text-slate-600">
                  {drawerJob.description}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Proposal Draft</h3>
                  <button
                    type="button"
                    onClick={handleGenerateProposal}
                    disabled={proposalLoading}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <Sparkles size={14} />
                    {proposalLoading ? 'Generating' : 'Draft with AI'}
                  </button>
                </div>

                <textarea
                  value={proposalText}
                  onChange={(event) => setProposalText(event.target.value)}
                  placeholder="Generate a proposal draft or write your own here."
                  className="mt-3 h-72 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white"
                />
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
