"use client";

/**
 * DetailPanel — Phase 60
 *
 * Right-column panel. Always visible on desktop, bottom-sheet on mobile.
 *
 * Two states:
 *   Empty (no selection) — body overview + visualization layer picker
 *   Active (muscle selected) — Details tab + Exercises tab (Phase 60)
 */

import { useState } from "react";
import type { MuscleRecord, BodySnapshot, VisualizationLayer } from "@/lib/bodyIntelligence/BodyStateEngine";
import { STATUS_COLOR, STATUS_LABEL, LAYER_META } from "../rendering/OverlaySystem";
import { getMuscleGroupById } from "@/lib/bodyIntelligence/muscleGroups";
import { ExerciseIntelligencePanel } from "./ExerciseIntelligencePanel";
import { AxisIcon } from "@/components/ui/Icon";

// ─── Shared primitives ────────────────────────────────────────────────────────

function Divider() {
  return <div className="h-px bg-[#F0EDE4] mx-5" />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9B9690] px-5 pt-5 pb-2">
      {children}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string; dim?: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5 border-b border-[#F0EDE4] last:border-0">
      <span className="text-[12px] text-[#9B9690]">{label}</span>
      <span className="text-[12px] font-medium" style={{ color: accent ?? "#1C1B18" }}>{value}</span>
    </div>
  );
}

// ─── Recovery bar ─────────────────────────────────────────────────────────────

