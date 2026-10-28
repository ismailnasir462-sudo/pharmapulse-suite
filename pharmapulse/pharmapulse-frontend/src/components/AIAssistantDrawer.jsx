import React, { useState } from 'react';
import axios from 'axios';
import { 
  Bot, 
  Send, 
  Sparkles, 
  ShieldCheck, 
  Package, 
  Loader2, 
  X, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

export default function AIAssistantDrawer({ onClose }) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Hello! I am your PharmaPulse Clinical & Stock Assistant. Ask me about drug dosages, contraindications, local FDA Ghana / WHO guidelines, or live stock availability.'
    }
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userMessage = query.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: userMessage }]);
    setQuery('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/ai/assistant-query',
        { query: userMessage },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        const { clinicalData, stockData } = response.data;

        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            clinicalMatches: clinicalData || [],
            stockMatches: stockData || []
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: 'I could not retrieve information for that query. Please try searching by drug brand or generic name.'
          }
        ]);
      }
    } catch (err) {
      console.error('AI Assistant Query Error:', err);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Failed to connect to the clinical knowledge base. Please verify the backend service is running.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-5 w-80 md:w-96 flex flex-col h-[520px] transition-all">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-pharmacy-100 flex items-center justify-center text-pharmacy-600 shadow-sm">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">PharmaPulse Clinical AI</h4>
            <span className="text-[10px] text-emerald-600 font-extrabold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> WHO / FDA Ghana / MoH
            </span>
          </div>
        </div>

        {onClose && (
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Message History Container */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`p-3.5 rounded-2xl max-w-[90%] space-y-2 ${
                m.sender === 'user'
                  ? 'bg-pharmacy-600 text-white font-medium shadow-sm'
                  : 'bg-slate-50 border border-slate-100 text-slate-800'
              }`}
            >
              {/* Plain Text Reply */}
              {m.text && <p className="whitespace-pre-line leading-relaxed">{m.text}</p>}

              {/* Structured Stock Matches Output */}
              {m.stockMatches && m.stockMatches.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Package className="w-3 h-3 text-pharmacy-600" /> Active Inventory Stock
                  </span>
                  <div className="space-y-1 bg-white p-2 rounded-xl border border-slate-200/80">
                    {m.stockMatches.map((item, i) => (
                      <div key={i} className="flex justify-between items-center text-[11px]">
                        <span className="font-semibold text-slate-900">{item.brand_name}</span>
                        <span className={`font-bold ${item.total_stock > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {item.total_stock} in stock
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Structured Clinical Guidelines Output */}
              {m.clinicalMatches && m.clinicalMatches.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified Clinical Guidelines
                  </span>
                  {m.clinicalMatches.map((guide, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/60 text-[11px] space-y-1 text-emerald-950">
                      <div className="font-bold text-emerald-900 flex justify-between items-center">
                        <span>{guide.drug_name} ({guide.generic_name})</span>
                        <span className="text-[9px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-full uppercase font-extrabold">
                          {guide.source_reference}
                        </span>
                      </div>
                      <p><strong className="text-emerald-900">Dosage:</strong> {guide.standard_dosage}</p>
                      <p><strong className="text-emerald-900">Max Daily Dose:</strong> {guide.max_daily_dose}</p>
                      <p><strong className="text-emerald-900">Contraindications:</strong> {guide.contraindications}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Fallback when no matches found */}
              {m.sender === 'ai' && !m.text && (!m.stockMatches || m.stockMatches.length === 0) && (!m.clinicalMatches || m.clinicalMatches.length === 0) && (
                <p className="text-slate-500 text-[11px]">No active inventory or clinical guidelines match your query in the database.</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-2 text-slate-500 text-xs font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-pharmacy-600" />
              Searching WHO, FDA Ghana & Inventory database...
            </div>
          </div>
        )}
      </div>

      {/* Query Submission Input Form */}
      <form onSubmit={handleSend} className="mt-3 flex gap-2 pt-2 border-t border-slate-100">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask dosage, stock, or guidelines..."
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-pharmacy-500/20 text-slate-800 font-medium"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className={`p-2.5 rounded-xl transition-all shadow-md flex items-center justify-center ${
            !query.trim() || loading
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-pharmacy-600 hover:bg-pharmacy-700 text-white active:scale-95'
          }`}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}