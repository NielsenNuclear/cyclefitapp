"use client";

// ─── components/dashboard/AthleteProfileHubCard.tsx ───────────────────────────
// Dashboard 2.0 — Layer 3. Merges AthleteProfileCard (anchor),
// AthleteDevelopmentCard's non-milestone content, TrainingMaturityCard, and
// TrainingSummaryCard into one card answering "who am I as an athlete?".
// AthleteDevelopmentCard's milestone content is redirected to the Goals &
// Milestones Hub instead of staying a 5th milestone surface.
// TrainingMaturityCard and AthleteDevelopmentCard's training-age section were
// confirmed the same question from two engines (lib/planning/trainingMaturity
// vs lib/athlete/trainingAge) — both surface here since neither is strictly
// a superset of the other (different components/insight text), but as two
// clearly-labeled rows, not two competing cards.
// See docs/ux/UXStabilizationAudit.md Batch 17.

import { useState } from "react";
import type { AthleteProfile }      from "@/lib/athlete/athleteProfile";
import type { TrainingAge as AthleteTrainingAge } from "@/lib/athlete/trainingAge";
import type { ResilienceIndex }     from "@/lib/athlete/resilienceIndex";
import type { ProgressionVelocity } from "@/lib/athlete/progressionVelocity";
import type { AthleteIdentity }     from "@/lib/athlete/athleteIdentity";
import type { TrainingMaturity, MaturityLevel } from "@/lib/planning/trainingMaturity";
import type { WorkoutHistorySummary } from "@/lib/history/workoutHistory";
import { AxisIcon } from "@/components/ui/Icon";

const MATURITY_COLORS: Record<string, string> = {
  beginner: "text-ink-muted", developing: "text-caution", intermediate: "text-success",
  advanced: "text-success-text", veteran: "text-brand",
};
const RESILIENCE_COLORS: Record<string, string> = {
  low: "text-danger", moderate: "text-caution", high: "text-success", elite: "text-brand",
};
const ARCHETYPE_ICON: Record<string, string> = {
  strength_focused: "⚡", hypertrophy_focused: "💪", performance_focused: "🎯", lifestyle_focused: "🌿",
};
const LEVEL_LABEL: Record<MaturityLevel, string> = {
  beginner: "Beginner", developing: "Developing", intermediate: "Intermediate", advanced: "Advanced",
};
const LEVEL_COLOR: Record<MaturityLevel, string> = {
  beginner: "text-info", developing: "text-success", intermediate: "text-brand", advanced: "text-caution",
};

function BaselineRow({ label, value, vsPersonal }: { label: string; value: string; vsPersonal?: "above" | "at" | "below" | "unknown" }) {
  const arrow = vsPersonal === "above" ? { char: "↑", cls: "text-success-text" } :
    vsPersonal === "below" ? { char: "↓", cls: "text-caution-text" } :
    vsPersonal === "at" ? { char: "→", cls: "text-ink-muted" } : null;
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-[12px] text-ink-secondary">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-[12px] font-semibold text-ink">{value}</span>
        {arrow && <span className={`text-[11px] font-bold ${arrow.cls}`}>{arrow.char}</span>}
      </div>
    </div>
  );
}
function BiasBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-ink-muted">{label}</span>
        <span className="text-[10px] font-semibold text-ink-secondary">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-subtle overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-2">{children}</p>;
}
function Divider() { return <div className="border-t border-surface-hover my-4" />; }

interface AthleteProfileHubCardProps {
  profile:             AthleteProfile | undefined;
  trainingAge:         AthleteTrainingAge | undefined;
  resilienceIndex:     ResilienceIndex | undefined;
  progressionVelocity: ProgressionVelocity | undefined;
  athleteIdentity:     AthleteIdentity | undefined;
  trainingMaturity:    TrainingMaturity | undefined;
  historySummary:      WorkoutHistorySummary | null;
}

