"use client";

// ─── components/dashboard/OutcomeIntelligenceHubCard.tsx ──────────────────────
// Dashboard 2.0 — Layer 4. Merges OutcomeIntelligenceCard (anchor — bottleneck
// framing) and OutcomeOptimizationCard — confirmed duplicate leverage-point
// box (identical LeveragePoint data). "Where you stand" (score, components)
// survives as a section; the leverage-point box renders once.
// See docs/ux/UXStabilizationAudit.md Batch 18.

import { useState } from "react";
import type { GoalSuccessModel }     from "@/lib/outcomes/goalSuccessModel";
import type { BehaviorImpactReport } from "@/lib/outcomes/behaviorImpactRanking";
import type { BottleneckReport }     from "@/lib/outcomes/bottleneckDetection";
import type { LeveragePoint }        from "@/lib/outcomes/leveragePointEngine";
import type { CompletionForecast }   from "@/lib/outcomes/completionForecast";
import type { OutcomeScorecard }     from "@/lib/outcomes/outcomeScorecard";
import type { SuccessPatternReport } from "@/lib/outcomes/successPatternDetection";
import { AxisIcon } from "@/components/ui/Icon";

const TIER_COLOR: Record<string, string> = { accelerating: "text-success", on_track: "text-info", stalled: "text-caution", declining: "text-danger" };
const SEVERITY_DOT: Record<string, string> = { severe: "bg-danger", moderate: "bg-caution", mild: "bg-info" };
const PRIORITY_BOX: Record<string, string> = {
  critical: "bg-danger-bg border-danger-border text-danger", high: "bg-caution-bg border-caution-border text-caution-text", moderate: "bg-info-bg border-info-border text-info",
};
function Divider() { return <div className="border-t border-surface-hover my-4" />; }
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-2">{children}</p>;
}

interface OutcomeIntelligenceHubCardProps {
  successModel?:   GoalSuccessModel;
  behaviorImpact?: BehaviorImpactReport;
  bottlenecks?:    BottleneckReport;
  leveragePoint?:  LeveragePoint;
  forecast?:       CompletionForecast;
  scorecard?:      OutcomeScorecard;
  successPatterns?: SuccessPatternReport;
}

