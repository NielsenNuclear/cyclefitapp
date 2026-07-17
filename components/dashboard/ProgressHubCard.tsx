"use client";

// ─── components/dashboard/ProgressHubCard.tsx ─────────────────────────────────
// Dashboard 2.0 — Layer 3. Merges PerformanceHubCard (anchor — already the
// best-built hub in the whole audit), ProgressCard's weekly-prescription/
// mesocycle-timeline/next-session-targets/plateau-interventions, and
// ProgressInsightsCard into one card. Rewritten onto DS-2 tokens — ProgressCard
// used raw Tailwind grays/indigos throughout.
//
// PerformanceHubCard's plateau alerts and ProgressCard's plateau
// interventions are two independent engines (lib/performance/plateauDetection
// vs lib/progression/plateauIntervention) — shown as two clearly labeled
// sections rather than guess-merged, since neither is confirmed a superset of
// the other. ProgressCard's own "Exercise Trends" count summary is dropped —
// redundant with the new dedicated ExerciseTrendsCard.
//
// ProgressInsightsCard computes client-side (calls detectAllPlateaus()
// directly, a third plateau engine) rather than receiving props — that SSOT
// violation is preserved as-is in this pass (not an engine change, out of
// this UI-focused initiative's scope) and flagged as tech debt.
// See docs/ux/UXStabilizationAudit.md Batch 17.

import { useState, useMemo } from "react";
import type { TrainingQualityScore }  from "@/lib/performance/trainingQuality";
import type { PlateauReport }         from "@/lib/performance/plateauDetection";
import type { PersonalBestSet }       from "@/lib/performance/personalBests";
import type { GoalVelocity }          from "@/lib/performance/goalVelocity";
import type { GoalAdjustmentAdvice }  from "@/lib/performance/goalAdjustment";
import type { PerformancePredictors } from "@/lib/performance/performancePredictors";
import type { ProgressionTarget }     from "@/lib/progression/progressionTargets";
import type { ExerciseMasteryEntry }  from "@/lib/progression/exerciseMastery";
import type { PlateauIntervention }   from "@/lib/progression/plateauIntervention";
import type { Mesocycle }             from "@/lib/planning/mesocycleBuilder";
import type { WeeklyProgressionPrescription } from "@/lib/planning/goalProgression";
import { getAllExerciseHistory, type ExercisePerformance } from "@/lib/progression/exerciseHistory";
import { detectAllPlateaus } from "@/lib/progression/plateauDetection";
import { LockedInsight } from "@/components/ui/LockedInsight";
import { AxisIcon } from "@/components/ui/Icon";

const QUALITY_COLOR: Record<string, string> = { Excellent: "text-success", Good: "text-info", Fair: "text-caution", Poor: "text-danger" };
const QUALITY_BG: Record<string, string> = { Excellent: "bg-success", Good: "bg-info", Fair: "bg-caution", Poor: "bg-danger" };
const URGENCY_COLOR: Record<string, string> = { none: "text-success", advisory: "text-info", recommended: "text-caution", urgent: "text-danger" };
const URGENCY_BG: Record<string, string> = {
  none: "bg-success-bg border-success-border", advisory: "bg-info-bg border-info-border",
  recommended: "bg-caution-bg border-caution-border", urgent: "bg-danger-bg border-danger-border",
};
const INTERVENTION_COLOR: Record<string, string> = {
  intensity: "bg-caution-bg text-caution-text", variation: "bg-brand-bg-mid text-brand-dark",
  density: "bg-info-bg text-info", power: "bg-success-bg text-success-text",
};
const PROGRESSION_BADGE: Record<string, string> = {
  load: "bg-success-bg text-success-text", reps: "bg-info-bg text-info",
  deload: "bg-caution-bg text-caution-text", maintain: "bg-surface-hover text-ink-secondary",
};

function epley1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}
function volumeProxy(p: ExercisePerformance): number { return (p.weight + 1) * p.reps * p.sets; }

