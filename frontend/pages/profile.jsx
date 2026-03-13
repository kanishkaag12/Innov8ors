import { useState } from 'react';
import FreelancerProfile from '../components/FreelancerProfile';
import { fetchFreelancerPFI } from '../services/api';
import { getStoredAuth } from '../services/auth';
import { useEffect } from 'react';

export default function ProfilePage() {
  const [freelancerId, setFreelancerId] = useState('');
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth?.user?.role === 'freelancer' && auth.user.id) {
      setFreelancerId(auth.user.id);
    }
  }, []);

  const handleLoadProfile = async () => {
    if (!freelancerId.trim()) {
      setMessage('Enter freelancer ID.');
      return;
    }

    try {
      setLoading(true);
      setMessage('');
      const response = await fetchFreelancerPFI(freelancerId);

      setProfile({
        name: response.data?.name || 'Freelancer',
        email: response.data?.email || `${freelancerId}@synapescrow.ai`,
        pfi_score: response.data?.pfi_score || 0
      });

      setMessage('PFI loaded successfully.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to load freelancer profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Freelancer Profile</h1>

      <section className="card flex flex-col gap-3 md:flex-row">
        <input
          className="input"
          value={freelancerId}
          onChange={(event) => setFreelancerId(event.target.value)}
          placeholder="Freelancer ID"
        />
        <button className="btn-primary" onClick={handleLoadProfile} disabled={loading}>
          {loading ? 'Loading...' : 'Load PFI'}
        </button>
      </section>

      {profile ? <FreelancerProfile profile={profile} /> : null}
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
    </div>
  );
}