export function AthleteProfileHubCard({
  profile, trainingAge, resilienceIndex, progressionVelocity, athleteIdentity,
  trainingMaturity, historySummary,
}: AthleteProfileHubCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const hasSummary = historySummary && historySummary.totalWorkouts > 0;
  if (!profile && !trainingAge?.dataReady && !resilienceIndex?.dataReady && !hasSummary) return null;

  const confidenceLabel = profile
    ? profile.profileConfidence >= 70 ? "Established" : profile.profileConfidence >= 40 ? "Building" : "Just starting"
    : null;

  const hasDetails = !!(profile?.fingerprint.dataReady || profile?.baselines.dataReady ||
    profile?.signature.dataReady || (profile?.adaptationInsights.length ?? 0) > 0 ||
    trainingMaturity || resilienceIndex?.dataReady || progressionVelocity?.dataReady);

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-card">
      <div className="px-5 pt-5 pb-3 border-b border-surface-hover">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Athlete Profile</h2>
            <p className="text-[11px] text-ink-muted mt-0.5">Who am I as an athlete?</p>
          </div>
          {confidenceLabel && (
            <span className={`text-[11px] font-semibold ${profile!.profileConfidence >= 70 ? "text-success-text" : profile!.profileConfidence >= 40 ? "text-brand-text" : "text-ink-muted"}`}>
              {confidenceLabel}
            </span>
          )}
        </div>
      </div>

      <div className="px-5 py-4">
        {hasSummary && historySummary && (
          <div className="grid grid-cols-3 divide-x divide-surface-hover mb-3">
            <div className="flex flex-col items-center gap-0.5 px-2">
              <span className="text-[1.35rem] font-light text-ink leading-none" style={{ fontFamily: "'Lora', Georgia, serif" }}>{historySummary.workoutsThisWeek}</span>
              <span className="text-[9px] text-ink-muted uppercase tracking-wider">This Week</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 px-2">
              <span className="text-[1.35rem] font-light text-ink leading-none" style={{ fontFamily: "'Lora', Georgia, serif" }}>{Math.round(historySummary.completionRate * 100)}%</span>
              <span className="text-[9px] text-ink-muted uppercase tracking-wider">Completion</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 px-2">
              <span className="text-[1.35rem] font-light text-ink leading-none" style={{ fontFamily: "'Lora', Georgia, serif" }}>{historySummary.currentStreak}</span>
              <span className="text-[9px] text-ink-muted uppercase tracking-wider">Day Streak</span>
            </div>
          </div>
        )}

        {athleteIdentity?.dataReady && (
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[12px] text-ink-muted">Archetype</span>
            <span className="text-[12px] font-medium text-ink">{ARCHETYPE_ICON[athleteIdentity.archetype]} {athleteIdentity.label}</span>
          </div>
        )}
        {trainingAge?.dataReady && (
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[12px] text-ink-muted">Training maturity</span>
            <span className={`text-[12px] font-semibold ${MATURITY_COLORS[trainingAge.maturity]}`}>
              {trainingAge.maturity.charAt(0).toUpperCase() + trainingAge.maturity.slice(1)}
              <span className="text-[11px] text-ink-muted font-normal ml-1">({trainingAge.estimatedAge})</span>
            </span>
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
          <span className="text-[12px] font-semibold text-brand">{showDetails ? "Hide details" : "Full athlete profile"}</span>
          <AxisIcon name="chevron-down" size={14} strokeWidth={1.5} className={`text-ink-muted transition-transform ${showDetails ? "rotate-180" : ""}`} />
        </button>
      )}

      {showDetails && (
        <div className="px-5 py-4 space-y-0 border-t border-border">
          {resilienceIndex?.dataReady && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] text-ink-muted">Resilience</span>
              <span className={`text-[13px] font-semibold ${RESILIENCE_COLORS[resilienceIndex.level]}`}>
                {resilienceIndex.level.charAt(0).toUpperCase() + resilienceIndex.level.slice(1)}
                <span className="text-[11px] text-ink-muted font-normal ml-1">({resilienceIndex.score}/100)</span>
              </span>
            </div>
          )}
          {progressionVelocity?.dataReady && (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] text-ink-muted">Adaptation speed</span>
                <span className="text-[12px] font-medium text-ink">{progressionVelocity.label}</span>
              </div>
              <p className="text-[11px] text-ink-secondary mb-2">{progressionVelocity.implication}</p>
            </>
          )}

          {trainingMaturity && (
            <>
              <Divider />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <SectionLabel>Training Maturity Score</SectionLabel>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full bg-surface-hover ${LEVEL_COLOR[trainingMaturity.level]}`}>{LEVEL_LABEL[trainingMaturity.level]}</span>
                </div>
                <div className="flex items-end gap-3 mb-2">
                  <span className={`text-3xl font-bold ${LEVEL_COLOR[trainingMaturity.level]}`}>{trainingMaturity.score}</span>
                  <span className="text-xs text-ink-muted pb-1">/ 100</span>
                </div>
                <div className="space-y-1.5">
                  {([
                    { label: "Volume", val: trainingMaturity.components.volume },
                    { label: "Consistency", val: trainingMaturity.components.consistency },
                    { label: "Complexity", val: trainingMaturity.components.complexity },
                    { label: "Progression", val: trainingMaturity.components.progression },
                  ]).map(({ label, val }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-[10px] text-ink-muted w-20 flex-shrink-0">{label}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-surface-hover">
                        <div className="h-1.5 rounded-full bg-brand" style={{ width: `${val}%` }} />
                      </div>
                      <span className="text-[10px] text-ink-muted w-7 text-right">{val}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-ink-muted leading-relaxed mt-2">{trainingMaturity.insight}</p>
              </div>
            </>
          )}

          {profile?.fingerprint.dataReady && (
            <>
              <Divider />
              <div>
                <SectionLabel>Training style</SectionLabel>
                <div className="space-y-2.5">
                  <BiasBar label="Strength" value={profile.fingerprint.strengthBias} color="bg-brand" />
                  <BiasBar label="Hypertrophy" value={profile.fingerprint.hypertrophyBias} color="bg-success" />
                  <BiasBar label="Conditioning" value={profile.fingerprint.conditioningBias} color="bg-caution" />
                </div>
              </div>
            </>
          )}

          {profile?.baselines.dataReady && (
            <>
              <Divider />
              <div>
                <SectionLabel>Your personal baselines</SectionLabel>
                <div className="divide-y divide-border/50">
                  <BaselineRow label="Readiness" value={`${profile.baselines.avgReadiness}/100`} vsPersonal={profile.baselines.readinessTodayVsBaseline} />
                  <BaselineRow label="Recovery" value={`${profile.baselines.avgRecovery}/100`} vsPersonal={profile.baselines.recoveryTodayVsBaseline} />
                  <BaselineRow label="Weekly sessions" value={`${profile.baselines.avgWeeklyFrequency} / wk`} />
                </div>
              </div>
            </>
          )}

          {profile?.signature.dataReady && (
            <>
              <Divider />
              <div>
                <SectionLabel>Recovery signature</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-raised rounded-xl p-3 border border-border">
                    <p className="text-[13px] font-semibold text-ink">{profile.signature.avgScore}/100</p>
                    <p className="text-[10px] text-ink-muted mt-0.5">Average</p>
                  </div>
                  <div className="bg-surface-raised rounded-xl p-3 border border-border">
                    <p className="text-[13px] font-semibold text-ink capitalize">{profile.signature.stabilityLabel}</p>
                    <p className="text-[10px] text-ink-muted mt-0.5">Stability</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {profile && profile.adaptationInsights.length > 0 && (
            <>
              <Divider />
              <div>
                <SectionLabel>What Axis has learned</SectionLabel>
                <div className="space-y-2">
                  {profile.adaptationInsights.slice(0, 3).map(insight => (
                    <div key={insight.id} className="p-3 bg-surface-raised rounded-xl border border-border">
                      <p className="text-[12px] text-ink-secondary leading-snug">{insight.text}</p>
                      <p className="text-[11px] text-brand-text mt-1.5 font-medium">{insight.actionable}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
