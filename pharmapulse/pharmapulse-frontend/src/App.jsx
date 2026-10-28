import React, { useState } from 'react';

// Import Authentication View
import Login from './components/Login';

// Import Workspace Components
import SidebarNav from './components/SidebarNav';
import DashboardView from './components/DashboardView';
import POSView from './components/POSView';
import InventoryView from './components/InventoryView';
import DrugImageScanner from './components/DrugImageScanner';
import PatientsManagement from './components/PatientsManagement';
import RefillsManagement from './components/RefillsManagement';
import UsersView from './components/UsersView';
import AIAssistantDrawer from './components/AIAssistantDrawer';
import StaffRegisterModal from './components/StaffRegisterModal';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(
    localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null
  );
  
  // Navigation & Shared State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showAIDrawer, setShowAIDrawer] = useState(false);

  // Attached context for POS Terminal & AI Vision Scanning
  const [attachedPatient, setAttachedPatient] = useState(null);
  const [activeRefill, setActiveRefill] = useState(null);

  const handleLoginSuccess = (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);

    // Default view based on user role
    if (newUser.role === 'CASHIER') setActiveTab('pos');
    else if (newUser.role === 'INVENTORY_MANAGER') setActiveTab('inventory');
    else if (newUser.role === 'LEAD_PHARMACIST' || newUser.role === 'PHARMACIST') setActiveTab('verification');
    else setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setAttachedPatient(null);
    setActiveRefill(null);
  };

  // ------------------------------------------------------------------
  // 1. Unauthenticated State (Renders Login Portal)
  // ------------------------------------------------------------------
  if (!token || !user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // ------------------------------------------------------------------
  // 2. Authenticated System Workspaces Layout
  // ------------------------------------------------------------------
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* Role-Filtered Navigation Sidebar */}
      <SidebarNav
        currentRole={user.role}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 p-6 overflow-y-auto">
        
        {/* Top Workspace Bar */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200/80">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Welcome back, {user.fullName || user.full_name}
            </h1>
            <p className="text-xs text-slate-400">
              Active Session: <span className="font-semibold text-pharmacy-600">{user.role}</span>
              {user.terminalId && ` • Till: ${user.terminalId}`}
              {user.licenseNumber && ` • License: ${user.licenseNumber}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Super Admin Staff Onboarding trigger */}
            {user.role === 'SUPER_ADMIN' && (
              <button
                type="button"
                onClick={() => setShowStaffModal(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                + Onboard Staff
              </button>
            )}

            {/* AI Clinical Assistant Slideout Toggle */}
            <button
              type="button"
              onClick={() => setShowAIDrawer(!showAIDrawer)}
              className="bg-pharmacy-50 text-pharmacy-700 hover:bg-pharmacy-100 border border-pharmacy-200 text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              ✨ Clinical AI Assistant
            </button>
          </div>
        </div>

        {/* Dynamic Workspace Views */}
        {activeTab === 'dashboard' && (
          <DashboardView onOpenPOS={() => setActiveTab('pos')} />
        )}

        {activeTab === 'pos' && (
          <POSView 
            attachedPatient={attachedPatient}
            activeRefill={activeRefill}
            onClearContext={() => {
              setAttachedPatient(null);
              setActiveRefill(null);
            }}
          />
        )}

        {activeTab === 'inventory' && <InventoryView />}
        
        {activeTab === 'verification' && <DrugImageScanner />}

        {activeTab === 'patients' && (
          <PatientsManagement 
            onAttachPatientToPOS={(patient) => {
              setAttachedPatient(patient);
              setActiveTab('pos');
            }} 
          />
        )}

        {activeTab === 'refills' && (
          <RefillsManagement 
            onSendRefillToPOS={(refill) => {
              setActiveRefill(refill);
              setActiveTab('pos');
            }} 
          />
        )}

        {activeTab === 'staff' && <UsersView />}

      </main>

      {/* Floating AI Assistant Drawer */}
      {showAIDrawer && (
        <div className="fixed bottom-6 right-6 z-50">
          <AIAssistantDrawer onClose={() => setShowAIDrawer(false)} />
        </div>
      )}

      {/* Super Admin Staff Registration Modal */}
      {showStaffModal && (
        <StaffRegisterModal
          onClose={() => setShowStaffModal(false)}
          onSuccess={(msg) => alert(msg)}
        />
      )}

    </div>
  );
}