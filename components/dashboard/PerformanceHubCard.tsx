"use client";

import type { TrainingQualityScore }   from "@/lib/performance/trainingQuality";
import type { PlateauReport }          from "@/lib/performance/plateauDetection";
import type { PersonalBestSet }        from "@/lib/performance/personalBests";
import type { GoalVelocity }           from "@/lib/performance/goalVelocity";
import type { GoalAdjustmentAdvice }   from "@/lib/performance/goalAdjustment";
import type { PerformancePredictors }  from "@/lib/performance/performancePredictors";

interface Props {
  quality:     TrainingQualityScore   | undefined;
  plateaus:    PlateauReport          | undefined;
  personalBests: PersonalBestSet[]    | undefined;
  velocity:    GoalVelocity           | undefined;
  adjustments: GoalAdjustmentAdvice   | undefined;
  predictors:  PerformancePredictors  | undefined;
}

const QUALITY_COLOR: Record<string, string> = {
  Excellent: "text-[#0F6E56]",
  Good:      "text-[#1B4FA0]",
  Fair:      "text-[#854F0B]",
  Poor:      "text-[#C0392B]",
};

const QUALITY_BG: Record<string, string> = {
  Excellent: "bg-emerald-500",
  Good:      "bg-sky-500",
  Fair:      "bg-amber-500",
  Poor:      "bg-rose-500",
};

const URGENCY_COLOR: Record<string, string> = {
  none:        "text-[#0F6E56]",
  advisory:    "text-[#1B4FA0]",
  recommended: "text-[#854F0B]",
  urgent:      "text-[#C0392B]",
};

const URGENCY_BG: Record<string, string> = {
  none:        "bg-emerald-500/10 border-emerald-500/20",
  advisory:    "bg-sky-500/10 border-sky-500/20",
  recommended: "bg-amber-500/10 border-amber-500/20",
  urgent:      "bg-rose-500/10 border-rose-500/25",
};

