import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Award, 
  UserCheck, 
  Boxes, 
  Search, 
  Loader2, 
  Mail,
  Phone,
  RefreshCw,
  Trash2,
  Edit3,
  X,
  Lock,
  CheckCircle2
} from 'lucide-react';
import StaffRegisterModal from './StaffRegisterModal';

export default function UsersView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [notification, setNotification] = useState(null);

  // Edit Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    role: 'CASHIER',
    license_number: '',
    terminal_id: '',
    new_password: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const getHeaders = () => {
    const token = localStorage.getItem('pharmapulse_token') || localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:5000/api/users', { headers: getHeaders() });
      
      let fetchedList = [];
      if (res.data && res.data.success && Array.isArray(res.data.users)) {
        fetchedList = res.data.users;
      } else if (Array.isArray(res.data)) {
        fetchedList = res.data;
      }

      setUsers(fetchedList);
    } catch (err) {
      console.error('Failed to fetch staff members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditError('');
    setEditFormData({
      full_name: user.full_name || user.fullName || '',
      email: user.email || '',
      phone_number: user.phone_number || user.phoneNumber || '',
      role: user.role || 'CASHIER',
      license_number: user.license_number || '',
      terminal_id: user.terminal_id || '',
      new_password: '' // Optional password reset
    });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setEditLoading(true);
      setEditError('');

      const userId = editingUser.user_id || editingUser.id;
      const res = await axios.put(
        `http://localhost:5000/api/users/${userId}`,
        editFormData,
        { headers: getHeaders() }
      );

      if (res.data.success) {
        setNotification(`Staff account for ${editFormData.full_name} updated successfully.`);
        setEditingUser(null);
        fetchUsers();
      }
    } catch (err) {
      setEditError(
        err.response?.data?.message || 
        err.response?.data?.error || 
        'Failed to update staff credentials'
      );
    } finally {
      setEditLoading(false);
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await axios.put(`http://localhost:5000/api/users/${userId}/status`, { status: newStatus }, { headers: getHeaders() });
      setNotification(`User account status updated to ${newStatus}.`);
      fetchUsers();
    } catch (err) {
      alert('Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId, fullName) => {
    if (!window.confirm(`Are you sure you want to permanently remove ${fullName} from the system?`)) return;
    try {
      await axios.delete(`http://localhost:5000/api/users/${userId}`, { headers: getHeaders() });
      setNotification(`Staff member ${fullName} removed.`);
      fetchUsers();
    } catch (err) {
      alert('Failed to delete staff member');
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const name = u.full_name || u.fullName || '';
    const email = u.email || '';
    const phone = u.phone_number || u.phoneNumber || '';
    const role = u.role || u.role_name || '';
    return (
      name.toLowerCase().includes(q) || 
      email.toLowerCase().includes(q) || 
      phone.toLowerCase().includes(q) || 
      role.toLowerCase().includes(q)
    );
  });

  const getRoleBadge = (role) => {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        return { label: 'Super Admin', icon: ShieldCheck, style: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'PHARMACIST':
      case 'LEAD_PHARMACIST':
        return { label: 'L. Pharmacist', icon: Award, style: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'INVENTORY_MANAGER':
        return { label: 'Inventory Manager', icon: Boxes, style: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'CASHIER':
      default:
        return { label: 'Cashier', icon: UserCheck, style: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-800">
      
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white rounded-3xl p-6 border border-slate-200 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-pharmacy-50 flex items-center justify-center text-pharmacy-600 border border-pharmacy-100">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Staff Directory & Onboarding</h2>
            <p className="text-xs text-slate-400">View personnel details, modify credentials, reset passwords, and manage access roles</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchUsers}
            className="p-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setShowRegisterModal(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Onboard New Staff</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-emerald-600 font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search staff by name, email, phone number, or assigned role..."
          className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pharmacy-500 shadow-sm"
        />
      </div>

      {/* Staff Directory Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-3 bg-white rounded-3xl border border-slate-200 p-8">
          <Loader2 className="w-8 h-8 text-pharmacy-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Loading staff directory...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center space-y-3 border border-slate-200">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-500">No staff accounts match your search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((member) => {
            const roleInfo = getRoleBadge(member.role || member.role_name);
            const RoleIcon = roleInfo.icon;
            const isUserActive = (member.status || 'ACTIVE') === 'ACTIVE';

            return (
              <div
                key={member.user_id || member.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:border-pharmacy-500/50 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-pharmacy-50 text-pharmacy-700 font-extrabold text-sm flex items-center justify-center border border-pharmacy-100">
                        {(member.full_name || member.fullName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{member.full_name || member.fullName}</h4>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {member.email}
                        </p>
                        {/* Display Phone Number */}
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {member.phone_number || member.phoneNumber || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold border flex items-center gap-1.5 ${roleInfo.style}`}>
                      <RoleIcon className="w-3.5 h-3.5" />
                      {roleInfo.label}
                    </span>

                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border ${
                      isUserActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {isUserActive ? 'Active' : 'Deactivated'}
                    </span>
                  </div>

                  {/* License & Terminal Code Details */}
                  <div className="bg-slate-50 rounded-2xl p-3 text-xs space-y-1">
                    {member.license_number ? (
                      <p className="text-[11px] font-semibold text-slate-600">
                        <span className="font-bold text-slate-900">License No:</span> {member.license_number}
                      </p>
                    ) : null}
                    {member.terminal_id ? (
                      <p className="text-[11px] font-semibold text-slate-600">
                        <span className="font-bold text-slate-900">Assigned Till/Store:</span> {member.terminal_id}
                      </p>
                    ) : null}
                    <p className="text-[10px] text-slate-400">
                      Onboarded: {member.created_at ? new Date(member.created_at).toLocaleDateString() : 'Active System Account'}
                    </p>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-2 flex justify-between items-center border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    {/* Edit Credentials Button */}
                    <button
                      type="button"
                      onClick={() => openEditModal(member)}
                      className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                      title="Edit Staff Credentials"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-pharmacy-600" /> Edit Details
                    </button>

                    {/* Delete Staff Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(member.user_id || member.id, member.full_name || member.fullName)}
                      className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-all cursor-pointer"
                      title="Delete Staff Member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Toggle Active Status */}
                  <button
                    type="button"
                    onClick={() => handleStatusToggle(member.user_id || member.id, member.status || 'ACTIVE')}
                    className={`text-[10px] font-bold px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                      isUserActive
                        ? 'text-rose-600 border-rose-200 hover:bg-rose-50'
                        : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                    }`}
                  >
                    {isUserActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EDIT STAFF CREDENTIALS MODAL */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-pharmacy-50 text-pharmacy-600">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Edit Staff Account</h3>
                  <p className="text-xs text-slate-400">Modify email, phone, role, or reset password</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold text-center">
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pharmacy-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pharmacy-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={editFormData.phone_number}
                    onChange={(e) => setEditFormData({ ...editFormData, phone_number: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pharmacy-500"
                    placeholder="+233 24 123 4567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Assigned Role</label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none"
                  >
                    <option value="SUPER_ADMIN">Super Admin</option>
                    <option value="LEAD_PHARMACIST">L. Pharmacist</option>
                    <option value="INVENTORY_MANAGER">Inventory Manager</option>
                    <option value="CASHIER">Cashier</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">License or Till ID</label>
                  <input
                    type="text"
                    value={editFormData.role === 'PHARMACIST' || editFormData.role === 'LEAD_PHARMACIST' ? editFormData.license_number : editFormData.terminal_id}
                    onChange={(e) => {
                      if (editFormData.role === 'PHARMACIST' || editFormData.role === 'LEAD_PHARMACIST') {
                        setEditFormData({ ...editFormData, license_number: e.target.value });
                      } else {
                        setEditFormData({ ...editFormData, terminal_id: e.target.value });
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pharmacy-500"
                    placeholder="e.g. PC-GH-8811 or POS-02"
                  />
                </div>
              </div>

              {/* Reset Password Field */}
              <div className="pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-slate-500" /> Reset Password (Optional)
                </label>
                <input
                  type="password"
                  value={editFormData.new_password}
                  onChange={(e) => setEditFormData({ ...editFormData, new_password: e.target.value })}
                  placeholder="Leave blank to keep existing password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pharmacy-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-pharmacy-600 text-white hover:bg-pharmacy-700 shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {editLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Onboarding Modal */}
      {showRegisterModal && (
        <StaffRegisterModal
          onClose={() => setShowRegisterModal(false)}
          onSuccess={(msg) => {
            setNotification(msg);
            fetchUsers();
          }}
        />
      )}

    </div>
  );
}