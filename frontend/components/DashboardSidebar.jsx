'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Briefcase, LayoutDashboard, LogOut, MessageSquare, Settings, ShieldCheck, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { clearAuth, getStoredAuth } from '../services/auth';

const sidebarLinks = [
  { href: '/dashboard/employer', label: 'Employer Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/freelancer', label: 'Freelancer Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/contracts', label: 'My Contracts', icon: Briefcase },
  { href: '/dashboard/escrow', label: 'Escrow Dashboard', icon: ShieldCheck },
  { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState(null);

  useEffect(() => {
    const auth = getStoredAuth();
    setRole(auth?.user?.role || null);
  }, []);

  const handleLogout = () => {
    clearAuth();
    window.localStorage.removeItem('token');
    router.replace('/login');
  };

  const filteredLinks = sidebarLinks.filter(link => {
    if (role === 'freelancer' && link.href === '/dashboard/employer') return false;
    if (role === 'employer' && link.href === '/dashboard/freelancer') return false;
    if (role === 'employer' && link.href === '/dashboard/contracts') return false;
    return true;
  });

  return (
    <aside className="w-64 bg-slate-50 border-r border-gray-200 px-4 py-6 min-h-screen text-slate-800 flex flex-col transition-all">
      <div className="mb-8 flex items-center gap-3 px-2">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm">
          <ShieldCheck size={22} className="text-white" />
        </span>
        <div>
          <p className="font-bold text-slate-900 tracking-wide text-[17px]">SynapEscrow</p>
          <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">Workspace</p>
        </div>
      </div>

      <nav className="space-y-2 flex-1">
        {filteredLinks.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 border-l-4 ${
                isActive
                  ? 'bg-emerald-100 text-emerald-700 font-medium border-emerald-500'
                  : 'border-transparent text-slate-600 hover:bg-gray-100 hover:text-slate-900'
              }`}
            >
              <Icon 
                size={18} 
                className={`transition-colors ${isActive ? 'text-emerald-700' : 'text-gray-500 group-hover:text-emerald-600'}`} 
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
