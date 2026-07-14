"use client";

import type { EquipmentCapabilityProfile } from "@/lib/equipment/equipmentProfile";
import type { EquipmentUsageAnalytics } from "@/lib/equipment/equipmentUsage";

interface Props {
  profile:        EquipmentCapabilityProfile;
  usageAnalytics?: EquipmentUsageAnalytics;
}

function PotentialBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] text-ink-secondary">{label}</span>
        <span className="text-[12px] font-semibold text-ink">{score}%</span>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export function EquipmentInsightsCard({ profile, usageAnalytics }: Props) {
  const {
    capabilityScore,
    unlockedCount,
    totalExercises,
    strengthScore,
    hypertrophyScore,
    explosiveScore,
    missingHighValue,
  } = profile;

  const scoreColor =
    capabilityScore >= 80 ? "text-success" :
    capabilityScore >= 60 ? "text-brand" :
    capabilityScore >= 40 ? "text-nutrition" :
    "text-ink-secondary";

  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-surface-hover">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted mb-1">
          Equipment Setup
        </div>
        <div className="flex items-end gap-3">
          <span className={`text-[40px] font-bold leading-none tracking-tight ${scoreColor}`}>
            {capabilityScore}
          </span>
          <div className="pb-1">
            <div className="text-[13px] font-semibold text-ink leading-tight">Setup score</div>
            <div className="text-[12px] text-ink-muted">{unlockedCount} of {totalExercises} exercises available</div>
          </div>
        </div>
      </div>

      {/* Potential bars */}
      <div className="px-5 py-4 border-b border-surface-hover space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted mb-3">
          Training Potential
        </div>
        <PotentialBar label="Strength"      score={strengthScore}    color="bg-brand" />
        <PotentialBar label="Hypertrophy"   score={hypertrophyScore} color="bg-success" />
        <PotentialBar label="Power / Explosive" score={explosiveScore}  color="bg-nutrition" />
      </div>

      {/* Missing high-value items */}
      {missingHighValue.length > 0 && (
        <div className="px-5 py-4">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted mb-3">
            High-Value Additions
          </div>
          <div className="space-y-2.5">
            {missingHighValue.map(({ item, unlocksCount }) => (
              <div key={item.id} className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-medium text-ink">{item.name}</div>
                  <div className="text-[11px] text-ink-muted">unlocks {unlocksCount} exercise{unlocksCount !== 1 ? "s" : ""}</div>
                </div>
                <div className="text-[11px] font-semibold text-brand bg-brand-bg px-2 py-1 rounded-lg">
                  +{unlocksCount}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage analytics */}
      {usageAnalytics && usageAnalytics.mostUsed.length > 0 && (
        <div className="px-5 py-4 border-t border-surface-hover">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted mb-3">
            Equipment Usage
          </div>
          <div className="space-y-2">
            {usageAnalytics.mostUsed.slice(0, 3).map(item => (
              <div key={item.equipmentName} className="flex items-center justify-between">
                <span className="text-[12px] text-ink-secondary">{item.equipmentName}</span>
                <span className="text-[11px] font-semibold text-brand">
                  {item.usageCount}×
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unused / underused recommendations */}
      {usageAnalytics && usageAnalytics.recommendations.length > 0 && (
        <div className="px-5 py-4 bg-canvas border-t border-surface-hover">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-ink-muted mb-2">
            Equipment Insights
          </div>
          <div className="space-y-1.5">
            {usageAnalytics.recommendations.map((rec, i) => (
              <p key={i} className="text-[12px] text-ink-secondary leading-relaxed">{rec}</p>
            ))}
          </div>
        </div>
      )}

      {capabilityScore === 100 && (
        <div className="px-5 py-3 bg-success-bg border-t border-success-border">
          <p className="text-[12px] text-success font-medium">Full library access — all exercises available.</p>
        </div>
      )}
    </div>
  );
}
