'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Send,
  Briefcase,
  Clock,
  DollarSign,
  ChevronRight,
  MessageSquare,
  FileText,
  Users,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  UserCircle,
  BriefcaseBusiness,
  Lock,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { getStoredAuth } from '@/services/auth';

export default function FreelancerDashboardPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth) {
      setUser(auth.user);
    }
  }, []);

  const stats = [
    { label: 'Active Contracts', value: '4', icon: BriefcaseBusiness, trend: '+1', color: 'bg-blue-500' },
    { label: 'Pending Reviews', value: '2', icon: Clock, trend: '-1', color: 'bg-amber-500' },
    { label: 'Total Earnings', value: '$12,450', icon: TrendingUp, trend: '+12%', color: 'bg-emerald-500' },
    { label: 'Escrow Locked', value: '$3,200', icon: ShieldCheck, trend: 'Stable', color: 'bg-indigo-500' },
  ];

  const projects = [
    { name: 'E-commerce Redesign Next.js', client: 'Acme Corp', status: 'Frontend Architecture', budget: '$4,500', timeLeft: '2 days left' },
    { name: 'AI Writing Assistant API', client: 'TechNova', status: 'Beta Testing', budget: '$2,800', timeLeft: '5 days left' }
  ];

  return (
    <div className="mx-auto max-w-7xl px-0 py-4 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 px-8 py-12 text-white shadow-2xl">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute left-0 bottom-0 -ml-16 -mb-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Welcome, {user?.name || 'Freelancer'}!
          </h1>
          <p className="mt-4 text-xl text-slate-300 font-medium">
            Your next big opportunity is waiting. Explore jobs and build your reputation.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <button className="flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 font-bold text-white shadow-lg transition hover:bg-emerald-600 hover:scale-105 active:scale-95">
              <Sparkles size={18} />
              Find work with AI
            </button>
            <button className="rounded-full bg-white/10 px-6 py-3 font-bold text-white backdrop-blur-sm transition hover:bg-white/20">
              Boost my profile
            </button>
          </div>
        </div>
      </section>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="group rounded-2xl bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md hover:border-emerald-100">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-xl ${stat.color} bg-opacity-10 text-white`}>
                <stat.icon className={`h-5 w-5 ${stat.color.replace('bg-', 'text-')}`} />
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stat.trend.includes('+') ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {stat.trend}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-sm font-medium text-slate-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Active Projects */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <h2 className="text-2xl font-bold text-slate-900">Your Active Projects</h2>
            <Link href="#" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              View all <ChevronRight size={16} />
            </Link>
          </div>

          <div className="space-y-4">
            {projects.map((proj, idx) => (
              <div key={idx} className="flex flex-wrap items-center justify-between rounded-2xl bg-white p-6 shadow-sm border border-slate-100 transition hover:border-emerald-200">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <Briefcase size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg hover:text-emerald-600 cursor-pointer">{proj.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-sm text-slate-500 font-medium flex items-center gap-1">
                        <Users size={14} /> {proj.client}
                      </p>
                      <span className="text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-bold">{proj.status}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 mt-4 sm:mt-0">
                  <p className="text-lg font-bold text-slate-900">{proj.budget}</p>
                  <p className="text-xs font-bold text-orange-500 flex items-center gap-1">
                    <Clock size={12} /> {proj.timeLeft}
                  </p>
                  <button className="text-xs font-bold text-slate-400 hover:text-emerald-600 transition">View Details</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <ArrowUpRight size={18} className="text-emerald-600" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <button className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-sm transition group">
                <div className="flex items-center gap-3">
                  <Send size={18} className="text-slate-400 group-hover:text-emerald-600" />
                  Submit Your Work
                </div>
                <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <button className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-sm transition group">
                <div className="flex items-center gap-3">
                  <MessageSquare size={18} className="text-slate-400 group-hover:text-emerald-600" />
                  Check Messages
                </div>
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">2</span>
              </button>
              <button className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-sm transition group">
                <div className="flex items-center gap-3">
                  <Lock size={18} className="text-slate-400 group-hover:text-emerald-600" />
                  Escrow Balance
                </div>
                <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-lg overflow-hidden relative">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 bg-white/10 rounded-full blur-2xl" />
            <h3 className="text-lg font-bold mb-2">Build Influence</h3>
            <p className="text-sm text-emerald-100 mb-6">Complete your profile to 100% and get noticed by premium clients.</p>
            <button className="w-full bg-white text-emerald-700 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-50 transition shadow-sm">
              Complete Profile
            </button>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Onboarding Completion</h3>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
              <span>Profile Progress</span>
              <span className="text-emerald-600">65%</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '65%' }} />
            </div>
            <p className="mt-4 text-xs text-slate-500 font-medium">Add skills and category to reach 100%.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
