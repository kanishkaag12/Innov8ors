'use client';

import { CheckCircle2, DollarSign, Lock, Unlock } from 'lucide-react';

const escrowStats = [
  {
    title: 'Total Escrow Locked',
    value: '$4,500',
    icon: Lock,
    wrapperClass: 'bg-purple-50 text-purple-600'
  },
  {
    title: 'Pending Release',
    value: '$2,800',
    icon: Unlock,
    wrapperClass: 'bg-amber-50 text-amber-600'
  },
  {
    title: 'Released Payments',
    value: '$12,450',
    icon: CheckCircle2,
    wrapperClass: 'bg-emerald-50 text-emerald-600'
  }
];

const transactions = [
  {
    id: '#TRX-9482',
    project: 'E-commerce Redesign Next.js',
    client: 'Acme Corp',
    milestone: 'Frontend Architecture',
    amount: '$1,500',
    status: 'Locked',
    statusClass: 'bg-purple-100 text-purple-700',
    date: 'Oct 21, 2026'
  },
  {
    id: '#TRX-9481',
    project: 'AI Writing Assistant API',
    client: 'TechNova',
    milestone: 'Beta Testing',
    amount: '$2,800',
    status: 'Pending Release',
    statusClass: 'bg-amber-100 text-amber-700',
    date: 'Oct 19, 2026'
  },
  {
    id: '#TRX-9480',
    project: 'AI Writing Assistant API',
    client: 'TechNova',
    milestone: 'Initial Setup',
    amount: '$1,000',
    status: 'Released',
    statusClass: 'bg-emerald-100 text-emerald-700',
    date: 'Oct 10, 2026'
  },
  {
    id: '#TRX-9479',
    project: 'Real Estate Dashboard UI',
    client: 'Elevate Realty',
    milestone: 'Final Delivery',
    amount: '$1,200',
    status: 'Released',
    statusClass: 'bg-emerald-100 text-emerald-700',
    date: 'Oct 02, 2026'
  }
];

export default function EscrowDashboardPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Escrow Dashboard</h2>
        <p className="mt-1 text-sm text-slate-500">
          Track escrow deposits, pending milestones, and released payments securely.
        </p>
      </div>

      <section className="grid gap-6 sm:grid-cols-3">
        {escrowStats.map((stat, i) => (
          <article key={i} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex items-center gap-4">
             <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${stat.wrapperClass}`}>
                <stat.icon size={24} />
             </div>
             <div>
               <p className="text-sm font-medium text-slate-500">{stat.title}</p>
               <p className="mt-0.5 text-2xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
             </div>
          </article>
        ))}
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Escrow Transactions</h3>
        
        <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="border-b border-slate-200 bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-600">Project</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">Client</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">Milestone</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">Amount</th>
                  <th className="px-6 py-4 font-semibold text-slate-600">Status</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((trx, i) => (
                  <tr key={i} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{trx.project}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{trx.id}</p>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{trx.client}</td>
                    <td className="px-6 py-4 text-slate-600">{trx.milestone}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{trx.amount}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${trx.statusClass}`}>
                        {trx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500">{trx.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
