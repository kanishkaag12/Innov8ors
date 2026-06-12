import React from 'react';

type Props = {
  children: React.ReactNode;
  sidebar: React.ReactNode;
};

export function DashboardLayout({ children, sidebar }: Props) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        <main className="space-y-6">{children}</main>
        <aside className="space-y-6">{sidebar}</aside>
      </div>
    </div>
  );
}
