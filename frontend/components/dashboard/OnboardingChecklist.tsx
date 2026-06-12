import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { OnboardingItem } from './types';

type Props = {
  items: OnboardingItem[];
  progress: number;
};

export function OnboardingChecklist({ items, progress }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Onboarding Checklist</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="text-slate-600">Progress</span>
          <span className="font-semibold text-emerald-700">{progress}%</span>
        </div>
        <Progress value={progress} />
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              {item.completed ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Circle size={16} className="text-slate-400" />}
              <span className={item.completed ? 'text-slate-700' : 'text-slate-500'}>{item.label}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
