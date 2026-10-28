import React from 'react';
import { 
  LayoutDashboard, 
  Pill, 
  ShoppingCart, 
  Users, 
  Truck, 
  Bot, 
  BarChart3, 
  Settings 
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, userRole = 'CASHIER' }) {
  // Define menu items with permitted roles
  const menuGroups = [
    {
      title: "MENU",
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'PHARMACIST', 'INVENTORY_MANAGER', 'CASHIER'] },
        { id: 'pos', label: 'POS Terminal', icon: ShoppingCart, roles: ['ADMIN', 'PHARMACIST', 'CASHIER'] },
        { id: 'inventory', label: 'Inventory & FEFO', icon: Pill, roles: ['ADMIN', 'PHARMACIST', 'INVENTORY_MANAGER'] },
        { id: 'patients', label: 'Patients & Refills', icon: Users, roles: ['ADMIN', 'PHARMACIST', 'CASHIER'] },
      ]
    },
    {
      title: "SUPPLY & AI",
      items: [
        { id: 'suppliers', label: 'Suppliers & POs', icon: Truck, roles: ['ADMIN', 'INVENTORY_MANAGER'] },
        { id: 'chatbot', label: 'Gemini AI Assistant', icon: Bot, roles: ['ADMIN', 'PHARMACIST'] },
        { id: 'reports', label: 'Analytics & Sales', icon: BarChart3, roles: ['ADMIN', 'PHARMACIST'] },
      ]
    },
    {
      title: "SYSTEM",
      items: [
        { id: 'settings', label: 'Settings', icon: Settings, roles: ['ADMIN'] },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 h-screen flex flex-col justify-between p-6 sticky top-0">
      <div>
        {/* Brand Logo Header */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 rounded-2xl bg-pharmacy-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-pharmacy-600/30">
            P
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-900 tracking-tight leading-none">PharmaPulse</h1>
            <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider mt-1 inline-block">
              {userRole}
            </span>
          </div>
        </div>

        {/* Navigation Sections Filtered by Role */}
        <nav className="space-y-6">
          {menuGroups.map((group, idx) => {
            // Filter items permitted for userRole
            const visibleItems = group.items.filter(item => item.roles.includes(userRole));
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx}>
                <h2 className="text-[11px] font-bold text-slate-400 tracking-wider px-3 mb-2 uppercase">
                  {group.title}
                </h2>
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer ${
                          isActive
                            ? 'bg-pharmacy-600 text-white shadow-md shadow-pharmacy-600/25 font-semibold'
                            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Role Badge Indicator */}
      <div className="bg-slate-900 rounded-2xl p-4 text-white relative overflow-hidden shadow-xl">
        <div className="flex items-center justify-between text-xs font-semibold mb-1 text-pharmacy-400">
          <span>Active Session</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        </div>
        <p className="text-xs text-slate-300">Logged in as <strong className="text-white">{userRole}</strong></p>
      </div>
    </aside>
  );
}