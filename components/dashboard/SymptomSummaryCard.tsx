"use client";

import type { SymptomEntry } from "@/lib/symptoms/symptomHistory";
import { SYMPTOM_BY_ID } from "@/lib/symptoms/symptomCatalog";

const SEVERITY_LABEL: Record<1 | 2 | 3, string> = {
  1: "Mild",
  2: "Moderate",
  3: "Severe",
};

const SEVERITY_COLOR: Record<1 | 2 | 3, string> = {
  1: "text-brand",
  2: "text-caution",
  3: "text-danger",
};

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-3">
      {children}
    </div>
  );
}

interface SymptomSummaryCardProps {
  symptoms: SymptomEntry[];
}

export function SymptomSummaryCard({ symptoms }: SymptomSummaryCardProps) {
  const present = symptoms
    .filter(e => e.severity > 0)
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 3);

  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <CardLabel>Today&apos;s Symptoms</CardLabel>

      {present.length === 0 ? (
        <p className="text-[12px] text-ink-muted leading-relaxed">
          No symptoms logged today.
        </p>
      ) : (
        <div className="space-y-2">
          {present.map(entry => {
            const symptom = SYMPTOM_BY_ID[entry.symptomId];
            if (!symptom) return null;
            const sev = entry.severity as 1 | 2 | 3;
            return (
              <div key={entry.symptomId} className="flex items-center justify-between">
                <span className="text-[12px] text-ink font-medium">
                  {symptom.name}
                </span>
                <span className={`text-[11px] font-semibold ${SEVERITY_COLOR[sev]}`}>
                  {SEVERITY_LABEL[sev]}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
