"use client";

import type { VisualizationMode } from "@/lib/bodyIntelligence/bodyIntelligenceTypes";
import { STATE_COLOR } from "@/lib/bodyIntelligence/bodyIntelligenceTypes";

interface VisualizationControlsProps {
  mode:     VisualizationMode;
  onChange: (mode: VisualizationMode) => void;
}

const MODES: Array<{ id: VisualizationMode; label: string; description: string }> = [
  { id: "today",          label: "Today",          description: "Scheduled vs recovering" },
  { id: "recovery",       label: "Recovery",        description: "Per-muscle recovery %" },
  { id: "fatigue",        label: "Fatigue",         description: "Current fatigue level" },
  { id: "injury",         label: "Injury",          description: "Symptoms & protection" },
  { id: "volume",         label: "Volume",          description: "Weekly sets vs MRV" },
  { id: "frequency",      label: "Frequency",       description: "Weekly training sessions" },
  { id: "cycle_influence",label: "Cycle",           description: "Hormonal phase modifier" },
  { id: "mobility",       label: "Mobility",        description: "Restriction flags" },
];

export function VisualizationControls({ mode, onChange }: VisualizationControlsProps) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9B9690] px-1">
        View Mode
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className={`text-left px-3 py-2.5 rounded-xl border transition-colors ${
              mode === m.id
                ? "bg-[#534AB7] border-[#534AB7] text-white"
                : "bg-white border-[#EAE7DE] text-[#1C1B18] hover:bg-[#F5F3EE]"
            }`}
          >
            <div className={`text-[12px] font-semibold ${mode === m.id ? "text-white" : "text-[#1C1B18]"}`}>
              {m.label}
            </div>
            <div className={`text-[10px] mt-0.5 ${mode === m.id ? "text-[rgba(255,255,255,0.7)]" : "text-[#9B9690]"}`}>
              {m.description}
            </div>
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="pt-2 border-t border-[#F0EDE4]">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9B9690] mb-2 px-1">
          Legend
        </div>
        {mode === "today" && (
          <div className="space-y-1.5">
            {(["scheduled", "secondary", "recently_trained", "recovering", "recovered", "fatigued", "overloaded", "injured"] as const).map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATE_COLOR[s] }} />
                <span className="text-[11px] text-[#6B6860] capitalize">{s.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
        )}
        {mode === "recovery" && (
          <div className="space-y-1.5">
            {[["80–100%", "#0F6E56"], ["60–79%", "#1B5FA0"], ["40–59%", "#854F0B"], ["0–39%", "#C0392B"]].map(([label, color]) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[11px] text-[#6B6860]">{label}</span>
              </div>
            ))}
          </div>
        )}
        {mode === "volume" && (
          <div className="space-y-1.5">
            {[["High (>80% MRV)", "#C0392B"], ["Moderate (60–80%)", "#854F0B"], ["Low (<30%)", "#0F6E56"], ["None tracked", "#EAE7DE"]].map(([label, color]) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[11px] text-[#6B6860]">{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
