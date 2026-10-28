import React, { useState } from 'react';
import axios from 'axios';
import { UserPlus, Shield, Award, UserCheck, Boxes, Phone } from 'lucide-react';
import CustomSelect from './CustomSelect';

export default function StaffRegisterModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
    role: 'PHARMACIST',
    license_number: '',
    terminal_id: 'POS-01'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getHeaders = () => {
    const token = localStorage.getItem('pharmapulse_token') || localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', formData, {
        headers: getHeaders()
      });
      if (res.data.success) {
        onSuccess(res.data.message || 'New staff member onboarded successfully!');
        onClose();
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 
        err.response?.data?.error || 
        'Failed to create staff account'
      );
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { value: 'PHARMACIST', label: 'L. Pharmacist', icon: Award, subtext: 'Full clinical & prescription rights' },
    { value: 'INVENTORY_MANAGER', label: 'Inventory Manager', icon: Boxes, subtext: 'Stock intake, FEFO tracking & suppliers' },
    { value: 'CASHIER', label: 'Cashier', icon: UserCheck, subtext: 'POS checkout & cash register operations' },
    { value: 'SUPER_ADMIN', label: 'Super Admin', icon: Shield, subtext: 'Full system management access' }
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans">
      <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 relative">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-pharmacy-50 flex items-center justify-center text-pharmacy-600 border border-pharmacy-100">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Onboard New Staff</h3>
            <p className="text-xs text-slate-400">Save employee credentials directly to database</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-pharmacy-500/20 focus:border-pharmacy-500 focus:outline-none transition-all"
              placeholder="e.g. Pharm. Ama Osei"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-pharmacy-500/20 focus:border-pharmacy-500 focus:outline-none transition-all"
                placeholder="ama.osei@pharmapulse.com"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" /> Phone Number
              </label>
              <input
                type="tel"
                required
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-pharmacy-500/20 focus:border-pharmacy-500 focus:outline-none transition-all"
                placeholder="+233 24 123 4567"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <CustomSelect
                label="System Role"
                options={roleOptions}
                value={formData.role}
                onChange={(val) => setFormData({ ...formData, role: val })}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Initial Password</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-pharmacy-500/20 focus:border-pharmacy-500 focus:outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Role-Specific Dynamic Inputs */}
          {formData.role === 'PHARMACIST' && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Pharmacy Council License No.</label>
              <input
                type="text"
                required
                value={formData.license_number}
                onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-pharmacy-500/20 focus:border-pharmacy-500 focus:outline-none transition-all"
                placeholder="e.g. PC-GH-2026-8849"
              />
            </div>
          )}

          {formData.role === 'INVENTORY_MANAGER' && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Assigned Warehouse / Store Code</label>
              <input
                type="text"
                required
                value={formData.terminal_id}
                onChange={(e) => setFormData({ ...formData, terminal_id: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-pharmacy-500/20 focus:border-pharmacy-500 focus:outline-none transition-all"
                placeholder="e.g. STORE-MAIN-ACCRA"
              />
            </div>
          )}

          {formData.role === 'CASHIER' && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Assigned Till / Terminal ID</label>
              <input
                type="text"
                required
                value={formData.terminal_id}
                onChange={(e) => setFormData({ ...formData, terminal_id: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-pharmacy-500/20 focus:border-pharmacy-500 focus:outline-none transition-all"
                placeholder="e.g. POS-TILL-02"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-pharmacy-600 text-white hover:bg-pharmacy-700 shadow-md cursor-pointer transition-all disabled:opacity-50"
            >
              {loading ? 'Saving to Database...' : 'Create Staff Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}