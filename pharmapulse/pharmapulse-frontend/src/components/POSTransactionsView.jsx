import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Search, 
  Receipt, 
  X, 
  Printer, 
  RefreshCw,
  Calendar,
  DollarSign,
  ArrowUpDown
} from 'lucide-react';
import CustomSelect from './CustomSelect';

export default function POSTransactionsView() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [priceSort, setPriceSort] = useState('DEFAULT');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const [selectedTxn, setSelectedTxn] = useState(null);

  const getHeaders = () => {
    const token = localStorage.getItem('pharmapulse_token') || localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = getHeaders();

      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (dateFilter !== 'ALL') params.append('dateFilter', dateFilter);
      if (dateFilter === 'CUSTOM' && customStartDate && customEndDate) {
        params.append('startDate', customStartDate);
        params.append('endDate', customEndDate);
      }
      if (paymentFilter !== 'ALL') params.append('paymentMethod', paymentFilter);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);
      if (priceSort !== 'DEFAULT') params.append('priceSort', priceSort);

      const res = await axios.get(`http://localhost:5000/api/pos/transactions?${params.toString()}`, { headers });

      if (res.data && res.data.success) {
        setTransactions(res.data.transactions || []);
      } else {
        setTransactions([]);
        setError(res.data.message || 'Failed to fetch transactions');
      }
    } catch (err) {
      console.error('Transactions Fetch Error:', err);
      setError(err.response?.data?.message || 'Server connection error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransactions();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, dateFilter, customStartDate, customEndDate, paymentFilter, priceSort, minPrice, maxPrice]);

  // Options arrays for CustomSelect dropdowns
  const dateOptions = [
    { value: 'ALL', label: 'All Dates', icon: Calendar },
    { value: 'TODAY', label: 'Today', icon: Calendar },
    { value: 'YESTERDAY', label: 'Yesterday', icon: Calendar },
    { value: 'CUSTOM', label: 'Custom Date Range', icon: Calendar }
  ];

  const paymentOptions = [
    { value: 'ALL', label: 'All Payment Methods', icon: DollarSign },
    { value: 'CASH', label: 'Cash Only', icon: DollarSign },
    { value: 'MOBILE_MONEY', label: 'Mobile Money (MoMo)', icon: DollarSign },
    { value: 'CARD', label: 'Card Payment', icon: DollarSign }
  ];

  const sortOptions = [
    { value: 'DEFAULT', label: 'Sort by Recent Date', icon: ArrowUpDown },
    { value: 'HIGH_TO_LOW', label: 'Price: High to Low', icon: ArrowUpDown },
    { value: 'LOW_TO_HIGH', label: 'Price: Low to High', icon: ArrowUpDown }
  ];

  return (
    <div className="space-y-4">
      {/* Search & CustomSelect Options Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Txn #, Patient, or Cashier..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pharmacy-500"
            />
          </div>

          <div className="md:col-span-3">
            <CustomSelect
              options={dateOptions}
              value={dateFilter}
              onChange={setDateFilter}
            />
          </div>

          <div className="md:col-span-2">
            <CustomSelect
              options={paymentOptions}
              value={paymentFilter}
              onChange={setPaymentFilter}
            />
          </div>

          <div className="md:col-span-2">
            <CustomSelect
              options={sortOptions}
              value={priceSort}
              onChange={setPriceSort}
            />
          </div>
        </div>

        {(dateFilter === 'CUSTOM' || minPrice || maxPrice) && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
            {dateFilter === 'CUSTOM' && (
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500">Range:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2 py-1 bg-slate-50 border rounded-lg text-xs"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2 py-1 bg-slate-50 border rounded-lg text-xs"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500">Min Total:</span>
              <input
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="GHS 0"
                className="w-20 px-2 py-1 bg-slate-50 border rounded-lg text-xs"
              />
              <span className="font-bold text-slate-500">Max Total:</span>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="GHS 1000"
                className="w-20 px-2 py-1 bg-slate-50 border rounded-lg text-xs"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setDateFilter('ALL');
                setMinPrice('');
                setMaxPrice('');
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Audit Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
            <Receipt className="w-4 h-4 text-pharmacy-600" /> Live Audit Logs ({transactions.length})
          </h4>
          <button
            type="button"
            onClick={fetchTransactions}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 font-semibold">
            Querying backend transactions...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600 font-medium">
            {error}
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No transaction records matched your search parameters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-extrabold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Txn Number</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Cashier</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {transactions.map((txn) => (
                  <tr key={txn.transaction_id || txn.transaction_number} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{txn.transaction_number}</td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(txn.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">{txn.patient_name || 'Walk-in Customer'}</td>
                    <td className="py-3.5 px-4 text-slate-500">{txn.cashier_name || 'System Admin'}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        txn.payment_method === 'CASH' ? 'bg-emerald-100 text-emerald-800' :
                        txn.payment_method === 'MOBILE_MONEY' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {txn.payment_method}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                      GHS {parseFloat(txn.grand_total).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedTxn(txn)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-pharmacy-50 hover:text-pharmacy-700 font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      {selectedTxn && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{selectedTxn.transaction_number}</h3>
                <p className="text-xs text-slate-400">
                  {new Date(selectedTxn.created_at).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTxn(null)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-bold text-slate-700">Itemized Breakdown:</p>
              <div className="max-h-48 overflow-y-auto space-y-2 divide-y divide-slate-100 pr-1">
                {(typeof selectedTxn.items === 'string' ? JSON.parse(selectedTxn.items) : selectedTxn.items)?.map((item, idx) => (
                  <div key={idx} className="pt-2 flex justify-between items-center text-slate-800">
                    <div>
                      <h5 className="font-bold text-xs">{item.brand_name}</h5>
                      <p className="text-[10px] text-slate-400">{item.generic_name}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold">{item.quantity_sold} x GHS {parseFloat(item.unit_price).toFixed(2)}</span>
                      <p className="font-extrabold text-xs text-slate-900">
                        GHS {(item.quantity_sold * item.unit_price).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>GHS {parseFloat(selectedTxn.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Tax</span>
                  <span>GHS {parseFloat(selectedTxn.tax_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Discount</span>
                  <span>-GHS {parseFloat(selectedTxn.discount_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-sm text-slate-900 pt-1 border-t border-slate-100">
                  <span>Grand Total</span>
                  <span className="text-pharmacy-600">GHS {parseFloat(selectedTxn.grand_total).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 font-bold text-xs text-slate-700 hover:bg-slate-200 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Copy
              </button>
              <button
                type="button"
                onClick={() => setSelectedTxn(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 font-bold text-xs text-white hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}