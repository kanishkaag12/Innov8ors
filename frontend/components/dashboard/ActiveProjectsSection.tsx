import React from 'react';
import { BriefcaseBusiness, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from './EmptyState';
import type { DashboardProject } from './types';

type Props = {
  projects: DashboardProject[];
  onProjectClick?: (project: DashboardProject) => void;
};

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export function ActiveProjectsSection({ projects, onProjectClick }: Props) {
  if (!projects.length) {
    return (
      <EmptyState
        title="No Active Projects Yet"
        description="Apply to jobs and start building your reputation on SynapEscrow."
        primaryAction="Browse Jobs"
        secondaryAction="Find AI Matches"
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Projects</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {projects.map((project) => (
          <article
            key={project.id}
            onClick={() => onProjectClick?.(project)}
            className="rounded-xl border border-slate-200 p-4 transition-all duration-200 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/20 hover:shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-900 group-hover:text-emerald-700">{project.title}</p>
                <p className="mt-1 text-sm text-slate-500">{project.description || 'No description available.'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1"><BriefcaseBusiness size={14} /> {project.employerName}</span>
                  <span className="inline-flex items-center gap-1"><CalendarDays size={14} /> {new Date(project.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-900">{INR.format(project.budget || 0)}</p>
            </div>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}
