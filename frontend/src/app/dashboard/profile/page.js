'use client';

import { Save, UploadCloud } from 'lucide-react';

export default function ProfilePage() {
  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Profile Management</h2>
        <p className="mt-1 text-sm text-slate-500">
          Update your personal info, portfolio, and availability.
        </p>
      </div>

      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">Personal Information</h3>
          
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Full Name</label>
                <input 
                  type="text" 
                  defaultValue="Jane Doe"
                  className="w-full px-4 py-2.5 bg-slate-50 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-shadow"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Email Address</label>
                <input 
                  type="email" 
                  defaultValue="jane.doe@example.com"
                  readOnly
                  className="w-full px-4 py-2.5 bg-slate-100 text-slate-500 text-sm border border-slate-200 rounded-xl cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Professional Title</label>
              <input 
                type="text" 
                defaultValue="Senior Next.js Developer"
                className="w-full px-4 py-2.5 bg-slate-50 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-shadow"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Bio</label>
              <textarea 
                rows={4}
                defaultValue="I am a passionate software engineer specializing in modern React frameworks and clean UI/UX."
                className="w-full px-4 py-2.5 bg-slate-50 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-shadow resize-none"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Skills (Comma separated)</label>
              <input 
                type="text" 
                defaultValue="Next.js, React, TailwindCSS, Node.js"
                className="w-full px-4 py-2.5 bg-slate-50 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-shadow"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-900">Portfolio</h3>
          </div>
          
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition cursor-pointer">
            <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3">
              <UploadCloud size={24} />
            </div>
            <p className="text-sm font-semibold text-slate-900">Click to upload or drag and drop</p>
            <p className="text-xs text-slate-500 mt-1">SVG, PNG, JPG or PDF (max. 10MB)</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Availability Status</h3>
              <p className="text-sm text-slate-500 mt-0.5">Let clients know if you are open to new contracts.</p>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>
        </section>

        <div className="flex justify-end gap-3 pt-2 pb-10">
          <button className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">
            Cancel
          </button>
          <button className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition flex items-center gap-2 shadow-sm">
            <Save size={16} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
