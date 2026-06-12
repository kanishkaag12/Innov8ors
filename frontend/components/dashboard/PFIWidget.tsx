import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

type Props = {
  score: number;
  status: string;
  factors?: Record<string, number>;
};

const labelMap: Record<string, string> = {
  profile_completeness: 'Profile Completion',
  identity_verification: 'Identity Verification',
  skill_verification: 'Skill Verification',
  proposal_acceptance: 'Proposal Acceptance',
  milestone_completion: 'Milestone Completion',
  on_time_delivery: 'On-Time Delivery',
  client_ratings: 'Client Ratings',
  response_rate: 'Response Rate',
  rehire_rate: 'Rehire Rate'
};

export function PFIWidget({ score, status, factors = {} }: Props) {
  const entries = Object.entries(factors)
    .filter(([key]) => key in labelMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Professional Fidelity Index</CardTitle>
          <Badge tone={status === 'Getting Started' ? 'info' : score >= 70 ? 'success' : 'warning'}>{status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex items-end justify-between">
          <p className="text-3xl font-bold text-slate-900">{score}</p>
          <p className="text-sm text-slate-500">out of 100</p>
        </div>
        <Progress value={score} />

        {entries.length > 0 ? (
          <div className="mt-4 space-y-2">
            {entries.map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{labelMap[key]}</span>
                <span className="font-semibold text-slate-900">{value}%</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Complete your profile to start building your dynamic PFI score.</p>
        )}
      </CardContent>
    </Card>
  );
}
