import React from "react";

interface TimeLockToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  className?: string;
}

export default function TimeLockToggle({ value, onChange, label = "Lock exchange rate (Fix the value at current exchange rate)", className = "" }: TimeLockToggleProps) {
  return (
    <div className={`flex items-center justify-between mt-2 ${className}`}>
      {label && (
        <span className="text-sm text-white/70">{label}</span>
      )}
      <div
        className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${
          value ? "bg-white/30" : "bg-[#333]"
        }`}
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onChange(!value); }}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white transform transition-transform ${
            value ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </div>
    </div>
  );
}
