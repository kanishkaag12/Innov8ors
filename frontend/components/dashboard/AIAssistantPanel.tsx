import React from 'react';
import { Lightbulb, Target, WandSparkles, Briefcase, CheckCircle, XCircle, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type RecommendedJob = {
  title?: string;
  job_title?: string;
  matchScore?: number;
  overlappingSkills?: string[];
  missingSkills?: string[];
};

type Props = {
  profileSuggestions: string[];
  missingSkills: string[];
  recommendedJobs: (string | RecommendedJob)[];
  proposalTips: string[];
};

function Section({ icon: Icon, title, items }: { icon: any; title: string; items: string[] }) {
  return (
    <div className="space-y-2">
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Icon size={16} className="text-emerald-600" /> {title}
      </p>
      {items.length ? (
        <ul className="space-y-1 text-sm text-slate-600">
          {items.slice(0, 4).map((item, index) => (
            <li key={`${title}-${index}`} className="rounded-md bg-slate-50 px-2.5 py-1.5">{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">No suggestions right now.</p>
      )}
    </div>
  );
}

function JobMatchBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
    score >= 50 ? 'bg-amber-100 text-amber-700 border-amber-200' :
    'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${color}`}>
      <Percent size={10} />
      {score}% match
    </span>
  );
}

function RecommendedJobCard({ job }: { job: RecommendedJob }) {
  const title = job.title || job.job_title || 'Untitled Job';
  const score = job.matchScore ?? null;
  const matching = job.overlappingSkills || [];
  const missing = job.missingSkills || [];

  return (
    <li className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800 leading-snug">{title}</p>
        {score !== null && <JobMatchBadge score={score} />}
      </div>
      {matching.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {matching.slice(0, 4).map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold"
            >
              <CheckCircle size={9} />
              {skill}
            </span>
          ))}
        </div>
      )}
      {missing.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {missing.slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 text-rose-600 px-2 py-0.5 text-[10px] font-semibold"
            >
              <XCircle size={9} />
              {skill}
            </span>
          ))}
          {missing.length > 3 && (
            <span className="text-[10px] text-slate-400 italic self-center">+{missing.length - 3} more gaps</span>
          )}
        </div>
      )}
    </li>
  );
}

export function AIAssistantPanel({ profileSuggestions, missingSkills, recommendedJobs, proposalTips }: Props) {
  // Normalize recommendedJobs — can be string[] (legacy) or RecommendedJob[]
  const normalizedJobs: RecommendedJob[] = recommendedJobs.map((job) =>
    typeof job === 'string' ? { title: job } : job
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2"><WandSparkles size={16} className="text-emerald-600" /> AI Career Assistant</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <Section icon={Lightbulb} title="Profile Completion Suggestions" items={profileSuggestions} />
        <Section icon={Target} title="Missing Skills" items={missingSkills} />

        {/* Recommended Jobs — Rich Cards */}
        <div className="space-y-2">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Briefcase size={16} className="text-emerald-600" /> Recommended Jobs
          </p>
          {normalizedJobs.length ? (
            <ul className="space-y-2">
              {normalizedJobs.slice(0, 4).map((job, index) => (
                <RecommendedJobCard key={index} job={job} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No job recommendations yet. Complete your profile to unlock matches.</p>
          )}
        </div>

        <Section icon={Lightbulb} title="Proposal Tips" items={proposalTips} />
      </CardContent>
    </Card>
  );
}
