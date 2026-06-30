"use client";

import type {
  BodyIntelligenceSnapshot,
  MuscleGroupState,
  VisualizationMode,
  MuscleState,
} from "@/lib/bodyIntelligence/bodyIntelligenceTypes";
import { STATE_COLOR, STATE_LABEL } from "@/lib/bodyIntelligence/bodyIntelligenceTypes";
import { MuscleDetailPanel } from "./MuscleDetailPanel";
import { ExerciseExplorer }  from "./ExerciseExplorer";
import { VisualizationControls } from "./VisualizationControls";

type PanelTab = "details" | "exercises";

// ─── Body overview (shown when nothing is selected) ───────────────────────────

const TOP_STATES: MuscleState[] = [
  "scheduled", "injured", "overloaded", "fatigued",
  "recovering", "recently_trained", "recovered",
];

function StatePill({ state, count }: { state: MuscleState; count: number }) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-2 py-2 border-b border-[#F0EDE4] last:border-0">
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATE_COLOR[state] }} />
      <span className="text-[12px] text-[#6B6860] capitalize flex-1">{STATE_LABEL[state] ?? state.replace(/_/g, " ")}</span>
      <span className="text-[12px] font-semibold text-[#1C1B18]">{count}</span>
    </div>
  );
}

function BodyOverview({ snapshot }: { snapshot: BodyIntelligenceSnapshot }) {
  const counts: Partial<Record<MuscleState, number>> = {};
  // Count unique muscle groups (de-duplicate bilateral L/R)
  const seen = new Set<string>();
  for (const m of snapshot.muscles) {
    const baseId = m.id.replace(/_(?:left|right)$/, "");
    if (seen.has(baseId)) continue;
    seen.add(baseId);
    counts[m.state] = (counts[m.state] ?? 0) + 1;
  }

  const hasAny = TOP_STATES.some(s => (counts[s] ?? 0) > 0);

  return (
    <div className="p-5 space-y-5">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9B9690] mb-3">
          Muscle Status
        </div>
        {hasAny ? (
          <div className="bg-white rounded-2xl border border-[#EAE7DE] px-4 py-1">
            {TOP_STATES.map(s => (
              <StatePill key={s} state={s} count={counts[s] ?? 0} />
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-[#9B9690] leading-relaxed">
            Log workouts to build your muscle status map.
          </p>
        )}
      </div>

      <div className="bg-[#F5F3EE] rounded-2xl px-4 py-3.5 flex items-start gap-3">
        <div className="w-5 h-5 rounded-full bg-[#EEEDFE] flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
            stroke="#534AB7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className="text-[11px] text-[#6B6860] leading-relaxed">
          Click any highlighted muscle on the 3D body to see its recovery status, training history, and recommended exercises.
        </p>
      </div>
    </div>
  );
}

// ─── Selected muscle content ──────────────────────────────────────────────────

interface SelectedMuscleContentProps {
  muscle:    MuscleGroupState;
  tab:       PanelTab;
  onTabChange: (t: PanelTab) => void;
  onClose:   () => void;
}

function SelectedMuscleContent({ muscle, tab, onTabChange, onClose }: SelectedMuscleContentProps) {
  return (
    <>
      {/* Tab bar */}
      <div className="flex-shrink-0 flex border-b border-[#EAE7DE] bg-white">
        {(["details", "exercises"] as PanelTab[]).map(t => (
          <button
            key={t}
            onClick={() => onTabChange(t)}
            className={`flex-1 py-3 text-[13px] font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#534AB7] focus-visible:ring-inset ${
              tab === t
                ? "text-[#534AB7] border-b-2 border-[#534AB7]"
                : "text-[#9B9690] hover:text-[#1C1B18]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "details" ? (
          <MuscleDetailPanel muscle={muscle} onClose={onClose} />
        ) : (
          <ExerciseExplorer muscle={muscle} />
        )}
      </div>
    </>
  );
}

// ─── Exported panel ───────────────────────────────────────────────────────────

export interface BodyPanelProps {
  snapshot:     BodyIntelligenceSnapshot | null;
  mode:         VisualizationMode;
  onModeChange: (m: VisualizationMode) => void;
  selected:     MuscleGroupState | null;
  onDeselect:   () => void;
  tab:          PanelTab;
  onTabChange:  (t: PanelTab) => void;
  className?:   string;
}

export function BodyPanel({
  snapshot,
  mode,
  onModeChange,
  selected,
  onDeselect,
  tab,
  onTabChange,
  className = "",
}: BodyPanelProps) {
  return (
    <div className={`flex flex-col h-full bg-[#FAF9F5] overflow-hidden ${className}`}>
      {/* Section header — always visible */}
      <div className="flex-shrink-0 border-b border-[#EAE7DE] bg-white">
        {selected ? (
          <div className="h-11 px-4 flex items-center gap-2">
            <button
              onClick={onDeselect}
              aria-label="Back to overview"
              className="w-7 h-7 flex items-center justify-center rounded-full text-[#9B9690] hover:text-[#1C1B18] hover:bg-[#F1EFE8] transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
            <span className="text-[12px] text-[#9B9690]">All muscles</span>
          </div>
        ) : (
          <div className="h-11 px-4 flex items-center">
            <span className="text-[12px] font-semibold text-[#1C1B18]">Intelligence Panel</span>
          </div>
        )}
      </div>

      {selected ? (
        <SelectedMuscleContent
          muscle={selected}
          tab={tab}
          onTabChange={onTabChange}
          onClose={onDeselect}
        />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {snapshot ? (
            <>
              <BodyOverview snapshot={snapshot} />
              <div className="px-5 pb-5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9B9690] mb-3">
                  Visualization Mode
                </div>
                <VisualizationControls mode={mode} onChange={onModeChange} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="w-6 h-6 rounded-full border-2 border-[#534AB7] border-t-transparent animate-spin" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
