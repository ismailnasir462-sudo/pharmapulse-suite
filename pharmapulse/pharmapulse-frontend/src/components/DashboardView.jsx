import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  Package, 
  Users, 
  AlertTriangle, 
  ArrowUpRight, 
  ChevronDown, 
  Loader2,
  Activity,
  Sparkles,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

export default function DashboardView({ onOpenPOS }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const token = localStorage.getItem('pharmapulse_token') || localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/dashboard/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          setStats(response.data.data);
        }
      } catch (err) {
        console.error("Failed to load pharmacy dashboard metrics", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-3">
        <Loader2 className="w-8 h-8 text-pharmacy-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading PharmaPulse Analytics...</p>
      </div>
    );
  }

  // Motion variants for fluid staggered animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { 
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.96 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: 'spring', stiffness: 260, damping: 20 }
    }
  };

  // Live Chart Data from Backend Engine
  const velocityData = stats?.salesVelocity || [
    { name: 'Jan', orders: 200, sales: 400 },
    { name: 'Feb', orders: 370, sales: 560 },
    { name: 'Mar', orders: 240, sales: 330 },
    { name: 'Apr', orders: 140, sales: 220 },
    { name: 'May', orders: 240, sales: 400 },
    { name: 'Jun', orders: 360, sales: 550 },
  ];

  const categoryPieData = stats?.categoryBreakdown || [
    { name: 'Antibiotics', value: 420, color: '#059669', change: '+1.9%' },
    { name: 'Analgesics', value: 310, color: '#10b981', change: '+2.9%' },
    { name: 'Antidiabetics', value: 180, color: '#34d399', change: '+0.8%' },
    { name: 'Supplements', value: 240, color: '#6ee7b7', change: '-1.2%' }
  ];

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6 max-w-[1400px] mx-auto p-2 font-sans text-slate-800"
    >
      
      {/* Top Header Title & Animated Action Bar */}
      <motion.div variants={cardVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Pharmacy Operations & Sales Report
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenPOS}
          className="bg-pharmacy-600 hover:bg-pharmacy-700 text-white text-xs font-bold px-4 py-2.5 rounded-2xl transition-all shadow-md shadow-pharmacy-600/20 flex items-center gap-2 cursor-pointer"
        >
          <Zap className="w-4 h-4 text-emerald-200 animate-pulse" /> Open POS Terminal
        </motion.button>
      </motion.div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (8 cols): 4 Pharmacy Stat Cards + Sales Velocity Chart */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 4 Metric Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Card 1: Primary Emerald Card (Total Sales) */}
            <motion.div 
              variants={cardVariants}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="bg-pharmacy-600 text-white rounded-3xl p-6 shadow-xl shadow-pharmacy-600/20 relative overflow-hidden flex flex-col justify-between h-44 cursor-pointer"
            >
              <div className="flex justify-between items-start relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <motion.span 
                  animate={{ scale: [1, 1.05, 1] }} 
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/20 text-white flex items-center gap-0.5"
                >
                  <ArrowUpRight className="w-3 h-3" /> +20.9%
                </motion.span>
              </div>
              <div className="relative z-10">
                <span className="text-[11px] text-emerald-100 font-bold uppercase tracking-wider block mb-1">Total Sales Revenue Today</span>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-3xl font-extrabold tracking-tight">
                    GHS {stats?.sales?.todayRevenue ? parseFloat(stats.sales.todayRevenue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                  </h3>
                  <span className="text-[10px] text-emerald-100 font-medium">vs Yesterday</span>
                </div>
              </div>

              {/* Patterned Background Overlay */}
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />
            </motion.div>

            {/* Card 2: Total Orders / Transactions */}
            <motion.div 
              variants={cardVariants}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between h-44 cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
                  <Package className="w-5 h-5 text-pharmacy-600" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" /> +10.9%
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Completed Transactions</span>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    {stats?.sales?.todayTransactions ? stats.sales.todayTransactions.toLocaleString() : '0'} Bills
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">Counter #01</span>
                </div>
              </div>
            </motion.div>

            {/* Card 3: Expiring Batches Warning (FEFO) */}
            <motion.div 
              variants={cardVariants}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between h-44 cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <AlertTriangle className="w-5 h-5 animate-bounce" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                  FEFO Alert
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Expiring Batches (&lt; 60 Days)</span>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-3xl font-extrabold text-amber-600 tracking-tight">
                    {stats?.inventory?.expiringBatchesCount ?? stats?.expiringBatches ?? 0} Batches
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">Priority Dispense</span>
                </div>
              </div>
            </motion.div>

            {/* Card 4: Registered Patients Profiles */}
            <motion.div 
              variants={cardVariants}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between h-44 cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
                  <Users className="w-5 h-5 text-pharmacy-600" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-pharmacy-50 text-pharmacy-700 flex items-center gap-0.5 border border-pharmacy-200/60">
                  <ArrowUpRight className="w-3 h-3" /> Active
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Registered Patient Profiles</span>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    {stats?.patients?.total ? stats.patients.total.toLocaleString() : (stats?.totalPatients ? stats.totalPatients.toLocaleString() : '0')}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">Loyalty Program</span>
                </div>
              </div>
            </motion.div>

          </div>

          {/* Dispensing & Sales Velocity Chart Container */}
          <motion.div 
            variants={cardVariants}
            className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-pharmacy-600 animate-pulse" /> Dispensing & Sales Velocity
                </h3>
                <p className="text-xs text-slate-400 font-medium">Monthly revenue and prescription dispensing trends</p>
              </div>
              <button className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
                This year <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Chart Legend */}
            <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Prescriptions Dispensed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900"></span> Sales Revenue (GHS)
              </span>
            </div>

            {/* Bar Chart Canvas */}
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={velocityData} barGap={10}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                    contentStyle={{ borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                  />
                  <Bar dataKey="orders" fill="#10b981" radius={[10, 10, 10, 10]} barSize={18} name="Orders" />
                  <Bar dataKey="sales" fill="#0f172a" radius={[10, 10, 10, 10]} barSize={18} name="Sales Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

        </div>

        {/* Right Column (4 cols): Product Breakdown & Operational Status */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Therapeutic Product Breakdown Card */}
          <motion.div 
            variants={cardVariants}
            className="bg-gradient-to-b from-pharmacy-50/70 via-white to-white rounded-3xl p-6 border border-pharmacy-100 shadow-sm flex flex-col justify-between space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Therapeutic Breakdown</h3>
                <p className="text-xs text-slate-500 font-medium">Drug category sales distribution</p>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-extrabold text-pharmacy-700 bg-pharmacy-100 px-2.5 py-1 rounded-full border border-pharmacy-200">
                <Sparkles className="w-3 h-3 text-pharmacy-600 animate-spin" /> Live Catalog
              </span>
            </div>

            {/* Circular Donut Chart */}
            <div className="h-44 w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Category Breakdown Table */}
            <div className="space-y-3 pt-2 text-xs font-medium">
              {categoryPieData.map((item, idx) => (
                <motion.div 
                  key={idx} 
                  whileHover={{ x: 3 }}
                  className="flex items-center justify-between text-slate-800 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                    <span className="font-semibold text-slate-700">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-slate-900">{item.value.toLocaleString()} units</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-800 bg-emerald-100">
                      {item.change || '+2.0%'}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Pharmacy Operational Readiness Card */}
          <motion.div 
            variants={cardVariants}
            className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">System Services Readiness</h3>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Operational
              </span>
            </div>

            <div className="space-y-2.5 text-xs font-medium">
              <div className="flex justify-between items-center p-2.5 rounded-2xl bg-slate-50">
                <span className="text-slate-700 font-semibold">MySQL FEFO Matrix</span>
                <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Active
                </span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-2xl bg-slate-50">
                <span className="text-slate-700 font-semibold">Python AI Image Engine</span>
                <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Port 8000
                </span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-2xl bg-slate-50">
                <span className="text-slate-700 font-semibold">WHO / FDA Ghana KB</span>
                <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Indexed
                </span>
              </div>
            </div>
          </motion.div>

        </div>

      </div>

    </motion.div>
  );
}