'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { getStoredAuth, saveAuth } from '@/services/auth';
import { onboardUser } from '@/services/api';

const companySizes = [
  "It's just me",
  "2-9 employees",
  "10-99 employees",
  "100-499 employees",
  "500-4,999 employees",
  "5,000 or more employees"
];

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    companySize: '',
    companyName: '',
    website: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth || !auth.token) {
      router.replace('/login');
      return;
    }
    if (auth.user?.onboardingCompleted) {
      if (auth.user.role === 'freelancer') {
        router.replace('/dashboard/freelancer');
      } else if (auth.user.role === 'employer') {
        router.replace('/dashboard/employer');
      } else {
        router.replace('/dashboard');
      }
      return;
    }
    setUser(auth.user);
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.companySize || !form.companyName) {
      setError('Please fill in the required fields.');
      return;
    }

    try {
      setLoading(true);
      const auth = getStoredAuth();
      const response = await onboardUser({
        userId: auth.user._id,
        ...form
      });

      // Update stored auth with onboarded status
      saveAuth({ 
        token: auth.token, 
        user: response.data.user 
      });

      // Redirect to appropriate dashboard
      if (response.data.user.role === 'freelancer') {
        router.push('/dashboard/freelancer');
      } else if (response.data.user.role === 'employer') {
        router.push('/dashboard/employer');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Onboarding failed:', err);
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-white md:bg-gray-50 flex flex-col font-sans">
      <header className="w-full px-6 py-4 flex items-center hidden md:flex">
        <div className="flex items-center gap-2 text-green-600 font-bold text-xl tracking-tight">
          <ShieldCheck size={28} />
          SynapEscrow
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 w-full mt-10 md:mt-0 mb-12">
        <div className="w-full max-w-xl bg-white md:rounded-2xl md:shadow-md md:border md:border-gray-100 p-8 sm:p-12 transition-all">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Welcome to SnapEscrow!</h1>
          <p className="text-slate-500 mb-8 font-medium">Tell us about your business so we can help you connect with talent.</p>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <span className="block text-lg font-bold text-slate-900">Company Size</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {companySizes.map((size) => (
                  <label 
                    key={size}
                    className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${
                      form.companySize === size 
                        ? 'border-green-600 bg-green-50/30' 
                        : 'border-gray-200 hover:border-green-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="companySize"
                      value={size}
                      checked={form.companySize === size}
                      onChange={handleChange}
                      className="hidden"
                    />
                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center mr-3 ${
                      form.companySize === size ? 'border-green-600' : 'border-gray-300'
                    }`}>
                      {form.companySize === size && <div className="h-2 w-2 bg-green-600 rounded-full" />}
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{size}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="companyName" className="block text-lg font-bold text-slate-900">
                Company Name
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                placeholder="Enter your company legal name"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-shadow"
                value={form.companyName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="website" className="block text-lg font-bold text-slate-900">
                Website <span className="text-sm font-normal text-slate-400">(Optional)</span>
              </label>
              <input
                id="website"
                name="website"
                type="url"
                placeholder="https://example.com"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-shadow"
                value={form.website}
                onChange={handleChange}
              />
            </div>

            {error && <p className="text-sm font-medium text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto min-w-[160px] flex items-center justify-center gap-2 py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full shadow-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Continue'}
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
