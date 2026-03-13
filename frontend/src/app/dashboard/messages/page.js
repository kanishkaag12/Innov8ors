'use client';

import { Search, Send, FileText, CheckCheck } from 'lucide-react';

const conversations = [
  { id: 1, name: 'Acme Corp', project: 'E-commerce Redesign Next.js', lastMessage: 'Looks great! Can you pushing the...', time: '10:42 AM', unread: 2, active: true },
  { id: 2, name: 'TechNova', project: 'AI Writing Assistant API', lastMessage: 'When can we start beta testing?', time: 'Yesterday', unread: 0, active: false },
  { id: 3, name: 'Elevate Realty', project: 'Real Estate Dashboard UI', lastMessage: 'Thank you for the quick turnover.', time: 'Oct 08', unread: 0, active: false },
];

export default function MessagesPage() {
  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col sm:flex-row gap-6 animate-in fade-in duration-500">
      {/* Sidebar: Conversation List */}
      <div className="w-full sm:w-80 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden shrink-0">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Messages</h2>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              className="w-full pl-9 pr-4 py-2 bg-white text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-shadow"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {conversations.map((conv) => (
            <div key={conv.id} className={`p-4 flex gap-3 cursor-pointer transition-colors ${conv.active ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-bold text-sm shadow-sm opacity-90">
                {conv.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-0.5">
                   <p className={`text-sm truncate pr-2 ${conv.active ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>{conv.name}</p>
                   <p className={`text-[11px] whitespace-nowrap mt-0.5 ${conv.unread > 0 ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>{conv.time}</p>
                </div>
                <p className="text-xs text-slate-500 truncate mb-1">{conv.project}</p>
                <div className="flex justify-between items-center">
                  <p className={`text-sm truncate ${conv.unread > 0 ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>{conv.lastMessage}</p>
                  {conv.unread > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow-sm shrink-0">
                      {conv.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content: Chat Window */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
             <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-bold text-sm shadow-sm">
                A
              </div>
             <div>
               <h3 className="font-bold text-slate-900 leading-tight">Acme Corp</h3>
               <p className="text-xs text-slate-500">E-commerce Redesign Next.js • Online</p>
             </div>
          </div>
          <button className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-100 transition">
            View Contract
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-50 space-y-6">
          <div className="flex justify-center">
             <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest bg-white border border-slate-100 px-3 py-1 rounded-full shadow-sm">Today</span>
          </div>
          
          <div className="flex gap-3 max-w-[85%]">
             <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-bold text-xs shadow-sm mt-auto">
                A
              </div>
             <div>
               <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-sm shadow-sm text-sm text-slate-700">
                 Hi! Are you ready to submit the frontend architecture document? We're excited to review it.
               </div>
               <p className="text-[11px] text-slate-400 mt-1 ml-1">10:30 AM</p>
             </div>
          </div>

          <div className="flex gap-3 max-w-[85%] self-end ml-auto flex-row-reverse">
             <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-white font-bold text-xs shadow-sm mt-auto">
                Y
              </div>
             <div className="flex flex-col items-end">
               <div className="bg-emerald-600 text-white p-3 rounded-2xl rounded-br-sm shadow-sm text-sm border border-emerald-700/20">
                 Yes, I just finished the final revisions. I'm attaching the PDF right now.
               </div>
               <div className="flex items-center gap-1 mt-1 mr-1">
                 <p className="text-[11px] text-slate-400">10:41 AM</p>
                 <CheckCheck size={14} className="text-emerald-500" />
               </div>
             </div>
          </div>
          
          <div className="flex gap-3 max-w-[85%] self-end ml-auto flex-row-reverse">
             <div className="w-8 shrink-0" /> {/* Spacer */}
             <div className="flex flex-col items-end w-full max-w-sm">
               <div className="flex items-center gap-3 bg-white border border-slate-200 p-3 rounded-2xl rounded-br-sm shadow-sm text-sm w-full cursor-pointer hover:border-emerald-200 transition">
                 <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                   <FileText size={20} />
                 </div>
                 <div className="flex-1 min-w-0">
                   <p className="font-semibold text-slate-900 truncate">frontend_architecture_v1.pdf</p>
                   <p className="text-xs text-slate-500">2.4 MB PDF Document</p>
                 </div>
               </div>
               <div className="flex items-center gap-1 mt-1 mr-1">
                 <p className="text-[11px] text-slate-400">10:41 AM</p>
                 <CheckCheck size={14} className="text-emerald-500" />
               </div>
             </div>
          </div>
          
          <div className="flex gap-3 max-w-[85%]">
             <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-bold text-xs shadow-sm mt-auto">
                A
              </div>
             <div>
               <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-sm shadow-sm text-sm text-slate-700 flex items-center gap-1">
                 <div className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" />
                 <div className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                 <div className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
               </div>
             </div>
          </div>

        </div>

        {/* Chat Input */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
          <div className="relative flex items-center">
            <input 
              type="text" 
              placeholder="Type your message..." 
              className="w-full pl-4 pr-12 py-3 bg-slate-50 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-shadow"
            />
            <button className="absolute right-2 h-8 w-8 flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm">
              <Send size={14} className="-ml-0.5 mt-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
