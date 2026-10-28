import React from 'react';
import { Printer, CheckCircle2, X } from 'lucide-react';

export default function ReceiptModal({ isOpen, onClose, transaction }) {
  if (!isOpen || !transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-6 border border-slate-200 shadow-2xl relative print:shadow-none print:border-none print:w-full print:max-w-none print:p-0">
        
        {/* Modal Header & Close Button (Hidden when printing) */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-100 print:hidden">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            <span>Transaction Completed</span>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Thermal Receipt Area */}
        <div id="printable-receipt" className="space-y-4 font-mono text-xs text-slate-800">
          
          {/* Pharmacy Branding Header */}
          <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
            <div className="w-9 h-9 rounded-2xl bg-pharmacy-600 text-white flex items-center justify-center font-bold text-base mx-auto mb-1.5 print:hidden">
              P
            </div>
            <h2 className="font-extrabold text-base text-slate-900 uppercase font-sans tracking-wider">
              PHARMAPULSE PHARMACY
            </h2>
            <p className="text-[11px] text-slate-500 font-sans">Accra, Ghana • Tel: +233 20 000 0000</p>
            <p className="text-[10px] text-slate-400 font-sans">Official Sales Receipt</p>
          </div>

          {/* Transaction Metadata */}
          <div className="space-y-1 text-[11px] text-slate-600 pb-3 border-b border-dashed border-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Receipt No:</span>
              <span className="font-bold text-slate-900">{transaction.transaction_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date:</span>
              <span>{new Date().toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cashier:</span>
              <span>Ismaila Nasiru</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Method:</span>
              <span className="font-bold text-slate-900">{transaction.payment_method}</span>
            </div>
            {transaction.patient_id && (
              <div className="flex justify-between">
                <span className="text-slate-500">Patient ID:</span>
                <span className="font-semibold">{transaction.patient_id}</span>
              </div>
            )}
            {transaction.prescription_id && (
              <div className="flex justify-between">
                <span className="text-slate-500">Rx Code:</span>
                <span className="font-semibold">{transaction.prescription_id}</span>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="space-y-2 pb-3 border-b border-dashed border-slate-300">
            <div className="flex justify-between font-bold text-[10px] text-slate-400 uppercase tracking-wider">
              <span>Item Description</span>
              <span>Qty x Price</span>
              <span>Total</span>
            </div>
            {transaction.items && transaction.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start text-[11px] gap-2">
                <div className="max-w-[140px] truncate">
                  <p className="font-bold text-slate-900 truncate">{item.brand_name}</p>
                  {item.strength && <p className="text-[10px] text-slate-400">{item.strength}</p>}
                </div>
                <span className="text-slate-500 text-[10px] self-center">
                  {item.quantity} x GHS {parseFloat(item.unit_price).toFixed(2)}
                </span>
                <span className="font-bold text-slate-900 self-center">
                  GHS {(item.quantity * item.unit_price).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals Summary */}
          <div className="space-y-1 text-[11px] pt-1">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span>GHS {transaction.subtotal?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Tax (5% NHSIL):</span>
              <span>GHS {transaction.tax?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-300 font-sans">
              <span>Grand Total:</span>
              <span className="text-pharmacy-600">GHS {transaction.grandTotal?.toFixed(2)}</span>
            </div>
          </div>

          {/* Thermal Receipt Footer */}
          <div className="text-center pt-4 space-y-1 text-[10px] text-slate-400 font-sans">
            <p className="font-semibold text-slate-600">Thank you for choosing PharmaPulse!</p>
            <p>Please inspect all medications prior to leaving the counter.</p>
          </div>

        </div>

        {/* Action Buttons (Hidden when printing) */}
        <div className="flex gap-3 pt-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Receipt
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}