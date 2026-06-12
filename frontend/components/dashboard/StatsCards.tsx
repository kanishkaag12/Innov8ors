import React from 'react';
import { BriefcaseBusiness, Send, Eye, Wallet, ShieldCheck, GaugeCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { QuickStats } from './types';

type Props = {
  stats: QuickStats;
};

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export function StatsCards({ stats }: Props) {
  const items = [
    { key: 'contracts', label: 'Active Contracts', value: String(stats.activeContracts), icon: BriefcaseBusiness },
    { key: 'proposals', label: 'Proposals Sent', value: String(stats.proposalsSent), icon: Send },
    { key: 'views', label: 'Profile Views', value: String(stats.profileViews), icon: Eye },
    { key: 'earnings', label: 'Earnings', value: INR.format(stats.earnings || 0), icon: Wallet },
    { key: 'escrow', label: 'Escrow Balance', value: INR.format(stats.escrowBalance || 0), icon: ShieldCheck },
    { key: 'pfi', label: 'PFI Score', value: `${stats.pfiScore} (${stats.pfiStatus})`, icon: GaugeCircle }
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Card key={item.key} className="border-slate-200">
          <CardContent className="pt-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className="mt-2 text-xl font-bold text-slate-900">{item.value}</p>
              </div>
              <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                <item.icon size={18} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
