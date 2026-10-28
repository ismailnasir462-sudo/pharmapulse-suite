import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PackagePlus, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Layers, 
  Calendar, 
  Loader2,
  X,
  Pill,
  Truck,
  Search,
  MinusCircle,
  FileText,
  Building2,
  ClipboardList,
  Plus,
  RefreshCw,
  Clock,
  Send,
  User,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';
import CustomSelect from './CustomSelect';

export default function InventoryView() {
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix', 'po', 'suppliers', 'audit'

  const [batches, setBatches] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [selectedBatchForAdjustment, setSelectedBatchForAdjustment] = useState(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');

  // Ingest Batch Form State
  const [formData, setFormData] = useState({
    drug_id: '',
    supplier_id: '',
    batch_number: '',
    quantity_in_stock: '',
    cost_price: '',
    selling_price: '',
    discount_percentage: '0.00',
    manufacture_date: '',
    expiry_date: '',
    storage_location: 'Aisle-1'
  });

  // Stock Adjustment Form State
  const [adjustmentData, setAdjustmentData] = useState({
    quantity_deducted: '',
    reason: 'DAMAGED',
    notes: ''
  });

  // New Supplier Form State
  const [supplierFormData, setSupplierFormData] = useState({
    supplier_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    lead_time_days: '3'
  });

  // New Purchase Order Form State
  const [poFormData, setPoFormData] = useState({
    supplier_id: '',
    drug_id: '',
    order_quantity: '',
    estimated_cost: ''
  });

  const getHeaders = () => {
    const token = localStorage.getItem('pharmapulse_token') || localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = getHeaders();

      const [expiryRes, supplierRes, drugRes, poRes, auditRes] = await Promise.all([
        axios.get('http://localhost:5000/api/inventory/expiry-matrix', { headers }).catch(() => ({ data: { success: false } })),
        axios.get('http://localhost:5000/api/inventory/suppliers', { headers }).catch(() => ({ data: { success: false } })),
        axios.get('http://localhost:5000/api/inventory/drugs', { headers }).catch(() => ({ data: { success: false } })),
        axios.get('http://localhost:5000/api/inventory/purchase-orders', { headers }).catch(() => ({ data: { success: false } })),
        axios.get('http://localhost:5000/api/inventory/audit-logs', { headers }).catch(() => ({ data: { success: false } }))
      ]);

      if (expiryRes.data?.success) setBatches(expiryRes.data.batches || []);
      if (supplierRes.data?.success) setSuppliers(supplierRes.data.suppliers || []);
      if (drugRes.data?.success) setDrugs(drugRes.data.drugs || []);
      if (poRes.data?.success) setPurchaseOrders(poRes.data.purchase_orders || []);
      if (auditRes.data?.success) setAuditLogs(auditRes.data.audit_logs || []);
    } catch (err) {
      console.error('Failed to load inventory workspace data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper to get baseline unit cost price for Purchase Orders before receiving
  const getReorderUnitCost = (drugId) => {
    if (!drugId) return 0;

    const drug = drugs.find((d) => d.drug_id == drugId);
    if (drug) {
      // 1. Primary: Baseline default unit cost from drugs_master
      const defaultCost = parseFloat(drug.default_unit_cost || drug.unit_price || drug.cost_price);
      if (!isNaN(defaultCost) && defaultCost > 0) return defaultCost;
    }

    // 2. Fallback: Most recent batch cost price
    const matchingBatch = batches.find((b) => b.drug_id == drugId && parseFloat(b.cost_price) > 0);
    if (matchingBatch) {
      return parseFloat(matchingBatch.cost_price);
    }

    return 0;
  };

  // Helper when receiving batch: Pre-populate suggested selling price
  const getSuggestedSellingPrice = (drugId) => {
    if (!drugId) return 0;

    const drug = drugs.find((d) => d.drug_id == drugId);
    if (drug) {
      const defaultSelling = parseFloat(drug.default_selling_price || drug.selling_price);
      if (!isNaN(defaultSelling) && defaultSelling > 0) return defaultSelling;
    }

    return 0;
  };

  // Helper to get default storage location from catalog
  const getDefaultStorageLocation = (drugId) => {
    if (!drugId) return 'Aisle-1';
    const drug = drugs.find((d) => d.drug_id == drugId);
    return drug?.default_storage_location || 'Aisle-1';
  };

  // Handler when PO quantity changes (real-time calculation)
  const handlePOQuantityChange = (quantity) => {
    const unitPrice = getReorderUnitCost(poFormData.drug_id);
    const numQty = parseFloat(quantity) || 0;
    const calculatedCost = numQty * unitPrice;

    setPoFormData((prev) => ({
      ...prev,
      order_quantity: quantity,
      estimated_cost: calculatedCost > 0 ? calculatedCost.toFixed(2) : (quantity ? '0.00' : '')
    }));
  };

  // Handler when drug selection changes in PO modal
  const handlePODrugChange = (drugId) => {
    const unitPrice = getReorderUnitCost(drugId);
    const numQty = parseFloat(poFormData.order_quantity) || 0;
    const calculatedCost = numQty * unitPrice;

    setPoFormData((prev) => ({
      ...prev,
      drug_id: drugId,
      estimated_cost: calculatedCost > 0 ? calculatedCost.toFixed(2) : (numQty > 0 ? '0.00' : prev.estimated_cost)
    }));
  };

  // Automatic multi-field population when selecting a drug in Ingest Batch modal
  const handleIngestDrugChange = (drugId) => {
    const suggestedCost = getReorderUnitCost(drugId);
    const suggestedSelling = getSuggestedSellingPrice(drugId);
    const defaultLocation = getDefaultStorageLocation(drugId);

    setFormData((prev) => ({
      ...prev,
      drug_id: drugId,
      cost_price: suggestedCost > 0 ? suggestedCost.toFixed(2) : prev.cost_price,
      selling_price: suggestedSelling > 0 ? suggestedSelling.toFixed(2) : prev.selling_price,
      storage_location: defaultLocation
    }));
  };

  const handleIngestSubmit = async (e) => {
    e.preventDefault();
    if (!formData.drug_id) return alert('Please select a medication');

    try {
      const res = await axios.post(
        'http://localhost:5000/api/inventory/ingest-batch',
        formData,
        { headers: getHeaders() }
      );

      if (res.data?.success) {
        setShowIngestModal(false);
        setFormData({
          drug_id: '',
          supplier_id: '',
          batch_number: '',
          quantity_in_stock: '',
          cost_price: '',
          selling_price: '',
          discount_percentage: '0.00',
          manufacture_date: '',
          expiry_date: '',
          storage_location: 'Aisle-1'
        });
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to ingest batch');
    }
  };

  const handleAdjustmentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBatchForAdjustment) return;

    try {
      const res = await axios.post(
        'http://localhost:5000/api/inventory/adjust-stock',
        {
          batch_id: selectedBatchForAdjustment.batch_id,
          ...adjustmentData
        },
        { headers: getHeaders() }
      );

      if (res.data?.success) {
        setSelectedBatchForAdjustment(null);
        setAdjustmentData({ quantity_deducted: '', reason: 'DAMAGED', notes: '' });
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to adjust stock');
    }
  };

  const handleSupplierSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        'http://localhost:5000/api/inventory/suppliers',
        supplierFormData,
        { headers: getHeaders() }
      );

      if (res.data?.success) {
        setShowSupplierModal(false);
        setSupplierFormData({
          supplier_name: '',
          contact_person: '',
          phone: '',
          email: '',
          address: '',
          lead_time_days: '3'
        });
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create supplier');
    }
  };

  const handlePOSubmit = async (e) => {
    e.preventDefault();
    if (!poFormData.supplier_id || !poFormData.drug_id) return alert('Select both supplier and drug');

    try {
      const res = await axios.post(
        'http://localhost:5000/api/inventory/purchase-orders',
        poFormData,
        { headers: getHeaders() }
      );

      if (res.data?.success) {
        setShowPOModal(false);
        setPoFormData({ supplier_id: '', drug_id: '', order_quantity: '', estimated_cost: '' });
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate Purchase Order');
    }
  };

  // Dropdown Options
  const drugOptions = drugs.map((d) => ({
    value: d.drug_id,
    label: d.brand_name,
    subtext: `${d.strength || ''} ${d.generic_name ? `(${d.generic_name})` : ''}`,
    icon: Pill
  }));

  const supplierOptions = suppliers.map((s) => ({
    value: s.supplier_id,
    label: s.supplier_name || s.company_name,
    icon: Truck
  }));

  const riskFilterOptions = [
    { value: 'ALL', label: 'All Risk Levels' },
    { value: 'CRITICAL', label: 'Critical (< 30 Days)' },
    { value: 'WARNING', label: 'Warning (31-90 Days)' },
    { value: 'HEALTHY', label: 'Healthy (> 90 Days)' },
    { value: 'EXPIRED', label: 'Expired Stock' }
  ];

  const adjustmentReasonOptions = [
    { value: 'DAMAGED', label: 'Damaged Packaging / Broken Vials' },
    { value: 'EXPIRED', label: 'Expired Stock Write-Off' },
    { value: 'AUDIT_CORRECTION', label: 'Physical Audit Count Discrepancy' },
    { value: 'RETURN_TO_SUPPLIER', label: 'Returned to Supplier / Vendor' }
  ];

  // Filtered Batches
  const filteredBatches = batches.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !q ||
      b.batch_number?.toLowerCase().includes(q) ||
      b.brand_name?.toLowerCase().includes(q) ||
      b.generic_name?.toLowerCase().includes(q) ||
      b.storage_location?.toLowerCase().includes(q);

    const matchesRisk =
      riskFilter === 'ALL' ||
      (riskFilter === 'CRITICAL' && (b.risk_level === 'CRITICAL' || b.risk_level === 'EXPIRED')) ||
      b.risk_level === riskFilter;

    return matchesSearch && matchesRisk;
  });

  const criticalBatches = batches.filter(b => b.risk_level === 'CRITICAL' || b.risk_level === 'EXPIRED');
  const warningBatches = batches.filter(b => b.risk_level === 'WARNING');
  const healthyBatches = batches.filter(b => b.risk_level === 'HEALTHY');

  // Low stock drugs calculation
  const lowStockDrugs = drugs.filter(d => (d.total_stock || d.quantity_in_stock || 0) <= (d.reorder_level || 20));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-3 font-sans">
        <Loader2 className="w-8 h-8 text-pharmacy-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading Store & Inventory Workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 font-sans text-slate-800">
      
      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Store & Inventory Workspace</h2>
          <p className="text-xs text-slate-400 mt-1">
            FEFO Batch Tracking, Expiry Risk Matrix, Purchase Orders & Supplier Directory
          </p>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'matrix' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-pharmacy-600" />
            <span>FEFO Matrix</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('po')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'po' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-600" />
            <span>POs & Reorders</span>
            {lowStockDrugs.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                {lowStockDrugs.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('suppliers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'suppliers' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Suppliers</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'audit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5 text-emerald-600" />
            <span>Audit Trail</span>
          </button>
        </div>
      </div>

      {/* TAB 1: FEFO BATCH MATRIX VIEW */}
      {activeTab === 'matrix' && (
        <div className="space-y-6">
          
          {/* Action Bar & Risk Tier Metrics Cards */}
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-slate-900 text-sm">Active Inventory Overview</h3>
            <button
              type="button"
              onClick={() => setShowIngestModal(true)}
              className="bg-pharmacy-600 hover:bg-pharmacy-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <PackagePlus className="w-4 h-4" /> Receive New Batch
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 text-rose-900 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="p-2 rounded-xl bg-rose-100 text-rose-600">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                </span>
                <span className="text-[10px] font-extrabold uppercase bg-rose-200 text-rose-800 px-2.5 py-0.5 rounded-full">
                  Expiring &lt; 30 Days
                </span>
              </div>
              <h3 className="text-3xl font-extrabold">{criticalBatches.length} Batches</h3>
              <p className="text-xs text-rose-700 mt-1 font-medium">Requires immediate discount or clearance</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 text-amber-900 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="p-2 rounded-xl bg-amber-100 text-amber-600">
                  <ShieldAlert className="w-5 h-5" />
                </span>
                <span className="text-[10px] font-extrabold uppercase bg-amber-200 text-amber-800 px-2.5 py-0.5 rounded-full">
                  31 - 90 Days
                </span>
              </div>
              <h3 className="text-3xl font-extrabold">{warningBatches.length} Batches</h3>
              <p className="text-xs text-amber-700 mt-1 font-medium">Prioritize for FEFO sales deduction</p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 text-emerald-900 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                <span className="text-[10px] font-extrabold uppercase bg-emerald-200 text-emerald-800 px-2.5 py-0.5 rounded-full">
                  &gt; 90 Days
                </span>
              </div>
              <h3 className="text-3xl font-extrabold">{healthyBatches.length} Batches</h3>
              <p className="text-xs text-emerald-700 mt-1 font-medium">Optimal operational stock state</p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-8 relative">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Batch #, Drug Name, or Storage Location..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pharmacy-500/20 focus:border-pharmacy-500"
              />
            </div>
            <div className="md:col-span-4">
              <CustomSelect
                options={riskFilterOptions}
                value={riskFilter}
                onChange={setRiskFilter}
              />
            </div>
          </div>

          {/* FEFO Table */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-pharmacy-600" /> Active FEFO Inventory Batches ({filteredBatches.length})
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3">Batch Number</th>
                    <th className="pb-3">Drug Name</th>
                    <th className="pb-3">Supplier</th>
                    <th className="pb-3">Location</th>
                    <th className="pb-3">In Stock</th>
                    <th className="pb-3">Price</th>
                    <th className="pb-3">Expiry Date</th>
                    <th className="pb-3">Risk Status</th>
                    <th className="pb-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredBatches.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-8 text-center text-slate-400 font-medium">
                        No matching inventory batches found.
                      </td>
                    </tr>
                  ) : (
                    filteredBatches.map((batch) => (
                      <tr key={batch.batch_id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 font-bold text-slate-900">{batch.batch_number}</td>
                        <td className="py-3.5">
                          <span className="font-bold text-slate-900 block">{batch.brand_name}</span>
                          <span className="text-[10px] text-slate-400">{batch.generic_name}</span>
                        </td>
                        <td className="py-3.5">{batch.supplier_name || batch.company_name || 'Direct Import'}</td>
                        <td className="py-3.5">{batch.storage_location || 'Aisle-1'}</td>
                        <td className="py-3.5 font-bold text-slate-900">{batch.quantity_in_stock} units</td>
                        <td className="py-3.5 font-bold text-pharmacy-600">GHS {parseFloat(batch.selling_price || 0).toFixed(2)}</td>
                        <td className="py-3.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {new Date(batch.expiry_date).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                            batch.risk_level === 'EXPIRED'
                              ? 'bg-red-200 text-red-900 border border-red-300'
                              : batch.risk_level === 'CRITICAL' 
                              ? 'bg-rose-100 text-rose-700' 
                              : batch.risk_level === 'WARNING'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {batch.days_to_expiry <= 0 ? 'EXPIRED' : `${batch.days_to_expiry} Days Left`}
                          </span>
                        </td>
                        <td className="py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedBatchForAdjustment(batch)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold text-[11px] transition-colors flex items-center gap-1 mx-auto cursor-pointer"
                          >
                            <MinusCircle className="w-3.5 h-3.5" /> Adjust
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PURCHASE ORDERS & LOW-STOCK REORDERS */}
      {activeTab === 'po' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Purchase Orders & Low-Stock Auto-Reorder</h3>
              <p className="text-xs text-slate-400">Restock catalog medications running below minimum threshold levels.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPOModal(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Purchase Order
            </button>
          </div>

          {/* Low Stock Alert Panel */}
          {lowStockDrugs.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 space-y-3">
              <h4 className="font-bold text-amber-900 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Low Stock Warning ({lowStockDrugs.length} Items Below Threshold)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {lowStockDrugs.map(drug => (
                  <div key={drug.drug_id} className="bg-white p-3 rounded-2xl border border-amber-200 flex justify-between items-center">
                    <div>
                      <h5 className="font-bold text-slate-900 text-xs">{drug.brand_name}</h5>
                      <p className="text-[10px] text-slate-400">{drug.strength} {drug.generic_name ? `(${drug.generic_name})` : ''}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-rose-600 block">
                        {drug.total_stock || drug.quantity_in_stock || 0} in stock
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          handlePODrugChange(drug.drug_id);
                          setShowPOModal(true);
                        }}
                        className="text-[10px] font-bold text-amber-700 hover:underline cursor-pointer"
                      >
                        + Reorder Item
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Purchase Orders Table */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              Generated Purchase Orders ({purchaseOrders.length})
            </h4>

            {purchaseOrders.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400">
                No active Purchase Orders found. Click "Create Purchase Order" above to issue a restocking request.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-extrabold">
                    <tr>
                      <th className="py-3 px-4">PO Code</th>
                      <th className="py-3 px-4">Supplier</th>
                      <th className="py-3 px-4">Medication Item</th>
                      <th className="py-3 px-4">Ordered Quantity</th>
                      <th className="py-3 px-4">Est. Total Cost</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {purchaseOrders.map((po) => (
                      <tr key={po.po_id || po.po_number} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{po.po_number || `PO-${po.po_id}`}</td>
                        <td className="py-3.5 px-4 text-slate-700">{po.supplier_name || po.company_name}</td>
                        <td className="py-3.5 px-4 text-slate-900 font-bold">{po.brand_name}</td>
                        <td className="py-3.5 px-4 font-bold">{po.order_quantity} units</td>
                        <td className="py-3.5 px-4 font-extrabold text-pharmacy-600">GHS {parseFloat(po.estimated_cost || 0).toFixed(2)}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                            po.status === 'FULFILLED' ? 'bg-emerald-100 text-emerald-800' :
                            po.status === 'SENT' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {po.status || 'DRAFT'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SUPPLIERS DIRECTORY */}
      {activeTab === 'suppliers' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Pharmaceutical Vendors & Suppliers Directory</h3>
              <p className="text-xs text-slate-400">Manage vendor profiles, contact details, and expected delivery lead times.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowSupplierModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <Building2 className="w-4 h-4" /> Add Vendor / Supplier
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.length === 0 ? (
              <div className="col-span-3 bg-white rounded-3xl p-12 text-center text-xs text-slate-400 border border-slate-200">
                No registered vendors in catalog.
              </div>
            ) : (
              suppliers.map((s) => (
                <div key={s.supplier_id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h4 className="font-extrabold text-slate-900 text-sm">{s.supplier_name || s.company_name}</h4>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                        {s.lead_time_days || 3} Days Lead Time
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-2 text-xs text-slate-600">
                      <p className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{s.contact_person || 'N/A'}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{s.phone || s.phone_number || 'N/A'}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{s.email || 'N/A'}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{s.address || 'Accra, Ghana'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setPoFormData({ ...poFormData, supplier_id: s.supplier_id });
                        setActiveTab('po');
                        setShowPOModal(true);
                      }}
                      className="text-xs font-bold text-pharmacy-600 hover:underline cursor-pointer"
                    >
                      Issue Purchase Order &rarr;
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: STOCK AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Stock Discrepancy & Adjustment Audit Logs</h3>
              <p className="text-xs text-slate-400">Complete compliance logging of all manual stock deductions, damages, and write-offs.</p>
            </div>
            <button
              type="button"
              onClick={fetchData}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm overflow-hidden">
            {auditLogs.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400">
                No stock adjustment records logged yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 uppercase text-[10px] font-extrabold text-slate-400">
                    <tr>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Batch #</th>
                      <th className="py-3 px-4">Drug Item</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Deducted Qty</th>
                      <th className="py-3 px-4">Notes / Remarks</th>
                      <th className="py-3 px-4">Adjusted By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {auditLogs.map((log) => (
                      <tr key={log.log_id || log.id} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4 text-slate-400">
                          {new Date(log.created_at || Date.now()).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{log.batch_number}</td>
                        <td className="py-3.5 px-4 font-bold">{log.brand_name}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.reason === 'EXPIRED' ? 'bg-rose-100 text-rose-800' :
                            log.reason === 'DAMAGED' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {log.reason}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-rose-600">-{log.quantity_deducted} units</td>
                        <td className="py-3.5 px-4 text-slate-500 italic">{log.notes || 'No comments provided'}</td>
                        <td className="py-3.5 px-4 text-slate-500">{log.adjusted_by_name || 'Inventory Manager'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PORTAL MODAL 1: Ingest Batch Modal */}
      {showIngestModal && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-pharmacy-600" /> Ingest New Inventory Batch
              </h3>
              <button 
                type="button" 
                onClick={() => setShowIngestModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIngestSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <CustomSelect
                  label="Select Medication *"
                  placeholder="Choose Drug..."
                  options={drugOptions}
                  value={formData.drug_id}
                  onChange={handleIngestDrugChange}
                />
                <CustomSelect
                  label="Supplier / Vendor"
                  placeholder="Choose Supplier..."
                  options={supplierOptions}
                  value={formData.supplier_id}
                  onChange={(val) => setFormData({ ...formData, supplier_id: val })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Batch / Lot Number</label>
                  <input
                    type="text"
                    required
                    value={formData.batch_number}
                    onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-pharmacy-500/20 focus:border-pharmacy-500"
                    placeholder="e.g. BATCH-2026-X"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Quantity Received</label>
                  <input
                    type="number"
                    required
                    value={formData.quantity_in_stock}
                    onChange={(e) => setFormData({ ...formData, quantity_in_stock: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-pharmacy-500/20 focus:border-pharmacy-500"
                    placeholder="100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Cost Price (GHS)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-pharmacy-500/20 focus:border-pharmacy-500"
                    placeholder="10.00"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Selling Price (GHS)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-pharmacy-500/20 focus:border-pharmacy-500"
                    placeholder="15.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-pharmacy-500/20 focus:border-pharmacy-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Storage Location</label>
                  <input
                    type="text"
                    value={formData.storage_location}
                    onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-pharmacy-500/20 focus:border-pharmacy-500"
                    placeholder="Aisle-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowIngestModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-pharmacy-600 text-white hover:bg-pharmacy-700 shadow-md cursor-pointer"
                >
                  Ingest Batch
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* PORTAL MODAL 2: Stock Adjustment Modal */}
      {selectedBatchForAdjustment && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 relative space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Adjust Batch Stock</h3>
                <p className="text-xs text-slate-400">Batch #: {selectedBatchForAdjustment.batch_number}</p>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedBatchForAdjustment(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustmentSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Medication Item</label>
                <input
                  type="text"
                  disabled
                  value={`${selectedBatchForAdjustment.brand_name} (${selectedBatchForAdjustment.quantity_in_stock} currently in stock)`}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-500 font-semibold"
                />
              </div>

              <div>
                <CustomSelect
                  label="Adjustment Reason"
                  options={adjustmentReasonOptions}
                  value={adjustmentData.reason}
                  onChange={(val) => setAdjustmentData({ ...adjustmentData, reason: val })}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Quantity to Deduct</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedBatchForAdjustment.quantity_in_stock}
                  value={adjustmentData.quantity_deducted}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, quantity_deducted: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-pharmacy-500/20 focus:border-pharmacy-500"
                  placeholder="e.g. 5"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Audit Notes / Explanation</label>
                <textarea
                  rows="2"
                  value={adjustmentData.notes}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-pharmacy-500/20 focus:border-pharmacy-500"
                  placeholder="Explain why stock is being adjusted..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedBatchForAdjustment(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md cursor-pointer"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* PORTAL MODAL 3: Add Supplier Modal */}
      {showSupplierModal && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 relative space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" /> Register Supplier / Vendor
              </h3>
              <button 
                type="button" 
                onClick={() => setShowSupplierModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSupplierSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Company / Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={supplierFormData.supplier_name}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, supplier_name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="e.g. Ernest Chemists Ltd"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={supplierFormData.contact_person}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, contact_person: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                    placeholder="Mr. Kofi Boateng"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    value={supplierFormData.lead_time_days}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, lead_time_days: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                    placeholder="3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={supplierFormData.phone}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                    placeholder="+233 24 123 4567"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={supplierFormData.email}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                    placeholder="orders@vendor.com"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* PORTAL MODAL 4: Create Purchase Order Modal */}
      {showPOModal && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 relative space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" /> Issue Purchase Order
              </h3>
              <button 
                type="button" 
                onClick={() => setShowPOModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePOSubmit} className="space-y-3">
              <CustomSelect
                label="Target Supplier *"
                placeholder="Choose Vendor..."
                options={supplierOptions}
                value={poFormData.supplier_id}
                onChange={(val) => setPoFormData({ ...poFormData, supplier_id: val })}
              />

              <CustomSelect
                label="Select Drug Item *"
                placeholder="Choose Drug..."
                options={drugOptions}
                value={poFormData.drug_id}
                onChange={handlePODrugChange}
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Order Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={poFormData.order_quantity}
                    onChange={(e) => handlePOQuantityChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-800"
                    placeholder="e.g. 100"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Est. Total Cost (GHS)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={poFormData.estimated_cost}
                    onChange={(e) => setPoFormData({ ...poFormData, estimated_cost: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-pharmacy-700 bg-amber-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {poFormData.drug_id && (
                <p className="text-[10px] text-slate-400 italic">
                  * Calculated using baseline catalog cost price. You can manually adjust total cost for special vendor bulk pricing.
                </p>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPOModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md cursor-pointer"
                >
                  Generate PO
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}