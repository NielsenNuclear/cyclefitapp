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
        <span className="text-[12px] text-[#6B6860]">{label}</span>
        <span className="text-[12px] font-semibold text-[#1C1B18]">{score}%</span>
      </div>
      <div className="h-1.5 bg-[#EAE7DE] rounded-full overflow-hidden">
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
    capabilityScore >= 80 ? "text-[#16754B]" :
    capabilityScore >= 60 ? "text-[#534AB7]" :
    capabilityScore >= 40 ? "text-[#B25E1B]" :
    "text-[#6B6860]";

  return (
    <div className="bg-white border border-[#E5E2DA] rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-[#F0EDE7]">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A8880] mb-1">
          Equipment Setup
        </div>
        <div className="flex items-end gap-3">
          <span className={`text-[40px] font-bold leading-none tracking-tight ${scoreColor}`}>
            {capabilityScore}
          </span>
          <div className="pb-1">
            <div className="text-[13px] font-semibold text-[#1C1B18] leading-tight">Setup score</div>
            <div className="text-[12px] text-[#8A8880]">{unlockedCount} of {totalExercises} exercises available</div>
          </div>
        </div>
      </div>

      {/* Potential bars */}
      <div className="px-5 py-4 border-b border-[#F0EDE7] space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A8880] mb-3">
          Training Potential
        </div>
        <PotentialBar label="Strength"      score={strengthScore}    color="bg-[#534AB7]" />
        <PotentialBar label="Hypertrophy"   score={hypertrophyScore} color="bg-[#16754B]" />
        <PotentialBar label="Power / Explosive" score={explosiveScore}  color="bg-[#B25E1B]" />
      </div>

      {/* Missing high-value items */}
      {missingHighValue.length > 0 && (
        <div className="px-5 py-4">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A8880] mb-3">
            High-Value Additions
          </div>
          <div className="space-y-2.5">
            {missingHighValue.map(({ item, unlocksCount }) => (
              <div key={item.id} className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-medium text-[#1C1B18]">{item.name}</div>
                  <div className="text-[11px] text-[#8A8880]">unlocks {unlocksCount} exercise{unlocksCount !== 1 ? "s" : ""}</div>
                </div>
                <div className="text-[11px] font-semibold text-[#534AB7] bg-[#F0EEF8] px-2 py-1 rounded-lg">
                  +{unlocksCount}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage analytics */}
      {usageAnalytics && usageAnalytics.mostUsed.length > 0 && (
        <div className="px-5 py-4 border-t border-[#F0EDE7]">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A8880] mb-3">
            Equipment Usage
          </div>
          <div className="space-y-2">
            {usageAnalytics.mostUsed.slice(0, 3).map(item => (
              <div key={item.equipmentName} className="flex items-center justify-between">
                <span className="text-[12px] text-[#3C3B38]">{item.equipmentName}</span>
                <span className="text-[11px] font-semibold text-[#534AB7]">
                  {item.usageCount}×
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unused / underused recommendations */}
      {usageAnalytics && usageAnalytics.recommendations.length > 0 && (
        <div className="px-5 py-4 bg-[#FAFAF7] border-t border-[#F0EDE7]">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A8880] mb-2">
            Equipment Insights
          </div>
          <div className="space-y-1.5">
            {usageAnalytics.recommendations.map((rec, i) => (
              <p key={i} className="text-[12px] text-[#5C5850] leading-relaxed">{rec}</p>
            ))}
          </div>
        </div>
      )}

      {capabilityScore === 100 && (
        <div className="px-5 py-3 bg-[#F0FAF5] border-t border-[#D1EDE0]">
          <p className="text-[12px] text-[#16754B] font-medium">Full library access — all exercises available.</p>
        </div>
      )}
    </div>
  );
}
