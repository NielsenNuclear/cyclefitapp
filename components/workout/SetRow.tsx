"use client";
import type { SetRecord }   from "./types";
import { CompletionButton } from "./CompletionButton";

// Compact inline input used exclusively within set rows
function SetInput({
  value,
  onChange,
  unit,
  min,
  max,
  step,
  placeholder,
}: {
  value:        number | undefined;
  onChange:     (v: number | undefined) => void;
  unit?:        string;
  min?:         number;
  max?:         number;
  step?:        number;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full">
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value ?? ""}
        onChange={e => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        placeholder={placeholder ?? "—"}
        inputMode="decimal"
        className="w-full h-11 text-center text-[15px] font-semibold text-[#1C1B18] bg-[#F5F3EE] border border-[#E0DDD4] rounded-xl outline-none focus:border-[#534AB7] focus:bg-white transition-colors pr-6 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none placeholder:text-[#C5C1B7]"
      />
      {unit && (
        <span className="absolute right-2 inset-y-0 flex items-center text-[9px] font-medium text-[#9B9690] pointer-events-none select-none">
          {unit}
        </span>
      )}
    </div>
  );
}

interface SetRowProps {
  setIndex:  number;
  set:       SetRecord;
  hasRpe:    boolean;
  isActive:  boolean;
  onChange:  (patch: Partial<SetRecord>) => void;
}

export function SetRow({ setIndex, set, hasRpe, isActive, onChange }: SetRowProps) {
  const actualRepsNum = parseInt(set.actualReps, 10) || undefined;

  return (
    <div
      className={`
        flex items-center gap-2 px-2 py-1 rounded-xl transition-all duration-200
        ${set.completed ? "opacity-50" : isActive ? "bg-[#F5F3EE]/50" : ""}
      `}
    >
      {/* Set number */}
      <div className="w-6 flex-shrink-0 text-center">
        <span className={`text-[12px] font-bold tabular-nums ${set.completed ? "text-[#534AB7]" : "text-[#9B9690]"}`}>
          {setIndex + 1}
        </span>
      </div>

      {/* Weight */}
      <div className="flex-1 min-w-0">
        <SetInput
          value={set.weight}
          onChange={weight => onChange({ weight })}
          unit="kg"
          min={0}
          step={2.5}
          placeholder="BW"
        />
      </div>

      {/* Reps */}
      <div className="flex-1 min-w-0">
        <SetInput
          value={actualRepsNum}
          onChange={v => onChange({ actualReps: v !== undefined ? String(v) : set.targetReps })}
          unit="reps"
          min={1}
          step={1}
          placeholder={set.targetReps}
        />
      </div>

      {/* RPE (optional) */}
      {hasRpe && (
        <div className="w-[76px] flex-shrink-0">
          <SetInput
            value={set.rpe}
            onChange={rpe => onChange({ rpe })}
            unit="RPE"
            min={1}
            max={10}
            step={0.5}
          />
        </div>
      )}

      {/* Completion */}
      <CompletionButton
        completed={set.completed}
        onToggle={completed => onChange({ completed })}
      />
    </div>
  );
}
