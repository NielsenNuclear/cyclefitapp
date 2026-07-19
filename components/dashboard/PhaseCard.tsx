"use client";

import { useState } from "react";
import type { PhaseData, PhaseName, EnergyTrend } from "@/types/recommendation";
import type { PeriodEntry, PeriodLogConflict } from "@/lib/cycle/cycleAccuracy";
import { checkPeriodLogConflict } from "@/lib/cycle/cycleAccuracy";
import { color as tokenColor } from "@/lib/design/tokens";
import { AxisIcon } from "@/components/ui/Icon";

interface PhaseCardProps {
  phase:          PhaseData;
  periodHistory?: PeriodEntry[];
  /** Omit to hide the "My period started" quick action entirely. */
  onLogPeriod?:   (date: string) => void;
}

// "Late Luteal" has no matching design token — it's a 5th, visually-distinct
// phase accent (distinguishing it from Follicular's brand-purple is a real
// product requirement, not decoration), so its hex stays a documented
// exception rather than being forced onto an existing token.
const PHASE_CONFIG: Record<PhaseName, any> = {
  Menstrual: {
    accent: tokenColor.danger,
    bg: "bg-danger-bg",
    border: "border-danger-border",
    textAccent: "text-danger",
    icon: "◎",
    cycleDayRange: "Days 1–5",
  },
  Follicular: {
    accent: tokenColor.brand,
    bg: "bg-brand-bg-mid",
    border: "border-brand-border",
    textAccent: "text-brand-dark",
    icon: "◐",
    cycleDayRange: "Days 6–13",
  },
  Ovulatory: {
    accent: tokenColor.success,
    bg: "bg-success-bg",
    border: "border-success-border",
    textAccent: "text-success-text",
    icon: "●",
    cycleDayRange: "Days 14–16",
  },
  Luteal: {
    accent: tokenColor.caution,
    bg: "bg-caution-bg",
    border: "border-caution-border",
    textAccent: "text-caution-text",
    icon: "◑",
    cycleDayRange: "Days 17–28",
  },
  "Late Luteal": {
    accent: "#6B4F8C",
    bg: "bg-[#F5F0FA]",
    border: "border-[#C9AEDC]",
    textAccent: "text-[#4A2E70]",
    icon: "◕",
    cycleDayRange: "Final days",
  },
};

const ENERGY_LABELS: Record<EnergyTrend, any> = {
  Rising: { label: "Rising", color: "bg-brand", bar: 65 },
  Peak: { label: "Peak", color: "bg-success", bar: 90 },
  Variable: { label: "Variable", color: "bg-caution", bar: 50 },
  Declining: { label: "Declining", color: "bg-caution", bar: 35 },
  Low: { label: "Low", color: "bg-danger", bar: 25 },
};

function CycleArc({
  cycleDay,
  cycleLength,
  accent,
}: {
  cycleDay: number;
  cycleLength: number;
  accent: string;
}) {
  const pct = cycleDay / cycleLength;
  const size = 64;
  const r = 26;

  const cx = size / 2;
  const cy = size / 2;

  const circ = 2 * Math.PI * r;
  const offset = circ - pct * circ;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="4" />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={accent}
          strokeWidth="4"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[15px] font-semibold text-ink">{cycleDay}</span>
        <span className="text-[8px] text-ink-muted font-medium uppercase tracking-wider">
          of {cycleLength}
        </span>
      </div>
    </div>
  );
}

// ─── Log-period quick action ────────────────────────────────────────────────
// The single most common real-world trigger for updating cycle data ("my
// period just started") gets a one-tap path right here, instead of routing
// through Settings/Profile — mirrors how RecoveryCheckinCard/NutritionCheckinCard
// already handle their own quick-log flows (local step state, a single write
// function as source of truth, an onComplete-style callback for the parent).

function todayMinusDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const QUICK_DATE_OPTIONS = [
  { label: "Today", value: todayMinusDays(0) },
  { label: "Yesterday", value: todayMinusDays(1) },
  { label: "2 days ago", value: todayMinusDays(2) },
] as const;

type LogStep = "closed" | "picker" | "confirm";

