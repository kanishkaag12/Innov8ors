import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Props = {
  title: string;
  description: string;
  primaryAction: string;
  secondaryAction: string;
};

export function EmptyState({ title, description, primaryAction, secondaryAction }: Props) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-10 text-center">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">{description}</p>
        <div className="mt-5 flex justify-center gap-3">
          <Button>{primaryAction}</Button>
          <Button variant="outline">{secondaryAction}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
