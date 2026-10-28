import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { 
  Camera, 
  X, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Pill,
  Upload
} from 'lucide-react';

export default function VisionScannerModal({ isOpen, onClose, onDrugIdentified }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Live Camera Controls
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  if (!isOpen) return null;

  const getHeaders = () => {
    const token = localStorage.getItem('pharmapulse_token') || localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  const startCamera = async () => {
    try {
      setError(null);
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
      setError('Unable to access camera feed.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleClose = () => {
    stopCamera();
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    onClose();
  };

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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
      stopCamera();
    }
  };

  const processScan = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);

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

      if (response.data?.success && response.data?.matched_drug) {
        onDrugIdentified(response.data.matched_drug, response.data.ai_extracted);
        handleClose();
      } else {
        setError(response.data?.message || 'Packaging extracted, but no matching catalog drug was found.');
      }
    } catch (err) {
      console.error('Vision Modal Scan Error:', err);
      setError(err.response?.data?.message || 'Failed to communicate with Express/Gemini gateway.');
    } finally {
      setLoading(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] font-sans">
      <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 relative space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-pharmacy-100 text-pharmacy-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Quick Optical Package Scanner</h3>
              <p className="text-[11px] text-slate-400">Scan packaging to auto-add to cart or fill stock forms.</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={handleClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            {error}
          </div>
        )}

        {/* Media Stream / Dropzone */}
        {isCameraActive ? (
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 min-h-[220px] flex flex-col items-center justify-center">
            <video ref={videoRef} autoPlay playsInline className="w-full h-52 object-cover" />
            <button
              type="button"
              onClick={capturePhoto}
              className="absolute bottom-3 bg-pharmacy-600 hover:bg-pharmacy-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Camera className="w-4 h-4" /> Snap Packaging
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="relative border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-pharmacy-500 hover:bg-pharmacy-50/50 transition-all min-h-[180px] bg-slate-50/50">
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              {previewUrl ? (
                <img src={previewUrl} alt="Captured scan" className="w-full h-40 object-cover rounded-xl" />
              ) : (
                <div className="text-center space-y-1.5">
                  <Upload className="w-6 h-6 text-pharmacy-600 mx-auto" />
                  <div className="text-xs font-semibold text-slate-700">Click to upload drug image</div>
                  <div className="text-[10px] text-slate-400">JPG, PNG, WEBP</div>
                </div>
              )}
            </label>

            <button
              type="button"
              onClick={startCamera}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-pharmacy-600" /> Use Live Device Web Camera
            </button>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={processScan}
            disabled={!selectedFile || loading}
            className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 text-white shadow-md cursor-pointer ${
              !selectedFile || loading ? 'bg-slate-300 cursor-not-allowed' : 'bg-pharmacy-600 hover:bg-pharmacy-700'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Scanning...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> Add Item to POS Cart
              </>
            )}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}