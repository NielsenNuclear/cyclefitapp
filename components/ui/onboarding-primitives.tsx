"use client";

import { Button } from "./Button";

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
    purple: { border: "border-brand",   bg: "bg-brand-bg-mid",   text: "text-brand-text",   dot: "bg-brand" },
    teal:   { border: "border-success", bg: "bg-success-bg",     text: "text-success-text", dot: "bg-success" },
    amber:  { border: "border-caution", bg: "bg-caution-bg",     text: "text-caution-text", dot: "bg-caution" },
  };
  const a = accentMap[accent];
  const padding = size === "sm" ? "p-3" : "p-4";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full text-left rounded-xl border transition-all duration-normal
        ${padding}
        ${selected
          ? `${a.border} ${a.bg} ${a.text}`
          : "border-border bg-surface hover:border-border-strong hover:bg-surface-hover"
        }
      `}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
            ${selected ? a.bg : "bg-surface-subtle"}`}>
            <span className={selected ? a.text : "text-ink-muted"}>{icon}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className={`text-[13px] font-semibold leading-snug ${selected ? a.text : "text-ink"}`}>
            {label}
          </div>
          {description && (
            <div className={`text-[11px] mt-0.5 leading-snug ${selected ? a.text + " opacity-80" : "text-ink-muted"}`}>
              {description}
            </div>
          )}
        </div>
        <div className={`flex-shrink-0 w-4 h-4 rounded-full border-2 transition-all
          ${selected ? `${a.dot} border-transparent flex items-center justify-center` : "border-border-strong"}`}>
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
    purple: "bg-brand-bg-mid text-brand-text border-brand-border",
    teal:   "bg-success-bg text-success-text border-success-border",
    amber:  "bg-caution-bg text-caution-text border-caution-border",
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
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium border transition-all duration-fast
              ${isSelected
                ? accentMap[accent]
                : "bg-surface text-ink-secondary border-border hover:border-border-strong hover:text-ink"
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

const ACCENT_BG_CLASS = { purple: "bg-brand", teal: "bg-success", amber: "bg-caution" };

export function ScaleSlider({
  value, onChange,
  min = 1, max = 10, step = 1,
  lowLabel, highLabel, showValue = true,
  accent = "purple",
}: ScaleSliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  const fillClass = ACCENT_BG_CLASS[accent];

  return (
    <div className="w-full">
      {showValue && (
        <div className="flex justify-between items-center mb-3">
          <span className="text-[12px] text-ink-muted">{lowLabel}</span>
          <span className="type-metric font-serif text-ink">
            {value}
            <span className="text-[14px] text-ink-muted font-normal font-sans">/{max}</span>
          </span>
          <span className="text-[12px] text-ink-muted">{highLabel}</span>
        </div>
      )}
      <div className="relative h-1.5 bg-border rounded-full">
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-fast ${fillClass}`}
          style={{ width: `${pct}%` }}
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
          className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white shadow-[0_2px_8px_rgba(28,27,24,0.15)] transition-all duration-fast ${fillClass}`}
          style={{ left: `calc(${pct}% - 10px)` }}
        />
      </div>
      {!showValue && lowLabel && (
        <div className="flex justify-between mt-2">
          <span className="text-[10px] text-ink-muted">{lowLabel}</span>
          <span className="text-[10px] text-ink-muted">{highLabel}</span>
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
      {label && <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">{label}</div>}
      <div className="flex items-center gap-4 bg-surface-subtle rounded-2xl px-4 py-3 border border-border">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          className="w-9 h-9 rounded-full border border-border-strong bg-surface text-ink flex items-center justify-center text-lg font-light hover:bg-brand-bg-mid hover:border-brand-border hover:text-brand transition-all duration-normal focus-ring"
        >
          −
        </button>
        <div className="text-center min-w-[60px]">
          <span className="type-metric-sm font-serif text-ink">
            {value}
          </span>
          {unit && <span className="text-[13px] text-ink-muted ml-1">{unit}</span>}
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          className="w-9 h-9 rounded-full border border-border-strong bg-surface text-ink flex items-center justify-center text-lg font-light hover:bg-brand-bg-mid hover:border-brand-border hover:text-brand transition-all duration-normal focus-ring"
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
    <div className="flex bg-surface-subtle rounded-xl p-1 border border-border gap-1">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-2 px-3 rounded-lg text-[12px] font-medium transition-all duration-normal
            ${value === opt.value
              ? "bg-surface text-ink shadow-subtle"
              : "text-ink-muted hover:text-ink"
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── StepContinueButton ───────────────────────────────────────────────────────
// Thin onboarding-specific wrapper over the shared Button — same "dark pill"
// look as always, now via Button's dark variant + pill shape instead of a
// second hand-rolled button implementation.

interface StepContinueButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  isLast?: boolean;
}

const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

export function StepContinueButton({ onClick, disabled = false, label, isLast = false }: StepContinueButtonProps) {
  return (
    <Button
      variant="dark"
      shape="pill"
      size="lg"
      fullWidth
      onClick={onClick}
      disabled={disabled}
      iconEnd={!disabled ? <ArrowIcon /> : undefined}
    >
      {label ?? (isLast ? "Build my profile" : "Continue")}
    </Button>
  );
}

// ─── StepLabel ────────────────────────────────────────────────────────────────

export function StepLabel({ category, step, total }: { category: string; step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="type-micro text-brand">{category}</span>
      <span className="text-[10px] text-ink-faint">·</span>
      <span className="text-[10px] text-ink-muted">{step} of {total}</span>
    </div>
  );
}
