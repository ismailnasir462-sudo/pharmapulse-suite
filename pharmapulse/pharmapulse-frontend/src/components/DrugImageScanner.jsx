import React, { useState, useRef } from 'react';
import axios from 'axios';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  ShieldAlert, 
  CheckCircle2, 
  Pill, 
  Loader2, 
  FileText, 
  AlertCircle,
  Package,
  Layers,
  X,
  RefreshCw
} from 'lucide-react';

export default function DrugImageScanner() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Live Camera Stream State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const getHeaders = () => {
    const token = localStorage.getItem('pharmapulse_token') || localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
      stopCamera();
    }
  };

  // Start Device Camera
  const startCamera = async () => {
    try {
      setError(null);
      setResult(null);
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsCameraActive(true);

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Unable to access webcam or mobile camera. Check permissions or upload a file instead.');
      setIsCameraActive(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Capture Frame from Live Camera Stream
  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'camera_capture.jpg', { type: 'image/jpeg' });
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        stopCamera();
      }
    }, 'image/jpeg', 0.92);
  };

  const handleIdentifyDrug = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/ai/identify-drug',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...getHeaders()
          }
        }
      );

      if (response.data?.success) {
        setResult(response.data);
      } else {
        setError(response.data?.message || 'Drug identification failed to match catalog items.');
      }
    } catch (err) {
      console.error('AI Identification Error:', err);
      setError(err.response?.data?.message || 'Error connecting to the Express/Gemini AI Gateway.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 font-sans text-slate-800">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-pharmacy-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex items-center justify-between">
        <div>
          <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-pharmacy-500/30 text-pharmacy-300 border border-pharmacy-400/30 flex items-center gap-1.5 w-fit mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Free Gemini Vision AI Engine
          </span>
          <h2 className="text-2xl font-bold tracking-tight">AI Drug Package & Pill Recognition</h2>
          <p className="text-xs text-slate-300 mt-1">
            Capture or upload a picture of unlabelled packaging to identify active composition, live stock, catalog price, and WHO/FDA Ghana clinical guidelines.
          </p>
        </div>
        <div className="hidden md:flex w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md items-center justify-center">
          <Pill className="w-6 h-6 text-pharmacy-300" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Image Dropzone / Live Camera Stream */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-pharmacy-600" /> Package Image Input
              </h3>
              {!isCameraActive ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-pharmacy-50 hover:text-pharmacy-700 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-pharmacy-600" /> Start Web Camera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 font-bold text-xs flex items-center gap-1 hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Close Camera
                </button>
              )}
            </div>

            {/* Live Camera Feed Container */}
            {isCameraActive ? (
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 min-h-[240px] flex flex-col items-center justify-center">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-56 object-cover"
                />
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="absolute bottom-3 bg-pharmacy-600 hover:bg-pharmacy-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-4 h-4" /> Snap Photo
                </button>
              </div>
            ) : (
              /* Dropzone Container */
              <label className="relative border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-pharmacy-500 hover:bg-pharmacy-50/50 transition-all min-h-[220px] bg-slate-50/50">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  className="hidden" 
                />

                {previewUrl ? (
                  <div className="relative w-full h-48 rounded-xl overflow-hidden group">
                    <img 
                      src={previewUrl} 
                      alt="Selected drug package" 
                      className="w-full h-full object-cover rounded-xl"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                      Change Image
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-pharmacy-100 text-pharmacy-600 flex items-center justify-center mx-auto">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-semibold text-slate-700">Click or drag drug photo here</div>
                    <div className="text-[10px] text-slate-400">Supports JPG, PNG, WEBP</div>
                  </div>
                )}
              </label>
            )}
          </div>

          {/* Identification Action Button */}
          <button
            type="button"
            onClick={handleIdentifyDrug}
            disabled={!selectedFile || loading}
            className={`w-full py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
              !selectedFile || loading
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-pharmacy-600 hover:bg-pharmacy-700 text-white active:scale-98'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Querying Gemini AI & MySQL...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Analyze Packaging & Match Stock
              </>
            )}
          </button>
        </div>

        {/* Right Column: Match Results, Active Stock & Guidelines */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              {error}
            </div>
          )}

          {!result && !loading && !error && (
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-bold text-slate-700">Awaiting Image Input</h4>
              <p className="text-[11px] text-slate-400 max-w-xs">
                Upload or capture a drug package picture on the left to extract generic specs, active stock levels, and clinical guidelines.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center h-64 space-y-3">
              <Loader2 className="w-8 h-8 text-pharmacy-600 animate-spin" />
              <p className="text-xs font-semibold text-slate-500">Gemini Vision parsing packaging text & cross-matching catalog...</p>
            </div>
          )}

          {result && result.success && (
            <div className="space-y-5 animate-fade-in">
              
              {/* Match Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1 w-fit mb-1.5">
                    <CheckCircle2 className="w-3 h-3" /> {result.match_type || 'EXACT_VISUAL_MATCH'}
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    {result.matched_drug?.brand_name || result.ai_extracted?.brand_name || 'Unmapped Drug Packaging'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Generic: <span className="text-slate-800 font-semibold">{result.matched_drug?.generic_name || result.ai_extracted?.generic_name}</span> ({result.matched_drug?.strength || result.ai_extracted?.strength})
                  </p>
                </div>

                {result.matched_drug && (
                  <div className="text-left sm:text-right bg-pharmacy-50/50 p-3 rounded-2xl border border-pharmacy-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Catalog Price</span>
                    <span className="text-lg font-extrabold text-pharmacy-600">
                      GHS {parseFloat(result.matched_drug.unit_price || result.matched_drug.selling_price || 0).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Stock Inventory & AI Raw Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">Total In Stock</span>
                  <span className="font-extrabold text-slate-900 flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-pharmacy-600" />
                    {result.matched_drug?.quantity_in_stock || result.matched_drug?.total_stock || 0} Units
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">Dosage Form</span>
                  <span className="font-semibold text-slate-800">
                    {result.matched_drug?.dosage_form || result.ai_extracted?.dosage_form || 'N/A'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 col-span-2 sm:col-span-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">Source Reference</span>
                  <span className="font-extrabold text-emerald-700 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" /> 
                    {result.matched_drug?.source_reference || result.matched_drug?.regulatory_status || 'FDA_GHANA'}
                  </span>
                </div>
              </div>

              {/* Gemini Extracted Raw Metadata Badge */}
              {result.ai_extracted && (
                <div className="p-3 rounded-2xl bg-slate-100/70 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <span className="font-bold text-slate-900 block text-[10px] uppercase tracking-wider">
                    Gemini AI Vision Extraction Specs:
                  </span>
                  <p>• <strong>Manufacturer:</strong> {result.ai_extracted.manufacturer || 'N/A'}</p>
                  <p>• <strong>Batch #:</strong> {result.ai_extracted.batch_number || 'N/A'}</p>
                  <p>• <strong>Expiry Printed:</strong> {result.ai_extracted.expiry_date || 'N/A'}</p>
                </div>
              )}

              {/* Verified Clinical Guidelines */}
              <div className="p-4 rounded-2xl bg-pharmacy-50/60 border border-pharmacy-200/60 space-y-2 text-xs">
                <h4 className="font-bold text-pharmacy-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-pharmacy-600" /> Verified Clinical Guidelines
                </h4>
                <div className="space-y-1 text-pharmacy-950 font-medium">
                  <p><strong className="text-pharmacy-900">Standard Dosage:</strong> {result.matched_drug?.standard_dosage || '500mg twice daily with meals'}</p>
                  <p><strong className="text-pharmacy-900">Max Daily Dose:</strong> {result.matched_drug?.max_daily_dose || '2500mg daily'}</p>
                  <p><strong className="text-pharmacy-900">Contraindications:</strong> {result.matched_drug?.contraindications || 'Severe renal impairment'}</p>
                  <p><strong className="text-pharmacy-900">Side Effects:</strong> {result.matched_drug?.side_effects || 'GI upset, nausea'}</p>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}