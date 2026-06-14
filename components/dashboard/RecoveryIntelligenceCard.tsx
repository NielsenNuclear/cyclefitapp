"use client";

import type { RecoveryScore }          from "@/lib/recovery/recoveryScore";
import type { RecoveryTrend }          from "@/lib/recovery/recoveryTrend";
import type { RecoveryDebt }           from "@/lib/recovery/recoveryDebt";
import type { BurnoutRisk }            from "@/lib/recovery/burnoutRisk";
import type { HealthTrend }            from "@/lib/recovery/healthTrendAnalysis";
import type { RecoveryPlan }           from "@/lib/recovery/recoveryPlanning";
import type { SymptomEscalationEntry } from "@/lib/recovery/symptomEscalation";
import type {
  RecoveryCategory,
  PlanUrgency,
  DebtCategory,
  BurnoutLevel,
  RecoveryTrendStatus,
} from "@/lib/recovery/recoveryTypes";

// ─── Props ────────────────────────────────────────────────────────────────────

interface RecoveryIntelligenceCardProps {
  recoveryScore:      RecoveryScore | null;
  recoveryTrend:      RecoveryTrend | null;
  recoveryDebt:       RecoveryDebt | null;
  burnoutRisk:        BurnoutRisk | null;
  healthTrend:        HealthTrend | null;
  recoveryPlan:       RecoveryPlan | null;
  symptomEscalations: SymptomEscalationEntry[];
}

// ─── Colour maps ──────────────────────────────────────────────────────────────

const SCORE_COLOR: Record<RecoveryCategory, string> = {
  Excellent:   "text-emerald-600",
  Good:        "text-green-600",
  Moderate:    "text-amber-600",
  Compromised: "text-orange-500",
  Poor:        "text-red-500",
};

const SCORE_BAR: Record<RecoveryCategory, string> = {
  Excellent:   "bg-emerald-400",
  Good:        "bg-green-400",
  Moderate:    "bg-amber-400",
  Compromised: "bg-orange-400",
  Poor:        "bg-red-400",
};

const SCORE_CHIP: Record<RecoveryCategory, string> = {
  Excellent:   "bg-emerald-50 text-emerald-700",
  Good:        "bg-green-50 text-green-700",
  Moderate:    "bg-amber-50 text-amber-700",
  Compromised: "bg-orange-50 text-orange-700",
  Poor:        "bg-red-50 text-red-600",
};

const URGENCY_CHIP: Record<PlanUrgency, string> = {
  none:     "bg-gray-100 text-gray-500",
  low:      "bg-green-50 text-green-700",
  moderate: "bg-amber-50 text-amber-700",
  high:     "bg-orange-50 text-orange-700",
  critical: "bg-red-50 text-red-600",
};

const URGENCY_BORDER: Record<PlanUrgency, string> = {
  none:     "border-gray-100",
  low:      "border-green-100",
  moderate: "border-amber-100",
  high:     "border-orange-100",
  critical: "border-red-100",
};

const URGENCY_BG: Record<PlanUrgency, string> = {
  none:     "bg-gray-50",
  low:      "bg-green-50",
  moderate: "bg-amber-50",
  high:     "bg-orange-50",
  critical: "bg-red-50",
};

const DEBT_CHIP: Record<DebtCategory, string> = {
  low:      "bg-green-50 text-green-700",
  moderate: "bg-yellow-50 text-yellow-700",
  elevated: "bg-amber-50 text-amber-700",
  high:     "bg-orange-50 text-orange-700",
  critical: "bg-red-50 text-red-600",
};

const BURNOUT_CHIP: Record<BurnoutLevel, string> = {
  low:      "bg-green-50 text-green-700",
  moderate: "bg-amber-50 text-amber-700",
  high:     "bg-orange-50 text-orange-700",
  severe:   "bg-red-50 text-red-600",
};

const TREND_CHIP: Record<RecoveryTrendStatus, string> = {
  improving:        "bg-green-50 text-green-700",
  stable:           "bg-gray-100 text-gray-500",
  declining:        "bg-amber-50 text-amber-700",
  rapidly_declining: "bg-red-50 text-red-600",
};

const TREND_LABEL: Record<RecoveryTrendStatus, string> = {
  improving:        "Improving",
  stable:           "Stable",
  declining:        "Declining",
  rapidly_declining: "↓ Rapid",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-2">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="border-t border-gray-50 my-4" />;
}

// ─── Sub-sections ─────────────────────────────────────────────────────────────

