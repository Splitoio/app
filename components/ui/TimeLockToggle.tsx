import React from "react";

interface TimeLockToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  className?: string;
}

export default function TimeLockToggle({ value, onChange, label = "Lock Price at Time of Split", className = "" }: TimeLockToggleProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && (
        <label htmlFor="time-lock-toggle" className="text-base text-white select-none cursor-pointer">
          {label}
        </label>
      )}
      <button
        id="time-lock-toggle"
        type="button"
        aria-pressed={value}
        onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 ${
          value ? "bg-blue-500" : "bg-white/10"
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white block transition-transform ${
            value ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
