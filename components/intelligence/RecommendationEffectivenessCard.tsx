"use client";

import type { RecommendationProfile } from "@/lib/intelligence/effectiveness/recommendationProfile";
import { REC_TYPE_LABELS }            from "@/lib/intelligence/effectiveness/recommendationProfile";

interface Props {
  profile?: RecommendationProfile;
}

const OUTCOME_COLORS = {
  helpful: "text-emerald-400",
  neutral: "text-amber-400",
  harmful: "text-rose-400",
};

const TREND_ICONS = {
  improving: "↑",
  stable:    "→",
  declining: "↓",
};

const TREND_COLORS = {
  improving: "text-emerald-400",
  stable:    "text-slate-500",
  declining: "text-rose-400",
};

function EffectivenessBar({ score, sampleSize }: { score: number; sampleSize: number }) {
  const pct   = Math.round(score * 100);
  const color = pct >= 75 ? "bg-emerald-500/60" : pct >= 50 ? "bg-amber-500/60" : "bg-rose-500/60";
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-slate-300 w-7 text-right">{pct}%</span>
      <span className="text-xs text-slate-600 w-8 text-right">n={sampleSize}</span>
    </div>
  );
}

export function RecommendationEffectivenessCard({ profile }: Props) {
  if (!profile?.dataReady) return null;

  const activeTypes = profile.byType.filter(t => t.sampleSize >= 1);
  const overallPct  = Math.round(profile.overallEffectiveness * 100);

  return (
    <div className="bg-slate-800/60 rounded-2xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Did it help?</h3>
        <span className={`text-xs font-semibold font-mono ${
          overallPct >= 75 ? "text-emerald-400" : overallPct >= 55 ? "text-amber-400" : "text-rose-400"
        }`}>
          {overallPct}% effective
        </span>
      </div>

      {/* Per-type breakdown */}
      <div className="space-y-2.5">
        {activeTypes.map(t => {
          const label = REC_TYPE_LABELS[t.recommendationType];
          const helpRate = t.sampleSize > 0
            ? Math.round(t.helpfulCount / t.sampleSize * 100) : 0;
          return (
            <div key={t.recommendationType} className="flex items-center gap-3">
              <div className="flex items-center gap-1 w-36 flex-shrink-0">
                <span className="text-xs text-slate-400 truncate">{label}</span>
                <span className={`text-xs ${TREND_COLORS[t.trend]} flex-shrink-0`}>
                  {TREND_ICONS[t.trend]}
                </span>
              </div>
              <EffectivenessBar score={t.averageScore} sampleSize={t.sampleSize} />
              <span className={`text-xs w-14 text-right flex-shrink-0 ${
                helpRate >= 75 ? "text-emerald-400" : helpRate >= 50 ? "text-amber-400" : "text-rose-400"
              }`}>
                {helpRate}% helped
              </span>
            </div>
          );
        })}
      </div>

      {/* Highlights */}
      {(profile.mostEffective || profile.leastEffective) && (
        <div className="pt-2 border-t border-slate-700/40 space-y-1">
          {profile.mostEffective && (
            <p className="text-xs text-slate-400">
              <span className="text-emerald-400">Most effective:</span>{" "}
              {REC_TYPE_LABELS[profile.mostEffective]}
            </p>
          )}
          {profile.leastEffective && profile.leastEffective !== profile.mostEffective && (
            <p className="text-xs text-slate-400">
              <span className="text-amber-400">Building confidence:</span>{" "}
              {REC_TYPE_LABELS[profile.leastEffective]}
            </p>
          )}
        </div>
      )}

      {/* Total evaluated */}
      <p className="text-xs text-slate-600">
        Based on {profile.totalEvaluated} evaluated recommendation{profile.totalEvaluated !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
