"use client";

// ─── components/dashboard/CapacityHubCard.tsx ─────────────────────────────────
// Dashboard 2.0 — Layer 4. Merges CapacityCard (anchor — more complete: ring +
// pillars + forecast) and ExecutiveSummaryCard — confirmed duplicate
// (identical CapacityScore/MomentumScore types). ExecutiveSummaryCard's
// unique top-3 unified-insights list survives as a section.
//
// Fixes a real bug found while reading the source: the capacity ring used
// fill="white"/rgba(255,255,255,...) assuming a dark background, on a card
// with a white background — the score number was invisible.
// See docs/ux/UXStabilizationAudit.md Batch 18.

import { useState } from "react";
import type { CapacityScore }       from "@/lib/unified/capacityScore";
import type { MomentumScore }       from "@/lib/unified/momentumScore";
import type { CapacityForecast }    from "@/lib/unified/capacityForecast";
import type { LifeBalanceReport }   from "@/lib/unified/lifeBalanceDetection";
import type { RecoverySufficiency } from "@/lib/unified/recoverySufficiency";
import type { TrajectoryScore }     from "@/lib/unified/trajectoryEngine";
import type { UnifiedInsight }      from "@/lib/unified/unifiedInsightsFeed";
import { color as tokenColor } from "@/lib/design/tokens";
import { AxisIcon } from "@/components/ui/Icon";

const SUFFICIENCY_BOX: Record<string, string> = {
  over_trained: "bg-danger-bg border-danger-border text-danger", strained: "bg-caution-bg border-caution-border text-caution",
  balanced: "bg-success-bg border-success-border text-success-text", under_engaged: "bg-info-bg border-info-border text-info",
};
const TIER_RING: Record<string, string> = {
  peak: tokenColor.success, ready: tokenColor.info, moderate: tokenColor.caution, limited: tokenColor.nutrition, rest: tokenColor.danger,
};
const TIER_TEXT: Record<string, string> = { peak: "text-success", ready: "text-info", moderate: "text-caution", limited: "text-nutrition", rest: "text-danger" };
const PILLAR_BAR = (score: number) => score >= 75 ? "bg-success" : score >= 55 ? "bg-info" : score >= 35 ? "bg-caution" : "bg-danger";
const MOMENTUM_ICON: Record<string, string> = { building: "↑", stable: "→", fading: "↓", insufficient: "—" };
const MOMENTUM_COLOR: Record<string, string> = { building: "text-success", stable: "text-info", fading: "text-danger", insufficient: "text-ink-faint" };
const PRIORITY_DOT: Record<string, string> = { critical: "bg-danger", high: "bg-caution", medium: "bg-info", low: "bg-success" };

interface CapacityHubCardProps {
  capacity?:    CapacityScore;
  momentum?:    MomentumScore;
  forecast?:    CapacityForecast;
  balance?:     LifeBalanceReport;
  sufficiency?: RecoverySufficiency;
  trajectory?:  TrajectoryScore;
  insights?:    UnifiedInsight[];
}

