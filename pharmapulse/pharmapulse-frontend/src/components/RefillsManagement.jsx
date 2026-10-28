import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, Search, ArrowRight, CheckCircle, Clock, Pill, Loader2 } from 'lucide-react';

export default function RefillsManagement({ onSendRefillToPOS }) {
  const [refills, setRefills] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchRefills = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/prescriptions/refills', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setRefills(res.data.refills || res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load active prescription refills:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefills();
  }, []);

  const filteredRefills = refills.filter(r => 
    r.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.rx_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.drug_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2">
      
      {/* Header Bar */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <RefreshCw className="w-6 h-6 text-pharmacy-600" /> Active Prescription Refill Queue
        </h1>
        <p className="text-xs text-slate-400 font-medium">Review patient refill authorization schedules and push ready orders to the checkout counter.</p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by Rx Number, Patient Name, or Prescribed Drug..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-pharmacy-500/20 focus:outline-none bg-white font-medium"
        />
      </div>

      {/* Refills Queue Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-2 text-slate-500 text-xs font-semibold">
            <Loader2 className="w-5 h-5 text-pharmacy-600 animate-spin" /> Fetching active refill authorizations...
          </div>
        ) : filteredRefills.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider">
                  <th className="pb-3">Rx Code</th>
                  <th className="pb-3">Patient</th>
                  <th className="pb-3">Prescribed Drug</th>
                  <th className="pb-3">Dosage Schedule</th>
                  <th className="pb-3">Refills Remaining</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredRefills.map((refill) => (
                  <tr key={refill.prescription_id || refill.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 font-bold text-pharmacy-700">
                      {refill.rx_number || `RX-${refill.prescription_id}`}
                    </td>
                    <td className="py-3.5 font-bold text-slate-900">{refill.patient_name}</td>
                    <td className="py-3.5">
                      <span className="flex items-center gap-1 font-bold text-slate-800">
                        <Pill className="w-3.5 h-3.5 text-pharmacy-600" /> {refill.drug_name}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-500">{refill.dosage_instructions || '1 tab twice daily'}</td>
                    <td className="py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                        {refill.refills_remaining ?? 3} Left
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => onSendRefillToPOS(refill)}
                        className="px-3 py-1.5 rounded-xl bg-pharmacy-600 hover:bg-pharmacy-700 text-white font-bold text-[11px] shadow-sm flex items-center gap-1.5 ml-auto transition-all"
                      >
                        Push to POS <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-400">
            No active prescription refills found.
          </div>
        )}
      </div>

    </div>
  );
}