function LogPeriodAction({
  periodHistory,
  onLogPeriod,
  promoted,
  accentTextClass,
}: {
  periodHistory: PeriodEntry[];
  onLogPeriod: (date: string) => void;
  promoted: boolean;
  accentTextClass: string;
}) {
  const [step, setStep]                 = useState<LogStep>("closed");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [customDate, setCustomDate]     = useState("");
  const [showCustom, setShowCustom]     = useState(false);

  const conflict: PeriodLogConflict = selectedDate ? checkPeriodLogConflict(selectedDate, periodHistory) : null;

  function reset() {
    setStep("closed");
    setSelectedDate(null);
    setCustomDate("");
    setShowCustom(false);
  }

  function pickDate(date: string) {
    setSelectedDate(date);
    setStep("confirm");
  }

  function confirmLog() {
    if (!selectedDate) return;
    onLogPeriod(selectedDate);
    reset();
  }

  if (step === "closed") {
    return promoted ? (
      <button
        type="button"
        onClick={() => setStep("picker")}
        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/60 border border-black/10 hover:bg-white/80 transition-colors min-h-[44px] focus-ring"
      >
        <span className={`text-[12px] font-semibold ${accentTextClass}`}>My period started</span>
        <AxisIcon name="chevron-right" size={13} strokeWidth={2} className={accentTextClass} />
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setStep("picker")}
        className="text-[11px] font-medium text-ink-muted hover:text-ink-secondary transition-colors focus-ring rounded"
      >
        My period started →
      </button>
    );
  }

  if (step === "picker") {
    return (
      <div className="rounded-xl bg-white/70 border border-black/10 p-3.5 space-y-2.5">
        <p className="text-[11px] font-semibold text-ink">My period started...</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_DATE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => pickDate(opt.value)}
              className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-surface border border-border text-ink-secondary hover:border-ink-faint transition-colors min-h-[32px]"
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowCustom(v => !v)}
            className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-surface border border-border text-ink-secondary hover:border-ink-faint transition-colors min-h-[32px]"
          >
            Pick a date
          </button>
        </div>
        {showCustom && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="date"
              value={customDate}
              max={todayMinusDays(0)}
              onChange={e => setCustomDate(e.target.value)}
              className="flex-1 text-[12px] px-2.5 py-2 rounded-lg border border-border bg-surface text-ink focus-ring"
              aria-label="Choose the date your period started"
            />
            <button
              type="button"
              disabled={!customDate}
              onClick={() => pickDate(customDate)}
              className="px-3 py-2 rounded-lg text-[11px] font-semibold bg-brand text-white disabled:opacity-40 transition-opacity"
            >
              Use date
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={reset}
          className="text-[11px] text-ink-faint hover:text-ink-muted transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  // step === "confirm"
  return (
    <div className="rounded-xl bg-white/70 border border-black/10 p-3.5 space-y-3">
      {conflict?.type === "future_date" && (
        <>
          <p className="text-[12px] text-danger leading-relaxed">
            That date hasn&apos;t happened yet — pick today or an earlier date.
          </p>
          <button
            type="button"
            onClick={() => setStep("picker")}
            className="w-full py-2 rounded-lg text-[12px] font-semibold border border-border text-ink-secondary"
          >
            Back
          </button>
        </>
      )}

      {conflict?.type === "duplicate" && (
        <>
          <p className="text-[12px] text-ink-secondary leading-relaxed">
            Already logged for {formatDateLabel(conflict.existingDate)} — nothing to update.
          </p>
          <button
            type="button"
            onClick={reset}
            className="w-full py-2 rounded-lg text-[12px] font-semibold bg-surface border border-border text-ink-secondary"
          >
            OK
          </button>
        </>
      )}

      {(conflict?.type === "before_latest" || conflict?.type === "too_soon") && selectedDate && (
        <>
          <p className="text-[12px] text-caution-text leading-relaxed">
            {conflict.type === "before_latest"
              ? `That's earlier than your last logged period (${formatDateLabel(conflict.latestDate)}) — that doesn't look right.`
              : `Only ${conflict.daysSince} day${conflict.daysSince === 1 ? "" : "s"} since your last logged period (${formatDateLabel(conflict.latestDate)}) — periods are rarely this close together.`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="flex-1 py-2 rounded-lg text-[12px] font-semibold border border-border text-ink-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmLog}
              className="flex-1 py-2 rounded-lg text-[12px] font-semibold bg-caution text-white"
            >
              Log anyway
            </button>
          </div>
        </>
      )}

      {!conflict && selectedDate && (
        <>
          <p className="text-[12px] text-ink-secondary leading-relaxed">
            Your period started {selectedDate === todayMinusDays(0) ? "today" : `on ${formatDateLabel(selectedDate)}`}?
            This will update your cycle history and refresh today&apos;s recommendations.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="flex-1 py-2 rounded-lg text-[12px] font-semibold border border-border text-ink-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmLog}
              className="flex-1 py-2 rounded-lg text-[12px] font-semibold bg-brand text-white"
            >
              Confirm
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function PhaseCard({ phase, periodHistory = [], onLogPeriod }: PhaseCardProps) {
  const canLogPeriod = !!onLogPeriod;

  if (!phase.hasCycleData) {
    return (
      <div className="rounded-2xl border bg-surface-subtle border-border p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)] space-y-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-1.5">
            Current phase
          </div>
          <div className="text-[1.1rem] font-light text-ink-secondary leading-snug mb-2">
            Cycle tracking not set up
          </div>
          <p className="text-[12px] text-ink-muted leading-relaxed">
            {canLogPeriod
              ? "Log when your last period started to see phase-aware training and recovery guidance."
              : "Add your last period date in Settings to see phase-aware training and recovery guidance."}
          </p>
        </div>
        {canLogPeriod && (
          <LogPeriodAction
            periodHistory={periodHistory}
            onLogPeriod={onLogPeriod!}
            promoted={false}
            accentTextClass="text-ink-secondary"
          />
        )}
      </div>
    );
  }

  const config = PHASE_CONFIG[phase.name];
  const energy = ENERGY_LABELS[phase.energyTrend];
  // Promote the quick action to a filled banner once a period is plausibly
  // imminent — Late Luteal is literally the pre-menstrual window, and
  // Menstrual itself is included so a user can correct an off-by-a-day
  // estimate rather than only being offered the action just before it.
  const periodImminent = phase.name === "Late Luteal" || phase.name === "Menstrual";

  return (
    <div className={`rounded-2xl border ${config.bg} ${config.border} p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className={`text-[10px] font-bold uppercase tracking-[0.12em] ${config.textAccent} mb-1.5`}>
            Current phase
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-[1.5rem] font-light text-ink leading-none">
              {phase.name}
            </span>
            <span className="text-[12px] text-ink-muted">
              · {config.cycleDayRange}
            </span>
          </div>
        </div>

        <CycleArc
          cycleDay={phase.cycleDay}
          cycleLength={phase.cycleLength}
          accent={config.accent}
        />
      </div>

      <div className="mb-4">
        <div className="flex justify-between mb-1.5">
          <span className="text-[10px] font-semibold uppercase text-ink-muted">
            Energy trend
          </span>
          <span className={`text-[11px] font-semibold ${config.textAccent}`}>
            {energy.label}
          </span>
        </div>

        <div className="h-[3px] bg-black/8 rounded-full overflow-hidden">
          <div className={`h-full ${energy.color}`} style={{ width: `${energy.bar}%` }} />
        </div>
      </div>

      <div className="h-px bg-black/6 mb-4" />

      <p className="text-[12px] text-ink-secondary mb-3">
        {phase.physiologicalNote}
      </p>

      <div className={`text-[11px] font-medium ${config.textAccent} ${canLogPeriod ? "mb-3" : ""}`}>
        {phase.daysUntilNextPhase === 1
          ? "Transitioning tomorrow"
          : `${phase.daysUntilNextPhase} days remaining`}
      </div>

      {canLogPeriod && (
        <LogPeriodAction
          periodHistory={periodHistory}
          onLogPeriod={onLogPeriod!}
          promoted={periodImminent}
          accentTextClass={config.textAccent}
        />
      )}
    </div>
  );
}