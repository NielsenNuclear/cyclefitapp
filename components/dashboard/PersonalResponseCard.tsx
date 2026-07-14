"use client";

import type { PhaseResponseProfile }    from "@/lib/physiology/phaseResponseModel";
import type { SymptomImpactProfile }    from "@/lib/physiology/symptomImpactModel";
import type { RecoveryResponseProfile } from "@/lib/physiology/recoveryResponseModel";
import type { PhysiologyConfidence }    from "@/lib/physiology/physiologyConfidence";

interface Props {
  phaseResponse:  PhaseResponseProfile | undefined;
  symptomImpact:  SymptomImpactProfile | undefined;
  recoveryModel:  RecoveryResponseProfile | undefined;
  confidence:     PhysiologyConfidence | undefined;
}

const LEVEL_COLOR: Record<string, string> = {
  early:       "text-ink-muted",
  building:    "text-caution",
  established: "text-info",
  mature:      "text-success",
};

export function PersonalResponseCard({ phaseResponse, symptomImpact, recoveryModel, confidence }: Props) {
  const hasData = phaseResponse?.dataReady || symptomImpact?.dataReady || recoveryModel?.dataReady;
  if (!hasData) return null;

  return (
    <div className="bg-white border border-border rounded-2xl p-5 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">How Your Body Responds</h3>
        {confidence && (
          <span className={`text-xs font-semibold capitalize ${LEVEL_COLOR[confidence.level] ?? "text-ink-muted"}`}>
            {confidence.level}
          </span>
        )}
      </div>

      {confidence && (
        <p className="text-[11px] text-ink-muted leading-relaxed">{confidence.summary}</p>
      )}

      {/* Phase response */}
      {phaseResponse?.dataReady && (
        <div className="space-y-2 pt-1 border-t border-border">
          <div className="text-[10px] text-ink-faint uppercase tracking-widest">Cycle Phase Response</div>
          <div className="grid grid-cols-2 gap-2">
            {phaseResponse.bestPhase && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 text-center">
                <div className="text-[9px] text-ink-muted mb-0.5">Peak phase</div>
                <div className="text-[11px] font-semibold text-success">{phaseResponse.bestPhase}</div>
              </div>
            )}
            {phaseResponse.worstPhase && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5 text-center">
                <div className="text-[9px] text-ink-muted mb-0.5">Recovery phase</div>
                <div className="text-[11px] font-semibold text-danger">{phaseResponse.worstPhase}</div>
              </div>
            )}
          </div>
          {phaseResponse.deviatesFromPopulation && (
            <div className="text-[10px] text-brand-dark/70 px-0.5">
              Your pattern differs from the population average — Axis uses your data.
            </div>
          )}
        </div>
      )}

      {/* Symptom impact */}
      {symptomImpact?.dataReady && symptomImpact.impacts.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-border">
          <div className="text-[10px] text-ink-faint uppercase tracking-widest">Symptom Impact</div>
          {symptomImpact.impacts.slice(0, 3).map(s => (
            <div key={s.symptomId} className="flex items-center justify-between">
              <span className="text-[11px] text-ink-secondary capitalize">{s.symptomId.replace(/_/g, " ")}</span>
              <span className={`text-[11px] font-semibold ${
                s.impactLevel === "significant" ? "text-danger"
                : s.impactLevel === "moderate"   ? "text-caution"
                : "text-ink-muted"
              }`}>
                −{s.meanDrop} pts
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Recovery response */}
      {recoveryModel?.dataReady && (
        <div className="space-y-2 pt-1 border-t border-border">
          <div className="text-[10px] text-ink-faint uppercase tracking-widest">Recovery Response</div>
          <p className="text-[11px] text-ink-muted">{recoveryModel.insight}</p>
          {recoveryModel.modalities.slice(0, 3).map(m => (
            <div key={m.modality} className="flex items-center justify-between">
              <span className="text-[11px] text-ink-secondary">{m.label}</span>
              <span className={`text-[11px] font-semibold ${m.meanLift >= 5 ? "text-success" : m.meanLift >= 0 ? "text-ink-muted" : "text-danger"}`}>
                {m.meanLift >= 0 ? "+" : ""}{m.meanLift} pts
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
