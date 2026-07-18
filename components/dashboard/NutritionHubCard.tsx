"use client";

// ─── components/dashboard/NutritionHubCard.tsx ────────────────────────────────
// Dashboard 2.0 — Layer 2. Merges 3 of 4 previously-separate nutrition cards
// (NutritionIntelligenceCard, FuelingCard, the base recommendation-engine
// NutritionCard) into one card, Summary → Details. NutritionCheckinCard stays
// separate — an input, not a display. See docs/ux/UXStabilizationAudit.md
// Batch 16.
//
// FuelingCard and the base NutritionCard were confirmed near-total
// duplicates (priorities list, micronutrient focus, hydration note — same
// shape, two engines: fuelTargets vs recommendation.nutrition). Only one
// copy renders here (FuelingCard's, since it's symptom/timing-aware); the
// underlying two-engine duplication is tech debt out of this pass's scope
// (see the Dashboard 2.0 migration map).

import { useState } from "react";
import type { FuelTargets, FuelingLevel, NutritionPriority } from "@/lib/nutrition/fuelTargets";
import type { WorkoutFuelingPlan }           from "@/lib/nutrition/workoutFueling";
import type { NutritionAdjustment }          from "@/lib/nutrition/symptomNutritionMap";
import type { NutritionOutcome }             from "@/lib/nutrition/nutritionLearning";
import type { PersonalizedNutritionProfile } from "@/lib/nutrition/personalNutritionProfile";
import type { NutritionTargets }             from "@/lib/nutrition/nutritionTargets";
import { getMicronutrientInsights }          from "@/lib/nutrition/micronutrientCatalog";
import { AxisIcon } from "@/components/ui/Icon";

const LEVEL_LABELS: Record<FuelingLevel, string> = {
  high_output: "High Output", performance: "Performance", maintenance: "Maintenance", recovery: "Recovery",
};
const LEVEL_COLORS: Record<FuelingLevel, string> = {
  high_output: "bg-brand-bg-mid text-brand-dark", performance: "bg-success-bg text-success-text",
  maintenance: "bg-caution-bg text-caution-text", recovery: "bg-neutral-bg text-neutral-text",
};
const PRIORITY_CHIPS: Record<NutritionPriority, string> = {
  high: "bg-success-bg text-success-text border border-success-border",
  moderate: "bg-surface-hover text-ink-secondary border border-border",
  low: "bg-canvas text-ink-muted border border-border",
};
const IMPACT_CONFIG: Record<"positive" | "neutral" | "insufficient_data", { label: string; cls: string }> = {
  positive:          { label: "↑ Boosts readiness", cls: "bg-success-bg text-success-text" },
  neutral:           { label: "No clear signal",     cls: "bg-surface-subtle text-ink-secondary" },
  insufficient_data: { label: "Learning…",           cls: "bg-surface-subtle text-ink-muted" },
};

