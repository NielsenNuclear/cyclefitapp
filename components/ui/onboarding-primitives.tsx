"use client";

import { useState } from "react";

// ─── OptionCard ───────────────────────────────────────────────────────────────
// Single or multi-select card with icon, label, and optional description

interface OptionCardProps {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  accent?: "purple" | "teal" | "amber";
  size?: "sm" | "md";
}

export function OptionCard({
  label, description, icon, selected, onClick,
  accent = "purple", size = "md",
}: OptionCardProps) {
  const accentMap = {
    purple: { border: "border-[#534AB7]", bg: "bg-[#EEEDFE]", text: "text-[#3C3489]", dot: "bg-[#534AB7]" },
    teal:   { border: "border-[#0F6E56]", bg: "bg-[#E1F5EE]", text: "text-[#085041]", dot: "bg-[#0F6E56]" },
    amber:  { border: "border-[#854F0B]", bg: "bg-[#FAEEDA]", text: "text-[#633806]", dot: "bg-[#854F0B]" },
  };
  const a = accentMap[accent];
  const padding = size === "sm" ? "p-3" : "p-4";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full text-left rounded-xl border transition-all duration-200
        ${padding}
        ${selected
          ? `${a.border} ${a.bg} shadow-[0_0_0_1px_${a.border}]`
          : "border-[#EAE7DE] bg-white hover:border-[#C8C5BC] hover:bg-[#FAFAF8]"
        }
      `}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
            ${selected ? a.bg : "bg-[#F5F3EE]"}`}>
            <span className={selected ? a.text : "text-[#8A8880]"}>{icon}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className={`text-[13px] font-semibold leading-snug ${selected ? a.text : "text-[#1C1B18]"}`}>
            {label}
          </div>
          {description && (
            <div className={`text-[11px] mt-0.5 leading-snug ${selected ? a.text + " opacity-80" : "text-[#8A8880]"}`}>
              {description}
            </div>
          )}
        </div>
        <div className={`flex-shrink-0 w-4 h-4 rounded-full border-2 transition-all
          ${selected ? `${a.dot} border-transparent flex items-center justify-center` : "border-[#D3D1C7]"}`}>
          {selected && (
            <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
              <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── ChipSelect ───────────────────────────────────────────────────────────────
// Compact pill chips for multi-select

interface ChipSelectProps {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  max?: number;
  accent?: "purple" | "teal" | "amber";
}

export function ChipSelect({ options, selected, onChange, max, accent = "purple" }: ChipSelectProps) {
  const accentMap = {
    purple: "bg-[#EEEDFE] text-[#3C3489] border-[#C4C0EE]",
    teal:   "bg-[#E1F5EE] text-[#085041] border-[#A8DFC8]",
    amber:  "bg-[#FAEEDA] text-[#633806] border-[#E4C88A]",
  };

  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter(v => v !== val));
    } else {
      if (max && selected.length >= max) return;
      onChange([...selected, val]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const isSelected = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium border transition-all duration-150
              ${isSelected
                ? accentMap[accent]
                : "bg-white text-[#6B6860] border-[#E0DDD4] hover:border-[#C8C5BC] hover:text-[#1C1B18]"
              }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── ScaleSlider ──────────────────────────────────────────────────────────────
// Labeled 1-10 range slider with visual fill

interface ScaleSliderProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  lowLabel?: string;
  highLabel?: string;
  showValue?: boolean;
  accent?: "purple" | "teal" | "amber";
}

export function ScaleSlider({
  value, onChange,
  min = 1, max = 10, step = 1,
  lowLabel, highLabel, showValue = true,
  accent = "purple",
}: ScaleSliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  const colorMap = { purple: "#534AB7", teal: "#0F6E56", amber: "#854F0B" };
  const color = colorMap[accent];

  return (
    <div className="w-full">
      {showValue && (
        <div className="flex justify-between items-center mb-3">
          <span className="text-[12px] text-[#8A8880]">{lowLabel}</span>
          <span className="text-[28px] font-semibold text-[#1C1B18]" style={{ fontFamily: "'DM Serif Display', serif" }}>
            {value}
            <span className="text-[14px] text-[#8A8880] font-normal">/{max}</span>
          </span>
          <span className="text-[12px] text-[#8A8880]">{highLabel}</span>
        </div>
      )}
      <div className="relative h-1.5 bg-[#EAE7DE] rounded-full">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-150"
          style={{ width: `${pct}%`, background: color }}
        />
        <input
          type="range"
          min={min} max={max} step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
          style={{ margin: 0 }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-all duration-150"
          style={{ left: `calc(${pct}% - 10px)`, background: color }}
        />
      </div>
      {!showValue && lowLabel && (
        <div className="flex justify-between mt-2">
          <span className="text-[10px] text-[#8A8880]">{lowLabel}</span>
          <span className="text-[10px] text-[#8A8880]">{highLabel}</span>
        </div>
      )}
    </div>
  );
}

// ─── NumberStepper ────────────────────────────────────────────────────────────

interface NumberStepperProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  label?: string;
}

export function NumberStepper({
  value, onChange,
  min = 0, max = 100, step = 1,
  unit = "", label,
}: NumberStepperProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      {label && <div className="text-[11px] font-semibold text-[#8A8880] uppercase tracking-wider">{label}</div>}
      <div className="flex items-center gap-4 bg-[#F5F3EE] rounded-2xl px-4 py-3 border border-[#EAE7DE]">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          className="w-9 h-9 rounded-full border border-[#E0DDD4] bg-white text-[#1C1B18] flex items-center justify-center text-lg font-light hover:bg-[#EEEDFE] hover:border-[#C4C0EE] hover:text-[#534AB7] transition-all"
        >
          −
        </button>
        <div className="text-center min-w-[60px]">
          <span className="text-[32px] font-semibold text-[#1C1B18]" style={{ fontFamily: "'DM Serif Display', serif" }}>
            {value}
          </span>
          {unit && <span className="text-[13px] text-[#8A8880] ml-1">{unit}</span>}
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          className="w-9 h-9 rounded-full border border-[#E0DDD4] bg-white text-[#1C1B18] flex items-center justify-center text-lg font-light hover:bg-[#EEEDFE] hover:border-[#C4C0EE] hover:text-[#534AB7] transition-all"
        >
          +
        </button>
      </div>
    </div>
  );
}

// ─── SegmentedControl ─────────────────────────────────────────────────────────

interface SegmentedControlProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (val: string) => void;
}

