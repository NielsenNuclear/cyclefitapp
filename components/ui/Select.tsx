"use client";
import type { SelectHTMLAttributes } from "react";
import { AxisIcon } from "./Icon";

// ── Select ────────────────────────────────────────────────────────────────
// Styled wrapper around the native <select> — deliberately not a hand-rolled
// listbox: the native element gives full keyboard/screen-reader support for
// free, and DS-2 rules against adding new dependencies rule out a headless-UI
// listbox primitive. Matches TextInput's label/error/hint API for consistency.

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label?:   string;
  error?:   string;
  hint?:    string;
  options:  SelectOption[];
}

export function Select({
  label, error, hint, options,
  className = "", id, ...props
}: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block type-micro text-ink-muted mb-1.5">
          {label}
        </label>
      )}
      <div className={`
        relative rounded-xl border bg-surface
        transition-colors duration-normal
        ${error ? "border-danger-border" : "border-border focus-within:border-brand"}
      `}>
        <select
          {...props}
          id={selectId}
          className={`
            w-full appearance-none
            px-3 py-2.5 pr-9 text-[13px] text-ink
            bg-transparent outline-none border-none
            ${className}
          `}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <AxisIcon
          name="chevron-down"
          size={14}
          strokeWidth={1.5}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
        />
      </div>
      {(error || hint) && (
        <p className={`mt-1.5 text-[11px] ${error ? "text-danger" : "text-ink-muted"}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