function ScoreSection({ score }: { score: RecoveryScore }) {
  const pct   = Math.round(score.score);
  const color = SCORE_COLOR[score.category];
  const bar   = SCORE_BAR[score.category];
  const chip  = SCORE_CHIP[score.category];

  const negative = score.contributors
    .filter(c => c.contribution < 0)
    .sort((a, b) => a.contribution - b.contribution)
    .slice(0, 2);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-bold tabular-nums ${color}`}>{pct}</span>
          <span className="text-sm text-gray-400">/ 100</span>
        </div>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${chip}`}>
          {score.category}
        </span>
      </div>

      {/* Score bar */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all ${bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Top negative contributors */}
      {negative.length > 0 && (
        <div className="space-y-1">
          {negative.map(c => (
            <div key={c.factor} className="flex items-start gap-1.5">
              <span className="text-red-400 text-[11px] shrink-0 mt-0.5">↓</span>
              <span className="text-[11px] text-gray-500">{c.note}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrendSection({ trend }: { trend: RecoveryTrend }) {
  if (trend.dataPoints < 3) return null;

  return (
    <div>
      <SectionLabel>Recovery trend</SectionLabel>
      <div className="flex gap-2">
        {(
          [
            { label: "7d", status: trend.status7d },
            { label: "14d", status: trend.status14d },
            { label: "28d", status: trend.status28d },
          ] as const
        ).map(({ label, status }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400 font-medium w-5">{label}</span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TREND_CHIP[status]}`}
            >
              {TREND_LABEL[status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HealthTrendSection({ trend }: { trend: HealthTrend }) {
  const hasContent = trend.watch.length > 0 || trend.improving.length > 0;
  if (!hasContent) return null;

  return (
    <div>
      <SectionLabel>Health signals</SectionLabel>
      <div className="space-y-1.5">
        {trend.watch.map(label => (
          <div key={label} className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-1.5" />
            <span className="text-[11px] text-gray-700 leading-snug">{label}</span>
          </div>
        ))}
        {trend.improving.map(label => (
          <div key={label} className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
            <span className="text-[11px] text-gray-700 leading-snug">{label}</span>
          </div>
        ))}
        {trend.stable.length > 0 && trend.watch.length === 0 && trend.improving.length === 0 && (
          <p className="text-[11px] text-gray-400">All indicators stable</p>
        )}
      </div>
    </div>
  );
}

function PlanSection({ plan }: { plan: RecoveryPlan }) {
  if (plan.urgency === "none" || plan.recommendations.length === 0) return null;

  const chipClass   = URGENCY_CHIP[plan.urgency];
  const borderClass = URGENCY_BORDER[plan.urgency];
  const bgClass     = URGENCY_BG[plan.urgency];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <SectionLabel>Recovery plan</SectionLabel>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 ${chipClass}`}>
          {plan.urgency.charAt(0).toUpperCase() + plan.urgency.slice(1)} urgency
        </span>
      </div>

      <p className="text-[11px] text-gray-500 leading-relaxed mb-2">{plan.rationale}</p>

      <div className={`rounded-xl border p-3 ${bgClass} ${borderClass}`}>
        <ul className="space-y-1.5">
          {plan.recommendations.slice(0, 4).map((rec, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-[11px] text-gray-400 shrink-0 mt-0.5">{i + 1}.</span>
              <span className="text-[11px] text-gray-700 leading-snug">{rec}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DebtAndStrainSection({
  debt,
  burnout,
}: {
  debt:    RecoveryDebt | null;
  burnout: BurnoutRisk | null;
}) {
  if (!debt && !burnout) return null;

  return (
    <div>
      <SectionLabel>Recovery load</SectionLabel>
      <div className="flex gap-3">
        {debt && (
          <div className="flex-1 bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 font-medium mb-1">Recovery Debt</p>
            <div className="flex items-center justify-between mb-1">
              <span className="text-lg font-bold text-gray-800 tabular-nums">{debt.debtScore}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${DEBT_CHIP[debt.category]}`}>
                {debt.category.charAt(0).toUpperCase() + debt.category.slice(1)}
              </span>
            </div>
            {debt.daysElevated > 0 && (
              <p className="text-[10px] text-gray-400">{debt.daysElevated}d elevated</p>
            )}
            <p className="text-[10px] text-gray-400">
              {debt.trend === "accumulating" ? "↑ Rising" : debt.trend === "reducing" ? "↓ Clearing" : "→ Stable"}
            </p>
          </div>
        )}

        {burnout && burnout.level !== "low" && (
          <div className="flex-1 bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 font-medium mb-1">Strain Indicators</p>
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-bold text-gray-800 tabular-nums">{burnout.score}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${BURNOUT_CHIP[burnout.level]}`}>
                {burnout.level.charAt(0).toUpperCase() + burnout.level.slice(1)}
              </span>
            </div>
            {burnout.factors.slice(0, 2).map(f => (
              <p key={f.name} className="text-[10px] text-gray-400 leading-tight truncate">{f.detail}</p>
            ))}
          </div>
        )}

        {burnout?.level === "low" && !debt && (
          <div className="flex-1 bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 font-medium mb-1">Strain Indicators</p>
            <span className="text-[11px] text-gray-500">Normal range</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

export function RecoveryIntelligenceCard({
  recoveryScore,
  recoveryTrend,
  recoveryDebt,
  burnoutRisk,
  healthTrend,
  recoveryPlan,
  symptomEscalations,
}: RecoveryIntelligenceCardProps) {
  if (!recoveryScore) return null;

  const hasEscalating = symptomEscalations.some(e => e.status === "escalating");

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-gray-50">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Recovery Intelligence</h2>
          {hasEscalating && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-500">
              Symptoms escalating
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">Your recovery health at a glance</p>
      </div>

      <div className="px-5 py-4 space-y-0">
        {/* Score */}
        <ScoreSection score={recoveryScore} />

        {/* Trend */}
        {recoveryTrend && (
          <>
            <Divider />
            <TrendSection trend={recoveryTrend} />
          </>
        )}

        {/* Health signals */}
        {healthTrend && (
          <>
            <Divider />
            <HealthTrendSection trend={healthTrend} />
          </>
        )}

        {/* Plan */}
        {recoveryPlan && recoveryPlan.urgency !== "none" && (
          <>
            <Divider />
            <PlanSection plan={recoveryPlan} />
          </>
        )}

        {/* Debt + Strain */}
        {(recoveryDebt || burnoutRisk) && (
          <>
            <Divider />
            <DebtAndStrainSection debt={recoveryDebt} burnout={burnoutRisk} />
          </>
        )}
      </div>

      <p className="px-5 pb-4 text-[10px] text-gray-300 leading-relaxed">
        Recovery scores update with each check-in and improve in accuracy over time.
      </p>
    </div>
  );
}
