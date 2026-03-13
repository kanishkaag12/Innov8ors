'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Menu, ShieldCheck, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { clearAuth, getStoredAuth } from '../services/auth';

const guestLinks = [
  { href: '/', label: 'Home' },
  { href: '/login', label: 'Login' },
  { href: '/signup', label: 'Signup' }
];

const authLinks = [
  { href: '/', label: 'Home' },
  { href: '/dashboard/employer', label: 'Employer Dashboard' },
  { href: '/dashboard/freelancer', label: 'Freelancer Dashboard' },
  { href: '/dashboard/escrow', label: 'Escrow Dashboard' }
];

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const auth = getStoredAuth();
    const token = auth?.token || window.localStorage.getItem('token');
    setLoggedIn(Boolean(token));
  }, [pathname]);

  useEffect(() => {
    const handleStorage = () => {
      const auth = getStoredAuth();
      const token = auth?.token || window.localStorage.getItem('token');
      setLoggedIn(Boolean(token));
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const items = useMemo(() => (loggedIn ? authLinks : guestLinks), [loggedIn]);

  const handleLogout = () => {
    clearAuth();
    window.localStorage.removeItem('token');
    setIsOpen(false);
    setLoggedIn(false);
    window.location.href = '/login';
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="inline-flex items-center gap-3 text-slate-900">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 via-emerald-500 to-cyan-600 text-white shadow-lg shadow-teal-500/20">
            <ShieldCheck size={20} />
          </span>
          <span>
            <span className="block text-lg font-extrabold tracking-tight">SynapEscrow</span>
            <span className="block text-xs font-medium text-slate-500">Trusted milestone escrow</span>
          </span>
        </Link>

        <button
          type="button"
          className="inline-flex rounded-xl border border-slate-200 p-2 text-slate-700 transition hover:bg-slate-50 md:hidden"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Toggle navigation"
          aria-expanded={isOpen}
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav className="hidden items-center gap-3 md:flex">
          {items.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          {loggedIn ? (
            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
            >
              Logout
            </button>
          ) : null}
        </nav>
      </div>

      {isOpen ? (
        <motion.nav
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="border-t border-slate-200 bg-white px-6 py-4 md:hidden"
        >
          <div className="flex flex-col gap-2">
            {items.map((item) => {
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                    active
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {loggedIn ? (
              <button
                onClick={handleLogout}
                className="mt-1 rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-600"
              >
                Logout
              </button>
            ) : null}
          </div>
        </motion.nav>
      ) : null}
    </header>
  );
}
