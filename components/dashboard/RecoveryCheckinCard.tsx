"use client";

import { useState }                   from "react";
import {
  RECOVERY_STRATEGY_CATALOG,
  logDailyRecoveryStrategies,
  type RecoveryStrategyItem,
} from "@/lib/recovery/recoveryStrategyCatalog";

// ─── Strategy chip ────────────────────────────────────────────────────────────

interface ChipProps {
  item:     RecoveryStrategyItem;
  selected: boolean;
  onToggle: (id: string) => void;
}

function StrategyChip({ item, selected, onToggle }: ChipProps) {
  return (
    <button
      onClick={() => onToggle(item.id)}
      className={[
        "px-3 py-1.5 rounded-xl border text-[11px] font-medium transition-colors",
        selected
          ? "bg-brand-bg-mid border-brand text-brand-dark"
          : "bg-surface-subtle border-border text-ink-secondary",
      ].join(" ")}
      title={item.description}
    >
      {item.label}
    </button>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  date:        string;
  onComplete?: (strategies: string[]) => void;
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function RecoveryCheckinCard({ date, onComplete }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saved,    setSaved]    = useState(false);

  function handleToggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else              next.add(id);
      return next;
    });
  }

  function handleSave() {
    const strategies = [...selected];
    logDailyRecoveryStrategies(strategies, date);
    setSaved(true);
    onComplete?.(strategies);
  }

  if (saved) {
    return (
      <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-sm px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-1">
          Recovery Check-in
        </p>
        <p className="text-[13px] font-semibold text-ink">
          {selected.size > 0
            ? `${selected.size} strateg${selected.size === 1 ? "y" : "ies"} logged`
            : "Rest day logged"}
        </p>
        <p className="text-[11px] text-ink-secondary mt-0.5">
          Axis is tracking what works best for you.
        </p>
      </div>
    );
  }

  const activeItems   = RECOVERY_STRATEGY_CATALOG.filter(s => s.category === "active");
  const passiveItems  = RECOVERY_STRATEGY_CATALOG.filter(s => s.category === "passive");
  const lifestyleItems = RECOVERY_STRATEGY_CATALOG.filter(s => s.category === "lifestyle");

  return (
    <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-surface-hover">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
          Recovery Check-in
        </p>
        <p className="text-[13px] font-semibold text-ink mt-0.5">
          What did you do for recovery today?
        </p>
        <p className="text-[11px] text-ink-muted mt-0.5">
          Select all that apply. Axis learns what works for you.
        </p>
      </div>

      <div className="px-4 py-3 space-y-3">

        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted mb-1.5">Active</p>
          <div className="flex flex-wrap gap-1.5">
            {activeItems.map(item => (
              <StrategyChip key={item.id} item={item} selected={selected.has(item.id)} onToggle={handleToggle} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted mb-1.5">Passive</p>
          <div className="flex flex-wrap gap-1.5">
            {passiveItems.map(item => (
              <StrategyChip key={item.id} item={item} selected={selected.has(item.id)} onToggle={handleToggle} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted mb-1.5">Lifestyle</p>
          <div className="flex flex-wrap gap-1.5">
            {lifestyleItems.map(item => (
              <StrategyChip key={item.id} item={item} selected={selected.has(item.id)} onToggle={handleToggle} />
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-2.5 rounded-xl bg-brand text-white text-[12px] font-semibold active:opacity-90"
        >
          {selected.size === 0 ? "Log Rest Day" : `Log ${selected.size} Strateg${selected.size === 1 ? "y" : "ies"}`}
        </button>
      </div>
    </div>
  );
}
