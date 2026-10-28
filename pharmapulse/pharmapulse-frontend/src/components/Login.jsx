import React, { useState } from 'react';
import axios from 'axios';
import { LogIn, Lock, Mail, ShieldAlert } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email: loginEmail,
        password: loginPassword
      });

      if (response.data.success) {
        onLoginSuccess(response.data.token, response.data.user);
      }
    } catch (err) {
      setLoginError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6">
        
        {/* Header Logo & Title */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-pharmacy-600 text-white font-extrabold text-2xl flex items-center justify-center mx-auto shadow-lg shadow-pharmacy-600/30">
            P
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">PharmaPulse PMS</h1>
          <p className="text-xs text-slate-400">Enterprise Pharmacy Management & AI System</p>
        </div>

        {/* Security Notice */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-2.5 text-slate-500 text-[11px] font-medium">
          <ShieldAlert className="w-4 h-4 text-pharmacy-600 shrink-0" />
          <span>Restricted Portal. Authorized personnel only. Account provisioned by Super Admin.</span>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          {loginError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold text-center">
              {loginError}
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-pharmacy-500/20 focus:outline-none font-medium text-slate-800"
                placeholder="admin@pharmapulse.com"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-pharmacy-500/20 focus:outline-none font-medium text-slate-800"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loginLoading}
            className="w-full py-3.5 rounded-2xl bg-pharmacy-600 hover:bg-pharmacy-700 text-white font-bold text-xs shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            {loginLoading ? 'Authenticating...' : 'Sign In to Workspace'}
          </button>
        </form>

      </div>
    </div>
  );
}