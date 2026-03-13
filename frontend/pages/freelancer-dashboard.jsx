import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useState } from 'react';
import SubmissionForm from '../components/SubmissionForm';
import {
  fetchMilestonesByProject,
  listProjects,
  submitMilestone
} from '../services/api';
import { getStoredAuth, isAuthenticated } from '../services/auth';

export default function FreelancerDashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [milestones, setMilestones] = useState([]);
  const [submittingFor, setSubmittingFor] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const auth = getStoredAuth();
        if (!auth?.user?.id) {
          return;
        }
        setLoadingProjects(true);
        const response = await listProjects({ role: 'freelancer', user_id: auth.user.id });
        setProjects(response.data?.projects || []);
      } catch (error) {
        setMessage(error.response?.data?.message || 'Failed to load projects');
      } finally {
        setLoadingProjects(false);
      }
    };

    if (ready) {
      loadProjects();
    }
  }, [ready]);

  const handleSelectProject = async (projectId) => {
    setSelectedProjectId(projectId);
    setMessage('');
    try {
      const response = await fetchMilestonesByProject(projectId);
      setMilestones(response.data?.milestones || []);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to load project milestones');
      setMilestones([]);
    }
  };

  const handleSubmitWork = async (milestoneId, payload) => {
    try {
      setSubmittingFor(milestoneId);
      setMessage('');
      const auth = getStoredAuth();
      await submitMilestone(milestoneId, payload);
      setMilestones((prev) =>
        prev.map((item) =>
          item._id === milestoneId
            ? { ...item, status: 'submitted', freelancer_id: payload.freelancer_id || auth?.user?.id }
            : item
        )
      );
      setMessage('Submission sent successfully.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to submit milestone');
    } finally {
      setSubmittingFor('');
    }
  };

  if (!ready) {
    return <div className="py-10 text-center text-sm text-slate-500">Redirecting to login...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Freelancer Dashboard</h1>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Browse Projects</h2>
        {loadingProjects ? (
          <p className="text-sm text-slate-500">Loading projects...</p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-slate-500">No projects available yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {projects.map((project) => (
              <button
                key={project._id}
                className={`rounded-xl border p-4 text-left transition-all ${
                  selectedProjectId === project._id
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 bg-white hover:border-emerald-300'
                }`}
                onClick={() => handleSelectProject(project._id)}
              >
                <p className="font-semibold text-slate-900">{project.title}</p>
                <p className="mt-1 text-xs text-slate-500">Budget: ${project.budget}</p>
                <p className="text-xs text-slate-500">Escrow: {project.escrow_status}</p>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        {milestones.length === 0 ? (
          <div className="card text-sm text-slate-500">No milestones assigned yet.</div>
        ) : (
          milestones.map((milestone) => (
            <article key={milestone._id} className="card space-y-3">
              <h3 className="text-lg font-semibold">{milestone.title}</h3>
              <p className="text-sm text-slate-600">{milestone.description}</p>
              <div className="grid gap-2 text-sm md:grid-cols-3">
                <p>
                  <span className="font-medium">Payment:</span> ${milestone.payment_amount}
                </p>
                <p>
                  <span className="font-medium">Status:</span> {milestone.status}
                </p>
                <p>
                  <span className="font-medium">Timeline:</span>{' '}
                  {milestone.timeline || milestone.estimated_time || 'N/A'}
                </p>
              </div>
              <SubmissionForm
                milestoneId={milestone._id}
                onSubmit={(milestoneId, payload) => {
                  const auth = getStoredAuth();
                  return handleSubmitWork(milestoneId, {
                    ...payload,
                    freelancer_id: payload.freelancer_id || auth?.user?.id
                  });
                }}
                loading={submittingFor === milestone._id}
              />
            </article>
          ))
        )}
      </section>

      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
    </div>
  );
}
