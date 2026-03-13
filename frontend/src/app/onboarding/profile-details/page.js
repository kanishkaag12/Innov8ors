'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, CheckCircle, ArrowRight } from 'lucide-react';
import { getStoredAuth, saveAuth } from '@/services/auth';
import { completeProfile } from '@/services/api';

export default function ProfileDetailsPlaceholder() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth || !auth.token) {
      router.replace('/login');
      return;
    }
    // Protect: if already onboarded, go to dashboard
    if (auth.user?.onboardingCompleted) {
      router.replace(auth.user.role === 'freelancer' ? '/dashboard/freelancer' : '/dashboard/employer');
      return;
    }
    setUser(auth.user);
  }, [router]);

  const handleFinish = async () => {
    try {
      setLoading(true);
      const auth = getStoredAuth();
      const response = await completeProfile({ userId: auth.user._id });
      
      const updatedUser = { ...auth.user, onboardingCompleted: true };
      saveAuth({ ...auth, user: updatedUser });
      router.push('/dashboard/freelancer');
    } catch (err) {
      console.error('Finalizing onboarding failed:', err);
      // Fallback update
      const auth = getStoredAuth();
      saveAuth({ ...auth, user: { ...auth.user, onboardingCompleted: true } });
      router.push('/dashboard/freelancer');
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
        <div className="w-full max-w-xl bg-white md:rounded-2xl md:shadow-md md:border md:border-gray-100 p-8 sm:p-12 text-center">
          <div className="mb-6 flex justify-center">
            <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
              <CheckCircle size={48} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Almost there!</h1>
          <p className="text-slate-500 mb-8 font-medium">Your categories and skills are saved. You're now ready to join the freelancer community.</p>
          
          <button 
            onClick={handleFinish}
            disabled={loading}
            className="w-full sm:w-auto min-w-[200px] flex items-center justify-center gap-2 py-3 px-8 bg-green-600 hover:bg-green-700 text-white font-bold rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-70 disabled:scale-100"
          >
            {loading ? 'Saving...' : 'Go to My Dashboard'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </div>
      </main>
    </div>
  );
}
