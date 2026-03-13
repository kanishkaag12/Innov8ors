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
  Briefcase
} from 'lucide-react';
import { clearAuth } from '@/services/auth';
import { useRouter } from 'next/navigation';

export default function EmployerNavbar({ user }) {
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
            <Link href="/dashboard/employer" className="flex items-center gap-2 text-green-600 font-bold text-xl tracking-tight">
              <ShieldCheck size={28} />
              <span className="hidden sm:inline">SynapEscrow</span>
            </Link>

            <div className="hidden lg:flex items-center gap-2">
              <NavItem label="Hire Talent" name="hire">
                <div className="p-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">Manage jobs and offers</p>
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600">
                    <Layout size={16} /> Job posts and proposals
                  </Link>
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600">
                    <FileText size={16} /> Pending offers
                  </Link>
                  <div className="my-2 border-t border-slate-100" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">Find freelancers</p>
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600">
                    <Plus size={16} /> Post a job
                  </Link>
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600">
                    <SearchIcon size={16} /> Search for talent
                  </Link>
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600">
                    <Users size={16} /> Talent you've hired
                  </Link>
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600">
                    <Heart size={16} /> Talent you've saved
                  </Link>
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600">
                    <ClipboardList size={16} /> Direct contracts
                  </Link>
                </div>
              </NavItem>

              <NavItem label="Manage Work" name="work">
                <div className="p-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">Active and past work</p>
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600">
                    <Briefcase size={16} /> Your contracts
                  </Link>
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600">
                    <Clock size={16} /> Timesheets
                  </Link>
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600">
                    <Users size={16} /> Time by freelancer
                  </Link>
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600">
                    <FileText size={16} /> Work diaries
                  </Link>
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600 text-xs text-slate-400 italic">
                    Custom export (Coming soon)
                  </Link>
                </div>
              </NavItem>

              <NavItem label="Reports" name="reports">
                <div className="p-2">
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600">
                    <BarChart2 size={16} /> Weekly financial summary
                  </Link>
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600">
                    <ClipboardList size={16} /> Transaction history
                  </Link>
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600">
                    <BarChart2 size={16} /> Spending by activity
                  </Link>
                </div>
              </NavItem>

              <Link href="/dashboard/messages" className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-green-600">
                Messages
              </Link>
            </div>
          </div>

          {/* Right Side: Search, Talent Dropdown, UI Elements */}
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
                  onClick={() => toggleDropdown('talentSearch')}
                  className="ml-2 flex items-center gap-1 border-l border-slate-300 pl-2 text-xs font-bold text-slate-600 hover:text-green-600"
                >
                  Talent
                  <ChevronDown size={12} />
                </button>
              </div>
              {openDropdown === 'talentSearch' && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white p-2 shadow-xl ring-1 ring-black ring-opacity-5 z-50">
                  <Link href="#" className="flex flex-col rounded-lg px-3 py-2 hover:bg-slate-50 group/item">
                    <span className="text-sm font-bold text-slate-700 group-hover/item:text-green-600">Talent</span>
                    <span className="text-[11px] text-slate-400">Find freelancers and agencies</span>
                  </Link>
                  <Link href="#" className="flex flex-col rounded-lg px-3 py-2 hover:bg-slate-50 group/item">
                    <span className="text-sm font-bold text-slate-700 group-hover/item:text-green-600">Projects</span>
                    <span className="text-[11px] text-slate-400">See projects from other professionals</span>
                  </Link>
                  <Link href="#" className="flex flex-col rounded-lg px-3 py-2 hover:bg-slate-50 group/item">
                    <span className="text-sm font-bold text-slate-700 group-hover/item:text-green-600">Jobs</span>
                    <span className="text-[11px] text-slate-400">View jobs posted by clients</span>
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
                {user?.name?.charAt(0).toUpperCase() || 'E'}
              </button>
              {openDropdown === 'profile' && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white p-2 shadow-xl ring-1 ring-black ring-opacity-5 z-50">
                  <div className="px-3 py-2 mb-2 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-900 truncate">{user?.name}</p>
                    <p className="text-[11px] text-slate-400 font-medium">Basic Membership</p>
                  </div>
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600">
                    <HeartPulse size={16} /> Account health
                  </Link>
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600">
                    <Award size={16} /> Membership plan
                  </Link>
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600">
                    <UserPlus size={16} /> Invite coworker
                  </Link>
                  <div className="my-1 border-t border-slate-100" />
                  <Link href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-green-600 text-xs">
                    <Moon size={16} /> Theme toggle
                  </Link>
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
