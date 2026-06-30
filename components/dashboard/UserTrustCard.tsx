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
        <span className="text-[#9B9690]">{label}</span>
        <span className="text-[#C8C5BC]">{value}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-black/8">
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
    : "bg-[#EAE7DE]";

  return (
    <div className="bg-white border border-[#EAE7DE] rounded-2xl p-5 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1C1B18]">How Well Axis Knows You</h3>
        <span className="text-xs text-[#9B9690] capitalize">{physiologyConf.level}</span>
      </div>

      {/* Narrative headline */}
      {narrative && (
        <p className="text-[12px] text-[#5C5850] leading-relaxed">{narrative.headline}</p>
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
        <div className="pt-1 border-t border-[#EAE7DE]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#9B9690]">Prediction accuracy</span>
            <span className="text-[11px] font-semibold text-[#1B4FA0]">{accuracy.overall}%</span>
          </div>
        </div>
      )}

      {/* Feedback summary */}
      {feedback && feedback.total >= 3 && (
        <div className="pt-1 border-t border-[#EAE7DE] space-y-1.5">
          <div className="text-[10px] text-[#C8C5BC] uppercase tracking-widest">Your Feedback</div>
          <div className="flex gap-2">
            <div className="flex-1 bg-emerald-500/10 rounded-lg p-2 text-center">
              <div className="text-sm font-semibold text-[#0F6E56]">{feedback.perfectRate + feedback.helpfulRate}%</div>
              <div className="text-[9px] text-[#C8C5BC]">Positive</div>
            </div>
            <div className="flex-1 bg-rose-500/10 rounded-lg p-2 text-center">
              <div className="text-sm font-semibold text-[#C0392B]">{feedback.tooHardRate}%</div>
              <div className="text-[9px] text-[#C8C5BC]">Too hard</div>
            </div>
            <div className="flex-1 bg-sky-500/10 rounded-lg p-2 text-center">
              <div className="text-sm font-semibold text-[#1B4FA0]">{feedback.tooEasyRate}%</div>
              <div className="text-[9px] text-[#C8C5BC]">Too easy</div>
            </div>
          </div>
          <div className="text-[10px] text-[#C8C5BC] text-center">Based on {feedback.total} sessions</div>
        </div>
      )}

      {/* Narrative lines */}
      {narrative && narrative.lines.length > 0 && (
        <div className="pt-1 border-t border-[#EAE7DE] space-y-1.5">
          {narrative.lines.map((line, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-[#534AB7] text-[9px] mt-0.5">→</span>
              <span className="text-[11px] text-[#9B9690] leading-relaxed">{line}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
