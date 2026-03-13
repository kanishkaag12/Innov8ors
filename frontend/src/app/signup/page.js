'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Briefcase, Laptop, Mail, Lock, User, Globe } from 'lucide-react';
import { useEffect, useState } from 'react';
import { signupUser } from '@/services/api';
import { getStoredAuth, saveAuth } from '@/services/auth';
import Image from 'next/image';

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    country: 'United States',
    role: null,
    emails: true,
    terms: false
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const existing = getStoredAuth();
    if (existing?.token && existing.user?.onboardingCompleted) {
      if (existing.user?.role === 'freelancer') {
        router.replace('/dashboard/freelancer');
      } else if (existing.user?.role === 'employer') {
        router.replace('/dashboard/employer');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [router]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleRoleSelect = (role) => {
    setForm((prev) => ({ ...prev, role }));
  };

  const handleContinue = () => {
    if (form.role) {
      setStep(2);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.password.trim()) {
      setMessage('Please fill out all required fields.');
      return;
    }

    if (!form.terms) {
      setMessage('You must agree to the Terms of Service to continue.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        email: form.email,
        password: form.password,
        role: form.role
      };
      
      const response = await signupUser(payload);
      saveAuth({ token: response.data?.token, user: response.data?.user });
      
      if (response.data?.user?.role === 'freelancer') {
        router.push('/onboarding/categories-skills');
      } else {
        router.push('/onboarding');
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white md:bg-gray-50 flex flex-col font-sans">
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 w-full mt-16 mx-auto mb-12">
        {/* Step 1: Role Selection */}
        {step === 1 && (
          <div className="w-full max-w-2xl bg-white md:rounded-2xl md:shadow-md md:border md:border-gray-100 p-6 sm:p-12 transition-all">
            <h2 className="text-3xl font-bold text-center text-slate-900 mb-10 tracking-tight">
              Join as a Client or Freelancer
            </h2>
            
            <div className="grid sm:grid-cols-2 gap-6 mb-10">
              <button
                type="button"
                onClick={() => handleRoleSelect('employer')}
                className={`relative flex flex-col items-start justify-between p-6 sm:p-8 rounded-xl border-2 transition-all duration-200 hover:bg-gray-50 focus:outline-none ${
                  form.role === 'employer'
                    ? 'border-green-600 bg-green-50/30'
                    : 'border-slate-200 hover:border-green-500 bg-white'
                }`}
              >
                <div className="w-full flex justify-between items-start mb-4">
                  <Briefcase size={32} strokeWidth={1.5} className="text-slate-800" />
                  <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${form.role === 'employer' ? 'border-green-600 bg-green-600' : 'border-gray-300'}`}>
                    {form.role === 'employer' && <div className="h-2 w-2 bg-white rounded-full" />}
                  </div>
                </div>
                <span className="block font-medium text-slate-900 text-2xl text-left leading-tight">I'm a client, hiring for a project</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('freelancer')}
                className={`relative flex flex-col items-start justify-between p-6 sm:p-8 rounded-xl border-2 transition-all duration-200 hover:bg-gray-50 focus:outline-none ${
                  form.role === 'freelancer'
                    ? 'border-green-600 bg-green-50/30'
                    : 'border-slate-200 hover:border-green-500 bg-white'
                }`}
              >
                <div className="w-full flex justify-between items-start mb-4">
                   <Laptop size={32} strokeWidth={1.5} className="text-slate-800" />
                   <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${form.role === 'freelancer' ? 'border-green-600 bg-green-600' : 'border-gray-300'}`}>
                     {form.role === 'freelancer' && <div className="h-2 w-2 bg-white rounded-full" />}
                   </div>
                </div>
                <span className="block font-medium text-slate-900 text-2xl text-left leading-tight">I'm a freelancer, looking for work</span>
              </button>
            </div>

            <div className="flex justify-center flex-col items-center">
              <button
                onClick={handleContinue}
                disabled={!form.role}
                className={`w-full sm:w-auto min-w-[240px] py-2.5 px-6 rounded-full text-white font-medium transition-all ${
                  form.role 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-green-600/50 cursor-not-allowed'
                }`}
              >
                {form.role === 'freelancer' ? 'Apply as a Freelancer' : form.role === 'employer' ? 'Join as a Client' : 'Create Account'}
              </button>
            </div>
            
            <p className="mt-8 text-center text-sm font-medium text-slate-600">
              Already have an account?{' '}
              <Link href="/login" className="text-green-600 hover:underline">
                Log In
              </Link>
            </p>
          </div>
        )}

        {/* Step 2: Form */}
        {step === 2 && (
          <div className="w-full max-w-md mx-auto md:mt-6 bg-white rounded-xl md:shadow-md md:border md:border-gray-100 p-8">
            <div className="mb-6 text-center">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Sign up to {form.role === 'freelancer' ? 'find work you love' : 'hire talent'}</h2>
              <p className="mt-2 text-sm text-slate-500 font-medium tracking-wide">Welcome! Please enter your details below.</p>
            </div>

            <div className="space-y-3 mb-6">
              <button type="button" className="flex w-full items-center justify-center gap-3 rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors">
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                 </svg>
                 Continue with Google
              </button>
              <button type="button" className="flex w-full items-center justify-center gap-3 rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors">
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                   <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.08.45-2.11.59-3.02-.32-4.14-4.15-4.86-10.46-1.02-13.43 1.76-1.35 3.33-1.22 4.16-.9.84.32 1.54.91 2.39.91.82 0 1.69-.64 2.66-1.02 1.48-.55 3.19-.24 4.35 1.05-3.26 1.83-2.67 6.32.61 7.6-.82 2.36-2.11 4.51-3.81 5.76zM12.03 5.4c-.16-2.45 1.95-4.4 4.38-4.4C16.64 3.75 14.15 5.56 12.03 5.4z" />
                 </svg>
                 Continue with Apple
              </button>
            </div>

            <div className="relative flex items-center mb-6">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink-0 mx-4 text-xs font-medium text-slate-400">OR</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="block text-sm font-medium text-slate-700">First Name</span>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      name="firstName"
                      className="w-full pl-9 pr-3 py-2 bg-white text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-shadow"
                      value={form.firstName}
                      onChange={handleChange}
                      placeholder="First Name"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="block text-sm font-medium text-slate-700">Last Name</span>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      name="lastName"
                      className="w-full pl-9 pr-3 py-2 bg-white text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-shadow"
                      value={form.lastName}
                      onChange={handleChange}
                      placeholder="Last Name"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <span className="block text-sm font-medium text-slate-700">Email</span>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="email"
                    name="email"
                    className="w-full pl-9 pr-3 py-2 bg-white text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-shadow"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Email Address"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <span className="block text-sm font-medium text-slate-700">Password</span>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="password"
                    name="password"
                    className="w-full pl-9 pr-3 py-2 bg-white text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-shadow"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Password (8 or more characters)"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <span className="block text-sm font-medium text-slate-700">Country</span>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <select
                    name="country"
                    className="w-full pl-9 pr-3 py-2 bg-white text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-shadow appearance-none"
                    value={form.country}
                    onChange={handleChange}
                  >
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="India">India</option>
                    <option value="Germany">Germany</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="emails"
                    checked={form.emails}
                    onChange={handleChange}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-slate-600">Send me helpful emails to find rewarding work and job leads.</span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="terms"
                    checked={form.terms}
                    onChange={handleChange}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-slate-600">
                    Yes, I understand and agree to the <span className="text-green-600 hover:underline">Terms of Service</span>, including the User Agreement and Privacy Policy.
                  </span>
                </label>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full mt-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-full shadow-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed text-sm"
              >
                {loading ? 'Creating Account...' : 'Create my account'}
              </button>
            </form>

            <div className="mt-8 flex flex-col items-center">
              {message && <p className="mb-4 text-sm font-medium text-red-600">{message}</p>}
              <p className="text-sm text-slate-600 font-medium">
                Already have an account?{' '}
                <Link href="/login" className="text-green-600 hover:underline">Log In</Link>
              </p>
            </div>
            
            <div className="mt-6 text-center">
               <button 
                 type="button" 
                 onClick={() => setStep(1)}
                 className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition"
               >
                 ← Change role selection
               </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
