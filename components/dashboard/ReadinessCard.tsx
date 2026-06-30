"use client";

import type { ReadinessScore, ReadinessContributors } from "@/lib/readiness/calculateReadiness";
import type { ReadinessCategory } from "@/lib/readiness/calculateReadiness";
import type { ReadinessTrend, ReadinessHistoryEntry } from "@/lib/readiness/readinessHistory";
import { explainReadiness } from "@/lib/readiness/explainReadiness";

// ─── Style maps ───────────────────────────────────────────────────────────────

const CATEGORY_STYLES: Record<ReadinessCategory, {
  badge: string;
  scoreColor: string;
  label: string;
}> = {
  optimal:  {
    badge:      "bg-[#E1F5EE] text-[#085041] border-[#A8DFC8]",
    scoreColor: "#0F6E56",
    label:      "Optimal",
  },
  ready:    {
    badge:      "bg-[#EEEDFE] text-[#3C3489] border-[#C4C0EE]",
    scoreColor: "#534AB7",
    label:      "Ready",
  },
  moderate: {
    badge:      "bg-[#E3EFFE] text-[#1B4FA0] border-[#A8C4F0]",
    scoreColor: "#1B5FA0",
    label:      "Moderate",
  },
  cautious: {
    badge:      "bg-[#FAEEDA] text-[#633806] border-[#E4C88A]",
    scoreColor: "#854F0B",
    label:      "Cautious",
  },
  recover:  {
    badge:      "bg-[#EEF0F2] text-[#3D4451] border-[#CBD0D8]",
    scoreColor: "#6B7280",
    label:      "Recover",
  },
};

const CONTRIBUTOR_LABELS: Record<keyof ReadinessContributors, string> = {
  sleep:        "Sleep quality",
  stress:       "Stress level",
  energy:       "Energy pattern",
  cycle:        "Cycle phase",
  trainingLoad: "Training load",
  adherence:    "Training consistency",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9B9690]">
      {children}
    </div>
  );
}

// ─── Trend indicator ──────────────────────────────────────────────────────────

const TREND_STYLES: Partial<Record<ReadinessTrend, {
  label: string;
  arrow: string;
  chip:  string;
}>> = {
  improving: {
    label: "Improving",
    arrow: "↑",
    chip:  "bg-[#E1F5EE] text-[#085041] border-[#A8DFC8]",
  },
  stable: {
    label: "Stable",
    arrow: "→",
    chip:  "bg-[#EEEDFE] text-[#3C3489] border-[#C4C0EE]",
  },
  declining: {
    label: "Declining",
    arrow: "↓",
    chip:  "bg-[#FAEEDA] text-[#633806] border-[#E4C88A]",
  },
};

// ─── Sparkline ────────────────────────────────────────────────────────────────

const BAR_COLORS: Record<ReadinessCategory, string> = {
  optimal:  "#0F6E56",
  ready:    "#534AB7",
  moderate: "#1B5FA0",
  cautious: "#854F0B",
  recover:  "#6B7280",
};

const MAX_BAR_HEIGHT = 36;

function Sparkline({ history }: { history: ReadinessHistoryEntry[] }) {
  const today = new Date().toISOString().slice(0, 10);

  // Sort ascending (oldest → newest), take last 7, pad left with nulls to fill 7 slots
  const ascending = [...history].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
  const slots: (ReadinessHistoryEntry | null)[] = [
    ...Array(7 - ascending.length).fill(null),
    ...ascending,
  ];

  return (
    <div className="mb-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[#9B9690] mb-2">
        7-day trend
      </p>
      <div
        className="flex items-end gap-[3px]"
        style={{ height: `${MAX_BAR_HEIGHT + 2}px` }}
      >
        {slots.map((entry, i) => {
          if (!entry) {
            return (
              <div
                key={i}
                className="flex-1 rounded-t-[2px] bg-[#EDE9DE]"
                style={{ height: "3px" }}
              />
            );
          }
          const height  = Math.max(3, Math.round((entry.score / 100) * MAX_BAR_HEIGHT));
          const color   = BAR_COLORS[entry.category];
          const isToday = entry.date === today;
          return (
            <div
              key={entry.date}
              className="flex-1 rounded-t-[2px] transition-opacity"
              style={{
                height:          `${height}px`,
                backgroundColor: color,
                opacity:         isToday ? 1 : 0.45,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface ReadinessCardProps {
  score:    ReadinessScore | null;
  trend?:   ReadinessTrend;
  history?: ReadinessHistoryEntry[];
}

export function ReadinessCard({ score, trend, history }: ReadinessCardProps) {
  if (!score) {
    return (
      <div className="bg-white rounded-2xl border border-[#EAE7DE] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
        <CardLabel>Readiness</CardLabel>
        <p className="text-[12px] text-[#9B9690] leading-relaxed mt-3">
          Complete your first check-in to activate the readiness engine.
        </p>
      </div>
    );
  }

  const style = CATEGORY_STYLES[score.category];

  const entries = Object.entries(score.contributors) as [keyof ReadinessContributors, number][];
  const positives = entries
    .filter(([, val]) => val >= 70)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const limiting = entries
    .filter(([, val]) => val <= 45)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3);

  return (
    <div className="bg-white rounded-2xl border border-[#EAE7DE] p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">

      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <CardLabel>Readiness</CardLabel>
        <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold border ${style.badge}`}>
          {style.label}
        </span>
      </div>

      {/* Score + trend */}
      <div className="flex items-baseline gap-3 mb-4">
        <div className="flex items-baseline gap-1.5">
          <span
            className="text-[40px] font-bold leading-none"
            style={{ color: style.scoreColor }}
          >
            {score.score}
          </span>
          <span className="text-[13px] text-[#9B9690]">/ 100</span>
        </div>
        {trend && TREND_STYLES[trend] && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${TREND_STYLES[trend]!.chip}`}>
            <span>{TREND_STYLES[trend]!.arrow}</span>
            <span>{TREND_STYLES[trend]!.label}</span>
          </span>
        )}
      </div>

      {/* 7-day sparkline */}
      {history && history.length > 1 && (
        <Sparkline history={history} />
      )}

      {/* Positive drivers */}
      {positives.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[#9B9690] mb-1.5">
            Positive drivers
          </p>
          <div className="space-y-1.5">
            {positives.map(([key]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-[#0F6E56] text-[11px] font-bold">✓</span>
                <span className="text-[11px] text-[#1C1B18]">{CONTRIBUTOR_LABELS[key]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Limiting factors */}
      {limiting.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-[#9B9690] mb-1.5">
            Limiting factors
          </p>
          <div className="space-y-1.5">
            {limiting.map(([key]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-[#854F0B] text-[11px]">•</span>
                <span className="text-[11px] text-[#1C1B18]">{CONTRIBUTOR_LABELS[key]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explanation */}
      <div className="pt-3 border-t border-[#F0EDE4]">
        <p className="text-[11px] text-[#6B6860] leading-relaxed">
          {explainReadiness(score)}
        </p>
      </div>

    </div>
  );
}
