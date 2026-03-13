import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useState } from 'react';
import { Activity, CheckCircle2, FolderKanban, LockKeyhole } from 'lucide-react';
import ProjectForm from '../components/ProjectForm';
import {
  approveProjectMilestones,
  createProject,
  generateMilestones,
  listProjects
} from '../services/api';
import { getStoredAuth, isAuthenticated } from '../services/auth';

export default function EmployerDashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [editingMilestones, setEditingMilestones] = useState([]);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);

  const normalizeStatus = (value) => {
    const status = String(value || '').toLowerCase();

    if (status.includes('complete') || status.includes('released')) {
      return 'completed';
    }

    if (status.includes('pending') || status.includes('draft')) {
      return 'pending';
    }

    return 'active';
  };

  const statusBadgeClass = (status) => {
    if (status === 'completed') {
      return 'bg-blue-100 text-blue-700';
    }
    if (status === 'pending') {
      return 'bg-yellow-100 text-yellow-700';
    }
    return 'bg-emerald-100 text-emerald-700';
  };

  const getProjectMilestoneCount = (item) =>
    Number(item?.milestone_count ?? item?.total_milestones ?? item?.milestones?.length ?? 0);

  const getProjectCompletedMilestoneCount = (item) =>
    Number(
      item?.completed_milestones ??
        item?.milestones_completed ??
        (Array.isArray(item?.milestones)
          ? item.milestones.filter((milestone) =>
              ['approved', 'completed', 'released'].includes(
                String(milestone?.status || '').toLowerCase()
              )
            ).length
          : 0)
    );

  const getProjectEscrowLocked = (item) =>
    Number(item?.escrow_locked ?? item?.total_escrow ?? item?.budget ?? 0);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(Number(amount || 0));

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const auth = getStoredAuth();
      const response = await listProjects({ employer_id: auth?.user?._id || auth?.user?.id || '' });
      setProjects(response.data?.projects || []);
    } catch {
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }

    setReady(true);
    loadProjects();
  }, [router]);

  const handleCreateProject = async (payload) => {
    try {
      setCreating(true);
      setMessage('');
      const auth = getStoredAuth();
      const requestPayload = {
        ...payload,
        employer_id: payload.employer_id || auth?.user?.id || ''
      };

      const response = await createProject(requestPayload);
      const createdProject = response.data.project;
      setProject(createdProject);
      setProjects((prev) => {
        const filtered = prev.filter((item) => item._id !== createdProject?._id);
        return [createdProject, ...filtered];
      });
      setMilestones([]);
      setEditingMilestones([]);
      setMessage('Project created successfully. You can now generate milestones.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleGenerateMilestones = async () => {
    if (!project?._id) return;
    try {
      setGenerating(true);
      setMessage('');
      const response = await generateMilestones({ project_id: project._id });
      setMilestones(response.data.milestones || []);
      setEditingMilestones(response.data.milestones || []);
      setMessage('AI milestones generated successfully.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to generate milestones');
    } finally {
      setGenerating(false);
    }
  };

  const handleEditChange = (id, field, value) => {
    setEditingMilestones((prev) =>
      prev.map((item) =>
        item._id === id ? { ...item, [field]: field === 'payment_amount' ? Number(value) : value } : item
      )
    );
  };

  const handleApprovalAction = async (action) => {
    if (!project?._id) {
      return;
    }

    try {
      setProcessing(true);
      setMessage('');

      const payload = { action };
      if (action === 'edit') {
        payload.milestones = editingMilestones.map((milestone) => ({
          id: milestone._id,
          title: milestone.title,
          description: milestone.description,
          deliverable: milestone.deliverable,
          timeline: milestone.timeline || milestone.estimated_time,
          payment_amount: milestone.payment_amount
        }));
      }

      const response = await approveProjectMilestones(project._id, payload);
      if (response.data?.milestones) {
        setMilestones(response.data.milestones);
        setEditingMilestones(response.data.milestones);
      }
      setMessage(response.data?.message || 'Action completed successfully.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to process milestone action');
    } finally {
      setProcessing(false);
    }
  };

  if (!ready) {
    return <div className="py-10 text-center text-sm text-slate-500">Redirecting to login...</div>;
  }

  const totalProjects = projects.length;
  const activeProjects = projects.filter((item) => normalizeStatus(item?.status) === 'active').length;
  const milestonesCompleted = projects.reduce(
    (sum, item) => sum + getProjectCompletedMilestoneCount(item),
    0
  );
  const totalEscrowLocked = projects.reduce((sum, item) => sum + getProjectEscrowLocked(item), 0);

  const stats = [
    {
      label: 'Total Projects',
      value: totalProjects,
      icon: FolderKanban
    },
    {
      label: 'Active Projects',
      value: activeProjects,
      icon: Activity
    },
    {
      label: 'Milestones Completed',
      value: milestonesCompleted,
      icon: CheckCircle2
    },
    {
      label: 'Total Escrow Locked',
      value: formatCurrency(totalEscrowLocked),
      icon: LockKeyhole
    }
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Employer Dashboard</h1>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article
              key={stat.label}
              className="flex items-center justify-between rounded-xl bg-white p-6 shadow-lg transition-all hover:shadow-xl"
            >
              <div>
                <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
              </div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <Icon size={20} />
              </span>
            </article>
          );
        })}
      </section>

      <section className="rounded-xl bg-white shadow-lg transition-all hover:shadow-xl">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Project List</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Project Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Budget
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Milestones
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loadingProjects ? (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-sm text-slate-500">
                    Loading projects...
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-sm text-slate-500">
                    No projects yet.
                  </td>
                </tr>
              ) : (
                projects.map((item) => {
                  const status = normalizeStatus(item?.status);
                  const milestoneTotal = getProjectMilestoneCount(item);

                  return (
                    <tr key={item._id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.title}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{formatCurrency(item.budget)}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{milestoneTotal}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusBadgeClass(
                            status
                          )}`}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ProjectForm onSubmit={handleCreateProject} loading={creating} />

      {project ? (
        <section className="card flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-slate-500">Created Project</p>
            <p className="font-semibold">{project.title}</p>
            <p className="text-xs text-slate-500">Project ID: {project._id}</p>
          </div>
          <button className="btn-primary" onClick={handleGenerateMilestones} disabled={generating}>
            {generating ? 'Generating...' : 'Generate Milestones'}
          </button>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">Milestone Review</h2>
          {milestones.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <button
                className="btn-secondary"
                onClick={() => handleApprovalAction('edit')}
                disabled={processing}
              >
                {processing ? 'Saving...' : 'Save Edits'}
              </button>
              <button
                className="btn-secondary"
                onClick={() => handleApprovalAction('regenerate')}
                disabled={processing}
              >
                Regenerate
              </button>
              <button
                className="btn-primary"
                onClick={() => handleApprovalAction('approve')}
                disabled={processing}
              >
                Approve & Fund Escrow
              </button>
            </div>
          ) : null}
        </div>

        {editingMilestones.length === 0 ? (
          <div className="card text-sm text-slate-500">No milestones generated yet.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {editingMilestones.map((milestone) => (
              <article key={milestone._id} className="card space-y-3">
                <input
                  className="input"
                  value={milestone.title}
                  onChange={(event) => handleEditChange(milestone._id, 'title', event.target.value)}
                />
                <textarea
                  className="input min-h-20"
                  value={milestone.description}
                  onChange={(event) => handleEditChange(milestone._id, 'description', event.target.value)}
                />
                <input
                  className="input"
                  value={milestone.deliverable}
                  onChange={(event) => handleEditChange(milestone._id, 'deliverable', event.target.value)}
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    className="input"
                    value={milestone.timeline || milestone.estimated_time || ''}
                    onChange={(event) => handleEditChange(milestone._id, 'timeline', event.target.value)}
                    placeholder="Timeline"
                  />
                  <input
                    type="number"
                    min="0"
                    className="input"
                    value={milestone.payment_amount}
                    onChange={(event) => handleEditChange(milestone._id, 'payment_amount', event.target.value)}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
    </div>
  );
}