function computeProgressInsights() {
  const all = getAllExerciseHistory();
  if (all.length === 0) return null;
  const byExercise = new Map<string, ExercisePerformance[]>();
  for (const p of all) {
    if (!p.completed) continue;
    const list = byExercise.get(p.exerciseName) ?? [];
    list.push(p);
    byExercise.set(p.exerciseName, list);
  }
  let strongestLift = "", strongestGrowthPct = 0, totalStrengthGain = 0;
  for (const [name, entries] of byExercise) {
    if (entries.length < 3) continue;
    const recent = entries.slice(0, 2).map(volumeProxy);
    const oldest = entries.slice(-2).map(volumeProxy);
    const recentMean = recent.reduce((s, v) => s + v, 0) / recent.length;
    const oldMean = oldest.reduce((s, v) => s + v, 0) / oldest.length;
    const growthPct = oldMean > 0 ? ((recentMean - oldMean) / oldMean) * 100 : 0;
    if (growthPct > strongestGrowthPct) { strongestGrowthPct = growthPct; strongestLift = name; }
    const first = entries[entries.length - 1], latest = entries[0];
    const firstRM = epley1RM(first.weight, first.reps), lastRM = epley1RM(latest.weight, latest.reps);
    if (firstRM > 0 && lastRM > firstRM) totalStrengthGain += lastRM - firstRM;
  }
  const plateaus = detectAllPlateaus();
  const topPlateau = plateaus.find(p => p.plateauDetected);
  const REASON_SHORT: Record<string, string> = {
    volume_flat: "Volume flat", weight_stuck: "Weight unchanged", rpe_rising: "Effort creeping up",
    incomplete_sets: "Sets not completed", insufficient_data: "",
  };
  return {
    strongestLift: strongestLift || null,
    strongestGrowthPct: Math.round(strongestGrowthPct * 10) / 10,
    biggestPlateau: topPlateau?.exerciseName ?? null,
    plateauReason: topPlateau ? (REASON_SHORT[topPlateau.reason] ?? "") : "",
    totalStrengthGain: Math.round(totalStrengthGain * 10) / 10,
  };
}

function Divider() { return <div className="border-t border-surface-hover my-4" />; }
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-2">{children}</p>;
}

interface ProgressHubCardProps {
  quality?:      TrainingQualityScore;
  plateaus?:     PlateauReport;
  personalBests?: PersonalBestSet[];
  velocity?:     GoalVelocity;
  adjustments?:  GoalAdjustmentAdvice;
  predictors?:   PerformancePredictors;
  progressionTargets:   ProgressionTarget[];
  exerciseMastery:      ExerciseMasteryEntry[];
  plateauInterventions: PlateauIntervention[];
  mesocycle:            Mesocycle | null;
  weeklyPrescription:   WeeklyProgressionPrescription | null;
}

