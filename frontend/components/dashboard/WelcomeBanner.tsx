import React from 'react';
import { Sparkles, BriefcaseBusiness } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  name: string;
};

export function WelcomeBanner({ name }: Props) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-900 bg-slate-900 p-7 text-white shadow-xl">
      <div className="pointer-events-none absolute -right-8 -top-10 h-44 w-44 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-10 -bottom-8 h-44 w-44 rounded-full bg-sky-500/20 blur-3xl" />
      <div className="relative z-10 max-w-2xl">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-200">
          <Sparkles size={14} /> Freelancer Command Center
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">Welcome back, {name}</h1>
        <p className="mt-3 text-sm text-slate-300 md:text-base">
          Track contracts, boost your PFI, and move faster with AI-powered career guidance.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="default" className="bg-emerald-500 hover:bg-emerald-600">
            <BriefcaseBusiness size={16} /> Browse Jobs
          </Button>
          <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
            Find AI Matches
          </Button>
        </div>
      </div>
    </section>
  );
}