export function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  return (
    <div className="flex bg-[#F5F3EE] rounded-xl p-1 border border-[#EAE7DE] gap-1">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-2 px-3 rounded-lg text-[12px] font-medium transition-all duration-200
            ${value === opt.value
              ? "bg-white text-[#1C1B18] shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
              : "text-[#8A8880] hover:text-[#1C1B18]"
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── StepContinueButton ───────────────────────────────────────────────────────

interface StepContinueButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  isLast?: boolean;
}

export function StepContinueButton({ onClick, disabled = false, label, isLast = false }: StepContinueButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-3.5 rounded-full text-[14px] font-semibold flex items-center justify-center gap-2 transition-all duration-200
        ${disabled
          ? "bg-[#EAE7DE] text-[#B0AEA6] cursor-not-allowed"
          : "bg-[#1C1B18] text-white hover:bg-[#2C2B28] shadow-[0_4px_20px_rgba(0,0,0,0.12)] hover:shadow-[0_6px_28px_rgba(0,0,0,0.18)] hover:-translate-y-0.5"
        }`}
    >
      {label ?? (isLast ? "Build my profile" : "Continue")}
      {!disabled && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      )}
    </button>
  );
}

// ─── StepLabel ────────────────────────────────────────────────────────────────

export function StepLabel({ category, step, total }: { category: string; step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#534AB7]">{category}</span>
      <span className="text-[10px] text-[#C8C5BC]">·</span>
      <span className="text-[10px] text-[#8A8880]">{step} of {total}</span>
    </div>
  );
}