function QualityBar({ score, tier }: { score: number; tier: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <span className="text-[10px] text-[#9B9690]">Training Quality</span>
        <span className={`text-xs font-semibold ${QUALITY_COLOR[tier] ?? "text-[#1C1B18]"}`}>{tier}</span>
      </div>
      <div className="w-full h-2 rounded-full bg-black/8">
        <div
          className={`h-2 rounded-full transition-all ${QUALITY_BG[tier] ?? "bg-[#C8C5BC]"}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="text-[10px] text-[#C8C5BC] text-right">{score}/100</div>
    </div>
  );
}

function PRChip({ pr }: { pr: PersonalBestSet }) {
  const best = pr.thirtyDay ?? pr.ninetyDay ?? pr.year ?? pr.lifetime;
  if (!best) return null;
  return (
    <div className="bg-[#F1EFE8] border border-[#EAE7DE] rounded-xl px-3 py-2">
      <div className="text-[10px] text-[#9B9690] truncate">{pr.exerciseName}</div>
      <div className="text-sm font-semibold text-[#1C1B18] mt-0.5">
        {best.weight}kg × {best.reps}
      </div>
      <div className="text-[10px] text-[#854F0B]">~{best.estimated1RM}kg 1RM</div>
    </div>
  );
}

export function PerformanceHubCard({
  quality, plateaus, personalBests, velocity, adjustments, predictors,
}: Props) {
  if (!quality && !plateaus && !velocity) return null;

  const prsWithBest = (personalBests ?? [])
    .filter(pb => pb.lifetime !== null)
    .slice(0, 4);

  return (
    <div className="bg-white border border-[#EAE7DE] rounded-2xl p-5 space-y-5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1C1B18]">Performance Hub</h3>
        {quality && (
          <span className={`text-xs font-semibold ${QUALITY_COLOR[quality.tier] ?? ""}`}>
            {quality.tier}
          </span>
        )}
      </div>

      {/* Quality bar */}
      {quality && <QualityBar score={quality.score} tier={quality.tier} />}

      {/* Quality breakdown */}
      {quality && (
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Completion",  val: quality.breakdown.completionRate  },
            { label: "Volume",      val: quality.breakdown.volumeAccuracy  },
            { label: "RPE Quality", val: quality.breakdown.rpeAccuracy     },
            { label: "Consistency", val: quality.breakdown.consistencyScore },
          ].map(({ label, val }) => (
            <div key={label} className="bg-[#F1EFE8] rounded-xl px-3 py-2">
              <div className="text-[10px] text-[#9B9690]">{label}</div>
              <div className="text-sm font-semibold text-[#1C1B18] mt-0.5">{val}%</div>
            </div>
          ))}
        </div>
      )}

      {/* Goal velocity */}
      {velocity && velocity.currentValue > 0 && (
        <div className="bg-[#F1EFE8] border border-[#EAE7DE] rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#9B9690] uppercase tracking-widest">Goal Velocity</span>
            <span className={`text-[10px] font-semibold ${velocity.onTrack ? "text-[#0F6E56]" : "text-[#854F0B]"}`}>
              {velocity.onTrack ? "On Track" : "Below Target"}
            </span>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 text-center">
              <div className="text-lg font-semibold text-[#1C1B18]">
                {velocity.weeklyRatePercent >= 0 ? "+" : ""}{velocity.weeklyRatePercent}%
              </div>
              <div className="text-[10px] text-[#9B9690]">per week</div>
            </div>
            {velocity.etaWeeks !== null && (
              <div className="flex-1 text-center">
                <div className="text-lg font-semibold text-[#1C1B18]">{velocity.etaWeeks}w</div>
                <div className="text-[10px] text-[#9B9690]">to +15% milestone</div>
              </div>
            )}
            <div className="flex-1 text-center">
              <div className="text-lg font-semibold text-[#1C1B18]">
                {velocity.changePercent >= 0 ? "+" : ""}{velocity.changePercent}%
              </div>
              <div className="text-[10px] text-[#9B9690]">4-week change</div>
            </div>
          </div>
          <p className="text-[11px] text-[#9B9690] leading-relaxed">{velocity.message}</p>
        </div>
      )}

      {/* Plateau alerts */}
      {plateaus && plateaus.plateaus.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] text-[#C0392B] font-semibold uppercase tracking-widest">
            Plateau Alerts
          </div>
          {plateaus.plateaus.slice(0, 3).map(p => (
            <div key={`${p.exerciseName}-${p.type}`}
              className="bg-rose-500/8 border border-rose-500/20 rounded-xl px-3 py-2">
              <div className="flex justify-between items-baseline mb-0.5">
                <span className="text-xs font-medium text-[#1C1B18]">{p.exerciseName}</span>
                <span className="text-[10px] text-[#C0392B] capitalize">{p.severity}</span>
              </div>
              <p className="text-[10px] text-[#9B9690]">{p.suggestion}</p>
            </div>
          ))}
        </div>
      )}

      {/* Personal bests */}
      {prsWithBest.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] text-[#854F0B] font-semibold uppercase tracking-widest">
            Personal Bests
          </div>
          <div className="grid grid-cols-2 gap-2">
            {prsWithBest.map(pb => <PRChip key={pb.exerciseName} pr={pb} />)}
          </div>
        </div>
      )}

      {/* Top predictor */}
      {predictors?.topPositive && predictors.dataMaturity !== "low" && (
        <div className="bg-violet-500/8 border border-violet-500/20 rounded-xl p-3">
          <div className="text-[10px] text-[#534AB7] font-semibold uppercase tracking-widest mb-1">
            Best Performance Condition
          </div>
          <div className="text-xs font-medium text-[#1C1B18]">{predictors.topPositive.label}</div>
          <div className="text-[11px] text-[#9B9690] mt-0.5">{predictors.insight}</div>
        </div>
      )}

      {/* Adjustments */}
      {adjustments && adjustments.urgency !== "none" && adjustments.suggestions.length > 0 && (
        <div className={`border rounded-xl p-3 space-y-3 ${URGENCY_BG[adjustments.urgency] ?? ""}`}>
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-widest
              ${URGENCY_COLOR[adjustments.urgency]}">
              Adjustments
            </div>
            <span className={`text-[10px] font-semibold capitalize ${URGENCY_COLOR[adjustments.urgency] ?? ""}`}>
              {adjustments.urgency}
            </span>
          </div>
          <p className="text-[11px] text-[#5C5850] leading-relaxed">{adjustments.headline}</p>
          <div className="space-y-2">
            {adjustments.suggestions.map((s, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="w-1.5 h-1.5 rounded-full bg-[#C8C5BC] mt-1.5 flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-[#9B9690] font-medium">{s.area}: </span>
                  <span className="text-[11px] text-[#5C5850]">{s.suggestion}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quality insight */}
      {quality && (
        <p className="text-[11px] text-[#9B9690] leading-relaxed text-center pt-1">
          {quality.insight}
        </p>
      )}
    </div>
  );
}