function RecoveryBar({ pct }: { pct: number }) {
  const color = pct >= 75 ? "#0F6E56" : pct >= 50 ? "#1B5FA0" : pct >= 30 ? "#854F0B" : "#C0392B";
  return (
    <div className="px-5 py-3">
      <div className="flex justify-between text-[11px] mb-1.5">
        <span className="text-[#9B9690]">Recovery</span>
        <span className="font-semibold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-[#F1EFE8] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Contextual insight banners ───────────────────────────────────────────────

function MuscleInsight({ muscle }: { muscle: MuscleRecord }) {
  const { status, daysSinceTrained, weeklyVolume, cycleModifier, symptoms } = muscle;

  if (status === "training") {
    return (
      <div className="mx-5 mb-4 bg-[#EEEDFE] border border-[#C4C1F5] rounded-2xl p-4">
        <div className="text-[11px] font-semibold text-[#3C3489] mb-1">Today's Focus</div>
        <p className="text-[11px] text-[#4B4299] leading-relaxed">
          This is a primary training target in today's session. Recovery and readiness support working this muscle today.
        </p>
      </div>
    );
  }
  if (status === "injured") {
    return (
      <div className="mx-5 mb-4 bg-[#FDF3F2] border border-[#F5C6C1] rounded-2xl p-4">
        <div className="text-[11px] font-semibold text-[#5C1A14] mb-1">Injury Flag</div>
        <p className="text-[11px] text-[#5C1A14] leading-relaxed">
          Exercises targeting this area have been automatically substituted in your workouts.
        </p>
      </div>
    );
  }
  if (status === "fatigued") {
    return (
      <div className="mx-5 mb-4 bg-[#FAEEDA] border border-[#E4C88A] rounded-2xl p-4">
        <div className="text-[11px] font-semibold text-[#633806] mb-1">Elevated Fatigue</div>
        <p className="text-[11px] text-[#7A5A1A] leading-relaxed">
          Accumulated volume is high. Lighter loads or an extra rest day may improve recovery speed.
        </p>
      </div>
    );
  }
  if (daysSinceTrained !== null && daysSinceTrained >= 6) {
    return (
      <div className="mx-5 mb-4 bg-[#F5F3EE] border border-[#EAE7DE] rounded-2xl p-4">
        <div className="text-[11px] font-semibold text-[#1C1B18] mb-1">{daysSinceTrained}d Without Training</div>
        <p className="text-[11px] text-[#6B6860] leading-relaxed">
          This muscle group hasn't been targeted in {daysSinceTrained} days — it's fully recovered and available.
        </p>
      </div>
    );
  }
  if (cycleModifier > 0.1) {
    return (
      <div className="mx-5 mb-4 bg-[#F0FBF7] border border-[#A8E0CE] rounded-2xl p-4">
        <div className="text-[11px] font-semibold text-[#0A4D3B] mb-1">Cycle Advantage</div>
        <p className="text-[11px] text-[#0F6E56] leading-relaxed">
          Your hormonal phase is favourable for high-intensity work on this muscle group.
        </p>
      </div>
    );
  }
  return null;
}

// ─── Detail tab ───────────────────────────────────────────────────────────────

function DetailTab({ muscle }: { muscle: MuscleRecord }) {
  const def = getMuscleGroupById(muscle.id.replace(/_(?:left|right)$/, ""));

  const lastTrainedLabel =
    muscle.lastTrainedDate === null
      ? "No history"
      : muscle.daysSinceTrained === 0
        ? "Today"
        : muscle.daysSinceTrained === 1
          ? "Yesterday"
          : `${muscle.daysSinceTrained}d ago`;

  return (
    <div className="pb-6">
      {/* Muscle description */}
      {def?.description && (
        <p className="px-5 pt-4 pb-2 text-[12px] text-[#6B6860] leading-relaxed">{def.description}</p>
      )}

      <Divider />
      <RecoveryBar pct={muscle.recoveryPct} />
      <Divider />

      <div className="bg-white mx-5 mt-4 rounded-2xl border border-[#EAE7DE] overflow-hidden">
        <Row label="Last trained"       value={lastTrainedLabel} />
        <Row label="Next scheduled"     value={muscle.nextScheduled ? "Today" : "Not scheduled"}  dim={!muscle.nextScheduled} />
        <Row label="This week"          value={muscle.weeklyFrequency > 0 ? `${muscle.weeklyFrequency} sessions` : "No sessions"} />
        <Row label="Weekly volume"      value={muscle.weeklyVolume > 0 ? `${muscle.weeklyVolume} sets` : "None"} />
        <Row label="Volume vs MRV"      value={muscle.volumePct > 0 ? `${muscle.volumePct}%` : "—"} />
        {muscle.cycleModifier !== 0 && (
          <Row
            label="Cycle influence"
            value={muscle.cycleModifier > 0 ? "Positive ↑" : "Reduce volume ↓"}
            accent={muscle.cycleModifier > 0 ? "#0F6E56" : "#854F0B"}
          />
        )}
      </div>

      {/* Symptoms */}
      {muscle.symptoms.length > 0 && (
        <>
          <SectionLabel>Reported Symptoms</SectionLabel>
          <div className="px-5 space-y-2">
            {muscle.symptoms.map((s, i) => (
              <div key={i} className="bg-[#FDF3F2] border border-[#F5C6C1] rounded-xl px-3 py-2.5 flex items-center justify-between">
                <span className="text-[12px] text-[#5C1A14] capitalize">{s.label || s.symptomId}</span>
                <div className="flex gap-1">
                  {[1, 2, 3].map(n => (
                    <div key={n} className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: n <= s.severity ? "#C0392B" : "#EAE7DE" }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="px-5 pt-4">
        <MuscleInsight muscle={muscle} />
      </div>
    </div>
  );
}

// (ExercisesTab removed in Phase 60 — replaced by ExerciseIntelligencePanel)

// ─── Body overview (shown when nothing is selected) ───────────────────────────

const STATUS_ORDER: MuscleRecord["status"][] = [
  "training", "injured", "fatigued", "recovering", "secondary", "ready",
];

function BodyOverview({ snapshot }: { snapshot: BodySnapshot }) {
  const counts: Partial<Record<MuscleRecord["status"], number>> = {};
  const seen = new Set<string>();
  for (const m of snapshot.muscles) {
    const base = m.id.replace(/_(?:left|right)$/, "");
    if (seen.has(base)) continue;
    seen.add(base);
    counts[m.status] = (counts[m.status] ?? 0) + 1;
  }

  const has = STATUS_ORDER.some(s => (counts[s] ?? 0) > 0);

  return (
    <div>
      <SectionLabel>Muscle Status</SectionLabel>
      {has ? (
        <div className="mx-5 bg-white rounded-2xl border border-[#EAE7DE] overflow-hidden">
          {STATUS_ORDER.filter(s => (counts[s] ?? 0) > 0).map(s => (
            <div key={s} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#F0EDE4] last:border-0">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLOR[s] }} />
              <span className="text-[12px] text-[#6B6860] flex-1">{STATUS_LABEL[s]}</span>
              <span className="text-[12px] font-semibold text-[#1C1B18]">{counts[s]}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-5 text-[12px] text-[#9B9690] leading-relaxed">
          Log your first workout to see muscle status across your body.
        </p>
      )}

      <div className="mx-5 mt-4 bg-[#F5F3EE] rounded-2xl px-4 py-3.5">
        <p className="text-[11px] text-[#6B6860] leading-relaxed">
          Click any highlighted region on the 3D body to see its recovery status, training history, and recommended exercises.
        </p>
      </div>
    </div>
  );
}

// ─── Layer picker ─────────────────────────────────────────────────────────────

function LayerPicker({
  layer,
  onChange,
}: {
  layer:    VisualizationLayer;
  onChange: (l: VisualizationLayer) => void;
}) {
  return (
    <div>
      <SectionLabel>Visualization</SectionLabel>
      <div className="px-5 grid grid-cols-2 gap-1.5">
        {LAYER_META.map(m => (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className={`text-left px-3 py-2.5 rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#534AB7] ${
              layer === m.id
                ? "bg-[#534AB7] border-[#534AB7] text-white"
                : "bg-white border-[#EAE7DE] hover:bg-[#F5F3EE]"
            }`}
          >
            <div className={`text-[11px] font-semibold ${layer === m.id ? "text-white" : "text-[#1C1B18]"}`}>
              {m.label}
            </div>
            <div className={`text-[10px] mt-0.5 ${layer === m.id ? "text-white/70" : "text-[#9B9690]"}`}>
              {m.description}
            </div>
          </button>
        ))}
      </div>
      {/* Legend for active layer */}
      {LAYER_META.find(m => m.id === layer)?.legend?.length ? (
        <div className="px-5 pt-4 space-y-1.5">
          {LAYER_META.find(m => m.id === layer)!.legend.map(l => (
            <div key={l.label} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
              <span className="text-[11px] text-[#6B6860]">{l.label}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ─── Exported panel ───────────────────────────────────────────────────────────

export interface DetailPanelProps {
  snapshot:     BodySnapshot | null;
  layer:        VisualizationLayer;
  onLayerChange: (l: VisualizationLayer) => void;
  selected:     MuscleRecord | null;
  onDeselect:   () => void;
  className?:   string;
}

type Tab = "details" | "exercises";

export function DetailPanel({
  snapshot,
  layer,
  onLayerChange,
  selected,
  onDeselect,
  className = "",
}: DetailPanelProps) {
  const [tab, setTab] = useState<Tab>("details");

  return (
    <div className={`flex flex-col h-full bg-[#FAF9F5] ${className}`}>
      {/* Header strip */}
      <div className="flex-shrink-0 border-b border-[#EAE7DE] bg-white">
        {selected ? (
          <>
            {/* Back row */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#F0EDE4]">
              <button
                onClick={onDeselect}
                aria-label="Back to overview"
                className="w-7 h-7 flex items-center justify-center rounded-full text-[#9B9690] hover:text-[#1C1B18] hover:bg-[#F1EFE8] transition-colors"
              >
                <AxisIcon name="back" size={13} strokeWidth={2.5} />
              </button>
              <span className="text-[11px] text-[#9B9690]">All muscles</span>
            </div>

            {/* Muscle name + status */}
            <div className="px-5 py-3">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: STATUS_COLOR[selected.status] }} />
                <span className="text-[13px] font-semibold text-[#1C1B18]">{selected.displayName}</span>
                {selected.side !== "bilateral" && (
                  <span className="text-[11px] text-[#9B9690] capitalize">({selected.side})</span>
                )}
              </div>
              <div className="text-[11px] font-medium mt-0.5" style={{ color: STATUS_COLOR[selected.status] }}>
                {STATUS_LABEL[selected.status]}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex">
              {(["details", "exercises"] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 text-[12px] font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#534AB7] ${
                    tab === t
                      ? "text-[#534AB7] border-b-2 border-[#534AB7]"
                      : "text-[#9B9690] hover:text-[#1C1B18]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="h-11 px-5 flex items-center">
            <span className="text-[12px] font-semibold text-[#1C1B18]">Body Intelligence</span>
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          tab === "details"
            ? <DetailTab muscle={selected} />
            : <ExerciseIntelligencePanel muscle={selected} />
        ) : (
          snapshot
            ? (
              <div className="pb-6">
                <BodyOverview snapshot={snapshot} />
                <div className="mt-4">
                  <Divider />
                  <LayerPicker layer={layer} onChange={onLayerChange} />
                </div>
              </div>
            )
            : (
              <div className="flex items-center justify-center h-40">
                <div className="w-6 h-6 rounded-full border-2 border-[#534AB7] border-t-transparent animate-spin" />
              </div>
            )
        )}
      </div>
    </div>
  );
}
