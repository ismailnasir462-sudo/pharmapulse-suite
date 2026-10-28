import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  Search, 
  UserPlus, 
  Phone, 
  Mail, 
  HeartPulse, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  Loader2 
} from 'lucide-react';

export default function PatientsManagement({ onAttachPatientToPOS }) {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Patient Form State
  const [newPatient, setNewPatient] = useState({
    full_name: '',
    phone: '',
    email: '',
    date_of_birth: '',
    allergies: '',
    chronic_conditions: ''
  });

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/patients', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setPatients(res.data.patients || res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load patients list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/patients', newPatient, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setShowAddModal(false);
        setNewPatient({ full_name: '', phone: '', email: '', date_of_birth: '', allergies: '', chronic_conditions: '' });
        fetchPatients();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to register new patient.');
    }
  };

  const filteredPatients = patients.filter(p => 
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone?.includes(searchTerm) ||
    p.patient_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-pharmacy-600" /> Patient Profiles & History
          </h1>
          <p className="text-xs text-slate-400 font-medium">Manage patient loyalty, chronic care notes, and past medication history.</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-pharmacy-600 hover:bg-pharmacy-700 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-md transition-all flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Register New Patient
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by Patient Name, Phone Number, or Patient Code..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-pharmacy-500/20 focus:outline-none bg-white font-medium"
        />
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-slate-500 text-xs font-semibold">
            <Loader2 className="w-5 h-5 text-pharmacy-600 animate-spin" /> Loading patient records...
          </div>
        ) : filteredPatients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider">
                  <th className="pb-3">Patient Code</th>
                  <th className="pb-3">Full Name</th>
                  <th className="pb-3">Phone</th>
                  <th className="pb-3">Known Allergies</th>
                  <th className="pb-3">Chronic Conditions</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredPatients.map((patient) => (
                  <tr key={patient.patient_id || patient.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 font-bold text-pharmacy-700">
                      {patient.patient_code || `PAT-${patient.patient_id}`}
                    </td>
                    <td className="py-3.5 font-bold text-slate-900">{patient.full_name}</td>
                    <td className="py-3.5 text-slate-600">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" /> {patient.phone || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3.5">
                      {patient.allergies ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 flex items-center gap-1 w-max">
                          <AlertCircle className="w-3 h-3" /> {patient.allergies}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">None Logged</span>
                      )}
                    </td>
                    <td className="py-3.5">
                      {patient.chronic_conditions ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1 w-max">
                          <HeartPulse className="w-3 h-3" /> {patient.chronic_conditions}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">None</span>
                      )}
                    </td>
                    <td className="py-3.5 text-right">
                      {onAttachPatientToPOS && (
                        <button
                          onClick={() => onAttachPatientToPOS(patient)}
                          className="px-3 py-1.5 rounded-xl bg-pharmacy-50 hover:bg-pharmacy-100 text-pharmacy-700 font-bold text-[11px] border border-pharmacy-200 transition-all"
                        >
                          Attach to POS
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-400">
            No patient records match your query.
          </div>
        )}
      </div>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Register New Patient Profile</h2>
            
            <form onSubmit={handleCreatePatient} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newPatient.full_name}
                  onChange={(e) => setNewPatient({ ...newPatient, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                  placeholder="Kofi Mensah"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={newPatient.phone}
                    onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                    placeholder="0241234567"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={newPatient.date_of_birth}
                    onChange={(e) => setNewPatient({ ...newPatient, date_of_birth: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Known Drug Allergies</label>
                <input
                  type="text"
                  value={newPatient.allergies}
                  onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                  placeholder="e.g. Penicillin, Sulfa drugs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Chronic Medical Conditions</label>
                <input
                  type="text"
                  value={newPatient.chronic_conditions}
                  onChange={(e) => setNewPatient({ ...newPatient, chronic_conditions: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                  placeholder="e.g. Hypertension, Type 2 Diabetes"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-pharmacy-600 hover:bg-pharmacy-700 text-white font-bold text-xs shadow-md"
                >
                  Save Patient Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}