export function CapacityHubCard({ capacity, momentum, forecast, balance, sufficiency, trajectory, insights }: CapacityHubCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  if (!capacity) return null;

  const CIRCUMFERENCE = 2 * Math.PI * 36;
  const dashOffset = CIRCUMFERENCE * (1 - capacity.score / 100);
  const ringColor = TIER_RING[capacity.tier] ?? tokenColor.inkFaint;
  const textColor = TIER_TEXT[capacity.tier] ?? "text-ink";

  const hasDetails = !!(forecast?.dataReady || balance || sufficiency?.dataReady || (insights && insights.length > 0));

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-card">
      <div className="px-5 pt-5 pb-3 border-b border-surface-hover">
        <h2 className="text-[15px] font-semibold text-ink">Capacity</h2>
        <p className="text-[11px] text-ink-muted mt-0.5">What&apos;s my overall training capacity right now?</p>
      </div>

      <div className="px-5 py-4">
        <div className="flex items-center gap-5">
          <svg width="88" height="88" viewBox="0 0 88 88">
            <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="8" />
            <circle cx="44" cy="44" r="36" fill="none" stroke={ringColor} strokeWidth="8"
              strokeDasharray={CIRCUMFERENCE} strokeDashoffset={dashOffset} strokeLinecap="round" transform="rotate(-90 44 44)" />
            <text x="44" y="44" textAnchor="middle" dominantBaseline="central" fill={tokenColor.ink} fontSize="18" fontWeight="700">{capacity.score}</text>
          </svg>
          <div className="flex-1 space-y-1">
            <div className={`text-[15px] font-semibold capitalize ${textColor}`}>{capacity.tier.replace("_", " ")}</div>
            <p className="text-[11px] text-ink-muted leading-relaxed">{capacity.headline}</p>
            {momentum?.dataReady && (
              <div className="flex items-center gap-1.5 pt-1">
                <span className={`text-[13px] font-semibold ${MOMENTUM_COLOR[momentum.direction] ?? "text-ink-faint"}`}>{MOMENTUM_ICON[momentum.direction]}</span>
                <span className="text-[10px] text-ink-muted">{momentum.description}</span>
              </div>
            )}
            {trajectory?.dataReady && (
              <div className="text-[10px] text-ink-muted">
                Goal trajectory: <span className="font-medium text-ink-secondary">
                  {trajectory.status === "ahead_of_pace" ? "Ahead" : trajectory.status === "on_pace" ? "On track" : trajectory.status === "slightly_behind" ? "Behind" : "Off pace"}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2 mt-4">
          {([
            { label: "Readiness", value: capacity.components.readiness },
            { label: "Recovery", value: capacity.components.recovery },
            { label: "Fatigue", value: capacity.components.fatigue },
            { label: "Lifestyle", value: capacity.components.lifestyle },
          ]).map(({ label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-[10px] text-ink-muted w-16 flex-shrink-0">{label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-surface-hover">
                <div className={`h-1.5 rounded-full ${PILLAR_BAR(value)}`} style={{ width: `${value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {hasDetails && (
        <button
          type="button"
          onClick={() => setShowDetails(v => !v)}
          className="w-full flex items-center justify-between px-5 py-2.5 bg-surface-raised border-t border-border hover:bg-surface-hover transition-colors min-h-[44px] focus-ring"
          aria-expanded={showDetails}
        >
          <span className="text-[12px] font-semibold text-brand">{showDetails ? "Hide details" : "Forecast & priority insights"}</span>
          <AxisIcon name="chevron-down" size={14} strokeWidth={1.5} className={`text-ink-muted transition-transform ${showDetails ? "rotate-180" : ""}`} />
        </button>
      )}

      {showDetails && (
        <div className="px-5 py-4 space-y-0 border-t border-border">
          {forecast?.dataReady && (
            <div className="grid grid-cols-2 gap-2">
              {[forecast.day3, forecast.day7].map(d => (
                <div key={d.daysAhead} className="bg-surface-hover rounded-xl py-2.5 px-2 text-center">
                  <div className="text-[13px] font-semibold text-ink">{d.projected}</div>
                  <div className="text-[9px] text-ink-faint mt-0.5">{d.daysAhead === 3 ? "3-day" : "7-day"} forecast</div>
                </div>
              ))}
            </div>
          )}

          {balance && !balance.isBalanced && balance.weakestPillar && (
            <div className="bg-caution-bg border border-caution-border rounded-xl px-3 py-2 mt-3">
              <div className="text-[10px] text-caution font-semibold">{balance.message}</div>
            </div>
          )}

          {sufficiency?.dataReady && (
            <div className={`border rounded-xl px-3 py-2 mt-3 ${SUFFICIENCY_BOX[sufficiency.status] ?? "bg-surface-hover border-border text-ink-muted"}`}>
              <div className="text-[10px] font-semibold capitalize">Recovery: {sufficiency.status.replace("_", " ")}</div>
              <div className="text-[9px] opacity-70 mt-0.5">{sufficiency.recommendation}</div>
            </div>
          )}

          {insights && insights.length > 0 && (
            <div className="mt-3 pt-3 border-t border-surface-hover space-y-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">Priority insights</p>
              {insights.slice(0, 3).map(insight => (
                <div key={insight.id} className="flex gap-2.5 items-start">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_DOT[insight.priority] ?? "bg-border"}`} />
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-semibold text-ink">{insight.headline}</div>
                    <div className="text-[10px] text-ink-muted leading-relaxed">{insight.action}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
