"use client";

interface NumericInputProps {
  value:        number | undefined;
  onChange:     (v: number | undefined) => void;
  unit?:        string;
  min?:         number;
  max?:         number;
  step?:        number;
  placeholder?: string;
  className?:   string;
}

export function NumericInput({
  value, onChange, unit, min = 0, max, step = 1, placeholder = "—", className = "",
}: NumericInputProps) {
  return (
    <div className={`relative flex items-center rounded-xl bg-[#F5F3EE] border border-[#E0DDD4] overflow-hidden focus-within:border-[#534AB7] focus-within:bg-white transition-colors ${className}`}>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value ?? ""}
        onChange={e => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        placeholder={placeholder}
        className="flex-1 min-w-0 py-3 pl-3 pr-1 text-center text-[15px] font-semibold text-[#1C1B18] bg-transparent outline-none border-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none placeholder:text-[#C5C1B7]"
      />
      {unit && (
        <span className="pr-3 text-[10px] font-medium text-[#9B9690] flex-shrink-0 pointer-events-none select-none leading-none">
          {unit}
        </span>
      )}
    </div>
  );
}
