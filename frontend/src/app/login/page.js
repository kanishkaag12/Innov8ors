'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, Lock, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { loginUser } from '@/services/api';
import { getStoredAuth, saveAuth } from '@/services/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth?.token) {
      if (auth.user.role === 'freelancer') {
        router.replace('/dashboard/freelancer');
      } else if (auth.user.role === 'employer') {
        router.replace('/dashboard/employer');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [router]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!email.trim() || !password.trim()) {
      setMessage('Email and password are required.');
      return;
    }

    try {
      setLoading(true);
      const response = await loginUser({ email, password });
      saveAuth({ token: response.data?.token, user: response.data?.user });

      if (response.data.user.role === 'freelancer') {
        router.push('/dashboard/freelancer');
      } else if (response.data.user.role === 'employer') {
        router.push('/dashboard/employer');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-teal-700 to-emerald-600 p-12 text-white md:flex md:flex-col md:items-center md:justify-center">
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-white/5 blur-3xl" />

        <div className="relative z-10 flex max-w-md flex-col items-center text-center">
          <div className="mb-6 inline-flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur">
              <LogIn size={22} />
            </span>
            <span className="text-2xl font-extrabold tracking-tight">SynapEscrow</span>
          </div>

          <h1 className="text-4xl font-bold leading-tight">
            Secure AI-powered escrow for freelancers and employers
          </h1>
          <p className="mt-4 text-base leading-relaxed text-teal-100/90">
            Trusted milestone verification and automated payments.
          </p>

          <div className="mt-8 w-full max-w-sm">
            <Image
              src="/images/signup-illustration.svg"
              alt="Freelance work illustration"
              width={450}
              height={300}
              className="w-full rounded-xl shadow-lg"
              priority
            />
          </div>
        </div>
      </aside>

      <section className="flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
          <div className="mb-8 text-center">
            <span className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
              <LogIn size={24} />
            </span>
            <h1 className="text-3xl font-bold text-slate-900">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-500">Sign in to manage projects, milestones, and escrow releases.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="email"
                  className="auth-input pl-11"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="password"
                  className="auth-input pl-11"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
            </label>

            <button className="auth-button w-full" type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {message ? <p className="mt-4 text-sm text-rose-600">{message}</p> : null}

          <p className="mt-6 text-center text-sm text-slate-600">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-teal-600 hover:text-teal-700">
              Sign up
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
