import React from 'react';

export default function PulseLoader({ text = "Querying Database..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-fade-in">
      <div className="relative flex items-center justify-center">
        {/* Outer Expanding Pulse Ring */}
        <div className="absolute w-16 h-16 rounded-full bg-pharmacy-500/20 animate-ping"></div>
        {/* Inner Soft Glow Ring */}
        <div className="absolute w-12 h-12 rounded-full bg-pharmacy-500/40 animate-pulse"></div>
        {/* Core Animated Pill Circle */}
        <div className="relative w-8 h-8 rounded-full bg-pharmacy-600 shadow-lg shadow-pharmacy-600/40 flex items-center justify-center transition-transform transform hover:scale-110">
          <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce"></div>
        </div>
      </div>
      <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase animate-pulse">
        {text}
      </p>
    </div>
  );
}