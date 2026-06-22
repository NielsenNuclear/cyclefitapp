"use client";

import type { PhysiologyConfidence }    from "@/lib/physiology/physiologyConfidence";
import type { ForecastAccuracyReport }  from "@/lib/accuracy/forecastAccuracy";
import type { FeedbackSummary }         from "@/lib/evidence/recommendationValidation";
import type { AdaptiveNarrative }       from "@/lib/evidence/adaptiveNarrative";

interface Props {
  physiologyConf: PhysiologyConfidence | undefined;
  accuracy:       ForecastAccuracyReport | undefined;
  feedback:       FeedbackSummary | undefined;
  narrative:      AdaptiveNarrative | undefined;
}

function ConfBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-white/45">{label}</span>
        <span className="text-white/30">{value}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-white/8">
        <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function UserTrustCard({ physiologyConf, accuracy, feedback, narrative }: Props) {
  if (!physiologyConf) return null;

  const physiologyColor =
    physiologyConf.overall >= 75 ? "bg-emerald-500"
    : physiologyConf.overall >= 50 ? "bg-sky-500"
    : physiologyConf.overall >= 25 ? "bg-amber-500"
    : "bg-white/20";

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">How Well Axis Knows You</h3>
        <span className="text-xs text-white/35 capitalize">{physiologyConf.level}</span>
      </div>

      {/* Narrative headline */}
      {narrative && (
        <p className="text-[12px] text-white/55 leading-relaxed">{narrative.headline}</p>
      )}

      {/* Physiology model bars */}
      <div className="space-y-2">
        <ConfBar label="Physiology model"     value={physiologyConf.overall}        color={physiologyColor} />
        <ConfBar label="Phase pattern"        value={physiologyConf.phaseModel}     color="bg-violet-500"   />
        <ConfBar label="Symptom mapping"      value={physiologyConf.symptomModel}   color="bg-sky-500"      />
        <ConfBar label="Recovery mapping"     value={physiologyConf.recoveryModel}  color="bg-emerald-500"  />
        <ConfBar label="Readiness calibration" value={physiologyConf.readinessModel} color="bg-amber-500"    />
      </div>

      {/* Accuracy */}
      {accuracy?.dataReady && (
        <div className="pt-1 border-t border-white/8">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/35">Prediction accuracy</span>
            <span className="text-[11px] font-semibold text-sky-400">{accuracy.overall}%</span>
          </div>
        </div>
      )}

      {/* Feedback summary */}
      {feedback && feedback.total >= 3 && (
        <div className="pt-1 border-t border-white/8 space-y-1.5">
          <div className="text-[10px] text-white/25 uppercase tracking-widest">Your Feedback</div>
          <div className="flex gap-2">
            <div className="flex-1 bg-emerald-500/10 rounded-lg p-2 text-center">
              <div className="text-sm font-semibold text-emerald-400">{feedback.perfectRate + feedback.helpfulRate}%</div>
              <div className="text-[9px] text-white/30">Positive</div>
            </div>
            <div className="flex-1 bg-rose-500/10 rounded-lg p-2 text-center">
              <div className="text-sm font-semibold text-rose-400">{feedback.tooHardRate}%</div>
              <div className="text-[9px] text-white/30">Too hard</div>
            </div>
            <div className="flex-1 bg-sky-500/10 rounded-lg p-2 text-center">
              <div className="text-sm font-semibold text-sky-400">{feedback.tooEasyRate}%</div>
              <div className="text-[9px] text-white/30">Too easy</div>
            </div>
          </div>
          <div className="text-[10px] text-white/25 text-center">Based on {feedback.total} sessions</div>
        </div>
      )}

      {/* Narrative lines */}
      {narrative && narrative.lines.length > 0 && (
        <div className="pt-1 border-t border-white/8 space-y-1.5">
          {narrative.lines.map((line, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-violet-400 text-[9px] mt-0.5">→</span>
              <span className="text-[11px] text-white/45 leading-relaxed">{line}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
