"use client";

import type { MuscleGroupState, VisualizationMode } from "@/lib/bodyIntelligence/bodyIntelligenceTypes";
import { STATE_COLOR, STATE_LABEL } from "@/lib/bodyIntelligence/bodyIntelligenceTypes";
import { getMuscleGroupById, MUSCLE_GROUPS } from "@/lib/bodyIntelligence/muscleGroups";

interface MuscleDetailPanelProps {
  muscle:   MuscleGroupState;
  onClose:  () => void;
}

function RecoveryBar({ pct }: { pct: number }) {
  const color = pct >= 75 ? "#0F6E56" : pct >= 50 ? "#1B5FA0" : pct >= 30 ? "#854F0B" : "#C0392B";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-[#9B9690]">Recovery</span>
        <span className="font-semibold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-[#F1EFE8] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function StatRow({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-[#F0EDE4] last:border-0">
      <span className="text-[12px] text-[#9B9690]">{label}</span>
      <span className={`text-[12px] font-medium ${dim ? "text-[#C8C5BC]" : "text-[#1C1B18]"}`}>{value}</span>
    </div>
  );
}

export function MuscleDetailPanel({ muscle, onClose }: MuscleDetailPanelProps) {
  const def = getMuscleGroupById(muscle.id.replace(/_(?:left|right)$/, ""));
  const stateColor = STATE_COLOR[muscle.state] ?? "#9B9690";
  const stateLabel = STATE_LABEL[muscle.state] ?? "Unknown";

  const displayName = muscle.displayName.replace(/ \((left|right)\)$/, "");

  return (
    <div className="h-full flex flex-col bg-[#FAF9F5] overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-[#EAE7DE]">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9B9690] mb-1">
            {def?.bodyRegion.replace(/_/g, " ").toUpperCase() ?? "MUSCLE"}
          </div>
          <h2 className="text-[20px] font-semibold text-[#1C1B18] leading-tight">{displayName}</h2>
          {muscle.side && muscle.side !== "bilateral" && (
            <div className="text-[12px] text-[#9B9690] capitalize mt-0.5">{muscle.side} side</div>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close panel"
          className="w-8 h-8 flex items-center justify-center rounded-full text-[#9B9690] hover:text-[#1C1B18] hover:bg-[#F1EFE8] transition-colors mt-0.5 flex-shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* Status badge */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: stateColor }}
          />
          <span className="text-[14px] font-semibold" style={{ color: stateColor }}>
            {stateLabel}
          </span>
          <span className="ml-auto text-[11px] text-[#C8C5BC] capitalize">
            Confidence: {muscle.confidence}
          </span>
        </div>

        {/* Recovery bar */}
        <RecoveryBar pct={muscle.recoveryPercent} />

        {/* Description */}
        {def?.description && (
          <p className="text-[12px] text-[#6B6860] leading-relaxed">{def.description}</p>
        )}

        {/* Stats */}
        <div className="bg-white rounded-2xl border border-[#EAE7DE] overflow-hidden">
          <StatRow
            label="Last trained"
            value={
              muscle.lastTrainedDate
                ? muscle.daysSinceTraining === 0
                  ? "Today"
                  : muscle.daysSinceTraining === 1
                    ? "Yesterday"
                    : `${muscle.daysSinceTraining}d ago`
                : "No history"
            }
            dim={!muscle.lastTrainedDate}
          />
          <StatRow
            label="Next scheduled"
            value={muscle.nextScheduledDate ? "Today" : "Not scheduled"}
            dim={!muscle.nextScheduledDate}
          />
          <StatRow
            label="Weekly frequency"
            value={muscle.weeklyFrequency > 0 ? `${muscle.weeklyFrequency}× this week` : "None this week"}
            dim={muscle.weeklyFrequency === 0}
          />
          <StatRow
            label="Weekly volume"
            value={muscle.weeklyVolume > 0 ? `${muscle.weeklyVolume} sets` : "None recorded"}
            dim={muscle.weeklyVolume === 0}
          />
          <StatRow
            label="Volume vs MRV"
            value={muscle.volumeScore > 0 ? `${muscle.volumeScore}%` : "No data"}
            dim={muscle.volumeScore === 0}
          />
          {muscle.cycleModifier !== 0 && (
            <StatRow
              label="Cycle influence"
              value={muscle.cycleModifier > 0 ? "Positive ↑" : "Reduce volume ↓"}
            />
          )}
        </div>

        {/* Symptoms */}
        {muscle.symptoms.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.10em] text-[#9B9690] mb-2">
              Reported Symptoms
            </div>
            <div className="space-y-2">
              {muscle.symptoms.map((s, i) => (
                <div
                  key={i}
                  className="bg-[#FDF3F2] border border-[#F5C6C1] rounded-xl px-3 py-2.5 flex items-center justify-between"
                >
                  <span className="text-[12px] text-[#5C1A14] capitalize">{s.label}</span>
                  <div className="flex gap-1">
                    {[1, 2, 3].map(n => (
                      <div
                        key={n}
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: n <= s.severity ? "#C0392B" : "#EAE7DE" }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fatigued state extra context */}
        {(muscle.state === "fatigued" || muscle.state === "overloaded") && (
          <div className="bg-[#FAEEDA] border border-[#E4C88A] rounded-2xl p-4">
            <div className="text-[12px] font-semibold text-[#633806] mb-1">
              {muscle.state === "overloaded" ? "Overloaded" : "Elevated Fatigue"}
            </div>
            <p className="text-[11px] text-[#7A5A1A] leading-relaxed">
              {muscle.state === "overloaded"
                ? "This muscle group has accumulated more volume than it can currently recover from. Reduce intensity or frequency this week."
                : "Recovery is slower than usual for this muscle. Lighter loads or additional rest may be beneficial."}
            </p>
          </div>
        )}

        {/* Injured state */}
        {muscle.state === "injured" && (
          <div className="bg-[#FDF3F2] border border-[#F5C6C1] rounded-2xl p-4">
            <div className="text-[12px] font-semibold text-[#5C1A14] mb-1">Injury Flag</div>
            <p className="text-[11px] text-[#5C1A14] leading-relaxed">
              Exercises targeting this muscle group have been automatically substituted or protected in your workouts.
            </p>
          </div>
        )}

        {/* Scheduled today */}
        {muscle.state === "scheduled" && (
          <div className="bg-[#EEEDFE] border border-[#C4C1F5] rounded-2xl p-4">
            <div className="text-[12px] font-semibold text-[#3C3489] mb-1">Today's Focus</div>
            <p className="text-[11px] text-[#4B4299] leading-relaxed">
              This muscle is a primary training target in today's recommended workout. Recovery and readiness support training this group today.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
