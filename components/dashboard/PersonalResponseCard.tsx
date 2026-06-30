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
  early:       "text-[#9B9690]",
  building:    "text-[#854F0B]",
  established: "text-[#1B4FA0]",
  mature:      "text-[#0F6E56]",
};

export function PersonalResponseCard({ phaseResponse, symptomImpact, recoveryModel, confidence }: Props) {
  const hasData = phaseResponse?.dataReady || symptomImpact?.dataReady || recoveryModel?.dataReady;
  if (!hasData) return null;

  return (
    <div className="bg-white border border-[#EAE7DE] rounded-2xl p-5 space-y-4 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1C1B18]">How Your Body Responds</h3>
        {confidence && (
          <span className={`text-xs font-semibold capitalize ${LEVEL_COLOR[confidence.level] ?? "text-[#9B9690]"}`}>
            {confidence.level}
          </span>
        )}
      </div>

      {confidence && (
        <p className="text-[11px] text-[#9B9690] leading-relaxed">{confidence.summary}</p>
      )}

      {/* Phase response */}
      {phaseResponse?.dataReady && (
        <div className="space-y-2 pt-1 border-t border-[#EAE7DE]">
          <div className="text-[10px] text-[#C8C5BC] uppercase tracking-widest">Cycle Phase Response</div>
          <div className="grid grid-cols-2 gap-2">
            {phaseResponse.bestPhase && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 text-center">
                <div className="text-[9px] text-[#9B9690] mb-0.5">Peak phase</div>
                <div className="text-[11px] font-semibold text-[#0F6E56]">{phaseResponse.bestPhase}</div>
              </div>
            )}
            {phaseResponse.worstPhase && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5 text-center">
                <div className="text-[9px] text-[#9B9690] mb-0.5">Recovery phase</div>
                <div className="text-[11px] font-semibold text-[#C0392B]">{phaseResponse.worstPhase}</div>
              </div>
            )}
          </div>
          {phaseResponse.deviatesFromPopulation && (
            <div className="text-[10px] text-[#3C3489]/70 px-0.5">
              Your pattern differs from the population average — Axis uses your data.
            </div>
          )}
        </div>
      )}

      {/* Symptom impact */}
      {symptomImpact?.dataReady && symptomImpact.impacts.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-[#EAE7DE]">
          <div className="text-[10px] text-[#C8C5BC] uppercase tracking-widest">Symptom Impact</div>
          {symptomImpact.impacts.slice(0, 3).map(s => (
            <div key={s.symptomId} className="flex items-center justify-between">
              <span className="text-[11px] text-[#6B6860] capitalize">{s.symptomId.replace(/_/g, " ")}</span>
              <span className={`text-[11px] font-semibold ${
                s.impactLevel === "significant" ? "text-[#C0392B]"
                : s.impactLevel === "moderate"   ? "text-[#854F0B]"
                : "text-[#9B9690]"
              }`}>
                −{s.meanDrop} pts
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Recovery response */}
      {recoveryModel?.dataReady && (
        <div className="space-y-2 pt-1 border-t border-[#EAE7DE]">
          <div className="text-[10px] text-[#C8C5BC] uppercase tracking-widest">Recovery Response</div>
          <p className="text-[11px] text-[#9B9690]">{recoveryModel.insight}</p>
          {recoveryModel.modalities.slice(0, 3).map(m => (
            <div key={m.modality} className="flex items-center justify-between">
              <span className="text-[11px] text-[#6B6860]">{m.label}</span>
              <span className={`text-[11px] font-semibold ${m.meanLift >= 5 ? "text-[#0F6E56]" : m.meanLift >= 0 ? "text-[#9B9690]" : "text-[#C0392B]"}`}>
                {m.meanLift >= 0 ? "+" : ""}{m.meanLift} pts
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
