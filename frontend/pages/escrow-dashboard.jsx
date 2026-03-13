import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useState } from 'react';
import EscrowDashboard from '../components/EscrowDashboard';
import {
  fetchEscrowDashboard,
  releaseEscrowPayment
} from '../services/api';
import { isAuthenticated } from '../services/auth';

export default function EscrowDashboardPage() {
  const router = useRouter();
  const [projectId, setProjectId] = useState('');
  const [projectBudget, setProjectBudget] = useState(0);
  const [milestones, setMilestones] = useState([]);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [releaseMilestoneId, setReleaseMilestoneId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  const loadEscrowData = async () => {
    if (!projectId.trim()) {
      setMessage('Enter project ID to load escrow information.');
      return;
    }

    try {
      setLoading(true);
      setMessage('');
      const response = await fetchEscrowDashboard(projectId);
      setProjectBudget(response.data?.total_budget_locked || 0);
      setMilestones(response.data?.milestones || []);
      setPayments(response.data?.payments || []);
      setSummary(response.data || null);

      setMessage('Escrow data loaded.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to load escrow data.');
    } finally {
      setLoading(false);
    }
  };

  const handleReleasePayment = async () => {
    if (!releaseMilestoneId.trim()) {
      setMessage('Enter milestone ID to release escrow payment.');
      return;
    }

    try {
      setLoading(true);
      setMessage('');
      const response = await releaseEscrowPayment({ milestone_id: releaseMilestoneId });
      setPayments((prev) => [...prev, response.data.payment]);
      setMessage('Escrow payment action processed successfully.');
      if (projectId) {
        await loadEscrowData();
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to release escrow payment.');
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return <div className="py-10 text-center text-sm text-slate-500">Redirecting to login...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Escrow Dashboard</h1>

      <section className="card space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            className="input"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            placeholder="Project ID"
          />
          <input
            className="input"
            value={releaseMilestoneId}
            onChange={(event) => setReleaseMilestoneId(event.target.value)}
            placeholder="Milestone ID for Release"
          />
          <div className="flex gap-2">
            <button className="btn-secondary w-full" onClick={loadEscrowData} disabled={loading}>
              Load Escrow Data
            </button>
            <button className="btn-primary w-full" onClick={handleReleasePayment} disabled={loading}>
              Release Payment
            </button>
          </div>
        </div>
      </section>

      <EscrowDashboard projectBudget={projectBudget} milestones={milestones} payments={payments} />

      {summary ? (
        <section className="card">
          <h3 className="text-lg font-semibold">Escrow Summary</h3>
          <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
            <p>
              <span className="font-medium">Released:</span> ${summary.payments_released}
            </p>
            <p>
              <span className="font-medium">Refunded:</span> ${summary.refunded_amount}
            </p>
            <p>
              <span className="font-medium">Pending Milestones:</span> {summary.pending_milestones}
            </p>
          </div>
        </section>
      ) : null}

      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
    </div>
  );
}
