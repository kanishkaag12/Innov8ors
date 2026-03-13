'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Search, 
  Bell, 
  ChevronDown, 
  User, 
  Settings, 
  LogOut, 
  Plus, 
  SearchIcon, 
  Users, 
  Heart, 
  FileText, 
  ClipboardList, 
  Clock, 
  BarChart2, 
  HeartPulse, 
  Award, 
  UserPlus, 
  Moon, 
  Layout, 
  Briefcase,
  Star,
  Zap,
  CheckCircle,
  FileSearch
} from 'lucide-react';
import { clearAuth } from '@/services/auth';
import { useRouter } from 'next/navigation';

export default function FreelancerNavbar({ user }) {
  const router = useRouter();
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearAuth();
    router.replace('/login');
  };

  const NavItem = ({ label, name, children }) => (
    <div className="relative">
      <button 
        onClick={() => toggleDropdown(name)}
        className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors hover:text-green-600 ${openDropdown === name ? 'text-green-600' : 'text-slate-700'}`}
      >
        {label}
        <ChevronDown size={14} className={`transition-transform duration-200 ${openDropdown === name ? 'rotate-180' : ''}`} />
      </button>
      {openDropdown === name && (
        <div className="absolute left-0 mt-2 w-64 rounded-xl bg-white p-2 shadow-xl ring-1 ring-black ring-opacity-5 animate-in fade-in slide-in-from-top-2 z-50">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <nav className="sticky top-0 z-[100] w-full border-b border-slate-200 bg-white shadow-sm" ref={dropdownRef}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Left Side: Logo & Main Menus */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard/freelancer" className="flex items-center gap-2 text-green-600 font-bold text-xl tracking-tight">
              <ShieldCheck size={28} />
              <span className="hidden sm:inline">SynapEscrow</span>
            </Link>

            <div className="hidden lg:flex items-center gap-2">
              <NavItem label="Find Work" name="findWork">
                <div className="p-2">
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600">
                    <SearchIcon size={16} /> Search for jobs
                  </Link>
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600">
                    <Heart size={16} /> Saved jobs
                  </Link>
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600">
                    <FileSearch size={16} /> My proposals
                  </Link>
                  <div className="my-2 border-t border-slate-100" />
                  <Link href="/profile" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600">
                    <User size={16} /> Profile
                  </Link>
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600">
                    <Star size={16} /> My stats
                  </Link>
                </div>
              </NavItem>

              <NavItem label="My Jobs" name="myJobs">
                <div className="p-2">
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600">
                    <Briefcase size={16} /> My jobs
                  </Link>
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600">
                    <FileText size={16} /> All contracts
                  </Link>
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600">
                    <Clock size={16} /> Work diary
                  </Link>
                </div>
              </NavItem>

              <NavItem label="Reports" name="reports">
                <div className="p-2">
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600">
                    <BarChart2 size={16} /> Billings & earnings
                  </Link>
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600">
                    <ClipboardList size={16} /> Transaction history
                  </Link>
                </div>
              </NavItem>

              <Link href="/dashboard/messages" className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-green-600">
                Messages
              </Link>
            </div>
          </div>

          {/* Right Side: Search, UI Elements */}
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block group">
              <div className="flex items-center bg-slate-100 rounded-full pl-3 pr-2 py-1.5 focus-within:ring-2 focus-within:ring-green-500/20 focus-within:bg-white border border-transparent focus-within:border-green-500 transition-all">
                <Search size={16} className="text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search" 
                  className="bg-transparent text-sm ml-2 w-32 focus:w-48 transition-all outline-none text-slate-700"
                />
                <button 
                  onClick={() => toggleDropdown('searchOptions')}
                  className="ml-2 flex items-center gap-1 border-l border-slate-300 pl-2 text-xs font-bold text-slate-600 hover:text-green-600"
                >
                  Jobs
                  <ChevronDown size={12} />
                </button>
              </div>
              {openDropdown === 'searchOptions' && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white p-2 shadow-xl ring-1 ring-black ring-opacity-5 z-50">
                  <Link href="#" className="flex flex-col rounded-lg px-3 py-2 hover:bg-slate-50 group/item">
                    <span className="text-sm font-bold text-slate-700 group-hover/item:text-green-600">Jobs</span>
                    <span className="text-[11px] text-slate-400">Find work for your skills</span>
                  </Link>
                  <Link href="#" className="flex flex-col rounded-lg px-3 py-2 hover:bg-slate-50 group/item">
                    <span className="text-sm font-bold text-slate-700 group-hover/item:text-green-600">Talent</span>
                    <span className="text-[11px] text-slate-400">Hire freelancers like you</span>
                  </Link>
                </div>
              )}
            </div>

            <button className="relative p-2 text-slate-400 hover:bg-slate-50 hover:text-green-600 rounded-full transition">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border-2 border-white" />
            </button>

            {/* Profile Avatar & Dropdown */}
            <div className="relative">
              <button 
                onClick={() => toggleDropdown('profile')}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white font-bold text-xs shadow-sm hover:scale-105 transition-transform"
              >
                {user?.name?.charAt(0).toUpperCase() || 'F'}
              </button>
              {openDropdown === 'profile' && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white p-2 shadow-xl ring-1 ring-black ring-opacity-5 z-50">
                  <div className="px-3 py-2 mb-2 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-900 truncate">{user?.name}</p>
                    <p className="text-[11px] text-slate-400 font-medium">Freelancer</p>
                  </div>
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600">
                    <HeartPulse size={16} /> Account health
                  </Link>
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600">
                    <Award size={16} /> Membership plan
                  </Link>
                  <div className="my-1 border-t border-slate-100" />
                  <Link href="/dashboard/settings" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600">
                    <Settings size={16} /> Account settings
                  </Link>
                  <div className="my-1 border-t border-slate-100" />
                  <button 
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
