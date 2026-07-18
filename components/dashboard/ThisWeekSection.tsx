"use client";

// ─── components/dashboard/ThisWeekSection.tsx ─────────────────────────────────
// Dashboard 3.0 — Batch 20, Phase 3. Tab-switching chrome only, reusing
// TrainingPlanHubCard's existing tab pattern one level up: instead of
// switching between timescales of one plan, this switches between the four
// card-groups that used to be their own AccordionSections ("Progress &
// Performance" / "Athlete Development" / "Training Plan" + the new
// AdherenceHubCard). Composition of the actual cards stays in page.tsx (via
// slot props) — this component owns only tab state and layout, matching the
// codebase's existing split between data-fetching (page.tsx) and display.

import { useState } from "react";
import type { ReactNode } from "react";

type ThisWeekTab = "plan" | "trends" | "athlete" | "consistency";

const TABS: { id: ThisWeekTab; label: string }[] = [
  { id: "plan",        label: "Plan" },
  { id: "trends",      label: "Trends" },
  { id: "athlete",     label: "Athlete" },
  { id: "consistency", label: "Consistency" },
];

interface ThisWeekSectionProps {
  plan:        ReactNode;
  trends:      ReactNode;
  athlete:     ReactNode;
  consistency: ReactNode;
}

export function ThisWeekSection({ plan, trends, athlete, consistency }: ThisWeekSectionProps) {
  const [tab, setTab] = useState<ThisWeekTab>("plan");

  return (
    <div className="space-y-3">
      <div className="flex gap-1 border-b border-surface-hover" role="tablist" aria-label="This week">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`this-week-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`this-week-panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-[12px] font-semibold rounded-t-lg transition-colors min-h-[44px] flex items-center focus-ring ${
              tab === t.id ? "text-brand border-b-2 border-brand" : "text-ink-muted hover:text-ink-secondary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        className="space-y-3"
        role="tabpanel"
        id={`this-week-panel-${tab}`}
        aria-labelledby={`this-week-tab-${tab}`}
        tabIndex={0}
      >
        {tab === "plan" && plan}
        {tab === "trends" && trends}
        {tab === "athlete" && athlete}
        {tab === "consistency" && consistency}
      </div>
    </div>
  );
}
