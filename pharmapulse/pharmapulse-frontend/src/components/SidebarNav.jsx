import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Pill, 
  Users, 
  FileCheck, 
  ShieldCheck, 
  LogOut,
  Bot,
  BarChart3,
  Settings,
  Truck,
  Sparkles
} from 'lucide-react';

export default function SidebarNav({ currentRole = 'CASHIER', activeTab, setActiveTab, onLogout }) {
  // Navigation structure organized by sections and role permissions
  const menuGroups = [
    {
      title: "CORE MENU",
      items: [
        { 
          id: 'dashboard', 
          label: 'Dashboard Overview', 
          icon: LayoutDashboard, 
          roles: ['SUPER_ADMIN', 'LEAD_PHARMACIST', 'PHARMACIST', 'INVENTORY_MANAGER', 'CASHIER'] 
        },
        { 
          id: 'pos', 
          label: 'POS Cashier Terminal', 
          icon: ShoppingCart, 
          roles: ['SUPER_ADMIN', 'LEAD_PHARMACIST', 'PHARMACIST', 'CASHIER'] 
        },
        { 
          id: 'inventory', 
          label: 'Inventory & FEFO Batches', 
          icon: Pill, 
          roles: ['SUPER_ADMIN', 'LEAD_PHARMACIST', 'PHARMACIST', 'INVENTORY_MANAGER'] 
        },
        { 
          id: 'verification', 
          label: 'Prescription Queue', 
          icon: FileCheck, 
          roles: ['SUPER_ADMIN', 'LEAD_PHARMACIST', 'PHARMACIST'] 
        },
        { 
          id: 'patients', 
          label: 'Patients & Refills', 
          icon: Users, 
          roles: ['SUPER_ADMIN', 'LEAD_PHARMACIST', 'PHARMACIST', 'CASHIER'] 
        },
      ]
    },
    {
      title: "ADMIN & OPERATIONS",
      items: [
        { 
          id: 'staff', 
          label: 'Staff Onboarding', 
          icon: ShieldCheck, 
          roles: ['SUPER_ADMIN'] 
        },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 h-screen sticky top-0 flex flex-col justify-between p-5 shadow-sm select-none z-20">
      <div>
        
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 rounded-2xl bg-pharmacy-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-pharmacy-600/30">
            P
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-slate-900 tracking-tight leading-none">
              PharmaPulse
            </h1>
            <span className="text-[10px] bg-pharmacy-50 text-pharmacy-700 font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider mt-1.5 inline-flex items-center gap-1 border border-pharmacy-200/60">
              <Sparkles className="w-2.5 h-2.5 text-pharmacy-600" />
              {currentRole.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Grouped Menu List */}
        <nav className="space-y-6">
          {menuGroups.map((group, groupIdx) => {
            const visibleItems = group.items.filter(item => item.roles.includes(currentRole));
            if (visibleItems.length === 0) return null;

            return (
              <div key={groupIdx} className="space-y-1.5">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-3.5 mb-2 block">
                  {group.title}
                </span>

                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-bold text-xs transition-all ${
                        isActive
                          ? 'bg-pharmacy-600 text-white shadow-md shadow-pharmacy-600/25'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </div>

      {/* User Footer Card & Logout */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-extrabold text-xs border border-slate-200/60">
            {currentRole === 'CASHIER' ? 'CA' : 'AD'}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900 leading-snug">
              {currentRole === 'CASHIER' ? 'Cashier Duty' : 'Active Admin'}
            </p>
            <span className="text-[10px] text-slate-400 font-medium block">
              Counter #01
            </span>
          </div>
        </div>

        <button
          onClick={onLogout}
          title="Sign Out"
          className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}