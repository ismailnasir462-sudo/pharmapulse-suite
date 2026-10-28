import React from 'react';
import { Search, Bell, User } from 'lucide-react';

export default function Header({ userTitle = "Main Dashboard" }) {
  return (
    <header className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{userTitle}</h1>
        <p className="text-sm text-slate-500 font-medium">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search drugs, patients, orders..." 
            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-pharmacy-500/20 focus:border-pharmacy-500 transition-all shadow-sm"
          />
        </div>

        {/* Notifications */}
        <button className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all relative shadow-sm">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full"></span>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-md">
            IN
          </div>
          <div className="hidden sm:block">
            <h4 className="text-xs font-bold text-slate-900 leading-tight">Ismaila Nasiru</h4>
            <span className="text-[11px] text-slate-500 font-medium">Lead Pharmacist</span>
          </div>
        </div>
      </div>
    </header>
  );
}