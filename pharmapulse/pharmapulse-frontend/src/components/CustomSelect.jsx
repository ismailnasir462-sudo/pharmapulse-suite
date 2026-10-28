import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomSelect({
  options = [], // Array of { value, label, subtext, icon: Icon }
  value,
  onChange,
  placeholder = 'Select an option...',
  label = '',
  className = '',
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Find currently selected option
  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative w-full space-y-1 font-sans ${className}`} ref={containerRef}>
      {label && (
        <label className="text-[11px] font-bold text-slate-700 block tracking-wide">
          {label}
        </label>
      )}

      {/* Select Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-xs font-semibold flex items-center justify-between transition-all duration-200 cursor-pointer shadow-sm ${
          isOpen
            ? 'border-pharmacy-500 ring-2 ring-pharmacy-500/20 text-slate-900 shadow-md'
            : 'border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
      >
        <div className="flex items-center gap-2 truncate pr-2">
          {selectedOption?.icon && (
            <selectedOption.icon className="w-4 h-4 text-pharmacy-600 shrink-0" />
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 text-slate-400"
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </button>

      {/* Floating Animated Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden z-50 divide-y divide-slate-100 max-h-60 overflow-y-auto py-1"
          >
            {options.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-400 text-center font-medium">
                No options available
              </div>
            ) : (
              options.map((option) => {
                const isSelected = String(option.value) === String(value);
                const OptionIcon = option.icon;

                return (
                  <div
                    key={String(option.value)}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`px-3.5 py-2.5 text-xs font-semibold cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-pharmacy-50 text-pharmacy-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {OptionIcon && (
                        <OptionIcon
                          className={`w-4 h-4 shrink-0 ${
                            isSelected ? 'text-pharmacy-600' : 'text-slate-400'
                          }`}
                        />
                      )}
                      <div>
                        <div className="truncate">{option.label}</div>
                        {option.subtext && (
                          <div className="text-[10px] text-slate-400 font-normal truncate">
                            {option.subtext}
                          </div>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-pharmacy-600 shrink-0 ml-2" />
                    )}
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}