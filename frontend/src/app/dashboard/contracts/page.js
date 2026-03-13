'use client';

import { Briefcase, ChevronRight, Download, Eye, Upload } from 'lucide-react';
import Link from 'next/link';

const contracts = [
  {
    id: 1,
    project: 'E-commerce Redesign Next.js',
    client: 'Acme Corp',
    budget: '$4,500',
    milestone: 'Frontend Architecture',
    status: 'In Progress',
    statusColor: 'bg-blue-100 text-blue-700',
    deadline: 'Oct 24, 2026'
  },
  {
    id: 2,
    project: 'AI Writing Assistant API',
    client: 'TechNova',
    budget: '$2,800',
    milestone: 'Beta Testing',
    status: 'Review',
    statusColor: 'bg-amber-100 text-amber-700',
    deadline: 'Oct 15, 2026'
  },
  {
    id: 3,
    project: 'Real Estate Dashboard UI',
    client: 'Elevate Realty',
    budget: '$1,200',
    milestone: 'Final Handoff',
    status: 'Completed',
    statusColor: 'bg-emerald-100 text-emerald-700',
    deadline: 'Oct 02, 2026'
  }
];

export default function ContractsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">My Contracts</h2>
          <p className="mt-1 text-sm text-slate-500">
            View and manage all your active and past freelancer contracts.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="border-b border-slate-200 bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-600">Project</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Client</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Budget</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Milestone</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Deadline</th>
                <th className="px-6 py-4 font-semibold text-slate-600">Status</th>
                <th className="px-6 py-4 font-semibold text-slate-600 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contracts.map((contract) => (
                <tr key={contract.id} className="transition-colors hover:bg-slate-50/50 group">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">{contract.project}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <p className="font-medium text-slate-700">{contract.client}</p>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">{contract.budget}</td>
                  <td className="px-6 py-4 text-slate-600">{contract.milestone}</td>
                  <td className="px-6 py-4 text-slate-600">{contract.deadline}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${contract.statusColor}`}>
                      {contract.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-100">
                        {contract.status === 'In Progress' ? (
                          <>
                            <Upload size={14} /> Submit Work
                          </>
                        ) : (
                          <>
                            <Eye size={14} /> View Details
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
