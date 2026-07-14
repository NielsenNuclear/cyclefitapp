"use client";

import type { LearnedPattern } from "@/lib/cycleLearning/types";
import { SYMPTOM_BY_ID } from "@/lib/symptoms/symptomCatalog";

const CONFIDENCE_CHIP: Record<"low" | "medium" | "high", { label: string; cls: string }> = {
  low:    { label: "Early data",  cls: "bg-surface-subtle text-ink-muted"   },
  medium: { label: "Consistent",  cls: "bg-brand-bg-mid text-brand-dark"   },
  high:   { label: "Established", cls: "bg-success-bg text-success-text"   },
};

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-3">
      {children}
    </div>
  );
}

function PatternRow({ pattern }: { pattern: LearnedPattern }) {
  const symptom = SYMPTOM_BY_ID[pattern.symptomId];
  const name    = symptom?.name ?? pattern.symptomId;
  const day     = Math.round(pattern.averageCycleDay);
  const chip    = CONFIDENCE_CHIP[pattern.confidence];

  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-surface-hover last:border-0">
      <div className="flex items-start gap-2 min-w-0">
        <span className="text-brand mt-0.5 flex-shrink-0">•</span>
        <span className="text-[12px] text-ink">
          <span className="font-medium">{name}</span>
          <span className="text-ink-muted"> around Day {day}</span>
        </span>
      </div>
      <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${chip.cls}`}>
        {chip.label}
      </span>
    </div>
  );
}

interface CyclePatternsCardProps {
  patterns: LearnedPattern[];
}

export function CyclePatternsCard({ patterns }: CyclePatternsCardProps) {
  if (patterns.length === 0) return null;

  const top = patterns.slice(0, 5);
  const maxCycles = Math.max(...patterns.map(p => p.supportingCycles));

  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <CardLabel>Cycle patterns</CardLabel>

      <p className="text-[11px] text-ink-muted mb-1 leading-relaxed">
        You frequently experience:
      </p>

      <div>
        {top.map(pattern => (
          <PatternRow key={pattern.symptomId} pattern={pattern} />
        ))}
      </div>

      <p className="text-[10px] text-ink-faint mt-3">
        Historical observations only · Based on {maxCycles} cycle{maxCycles !== 1 ? "s" : ""} of data
      </p>
    </div>
  );
}
