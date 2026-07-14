"use client";

import type { TrainingRecommendation, NutritionRecommendation, RecoveryRecommendation } from "@/types/recommendation";

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-3">
      {children}
    </div>
  );
}

function ListItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-[12px] text-ink-secondary leading-relaxed">
      <span className="mt-[5px] w-1 h-1 rounded-full bg-ink-faint flex-shrink-0" />
      <span>{children}</span>
    </li>
  );
}

function PillTag({ children, variant = "neutral" }: {
  children: React.ReactNode;
  variant?: "neutral" | "teal" | "purple" | "amber";
}) {
  const styles = {
    neutral: "bg-surface-hover text-ink-secondary border-border-strong",
    teal:    "bg-success-bg text-success-text border-success-border",
    purple:  "bg-brand-bg-mid text-brand-text border-brand-border",
    amber:   "bg-caution-bg text-caution-text border-caution-border",
  };
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium border ${styles[variant]}`}>
      {children}
    </span>
  );
}

// ─── Badge config ─────────────────────────────────────────────────────────────

const BADGE_CONFIG = {
  Push:     { bg: "bg-success-bg",    text: "text-success-text", label: "Push day"    },
  Maintain: { bg: "bg-brand-bg-mid",  text: "text-brand-text",   label: "Maintain"    },
  Watch:    { bg: "bg-caution-bg",    text: "text-caution-text", label: "Watch"       },
  Recover:  { bg: "bg-neutral-bg",    text: "text-neutral-text", label: "Recovery day" },
};

// ─── TrainingCard ─────────────────────────────────────────────────────────────

export function TrainingCard({
  training,
  restDaySignal = false,
}: {
  training:       TrainingRecommendation;
  restDaySignal?: boolean;
}) {
  const badge = BADGE_CONFIG[training.badge] ?? BADGE_CONFIG.Maintain;

  return (
    <div className="bg-surface rounded-2xl border border-border p-5 shadow-card">
      <CardLabel>Training</CardLabel>

      {/* Rest-day signal banner */}
      {restDaySignal && (
        <div className="mb-4 p-3 bg-neutral-bg rounded-xl border border-neutral-border">
          <p className="text-[11px] text-neutral-text leading-relaxed">
            Readiness has been below threshold for 3 consecutive days. A rest day or active
            recovery session may better serve training outcomes than structured load today.
          </p>
        </div>
      )}

      {/* Focus + badge */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-[1.1rem] font-light font-serif text-ink leading-snug">
          {training.focus}
        </h3>
        <span className={`flex-shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${badge.bg} ${badge.text}`}>
          {badge.label}
        </span>
      </div>

      {/* Intensity */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] text-ink-muted font-medium uppercase tracking-wider">Intensity</span>
        <span className="text-[11px] font-semibold text-ink">{training.intensity}</span>
      </div>

      {/* Body */}
      <p className="text-[12px] text-ink-secondary leading-relaxed mb-4 italic border-l-2 border-border-strong pl-3">
        "{training.headline}"
      </p>
      <p className="text-[12px] text-ink-secondary leading-relaxed mb-4">{training.body}</p>

      {/* Suggestions */}
     {training.suggestions?.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-2">Suggested focus</div>
          <ul className="space-y-1.5">
         {training.suggestions?.map((s, i) => (
  <ListItem key={i}>{s}</ListItem>
))}
          </ul>
        </div>
      )}

      {/* Avoid note */}
      {training.avoidNote && (
        <div className="mt-3 p-3 bg-caution-bg rounded-xl border border-caution-border">
          <p className="text-[11px] text-caution-text leading-relaxed">{training.avoidNote}</p>
        </div>
      )}
    </div>
  );
}

// ─── NutritionCard ────────────────────────────────────────────────────────────

export function NutritionCard({ nutrition }: { nutrition: NutritionRecommendation }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <CardLabel>Nutrition</CardLabel>

      <h3
        className="text-[1.1rem] font-light text-ink leading-snug mb-1.5"
        style={{ fontFamily: "'Lora', Georgia, serif" }}
      >
        {nutrition.focus}
      </h3>

      <p className="text-[12px] text-ink-secondary leading-relaxed mb-4">{nutrition.body}</p>

      {/* Macro emphasis */}
      <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-surface-subtle rounded-xl">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Macro emphasis</span>
        <span className="text-[12px] font-medium text-ink">{nutrition.macroEmphasis}</span>
      </div>

      {/* Priorities */}
      <div className="mb-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-2">Priorities</div>
        <ul className="space-y-1.5">
          {nutrition.priorities?.map((p, i) => (
  <ListItem key={i}>{p}</ListItem>
))}
        </ul>
      </div>

      {/* Key nutrients */}
      <div className="mb-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-2">Key nutrients</div>
        <div className="flex flex-wrap gap-1.5">
          {nutrition.keyNutrients.map(n => (
            <PillTag key={n} variant="teal">{n}</PillTag>
          ))}
        </div>
      </div>

      {/* Hydration */}
      <div className="flex items-start gap-2 mt-3 pt-3 border-t border-surface-hover">
        <span className="text-brand mt-0.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
          </svg>
        </span>
        <p className="text-[11px] text-ink-secondary leading-relaxed">
          <span className="font-semibold text-ink">Hydration: </span>
          {nutrition.hydration}
        </p>
      </div>

      {/* Timing note */}
      {nutrition.timingNote && (
        <div className="mt-3 p-3 bg-brand-bg-mid rounded-xl border border-brand-border">
          <p className="text-[11px] text-brand-dark leading-relaxed">{nutrition.timingNote}</p>
        </div>
      )}
    </div>
  );
}

// ─── RecoveryCard ─────────────────────────────────────────────────────────────

export function RecoveryCard({ recovery }: { recovery: RecoveryRecommendation }) {
  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <CardLabel>Recovery</CardLabel>

      <h3
        className="text-[1.1rem] font-light text-ink leading-snug mb-3"
        style={{ fontFamily: "'Lora', Georgia, serif" }}
      >
        {recovery.focus}
      </h3>

      <p className="text-[12px] text-ink-secondary leading-relaxed mb-4">{recovery.body}</p>

      {/* Sleep target */}
      <div className="flex items-start gap-2.5 p-3 bg-surface-subtle rounded-xl mb-4">
        <span className="text-brand mt-0.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </span>
        <p className="text-[11px] text-ink-secondary leading-relaxed">{recovery.sleepTarget}</p>
      </div>

      {/* Practices */}
      {recovery.practices.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-2">Practices</div>
          <ul className="space-y-1.5">
            {recovery.practices.map((p, i) => <ListItem key={i}>{p}</ListItem>)}
          </ul>
        </div>
      )}

      {/* Stress note */}
      {recovery.stressNote && (
        <div className="mt-3 p-3 bg-caution-bg rounded-xl border border-caution-border">
          <p className="text-[11px] text-caution-text leading-relaxed">{recovery.stressNote}</p>
        </div>
      )}
    </div>
  );
}
