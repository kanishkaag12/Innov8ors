'use client';

import { ShieldAlert, KeyRound, Bell, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Account Settings</h2>
        <p className="mt-1 text-sm text-slate-500">
          Manage your account security, passwords, and notifications.
        </p>
      </div>

      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
           <div className="p-6 border-b border-slate-100 flex items-center gap-3">
             <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
               <KeyRound size={20} />
             </div>
             <div>
               <h3 className="text-lg font-bold text-slate-900">Password</h3>
               <p className="text-sm text-slate-500 mt-0.5">Update your password to keep your account secure.</p>
             </div>
           </div>
           
           <div className="p-6 space-y-5 bg-slate-50/30">
             <div className="space-y-2">
               <label className="text-sm font-semibold text-slate-700">Current Password</label>
               <input 
                 type="password" 
                 placeholder="••••••••"
                 className="w-full max-w-md px-4 py-2.5 bg-white text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-shadow"
               />
             </div>
             <div className="space-y-2">
               <label className="text-sm font-semibold text-slate-700">New Password</label>
               <input 
                 type="password" 
                 placeholder="••••••••"
                 className="w-full max-w-md px-4 py-2.5 bg-white text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-shadow"
               />
             </div>
             <button className="px-5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition">
                Update Password
             </button>
           </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
           <div className="p-6 border-b border-slate-100 flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Two-Factor Authentication</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Add an extra layer of security to your account.</p>
                </div>
             </div>
             <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                <CheckCircle2 size={14} /> Enabled
             </span>
           </div>
           <div className="p-6 bg-slate-50/30">
              <button className="px-5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition">
                  Manage 2FA Settings
              </button>
           </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
           <div className="p-6 border-b border-slate-100 flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Bell size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Email Notifications</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Receive updates about milestones, escrow, and messages.</p>
                </div>
             </div>
             
             <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
           </div>
        </section>

        <section className="rounded-2xl border border-red-200 bg-white shadow-sm overflow-hidden">
           <div className="p-6 border-b border-red-100 flex items-center gap-3">
             <div className="p-2 bg-red-50 text-red-600 rounded-lg">
               <ShieldAlert size={20} />
             </div>
             <div>
               <h3 className="text-lg font-bold text-red-700">Danger Zone</h3>
               <p className="text-sm text-slate-500 mt-0.5">Permanently delete your account and all data.</p>
             </div>
           </div>
           <div className="p-6 bg-red-50/30">
              <button className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition">
                  Delete Account
              </button>
           </div>
        </section>
        
        <div className="pb-10" />

      </div>
    </div>
  );
}
