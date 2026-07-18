"use client";

// ─── components/dashboard/WhatAxisLearnedHubCard.tsx ──────────────────────────
// Dashboard 2.0 — Layer 4. Merges WhatAxisLearnedCard (anchor), PersonalResponseCard,
// SituationMemoryCard, PersonalizationCard, and CoachingMemoryCard (relocated
// from the misfiled "Performance Tracking" section — its header is literally
// "What Axis has learned") into one card. These are related, not duplicate —
// four distinct engines, genuinely different content — but all answer "what
// does Axis know about me," so they share one entry point with sections
// instead of four separate cards. See docs/ux/UXStabilizationAudit.md Batch 18.

import { useState } from "react";
import type { PhysiologyFingerprint }  from "@/lib/adaptive/physiologyMemory";
import type { PatternConfidence }       from "@/lib/adaptive/patternConfidence";
import type { RecoveryCapacity }        from "@/lib/adaptive/recoveryCapacity";
import type { PersonalWeights }         from "@/lib/adaptive/personalWeighting";
import type { PersonalizationProgress } from "@/lib/adaptive/personalizationProgress";
import type { PhaseResponseProfile }    from "@/lib/physiology/phaseResponseModel";
import type { SymptomImpactProfile }    from "@/lib/physiology/symptomImpactModel";
import type { RecoveryResponseProfile } from "@/lib/physiology/recoveryResponseModel";
import type { PhysiologyConfidence }    from "@/lib/physiology/physiologyConfidence";
import type { CoachingNarrative }       from "@/lib/memory/coachingNarrative";
import type { IdentityModel }           from "@/lib/memory/identityModel";
import type { SimilarSituation }        from "@/lib/memory/situationMemory";
import type { CoachingMemoryItem, MemoryCategory } from "@/lib/adaptive/coachingMemory";
import { AxisIcon } from "@/components/ui/Icon";

function cycleOrdinal(days: number[]): string {
  if (days.length === 0) return "";
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 1) return `Day ${sorted[0]}`;
  const last = sorted.pop()!;
  return sorted.length === 1 ? `Days ${sorted[0]} and ${last}` : `Days ${sorted.join(", ")} and ${last}`;
}
function Divider() { return <div className="border-t border-surface-hover my-4" />; }
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-2">{children}</p>;
}
const CATEGORY_ICON: Record<MemoryCategory, string> = { cycle: "○", recovery: "◇", performance: "△", accuracy: "◻" };
const MEM_CONFIDENCE_CHIP: Record<CoachingMemoryItem["confidence"], string> = {
  established: "bg-success-bg text-success-text", growing: "bg-brand-bg-mid text-brand-dark", early: "bg-surface-subtle text-ink-muted",
};
const MEM_CONFIDENCE_LABEL: Record<CoachingMemoryItem["confidence"], string> = { established: "Established", growing: "Growing", early: "Early data" };
const TIER_COLOR: Record<string, string> = {
  Starting: "text-ink-secondary", Learning: "text-caution", Personalized: "text-success", "Highly Personalized": "text-brand",
};
const CAPACITY_LABEL: Record<string, string> = {
  high: "High — recovers well between sessions", moderate: "Moderate — standard recovery between sessions", low: "Low — benefits from extra recovery time",
};

interface WhatAxisLearnedHubCardProps {
  fingerprint?:  PhysiologyFingerprint | null;
  patternConfidences: PatternConfidence[];
  recoveryCapacity?: RecoveryCapacity | null;
  personalWeights?: PersonalWeights | null;
  personalizationProgress?: PersonalizationProgress | null;
  phaseResponse?: PhaseResponseProfile;
  symptomImpact?: SymptomImpactProfile;
  recoveryModel?: RecoveryResponseProfile;
  physiologyConf?: PhysiologyConfidence;
  narrative?: CoachingNarrative;
  identity?: IdentityModel;
  similar?: SimilarSituation[];
  memoryItems: CoachingMemoryItem[];
}

