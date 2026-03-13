'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, LogOut, Settings, User } from 'lucide-react';
import Link from 'next/link';
import DashboardSidebar from '../../../components/DashboardSidebar';
import EmployerNavbar from '../../../components/employer/EmployerNavbar';
import FreelancerNavbar from '../../../components/freelancer/FreelancerNavbar';
import { clearAuth, getStoredAuth } from '@/services/auth';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('User');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const auth = getStoredAuth();
    
    if (!auth || !auth.token) {
      router.replace('/login');
      return;
    }
    
    setUser(auth.user);
    setUserName(auth.user?.name || 'User');

    const role = auth.user?.role;
    const isEmployerRoute = pathname.startsWith('/dashboard/employer');
    const isFreelancerRoute = pathname.startsWith('/dashboard/freelancer') || pathname.startsWith('/dashboard/contracts');

    if (role === 'freelancer' && isEmployerRoute) {
      router.replace('/dashboard/freelancer');
      return;
    }
    
    if (role === 'employer' && isFreelancerRoute) {
      router.replace('/dashboard/employer');
      return;
    }

    setIsAuthorized(true);
  }, [router, pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const handleLogout = () => {
    clearAuth();
    window.localStorage.removeItem('token');
    router.replace('/login');
  };

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm font-medium text-slate-500">Checking authentication...</p>
      </div>
    );
  }

  // Employer uses a full-width layout with a top navbar (Upwork style)
  if (user?.role === 'employer') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
        <EmployerNavbar user={user} />
        <main className="flex-1 w-full animate-in fade-in duration-700">
          {children}
        </main>
      </div>
    );
  }

  // Freelancer also uses a full-width layout with a top navbar
  if (user?.role === 'freelancer') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
        <FreelancerNavbar user={user} />
        <main className="flex-1 w-full animate-in fade-in duration-700">
          {children}
        </main>
      </div>
    );
  }

  // Fallback for others (admin etc) uses the sidebar layout
  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="hidden lg:block">
        <DashboardSidebar />
      </div>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-sm animate-in fade-in slide-in-from-top-2">
          <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
          {/* ... existing header content ... */}
        </header>
        <main className="flex-1 p-6 animate-in slide-in-from-bottom-2 duration-500">{children}</main>
      </div>
    </div>
  );
}