export function ProgressHubCard({
  quality, plateaus, personalBests, velocity, adjustments, predictors,
  progressionTargets, exerciseMastery, plateauInterventions, mesocycle, weeklyPrescription,
}: ProgressHubCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const insights = useMemo(() => computeProgressInsights(), []);

  if (!quality && !plateaus && !velocity && !weeklyPrescription && !mesocycle && progressionTargets.length === 0) return null;

  const prsWithBest = (personalBests ?? []).filter(pb => pb.lifetime !== null).slice(0, 4);
  const qualityMaturity = quality ? quality.maturityStage : "locked";
  const topInterventions = plateauInterventions.slice(0, 3);
  const actionableTargets = progressionTargets.filter(t => t.progressionType !== "maintain").slice(0, 5);
  const allMaintain = progressionTargets.length > 0 && progressionTargets.every(t => t.progressionType === "maintain");
  const masteryMap = new Map(exerciseMastery.map(m => [m.exerciseName, m]));

  const hasDetails = !!(mesocycle || weeklyPrescription?.keyGuidance.length || topInterventions.length ||
    progressionTargets.length || insights?.strongestLift || insights?.biggestPlateau || (insights?.totalStrengthGain ?? 0) > 0);

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-card">
      <div className="px-5 pt-5 pb-3 border-b border-surface-hover">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-ink">Progress</h2>
          {quality && qualityMaturity === "ready" && (
            <span className={`text-[11px] font-semibold ${QUALITY_COLOR[quality.tier] ?? ""}`}>{quality.tier}</span>
          )}
        </div>
        <p className="text-[11px] text-ink-muted mt-0.5">How am I improving?</p>
      </div>

      <div className="px-5 py-4">
        {quality && qualityMaturity === "ready" && (
          <>
            <div className="space-y-1 mb-3">
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] text-ink-muted">Training Quality</span>
                <span className={`text-[11px] font-semibold ${QUALITY_COLOR[quality.tier] ?? "text-ink"}`}>{quality.score}/100</span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-hover">
                <div className={`h-2 rounded-full ${QUALITY_BG[quality.tier] ?? "bg-ink-faint"}`} style={{ width: `${quality.score}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Completion", val: quality.breakdown.completionRate },
                { label: "Volume", val: quality.breakdown.volumeAccuracy },
                { label: "RPE Quality", val: quality.breakdown.rpeAccuracy },
                { label: "Consistency", val: quality.breakdown.consistencyScore },
              ].map(({ label, val }) => (
                <div key={label} className="bg-surface-hover rounded-xl px-3 py-2">
                  <div className="text-[10px] text-ink-muted">{label}</div>
                  <div className="text-[13px] font-semibold text-ink mt-0.5">{val}%</div>
                </div>
              ))}
            </div>
          </>
        )}
        {quality && qualityMaturity === "locked" && (
          <p className="text-[11px] text-ink-muted text-center py-2">Complete your first workout to see training quality.</p>
        )}
        {quality && qualityMaturity === "building" && quality.sessionsAnalysed === 1 && (
          <p className="text-[11px] text-success text-center py-2">First workout completed! Keep training to build your quality profile.</p>
        )}
        {quality && qualityMaturity === "building" && quality.sessionsAnalysed > 1 && (
          <LockedInsight entryCount={quality.sessionsAnalysed} title="Training Quality" />
        )}

        {velocity && velocity.currentValue > 0 && (
          <div className="bg-surface-hover border border-border rounded-xl p-3 space-y-2 mt-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-ink-muted uppercase tracking-widest">Goal Velocity</span>
              <span className={`text-[10px] font-semibold ${velocity.onTrack ? "text-success" : "text-caution"}`}>{velocity.onTrack ? "On Track" : "Below Target"}</span>
            </div>
            <p className="text-[11px] text-ink-muted leading-relaxed">{velocity.message}</p>
          </div>
        )}

        {plateaus && plateaus.plateaus.length > 0 && (
          <div className="space-y-2 mt-3">
            <div className="text-[10px] text-danger font-semibold uppercase tracking-widest">Plateau Alerts</div>
            {plateaus.plateaus.slice(0, 2).map(p => (
              <div key={`${p.exerciseName}-${p.type}`} className="bg-danger-bg border border-danger-border rounded-xl px-3 py-2">
                <div className="flex justify-between items-baseline mb-0.5">
                  <span className="text-[12px] font-medium text-ink">{p.exerciseName}</span>
                  <span className="text-[10px] text-danger capitalize">{p.severity}</span>
                </div>
                <p className="text-[10px] text-ink-muted">{p.suggestion}</p>
              </div>
            ))}
          </div>
        )}

        {prsWithBest.length > 0 && (
          <div className="space-y-2 mt-3">
            <div className="text-[10px] text-caution font-semibold uppercase tracking-widest">Personal Bests</div>
            <div className="grid grid-cols-2 gap-2">
              {prsWithBest.map(pb => {
                const best = pb.thirtyDay ?? pb.ninetyDay ?? pb.year ?? pb.lifetime;
                if (!best) return null;
                return (
                  <div key={pb.exerciseName} className="bg-surface-hover border border-border rounded-xl px-3 py-2">
                    <div className="text-[10px] text-ink-muted truncate">{pb.exerciseName}</div>
                    <div className="text-[13px] font-semibold text-ink mt-0.5">{best.weight}kg × {best.reps}</div>
                    <div className="text-[10px] text-caution">~{best.estimated1RM}kg 1RM</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {predictors?.topPositive && predictors.dataMaturity !== "low" && (
          <div className="bg-brand-bg-mid border border-brand-border rounded-xl p-3 mt-3">
            <div className="text-[10px] text-brand font-semibold uppercase tracking-widest mb-1">Best Performance Condition</div>
            <div className="text-[12px] font-medium text-ink">{predictors.topPositive.label}</div>
            <div className="text-[11px] text-ink-muted mt-0.5">{predictors.insight}</div>
          </div>
        )}

        {adjustments && adjustments.urgency !== "none" && adjustments.suggestions.length > 0 && (
          <div className={`border rounded-xl p-3 space-y-2 mt-3 ${URGENCY_BG[adjustments.urgency] ?? ""}`}>
            <div className="flex items-center justify-between">
              <div className={`text-[10px] font-semibold uppercase tracking-widest ${URGENCY_COLOR[adjustments.urgency]}`}>Adjustments</div>
              <span className={`text-[10px] font-semibold capitalize ${URGENCY_COLOR[adjustments.urgency] ?? ""}`}>{adjustments.urgency}</span>
            </div>
            <p className="text-[11px] text-ink-secondary leading-relaxed">{adjustments.headline}</p>
          </div>
        )}
      </div>

      {hasDetails && (
        <button
          type="button"
          onClick={() => setShowDetails(v => !v)}
          className="w-full flex items-center justify-between px-5 py-2.5 bg-surface-raised border-t border-border hover:bg-surface-hover transition-colors min-h-[44px]"
          aria-expanded={showDetails}
        >
          <span className="text-[12px] font-semibold text-brand">{showDetails ? "Hide details" : "Full progress breakdown"}</span>
          <AxisIcon name="chevron-down" size={14} strokeWidth={1.5} className={`text-ink-muted transition-transform ${showDetails ? "rotate-180" : ""}`} />
        </button>
      )}

      {showDetails && (
        <div className="px-5 py-4 space-y-0 border-t border-border">
          {weeklyPrescription && weeklyPrescription.keyGuidance.length > 0 && (
            <div>
              <SectionLabel>This Week</SectionLabel>
              <ul className="space-y-1.5">
                {weeklyPrescription.keyGuidance.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-ink-secondary">
                    <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-brand-light" />{tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {mesocycle && (
            <>
              <Divider />
              <div>
                <SectionLabel>Block Progress — Week {mesocycle.currentWeek} of {mesocycle.totalWeeks}</SectionLabel>
                <div className="flex gap-2">
                  {mesocycle.weeks.map(week => {
                    const isPast = week.weekNumber < mesocycle.currentWeek;
                    const isCurrent = week.weekNumber === mesocycle.currentWeek;
                    return (
                      <div key={week.weekNumber} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                          week.isDeload
                            ? isCurrent ? "bg-caution text-white" : isPast ? "bg-caution-bg text-caution-text" : "bg-surface-hover text-ink-faint"
                            : isCurrent ? "bg-brand text-white" : isPast ? "bg-brand-bg-mid text-brand-dark" : "bg-surface-hover text-ink-faint"
                        }`}>
                          {week.weekNumber}
                        </div>
                        <span className="text-[9px] text-ink-faint truncate w-full text-center">{week.isDeload ? "Deload" : week.focus.split(" ")[0]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {topInterventions.length > 0 && (
            <>
              <Divider />
              <div>
                <SectionLabel>Plateau Fix Suggestions</SectionLabel>
                <div className="space-y-2">
                  {topInterventions.map(inv => (
                    <div key={inv.exerciseName} className="bg-caution-bg rounded-xl p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[12px] font-medium text-ink">{inv.exerciseName}</span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${INTERVENTION_COLOR[inv.interventionType] ?? "bg-surface-hover text-ink-secondary"}`}>{inv.interventionType}</span>
                      </div>
                      <p className="text-[12px] text-ink-secondary">{inv.suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {progressionTargets.length > 0 && (
            <>
              <Divider />
              <div>
                <SectionLabel>Next Session Targets</SectionLabel>
                {allMaintain ? (
                  <p className="text-[12px] text-ink-muted">All exercises on track — maintain current loads.</p>
                ) : (
                  <div className="space-y-2">
                    {actionableTargets.map(target => {
                      const mastery = masteryMap.get(target.exerciseName);
                      return (
                        <div key={target.exerciseName} className="flex flex-col gap-1 py-2 border-b border-surface-hover last:border-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[12px] font-medium text-ink">{target.exerciseName}</span>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${PROGRESSION_BADGE[target.progressionType] ?? PROGRESSION_BADGE.maintain}`}>
                              {target.progressionType === "load" ? "Add Load" : target.progressionType === "reps" ? "Add Reps" : target.progressionType === "deload" ? "Deload" : "Maintain"}
                            </span>
                          </div>
                          <p className="text-[11px] text-ink-muted">
                            {target.targetWeight > 0 ? `${target.targetWeight} kg × ` : "Bodyweight × "}{target.targetReps} reps × {target.targetSets} sets
                          </p>
                          {mastery?.advancementSuggestion && (
                            <p className="text-[11px] text-success-text">Ready to progress → {mastery.advancementSuggestion}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {insights && (insights.strongestLift || insights.biggestPlateau || insights.totalStrengthGain > 0) && (
            <>
              <Divider />
              <div className="space-y-2">
                <SectionLabel>Progress Insights</SectionLabel>
                {insights.strongestLift && (
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] text-ink-secondary">Strongest progress</div>
                      <div className="text-[10px] text-ink-muted mt-0.5">{insights.strongestLift}</div>
                    </div>
                    <div className="text-[13px] font-semibold text-success-text">+{insights.strongestGrowthPct}%</div>
                  </div>
                )}
                {insights.totalStrengthGain > 0 && (
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] text-ink-secondary">Est. total 1RM gain</div>
                      <div className="text-[10px] text-ink-muted mt-0.5">Sum across all tracked lifts</div>
                    </div>
                    <div className="text-[13px] font-semibold text-brand">+{insights.totalStrengthGain} kg</div>
                  </div>
                )}
              </div>
            </>
          )}

          {quality && qualityMaturity === "ready" && (
            <p className="text-[11px] text-ink-muted leading-relaxed text-center pt-3">{quality.insight}</p>
          )}
        </div>
      )}
    </div>
  );
}