export function WhatAxisLearnedHubCard({
  fingerprint, patternConfidences, recoveryCapacity, personalWeights, personalizationProgress,
  phaseResponse, symptomImpact, recoveryModel, physiologyConf, narrative, identity, similar, memoryItems,
}: WhatAxisLearnedHubCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const reliablePatterns = patternConfidences.filter(p => p.isReliable).slice(0, 2);
  let dominantFactor: string | null = null;
  if (personalWeights?.isCalibrated) {
    const { sleep, stress, symptoms } = personalWeights;
    if (sleep >= stress && sleep >= symptoms && sleep > 0.40) dominantFactor = "sleep quality";
    else if (stress >= sleep && stress >= symptoms && stress > 0.40) dominantFactor = "stress levels";
    else if (symptoms > 0.40) dominantFactor = "symptom patterns";
  }
  const hasStrengthDays = fingerprint && fingerprint.bestStrengthDays.length > 0 && fingerprint.entryCount >= 30;
  const hasRecoveryDays = fingerprint && fingerprint.worstRecoveryDays.length > 0 && fingerprint.entryCount >= 30;
  const hasCapacity = recoveryCapacity && recoveryCapacity.confidence !== "early";
  const hasPersonalization = personalizationProgress && personalizationProgress.overallProgress >= 10;
  const hasResponse = phaseResponse?.dataReady || symptomImpact?.dataReady || recoveryModel?.dataReady;
  const hasMemory = narrative?.hasMemory || identity?.dataReady || (similar && similar.length > 0);

  const hasSummary = hasStrengthDays || hasRecoveryDays || reliablePatterns.length > 0 || dominantFactor || hasCapacity;
  if (!hasSummary && !hasPersonalization && !hasResponse && !hasMemory && memoryItems.length === 0) return null;

  const hasDetails = hasPersonalization || hasResponse || hasMemory || memoryItems.length > 0;

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-card">
      <div className="px-5 pt-5 pb-3 border-b border-surface-hover">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-ink">What Axis Has Learned</h2>
          {personalizationProgress && (
            <span className={`text-[11px] font-semibold ${TIER_COLOR[personalizationProgress.tier] ?? "text-ink-muted"}`}>{personalizationProgress.tier}</span>
          )}
        </div>
        <p className="text-[11px] text-ink-muted mt-0.5">What does Axis know about me?</p>
      </div>

      <div className="px-5 py-4 space-y-3">
        {hasStrengthDays && fingerprint && (
          <div>
            <p className="text-[10px] text-ink-muted uppercase tracking-wide">Peak performance window</p>
            <p className="text-[13px] text-ink">{cycleOrdinal(fingerprint.bestStrengthDays)} of your cycle</p>
          </div>
        )}
        {hasRecoveryDays && fingerprint && (
          <div>
            <p className="text-[10px] text-ink-muted uppercase tracking-wide">Lower readiness window</p>
            <p className="text-[13px] text-ink">{cycleOrdinal(fingerprint.worstRecoveryDays)} of your cycle</p>
          </div>
        )}
        {dominantFactor && (
          <div>
            <p className="text-[10px] text-ink-muted uppercase tracking-wide">Strongest readiness signal</p>
            <p className="text-[13px] text-ink capitalize">{dominantFactor}</p>
          </div>
        )}
        {reliablePatterns.length > 0 && (
          <div>
            <p className="text-[10px] text-ink-muted uppercase tracking-wide mb-1">Consistent symptom patterns</p>
            {reliablePatterns.map(p => (
              <p key={p.patternId} className="text-[13px] text-ink">{p.symptomName} <span className="text-ink-muted text-[11px]">· {p.phase.replace(" Phase", "")}</span></p>
            ))}
          </div>
        )}
        {hasCapacity && recoveryCapacity && (
          <div>
            <p className="text-[10px] text-ink-muted uppercase tracking-wide">Recovery capacity</p>
            <p className="text-[13px] text-ink">{CAPACITY_LABEL[recoveryCapacity.level] ?? recoveryCapacity.level}</p>
            <p className="text-[11px] text-ink-muted">{recoveryCapacity.confidence === "established" ? "Established" : "Growing"} pattern · {recoveryCapacity.dataPoints} sessions tracked</p>
          </div>
        )}
        {!hasSummary && (
          <p className="text-[12px] text-ink-muted leading-relaxed">Axis is collecting data to personalize your recommendations. Check back after a few weeks of check-ins and workouts.</p>
        )}
      </div>

      {hasDetails && (
        <button
          type="button"
          onClick={() => setShowDetails(v => !v)}
          className="w-full flex items-center justify-between px-5 py-2.5 bg-surface-raised border-t border-border hover:bg-surface-hover transition-colors min-h-[44px]"
          aria-expanded={showDetails}
        >
          <span className="text-[12px] font-semibold text-brand">{showDetails ? "Hide details" : "Full learning profile"}</span>
          <AxisIcon name="chevron-down" size={14} strokeWidth={1.5} className={`text-ink-muted transition-transform ${showDetails ? "rotate-180" : ""}`} />
        </button>
      )}

      {showDetails && (
        <div className="px-5 py-4 space-y-0 border-t border-border">
          {hasResponse && (
            <div>
              <SectionLabel>How your body responds</SectionLabel>
              {physiologyConf?.summary && (
                <p className="text-[11px] text-ink-muted leading-relaxed mb-2">{physiologyConf.summary}</p>
              )}
              {phaseResponse?.dataReady && (phaseResponse.bestPhase || phaseResponse.worstPhase) && (
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {phaseResponse.bestPhase && (
                    <div className="bg-success-bg border border-success-border rounded-xl p-2.5 text-center">
                      <div className="text-[9px] text-ink-muted mb-0.5">Peak phase</div>
                      <div className="text-[11px] font-semibold text-success-text">{phaseResponse.bestPhase}</div>
                    </div>
                  )}
                  {phaseResponse.worstPhase && (
                    <div className="bg-danger-bg border border-danger-border rounded-xl p-2.5 text-center">
                      <div className="text-[9px] text-ink-muted mb-0.5">Recovery phase</div>
                      <div className="text-[11px] font-semibold text-danger">{phaseResponse.worstPhase}</div>
                    </div>
                  )}
                </div>
              )}
              {symptomImpact?.dataReady && symptomImpact.impacts.length > 0 && (
                <div className="space-y-1 mb-2">
                  {symptomImpact.impacts.slice(0, 3).map(s => (
                    <div key={s.symptomId} className="flex items-center justify-between">
                      <span className="text-[11px] text-ink-secondary capitalize">{s.symptomId.replace(/_/g, " ")}</span>
                      <span className={`text-[11px] font-semibold ${s.impactLevel === "significant" ? "text-danger" : s.impactLevel === "moderate" ? "text-caution" : "text-ink-muted"}`}>{s.impactLevel}</span>
                    </div>
                  ))}
                </div>
              )}
              {recoveryModel?.dataReady && <p className="text-[11px] text-ink-muted">{recoveryModel.insight}</p>}
            </div>
          )}

          {hasPersonalization && personalizationProgress && (
            <>
              {hasResponse && <Divider />}
              <div>
                <SectionLabel>Personalization progress</SectionLabel>
                <div className="space-y-2">
                  {([
                    { label: "Cycle timing", value: personalizationProgress.cycleLearning },
                    { label: "Readiness calibration", value: personalizationProgress.readinessLearning },
                    { label: "Recovery response", value: personalizationProgress.recoveryLearning },
                    { label: "Symptom patterns", value: personalizationProgress.symptomLearning },
                  ]).map(({ label, value }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-[11px] text-ink-secondary w-32 flex-shrink-0">{label}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-surface-hover overflow-hidden">
                        <div className={`h-full rounded-full ${value >= 70 ? "bg-success" : value >= 30 ? "bg-caution" : "bg-ink-faint"}`} style={{ width: `${value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {memoryItems.length > 0 && (
            <>
              {(hasResponse || hasPersonalization) && <Divider />}
              <div>
                <SectionLabel>Observations</SectionLabel>
                {memoryItems.slice(0, 6).map((item, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-surface-hover last:border-0">
                    <span className="text-brand text-[13px] flex-shrink-0 mt-0.5">{CATEGORY_ICON[item.category]}</span>
                    <p className="text-[12px] text-ink leading-relaxed flex-1">{item.observation}</p>
                    <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${MEM_CONFIDENCE_CHIP[item.confidence]}`}>{MEM_CONFIDENCE_LABEL[item.confidence]}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {hasMemory && (
            <>
              {(hasResponse || hasPersonalization || memoryItems.length > 0) && <Divider />}
              <div>
                <SectionLabel>Coaching memory</SectionLabel>
                {narrative?.headline && <p className="text-[12px] text-ink-secondary leading-relaxed mb-2">{narrative.headline}</p>}
                {similar && similar.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {similar.slice(0, 3).map(s => (
                      <div key={s.entry.id} className="flex items-center justify-between bg-surface-hover rounded-xl px-3 py-2">
                        <div className="text-[10px] font-semibold text-ink-secondary">{s.entry.context.cyclePhase}</div>
                        <div className="text-[9px] text-ink-faint">{s.daysAgo}d ago</div>
                      </div>
                    ))}
                  </div>
                )}
                {identity?.dataReady && identity.traits.length > 0 && (
                  <p className="text-[11px] text-ink-muted leading-relaxed">{identity.successSummary}</p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
