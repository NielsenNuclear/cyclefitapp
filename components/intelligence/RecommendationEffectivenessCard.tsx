"use client";

import type { RecommendationProfile } from "@/lib/intelligence/effectiveness/recommendationProfile";
import { REC_TYPE_LABELS }            from "@/lib/intelligence/effectiveness/recommendationProfile";

interface Props {
  profile?: RecommendationProfile;
}

const TREND_ICONS = {
  improving: "↑",
  stable:    "→",
  declining: "↓",
};

const TREND_COLORS = {
  improving: "text-[#0F6E56]",
  stable:    "text-[#9B9690]",
  declining: "text-[#C0392B]",
};

function EffectivenessBar({ score }: { score: number }) {
  const pct   = Math.round(score * 100);
  const color = pct >= 75 ? "bg-[#0F6E56]" : pct >= 50 ? "bg-[#854F0B]" : "bg-[#C0392B]";
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-[3px] bg-black/8 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[12px] font-mono text-[#1C1B18] w-7 text-right">{pct}%</span>
    </div>
  );
}

export function RecommendationEffectivenessCard({ profile }: Props) {
  if (!profile?.dataReady) return null;

  const activeTypes = profile.byType.filter(t => t.sampleSize >= 1);
  const overallPct  = Math.round(profile.overallEffectiveness * 100);

  const overallColor =
    overallPct >= 75 ? "text-[#0F6E56]"
    : overallPct >= 55 ? "text-[#854F0B]"
    : "text-[#C0392B]";

  return (
    <div className="bg-white rounded-2xl border border-[#EAE7DE] p-4 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-[#1C1B18]">Did it help?</h3>
        <span className={`text-[12px] font-semibold font-mono ${overallColor}`}>
          {overallPct}% effective
        </span>
      </div>

      {/* Per-type breakdown */}
      <div className="space-y-2.5">
        {activeTypes.map(t => {
          const label    = REC_TYPE_LABELS[t.recommendationType];
          const helpRate = t.sampleSize > 0
            ? Math.round(t.helpfulCount / t.sampleSize * 100) : 0;
          const rateColor =
            helpRate >= 75 ? "text-[#0F6E56]"
            : helpRate >= 50 ? "text-[#854F0B]"
            : "text-[#C0392B]";
          return (
            <div key={t.recommendationType} className="flex items-center gap-3">
              <div className="flex items-center gap-1 w-36 flex-shrink-0">
                <span className="text-[12px] text-[#6B6860] truncate">{label}</span>
                <span className={`text-[12px] ${TREND_COLORS[t.trend]} flex-shrink-0`}>
                  {TREND_ICONS[t.trend]}
                </span>
              </div>
              <EffectivenessBar score={t.averageScore} />
              <span className={`text-[11px] w-14 text-right flex-shrink-0 ${rateColor}`}>
                {helpRate}% helped
              </span>
            </div>
          );
        })}
      </div>

      {/* Highlights */}
      {(profile.mostEffective || profile.leastEffective) && (
        <div className="pt-2 border-t border-black/6 space-y-1">
          {profile.mostEffective && (
            <p className="text-[12px] text-[#6B6860]">
              <span className="text-[#0F6E56] font-medium">Most effective:</span>{" "}
              {REC_TYPE_LABELS[profile.mostEffective]}
            </p>
          )}
          {profile.leastEffective && profile.leastEffective !== profile.mostEffective && (
            <p className="text-[12px] text-[#6B6860]">
              <span className="text-[#854F0B] font-medium">Building confidence:</span>{" "}
              {REC_TYPE_LABELS[profile.leastEffective]}
            </p>
          )}
        </div>
      )}

      {/* Total evaluated */}
      <p className="text-[11px] text-[#C8C5BC]">
        Based on {profile.totalEvaluated} evaluated recommendation{profile.totalEvaluated !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
