import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  DollarSign, 
  Smartphone, 
  Printer, 
  CheckCircle2, 
  Loader2,
  Clock,
  Camera,
  X,
  Pill,
  Receipt,
  User,
  Sparkles,
  Scan
} from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import POSTransactionsView from './POSTransactionsView';
import CustomSelect from './CustomSelect';
import VisionScannerModal from './VisionScannerModal';

export default function POSTerminalView({ externalAttachedPatient, externalAttachedPrescription }) {
  const [activeTab, setActiveTab] = useState('terminal');

  const [catalog, setCatalog] = useState([]);
  const [filteredCatalog, setFilteredCatalog] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [cart, setCart] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxRate] = useState(0.05);
  const [activeShift, setActiveShift] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedTxn, setCompletedTxn] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [showVisionModal, setShowVisionModal] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const searchInputRef = useRef(null);

  const getHeaders = () => {
    const token = localStorage.getItem('pharmapulse_token') || localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const headers = getHeaders();

      const [catalogRes, patientRes, shiftRes] = await Promise.all([
        axios.get('http://localhost:5000/api/pos/catalog', { headers }).catch(() => ({ data: { success: false } })),
        axios.get('http://localhost:5000/api/pos/patients', { headers }).catch(() => ({ data: { success: false } })),
        axios.get('http://localhost:5000/api/shifts/active', { headers }).catch(() => ({ data: { success: false } }))
      ]);

      if (catalogRes.data && catalogRes.data.success) {
        setCatalog(catalogRes.data.catalog || []);
        setFilteredCatalog(catalogRes.data.catalog || []);
      }
      if (patientRes.data && patientRes.data.success) {
        setPatients(patientRes.data.patients || []);
      }
      if (shiftRes.data && shiftRes.data.success) {
        setActiveShift(shiftRes.data.activeShift || null);
      }

      if (externalAttachedPatient) {
        setSelectedPatient(externalAttachedPatient);
      }
    } catch (err) {
      console.error('POS Initialization Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [externalAttachedPatient]);

  useEffect(() => {
    if (!searchQuery || !searchQuery.trim()) {
      setFilteredCatalog(catalog);
      setSuggestions([]);
      setShowSuggestions(false);
    } else {
      const q = searchQuery.toLowerCase().trim();
      
      const matches = catalog.filter((item) => {
        const brandMatch = item.brand_name ? item.brand_name.toLowerCase().includes(q) : false;
        const genericMatch = item.generic_name ? item.generic_name.toLowerCase().includes(q) : false;
        const ingredientMatch = item.active_ingredient ? item.active_ingredient.toLowerCase().includes(q) : false;
        const barcodeMatch = item.barcode ? String(item.barcode).toLowerCase().includes(q) : false;
        const batchMatch = item.batch_number ? String(item.batch_number).toLowerCase().includes(q) : false;
        
        return brandMatch || genericMatch || ingredientMatch || barcodeMatch || batchMatch;
      });

      setFilteredCatalog(matches);
      setSuggestions(matches.slice(0, 8));
      setShowSuggestions(true);
    }
  }, [searchQuery, catalog]);

  const addToCart = (product) => {
    const batchId = product.batch_id || 1;
    const availableStock = parseInt(product.quantity_in_stock || product.in_stock || 100, 10);
    const unitPrice = parseFloat(product.unit_price || product.selling_price || 0);

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((i) => i.batch_id === batchId && i.drug_id === product.drug_id);

      if (existingIndex > -1) {
        const currentQty = prevCart[existingIndex].quantity;
        if (currentQty >= availableStock) {
          alert(`Stock limit reached! Only ${availableStock} units available in this batch.`);
          return prevCart;
        }

        const updated = [...prevCart];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: currentQty + 1
        };
        return updated;
      }

      return [
        ...prevCart,
        {
          drug_id: product.drug_id,
          batch_id: batchId,
          brand_name: product.brand_name || 'Medication',
          generic_name: product.generic_name || '',
          strength: product.strength || '',
          dosage_form: product.dosage_form || 'Tablet',
          unit_price: unitPrice,
          quantity: 1,
          max_stock: availableStock,
          discount_applied: 0
        }
      ];
    });

    setSearchQuery('');
    setShowSuggestions(false);
  };

  // Handler when DeepSeek / AI identifies a drug packaging photo (Product Name -> Active Ingredient Fallback)
  const handleAiDrugIdentified = (matchedDrug, aiExtracted) => {
    if (matchedDrug) {
      // Exact stock item matched (by brand name OR ingredient) -> Add directly to cart!
      addToCart(matchedDrug);
    } else {
      // Fallback: If item is not in stock, populate search query with Product Name first, then Active Ingredient
      const fallbackTerm = aiExtracted?.brand_name || aiExtracted?.active_ingredient || aiExtracted?.generic_name;
      if (fallbackTerm && fallbackTerm.toLowerCase() !== 'null') {
        setSearchQuery(fallbackTerm);
      }
    }
  };

  const closeCameraAndRefresh = () => {
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }

      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
        codeReaderRef.current = null;
      }
    } catch (err) {
      console.error('Error stopping video stream:', err);
    } finally {
      setIsCameraOpen(false);
    }
  };

  useEffect(() => {
    if (isCameraOpen) {
      codeReaderRef.current = new BrowserMultiFormatReader();
      
      codeReaderRef.current
        .decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
          if (result) {
            const scannedCode = result.getText();
            handleBarCodeScanned(scannedCode);
          }
        })
        .catch((err) => {
          console.error('Camera Access Error:', err);
          setCameraError('Unable to access webcam. Please verify permissions.');
        });
    } else {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    }

    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, [isCameraOpen]);

  const handleBarCodeScanned = (code) => {
    const matched = catalog.find(
      (item) => item.barcode === code || item.batch_number === code
    );

    if (matched) {
      addToCart(matched);
      closeCameraAndRefresh();
    } else {
      setSearchQuery(code);
      closeCameraAndRefresh();
    }
  };

  const updateQuantity = (batchId, drugId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.batch_id === batchId && item.drug_id === drugId) {
            const newQty = item.quantity + delta;
            if (newQty > item.max_stock) {
              alert(`Maximum available batch stock is ${item.max_stock}.`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (batchId, drugId) => {
    setCart((prev) => prev.filter((i) => !(i.batch_id === batchId && i.drug_id === drugId)));
  };

  const subtotal = cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const taxAmount = Math.max(0, (subtotal - discountAmount) * taxRate);
  const grandTotal = Math.max(0, subtotal - discountAmount + taxAmount);

  const handleCheckout = async () => {
    if (cart.length === 0) return alert('Cart is empty!');

    try {
      setIsProcessing(true);
      const headers = getHeaders();
      const payload = {
        patient_id: selectedPatient ? selectedPatient.patient_id : null,
        prescription_id: externalAttachedPrescription?.prescription_id || null,
        items: cart.map((item) => ({
          drug_id: item.drug_id,
          batch_id: item.batch_id,
          quantity_sold: item.quantity,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_applied: item.discount_applied || 0
        })),
        payment_method: paymentMethod,
        subtotal,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        grand_total: grandTotal
      };

      const res = await axios.post('http://localhost:5000/api/pos/checkout', payload, { headers });

      if (res.data.success) {
        setCompletedTxn({
          transaction_number: res.data.transaction_number || res.data.transaction?.transaction_number || `TXN-${Date.now()}`,
          items: cart,
          subtotal,
          taxAmount,
          discountAmount,
          grandTotal: res.data.total_amount || grandTotal,
          patient: selectedPatient
        });
        setCart([]);
        setSelectedPatient(null);
        setDiscountAmount(0);
        loadInitialData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Checkout failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const patientOptions = [
    { value: '', label: 'Walk-in Customer', icon: User },
    ...patients.map((p) => ({
      value: p.patient_id,
      label: `${p.full_name} (${p.phone_number || p.patient_code})`,
      subtext: `${p.loyalty_points || 0} Loyalty Points`,
      icon: User
    }))
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-3">
        <Loader2 className="w-8 h-8 text-pharmacy-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Loading POS Catalog & Cashier Terminal...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto p-4 space-y-4 font-sans text-slate-800">
      
      {/* Top Header & Tab Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between bg-white rounded-2xl p-4 border border-slate-200 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              {activeShift ? `Register: ${activeShift.cash_register_id || 'REG-01'}` : 'Cashier Counter Terminal'}
            </h3>
            <p className="text-xs text-slate-500">FEFO Automated Batch Deduction & DeepSeek AI Vision Ready</p>
          </div>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('terminal')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'terminal' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5 text-pharmacy-600" />
            <span>POS Terminal</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'transactions' 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sales & Audit History</span>
          </button>
        </div>
      </div>

      {activeTab === 'transactions' ? (
        <POSTransactionsView />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4 relative">
            <div className="relative z-30">
              <div className="relative flex items-center">
                <Search className="absolute left-4 w-4 h-4 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
                  placeholder="Search drug, active ingredient, barcode, or click AI Vision Scanner..."
                  className="w-full pl-11 pr-36 py-3.5 bg-white rounded-2xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pharmacy-500 shadow-sm"
                />

                <div className="absolute right-2 flex items-center gap-1">
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setShowSuggestions(false);
                      }}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg bg-slate-100 cursor-pointer"
                    >
                      CLEAR
                    </button>
                  )}

                  {/* Barcode Scanner Button */}
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    title="Scan Barcode via WebCam"
                    className="px-2 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>

                  {/* DeepSeek AI Vision Package Scanner Button */}
                  <button
                    type="button"
                    onClick={() => setShowVisionModal(true)}
                    title="Open DeepSeek AI Vision Package Scanner"
                    className="px-2.5 py-1.5 bg-pharmacy-50 text-pharmacy-700 hover:bg-pharmacy-600 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-pharmacy-600" />
                    <span>AI Scan</span>
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50 divide-y divide-slate-100 max-h-80 overflow-y-auto"
                  >
                    <div className="px-4 py-2 bg-slate-50 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex justify-between">
                      <span>Matching Stock Items</span>
                      <span>Click item to add to cart</span>
                    </div>

                    {suggestions.map((item) => (
                      <div
                        key={`suggest-${item.drug_id}-${item.batch_id}`}
                        onClick={() => addToCart(item)}
                        className="p-3 hover:bg-pharmacy-50/80 cursor-pointer transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-pharmacy-100 text-pharmacy-700 group-hover:bg-pharmacy-600 group-hover:text-white transition-colors">
                            <Pill className="w-4 h-4" />
                          </div>
                          <div>
                            <h5 className="font-bold text-slate-900 text-xs group-hover:text-pharmacy-700">
                              {item.brand_name}
                            </h5>
                            <p className="text-[10px] text-slate-400">
                              {item.strength} <span className="italic">{item.generic_name}</span> ({item.active_ingredient})
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-extrabold text-xs text-pharmacy-600 block">
                            GHS {parseFloat(item.unit_price || item.selling_price || 0).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                            {item.quantity_in_stock} available
                          </span>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-1">
              {filteredCatalog.length === 0 ? (
                <div className="col-span-3 bg-white rounded-2xl p-8 text-center text-slate-400 text-xs border border-slate-200">
                  No matching medications found in active inventory.
                </div>
              ) : (
                filteredCatalog.map((product) => (
                  <motion.div
                    key={`grid-${product.drug_id}-${product.batch_id}`}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => addToCart(product)}
                    className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm cursor-pointer hover:border-pharmacy-500 transition-all flex flex-col justify-between h-36"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {product.dosage_form || 'Tablet'}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          FEFO
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs mt-2 line-clamp-1">{product.brand_name}</h4>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{product.strength} {product.generic_name}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="font-extrabold text-xs text-pharmacy-600">
                        GHS {parseFloat(product.unit_price || product.selling_price || 0).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {product.quantity_in_stock} in stock
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between min-h-[500px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-pharmacy-600" /> Dispensing Cart
                </h3>
                <span className="text-xs font-bold text-slate-500">{cart.length} Item(s)</span>
              </div>

              {/* Patient Attachment Custom Dropdown */}
              <CustomSelect
                label="Customer / Patient"
                options={patientOptions}
                value={selectedPatient ? selectedPatient.patient_id : ''}
                onChange={(val) => {
                  const p = patients.find((x) => String(x.patient_id) === String(val));
                  setSelectedPatient(p || null);
                }}
              />

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-400">Cart is empty. Type letters above or scan barcodes.</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={`cart-${item.drug_id}-${item.batch_id}`} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-xs">
                      <div className="flex-1 pr-2">
                        <h5 className="font-bold text-slate-900">{item.brand_name}</h5>
                        <p className="text-[10px] text-slate-400">GHS {item.unit_price.toFixed(2)} each</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          type="button"
                          onClick={() => updateQuantity(item.batch_id, item.drug_id, -1)}
                          className="p-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 cursor-pointer"
                        >
                          <Minus className="w-3 h-3 text-slate-600" />
                        </button>
                        <span className="font-bold text-slate-900 w-5 text-center">{item.quantity}</span>
                        <button 
                          type="button"
                          onClick={() => updateQuantity(item.batch_id, item.drug_id, 1)}
                          className="p-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-slate-600" />
                        </button>
                        <span className="font-extrabold text-slate-900 w-16 text-right">
                          GHS {(item.unit_price * item.quantity).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.batch_id, item.drug_id)}
                          className="p-1 rounded-md text-rose-500 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>GHS {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Estimated Tax (5%)</span>
                  <span>GHS {taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-sm text-slate-900 pt-1 border-t border-slate-100">
                  <span>Grand Total</span>
                  <span className="text-pharmacy-600">GHS {grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                    paymentMethod === 'CASH' 
                      ? 'bg-pharmacy-600 text-white border-pharmacy-600 shadow-sm' 
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" /> Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('MOBILE_MONEY')}
                  className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                    paymentMethod === 'MOBILE_MONEY' 
                      ? 'bg-pharmacy-600 text-white border-pharmacy-600 shadow-sm' 
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" /> MoMo
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARD')}
                  className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                    paymentMethod === 'CARD' 
                      ? 'bg-pharmacy-600 text-white border-pharmacy-600 shadow-sm' 
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" /> Card
                </button>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isProcessing || cart.length === 0}
                onClick={handleCheckout}
                className="w-full py-3.5 rounded-2xl bg-pharmacy-600 hover:bg-pharmacy-700 disabled:bg-slate-300 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {isProcessing ? 'Processing Checkout...' : 'Complete Sale & Print Receipt'}
              </motion.button>
            </div>
          </div>
        </div>
      )}

      {/* WebCam Barcode Scanner Modal */}
      <AnimatePresence>
        {isCameraOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCameraAndRefresh}
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999]"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 relative space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Camera className="w-4 h-4 text-pharmacy-600 animate-pulse" /> WebCam Barcode Vision Scanner
                </h3>
                <button
                  type="button"
                  onClick={closeCameraAndRefresh}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-slate-800">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 border-2 border-pharmacy-500/30 rounded-2xl pointer-events-none flex items-center justify-center">
                  <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse" />
                </div>
              </div>

              {cameraError ? (
                <p className="text-xs text-rose-600 font-medium text-center">{cameraError}</p>
              ) : (
                <p className="text-xs text-slate-500 text-center font-medium">
                  Hold medication barcode steadily in front of your camera.
                </p>
              )}

              <button
                type="button"
                onClick={closeCameraAndRefresh}
                className="w-full py-2.5 rounded-xl bg-slate-100 font-bold text-xs text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                Close Scanner
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DeepSeek AI Vision Package Scanner Modal */}
      <VisionScannerModal
        isOpen={showVisionModal}
        onClose={() => setShowVisionModal(false)}
        onDrugIdentified={handleAiDrugIdentified}
      />

      {/* Thermal Receipt Modal */}
      {completedTxn && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="text-center space-y-1 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">PharmaPulse Pharmacy</h3>
              <p className="text-[10px] text-slate-400">Accra, Ghana | +233 24 000 1122</p>
              <p className="text-xs font-bold text-emerald-600 mt-2">Receipt #{completedTxn.transaction_number}</p>
            </div>

            <div className="space-y-2 text-xs">
              {completedTxn.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-slate-700">
                  <span>{item.brand_name} x{item.quantity}</span>
                  <span>GHS {(item.unit_price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <hr className="border-slate-100" />
              <div className="flex justify-between font-extrabold text-slate-900 text-sm">
                <span>Total Paid</span>
                <span>GHS {parseFloat(completedTxn.grandTotal).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 font-bold text-xs text-slate-700 hover:bg-slate-200 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
              <button
                type="button"
                onClick={() => setCompletedTxn(null)}
                className="flex-1 py-2.5 rounded-xl bg-pharmacy-600 font-bold text-xs text-white hover:bg-pharmacy-700 cursor-pointer"
              >
                Next Order
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}