function MacroBar({ label, value, unit, color, max }: { label: string; value: number; unit: string; color: string; max: number }) {
  const pct = Math.round(Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-ink-secondary">{label}</span>
        <span className="text-[11px] font-semibold text-ink">{value}{unit}</span>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-2">{children}</p>;
}
function Divider() { return <div className="border-t border-surface-hover my-4" />; }

function bestOutcomeNote(outcomes: NutritionOutcome[], currentLevel: FuelingLevel): string | null {
  if (outcomes.length === 0) return null;
  const best = outcomes[0];
  if (best.fuelingLevel === currentLevel) {
    return `Your readiness has averaged ${best.meanNextDayScore} the day after ${LEVEL_LABELS[best.fuelingLevel].toLowerCase()} fueling days (${best.sampleSize} logged).`;
  }
  return `Your best next-day readiness (${best.meanNextDayScore}) follows ${LEVEL_LABELS[best.fuelingLevel].toLowerCase()} fueling days.`;
}

interface NutritionHubCardProps {
  fuelTargets:          FuelTargets | null;
  workoutFueling:       WorkoutFuelingPlan | null;
  nutritionAdjustments: NutritionAdjustment[];
  nutritionOutcomes:    NutritionOutcome[];
  profile?:             PersonalizedNutritionProfile;
  targets?:             NutritionTargets;
  periodizationNote?:   string;
}

export function NutritionHubCard({
  fuelTargets, workoutFueling, nutritionAdjustments, nutritionOutcomes,
  profile, targets, periodizationNote,
}: NutritionHubCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Two independent kinds of "ready": a mature *learned* compliance profile
  // (needs check-in history, Phase 32J) vs. real personalized numeric
  // targets (needs only body metrics, available from day one — Nutrition
  // Intelligence 2.0). The MacroBar view should show whenever either is
  // true, not just the learned profile — otherwise a user who has
  // completed body-metrics onboarding still sees the bare protein-range
  // fallback until they've logged a week of check-ins, defeating the
  // "Axis understands me before it starts learning me" goal.
  const hasLearnedProfile = !!profile && !(profile.sampleDays === 0 && profile.confidence === "early");
  const hasNumericTargets = !!targets && (targets.isPersonalized || hasLearnedProfile);
  if (!fuelTargets && !hasNumericTargets) return null;

  const outcomeNote = fuelTargets ? bestOutcomeNote(nutritionOutcomes, fuelTargets.fuelingLevel) : null;
  const topSymptoms = nutritionAdjustments.slice(0, 3);
  const hasTiming = workoutFueling && (workoutFueling.preWorkout || workoutFueling.postWorkout || workoutFueling.evening);
  const hasLearned = hasLearnedProfile && profile!.sampleDays >= 7;
  const microInsights = fuelTargets ? getMicronutrientInsights(fuelTargets.microFocus) : [];
  const showBackfillNudge = !!targets && !targets.isPersonalized;

  const hasDetails = !!(fuelTargets || topSymptoms.length > 0 || hasTiming || outcomeNote || hasLearned || microInsights.length > 0 || (profile && profile.recommendations.length > 0));

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-card">
      <div className="px-5 pt-5 pb-3 border-b border-surface-hover">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-ink">Nutrition</h2>
          {fuelTargets && (
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${LEVEL_COLORS[fuelTargets.fuelingLevel]}`}>
              {LEVEL_LABELS[fuelTargets.fuelingLevel]}
            </span>
          )}
        </div>
        <p className="text-[11px] text-ink-muted mt-0.5">Am I fueling appropriately?</p>
      </div>

      <div className="px-5 py-4">
        {hasNumericTargets && targets ? (
          <div className="space-y-2">
            <MacroBar label="Calories"  value={targets.calories}        unit=" kcal" color="#534AB7" max={3000} />
            <MacroBar label="Protein"   value={targets.protein}         unit="g"     color="#1A7A3E" max={200}  />
            <MacroBar label="Carbs"     value={targets.carbs}           unit="g"     color="#B35C00" max={400}  />
            <MacroBar label="Fats"      value={targets.fats}            unit="g"     color="#C0392B" max={120}  />
            <MacroBar label="Hydration" value={targets.hydrationLiters} unit="L"     color="#0A7AC4" max={4}    />
          </div>
        ) : fuelTargets && (
          <div>
            <p className="text-ink-secondary text-xs uppercase tracking-wide mb-1">Protein target</p>
            <p className="text-[1.8rem] font-light text-ink">
              {fuelTargets.proteinRange.min}–{fuelTargets.proteinRange.max}
              <span className="text-ink-secondary text-sm font-normal ml-1">g</span>
            </p>
          </div>
        )}
        {targets?.phaseNote && (
          <div className="px-3 py-2 bg-surface-subtle rounded-xl mt-3">
            <p className="text-[11px] text-ink-secondary leading-relaxed">{targets.phaseNote}</p>
          </div>
        )}
        {showBackfillNudge && (
          <a
            href="/profile"
            className="flex items-center gap-2.5 px-3 py-2.5 bg-brand-bg-mid rounded-xl mt-3 hover:bg-brand-bg transition-colors"
          >
            <AxisIcon name="lock" size="sm" className="text-brand shrink-0" />
            <p className="text-[11px] text-brand-dark leading-relaxed flex-1">
              Add your body stats for personalized nutrition targets, instead of a general estimate.
            </p>
            <AxisIcon name="arrow-right" size={14} className="text-brand shrink-0" />
          </a>
        )}
      </div>

      {hasDetails && (
        <button
          type="button"
          onClick={() => setShowDetails(v => !v)}
          className="w-full flex items-center justify-between px-5 py-2.5 bg-surface-raised border-t border-border hover:bg-surface-hover transition-colors min-h-[44px] focus-ring"
          aria-expanded={showDetails}
        >
          <span className="text-[12px] font-semibold text-brand">{showDetails ? "Hide details" : "Why these targets?"}</span>
          <AxisIcon name="chevron-down" size={14} strokeWidth={1.5} className={`text-ink-muted transition-transform ${showDetails ? "rotate-180" : ""}`} />
        </button>
      )}

      {showDetails && (
        <div className="px-5 py-4 space-y-0 border-t border-border">
          {fuelTargets && (
            <div>
              <SectionLabel>Priorities</SectionLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${PRIORITY_CHIPS[fuelTargets.carbPriority]}`}>Carbs — {fuelTargets.carbPriority}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${PRIORITY_CHIPS[fuelTargets.hydrationPriority]}`}>Hydration — {fuelTargets.hydrationPriority}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${PRIORITY_CHIPS[fuelTargets.fatPriority]}`}>Fat — {fuelTargets.fatPriority}</span>
              </div>
              {(fuelTargets.ironFocus || fuelTargets.magnesiumFocus || fuelTargets.electrolyteFocus) && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {fuelTargets.ironFocus && <span className="text-[11px] px-2 py-0.5 rounded-full bg-danger-bg text-danger border border-danger-border font-medium">Iron focus</span>}
                  {fuelTargets.magnesiumFocus && <span className="text-[11px] px-2 py-0.5 rounded-full bg-danger-bg text-danger border border-danger-border font-medium">Magnesium focus</span>}
                  {fuelTargets.electrolyteFocus && <span className="text-[11px] px-2 py-0.5 rounded-full bg-danger-bg text-danger border border-danger-border font-medium">Electrolyte focus</span>}
                </div>
              )}
              <p className="text-[12px] text-ink-secondary leading-snug">{fuelTargets.fuelingNote}</p>
            </div>
          )}

          {microInsights.length > 0 && (
            <>
              <Divider />
              <div>
                <SectionLabel>Nutrients to watch today</SectionLabel>
                <div className="space-y-2.5">
                  {microInsights.map(n => (
                    <div key={n.id} className="bg-surface-hover rounded-xl px-3 py-2.5">
                      <p className="text-[12px] font-semibold text-ink mb-0.5">{n.name}</p>
                      <p className="text-[11px] text-ink-secondary leading-relaxed mb-1">{n.blurb}</p>
                      <p className="text-[10px] text-ink-muted">Sources: {n.foodSources.join(", ")}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-ink-faint leading-relaxed mt-2">
                  Educational information, not a medical assessment. If symptoms persist, consider discussing with a healthcare professional.
                </p>
              </div>
            </>
          )}

          {topSymptoms.length > 0 && (
            <>
              <Divider />
              <div>
                <SectionLabel>Based on today&apos;s symptoms</SectionLabel>
                {topSymptoms.map(adj => (
                  <div key={adj.symptomId} className="mb-2 last:mb-0">
                    <p className="text-[12px] font-medium text-ink">{adj.focus}</p>
                    <p className="text-[11px] text-ink-secondary">{adj.suggestion}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {hasTiming && workoutFueling && (
            <>
              <Divider />
              <div>
                <SectionLabel>Fueling windows</SectionLabel>
                {workoutFueling.preWorkout && (
                  <div className="mb-2">
                    <p className="text-[10px] text-ink-muted uppercase tracking-wide">Pre-workout · {workoutFueling.preWorkout.timing}</p>
                    <p className="text-[12px] text-ink">{workoutFueling.preWorkout.recommendation}</p>
                  </div>
                )}
                {workoutFueling.postWorkout && (
                  <div className="mb-2">
                    <p className="text-[10px] text-ink-muted uppercase tracking-wide">Post-workout · {workoutFueling.postWorkout.timing}</p>
                    <p className="text-[12px] text-ink">{workoutFueling.postWorkout.recommendation}</p>
                  </div>
                )}
                {workoutFueling.evening && (
                  <div>
                    <p className="text-[10px] text-ink-muted uppercase tracking-wide">This evening</p>
                    <p className="text-[12px] text-ink">{workoutFueling.evening.recommendation}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {periodizationNote && (
            <>
              <Divider />
              <div className="px-3 py-2 bg-brand-bg-mid rounded-xl border border-brand-border">
                <p className="text-[10px] font-bold text-brand mb-0.5">Training Block</p>
                <p className="text-[11px] text-brand leading-relaxed">{periodizationNote}</p>
              </div>
            </>
          )}

          {hasLearned && profile && (
            <>
              <Divider />
              <div>
                <SectionLabel>What Axis has learned · {profile.sampleDays} days</SectionLabel>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-ink-secondary">Protein → Readiness</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${IMPACT_CONFIG[profile.proteinImpact].cls}`}>{IMPACT_CONFIG[profile.proteinImpact].label}</span>
                </div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-ink-secondary">Hydration → Readiness</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${IMPACT_CONFIG[profile.hydrationImpact].cls}`}>{IMPACT_CONFIG[profile.hydrationImpact].label}</span>
                </div>
                <p className="text-[11px] text-ink-secondary leading-relaxed">{profile.primaryInsight}</p>
              </div>
            </>
          )}

          {profile && profile.recommendations.length > 0 && (
            <>
              <Divider />
              <div>
                <SectionLabel>Personalised nudges</SectionLabel>
                {profile.recommendations.map((r, i) => (
                  <div key={i} className="flex gap-2 text-[11px] text-ink-secondary leading-relaxed mb-1 last:mb-0">
                    <span className="text-brand shrink-0">·</span><span>{r}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {outcomeNote && (
            <>
              <Divider />
              <div>
                <SectionLabel>Personalised insight</SectionLabel>
                <p className="text-[12px] text-success-text">{outcomeNote}</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