export function OutcomeIntelligenceHubCard({
  successModel, behaviorImpact, bottlenecks, leveragePoint, forecast, scorecard, successPatterns,
}: OutcomeIntelligenceHubCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const hasContent = successModel?.dataReady || bottlenecks?.dataReady || forecast?.dataReady || scorecard;
  if (!hasContent) return null;

  const tierColor = TIER_COLOR[successModel?.currentTier ?? ""] ?? "text-ink-muted";
  const hasAcceleration = (scorecard?.accelerationTips?.length ?? 0) > 0;
  const hasBottleneckList = (bottlenecks?.allBottlenecks?.length ?? 0) > 1;
  const hasSuccessPatterns = !!successPatterns?.dataReady && successPatterns.patterns.length > 0;
  const hasDetails = !!scorecard || hasBottleneckList || hasSuccessPatterns || hasAcceleration;

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-card">
      <div className="px-5 pt-5 pb-3 border-b border-surface-hover">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-ink">Outcome Intelligence</h2>
          {successModel?.dataReady && <span className={`text-[11px] font-semibold capitalize ${tierColor}`}>{successModel.currentTier.replace("_", " ")}</span>}
        </div>
        <p className="text-[11px] text-ink-muted mt-0.5">Am I on track to reach my goal?</p>
      </div>

      <div className="px-5 py-4">
        {scorecard && <p className="text-[12px] text-ink-secondary leading-relaxed mb-3">{scorecard.headline}</p>}

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-surface-hover rounded-xl px-3 py-2.5">
            <div className="text-[9px] text-ink-faint uppercase tracking-widest mb-1">Top predictor</div>
            <div className="text-[11px] font-semibold text-ink">{behaviorImpact?.behaviors[0]?.label ?? "—"}</div>
          </div>
          <div className="bg-surface-hover rounded-xl px-3 py-2.5">
            <div className="text-[9px] text-ink-faint uppercase tracking-widest mb-1">Primary bottleneck</div>
            <div className="text-[11px] font-semibold text-ink">{bottlenecks?.primaryBottleneck?.label ?? (bottlenecks?.dataReady ? "None detected" : "—")}</div>
            {bottlenecks?.primaryBottleneck && (
              <div className="flex items-center gap-1 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOT[bottlenecks.primaryBottleneck.severity]}`} />
                <span className="text-[9px] text-ink-muted">{bottlenecks.primaryBottleneck.severity}</span>
              </div>
            )}
          </div>
        </div>

        {leveragePoint && (
          <div className={`border rounded-xl px-3 py-2.5 space-y-1 mt-3 ${PRIORITY_BOX[leveragePoint.priority] ?? "bg-surface-hover border-border text-ink-secondary"}`}>
            <div className="text-[9px] font-semibold uppercase tracking-widest opacity-70">Best leverage point</div>
            <div className="text-[12px] font-semibold text-ink">{leveragePoint.label}</div>
            <div className="text-[10px] opacity-80">{leveragePoint.actionableAdvice}</div>
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
          <span className="text-[12px] font-semibold text-brand">{showDetails ? "Hide details" : "Where you stand"}</span>
          <AxisIcon name="chevron-down" size={14} strokeWidth={1.5} className={`text-ink-muted transition-transform ${showDetails ? "rotate-180" : ""}`} />
        </button>
      )}

      {showDetails && (
        <div className="px-5 py-4 space-y-0 border-t border-border">
          {scorecard && (
            <div>
              <SectionLabel>Outcome score</SectionLabel>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {([
                  { label: "Velocity", value: scorecard.velocityScore },
                  { label: "Compliance", value: scorecard.complianceScore },
                  { label: "Momentum", value: scorecard.momentumScore },
                ]).map(({ label, value }) => (
                  <div key={label} className="bg-surface-hover rounded-xl py-2 px-1 text-center">
                    <div className="text-[13px] font-semibold text-ink">{value}</div>
                    <div className="text-[9px] text-ink-faint mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bottlenecks?.allBottlenecks && bottlenecks.allBottlenecks.length > 1 && (
            <>
              <Divider />
              <div>
                <SectionLabel>All constraints</SectionLabel>
                {bottlenecks.allBottlenecks.map(b => (
                  <div key={b.category} className="flex items-center gap-2.5 py-1">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${SEVERITY_DOT[b.severity]}`} />
                    <div className="flex-1 text-[11px] text-ink-secondary">{b.label}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {successPatterns?.dataReady && successPatterns.patterns.length > 0 && (
            <>
              <Divider />
              <div>
                <SectionLabel>Your success patterns</SectionLabel>
                {successPatterns.patterns.slice(0, 2).map((p, i) => (
                  <div key={i} className="flex gap-2 items-start mb-1">
                    <span className="text-success text-[9px] mt-0.5">✓</span>
                    <span className="text-[11px] text-ink-muted">{p.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {hasAcceleration && scorecard && (
            <>
              <Divider />
              <div>
                <SectionLabel>Acceleration</SectionLabel>
                {scorecard.accelerationTips.slice(0, 2).map((t, i) => (
                  <div key={i} className="flex gap-2 items-start mb-1">
                    <span className="text-info text-[9px] mt-0.5">→</span>
                    <span className="text-[11px] text-ink-muted">{t}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {forecast?.dataReady && (
            <>
              <Divider />
              <div>
                <SectionLabel>Goal completion forecast</SectionLabel>
                <div className="grid grid-cols-3 gap-1.5">
                  {forecast.periods.map(p => (
                    <div key={p.days} className="bg-surface-hover rounded-xl py-2 px-1 text-center">
                      <div className="text-[11px] font-bold text-ink capitalize">{p.confidence}</div>
                      <div className="text-[9px] text-ink-faint mt-0.5">{p.label}</div>
                    </div>
                  ))}
                </div>
                {forecast.projectedEtaWeeks !== null && (
                  <div className="text-[10px] text-ink-muted text-center mt-1.5">Current velocity → goal in ~{forecast.projectedEtaWeeks}w</div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
