import React from 'react';

type ProgressProps = {
  value: number;
};

export function Progress({ value }: ProgressProps) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  return (
    <div className="h-2 w-full rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${safe}%` }} />
    </div>
  );
}
