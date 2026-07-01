"use client";

import { useState } from "react";
import type { MuscleRecord, VisualizationLayer } from "@/lib/bodyIntelligence/BodyStateEngine";
import { STATUS_COLOR, STATUS_LABEL }            from "../rendering/OverlaySystem";
import { getMuscleGroupById }                    from "@/lib/bodyIntelligence/muscleGroups";
import { ExerciseIntelligencePanel }             from "./ExerciseIntelligencePanel";

// ─── Shared primitives ────────────────────────────────────────────────────────

function Chip({
  label,
  color,
  bg,
}: {
  label: string;
  color: string;
  bg:    string;
}) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold leading-none"
      style={{ color, backgroundColor: bg }}
    >
      {label}
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label:   string;
  value:   string;
  sub?:    string;
  accent?: string;
}) {
  return (
    <div className="flex-1 min-w-0 bg-[#F8F6F1] rounded-[12px] px-3 py-2.5">
      <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#B0ADA6] mb-1">{label}</div>
      <div
        className="text-[14px] font-bold leading-none truncate"
        style={{ color: accent ?? "#1C1B18" }}
      >
        {value}
      </div>
      {sub && <div className="text-[10px] text-[#9B9690] mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

// ─── Recovery arc ─────────────────────────────────────────────────────────────

function RecoveryArc({ pct }: { pct: number }) {
  const r      = 44;
  const circ   = 2 * Math.PI * r;
  const dash   = Math.max(0, Math.min(pct / 100, 1)) * circ;
  const color  =
    pct >= 75 ? "#0F6E56" :
    pct >= 50 ? "#1B5FA0" :
    pct >= 30 ? "#854F0B" : "#C0392B";
  const label  =
    pct >= 80 ? "Excellent" :
    pct >= 60 ? "Good" :
    pct >= 40 ? "Moderate" : "Low";

  return (
    <div className="flex flex-col items-center py-4">
      <div className="relative w-[112px] h-[112px]">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 112 112">
          <circle cx="56" cy="56" r={r} fill="none" stroke="#EAE7DE" strokeWidth="8" />
          <circle
            cx="56" cy="56" r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.9s cubic-bezier(0.4,0,0.2,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[26px] font-bold leading-none" style={{ color }}>
            {pct}
          </div>
          <div className="text-[10px] text-[#9B9690] mt-0.5">%</div>
        </div>
      </div>
      <div className="mt-2 text-[12px] font-semibold" style={{ color }}>{label} Recovery</div>
    </div>
  );
}

// ─── Insight banner ───────────────────────────────────────────────────────────

function InsightBanner({ muscle }: { muscle: MuscleRecord }) {
  const { status, daysSinceTrained, cycleModifier, symptoms } = muscle;

  let icon  = "●";
  let bg    = "";
  let border = "";
  let title = "";
  let body  = "";
  let textColor = "";
  let titleColor = "";

  if (status === "training") {
    bg = "#EEEDFE"; border = "#C4C1F5"; titleColor = "#3C3489"; textColor = "#4B4299";
    title = "Today's Focus";
    body  = "Recovery and readiness support high-intensity work on this muscle today.";
  } else if (status === "injured") {
    bg = "#FDF3F2"; border = "#F5C6C1"; titleColor = "#5C1A14"; textColor = "#5C1A14";
    title = "Injury Flag";
    body  = "Exercises targeting this area have been automatically substituted in your workouts.";
  } else if (status === "fatigued") {
    bg = "#FAEEDA"; border = "#E4C88A"; titleColor = "#633806"; textColor = "#7A5A1A";
    title = "Elevated Fatigue";
    body  = "Accumulated volume is high. Lighter loads or an extra rest day will speed recovery.";
  } else if (daysSinceTrained !== null && daysSinceTrained >= 6) {
    bg = "#F5F3EE"; border = "#EAE7DE"; titleColor = "#1C1B18"; textColor = "#6B6860";
    title = `${daysSinceTrained}d Without Training`;
    body  = `This group hasn't been targeted in ${daysSinceTrained} days — fully recovered and available.`;
  } else if (cycleModifier > 0.1) {
    bg = "#F0FBF7"; border = "#A8E0CE"; titleColor = "#0A4D3B"; textColor = "#0F6E56";
    icon  = "↑";
    title = "Cycle Advantage";
    body  = "Your hormonal phase is favourable for high-intensity work here.";
  } else {
    return null;
  }

  return (
    <div
      className="mx-5 rounded-[14px] p-3.5 border"
      style={{ background: bg, borderColor: border }}
    >
      <div className="flex items-start gap-2">
        <div
          className="text-[13px] font-bold leading-none mt-0.5 flex-shrink-0"
          style={{ color: titleColor }}
        >
          {icon}
        </div>
        <div>
          <div className="text-[11px] font-semibold mb-1" style={{ color: titleColor }}>
            {title}
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: textColor }}>
            {body}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Detail body (overview tab) ───────────────────────────────────────────────

function OverviewContent({ muscle }: { muscle: MuscleRecord }) {
  const def = getMuscleGroupById(muscle.id.replace(/_(?:left|right)$/, ""));

  const lastTrained =
    muscle.lastTrainedDate === null ? "No history"
    : muscle.daysSinceTrained === 0 ? "Today"
    : muscle.daysSinceTrained === 1 ? "Yesterday"
    : `${muscle.daysSinceTrained}d ago`;

  const fatigueColor =
    muscle.fatigueLevel === "low" ? "#0F6E56" :
    muscle.fatigueLevel === "moderate" ? "#854F0B" : "#C0392B";

  return (
    <div className="pb-6">
      {/* Description */}
      {def?.description && (
        <p className="px-5 pt-4 text-[12px] text-[#6B6860] leading-[1.7]">
          {def.description}
        </p>
      )}

      {/* Recovery arc */}
      <RecoveryArc pct={muscle.recoveryPct} />

      {/* Stat cards row */}
      <div className="px-5 flex gap-2 mb-4">
        <StatCard
          label="Fatigue"
          value={muscle.fatigueLevel === "low" ? "Low" : muscle.fatigueLevel === "moderate" ? "Moderate" : "High"}
          accent={fatigueColor}
        />
        <StatCard
          label="Last Trained"
          value={lastTrained}
        />
        <StatCard
          label="This Week"
          value={muscle.weeklyVolume > 0 ? `${muscle.weeklyVolume}` : "—"}
          sub={muscle.weeklyVolume > 0 ? "sets" : undefined}
        />
      </div>

      {/* Volume vs MRV */}
      {muscle.volumePct > 0 && (
        <div className="mx-5 mb-4">
          <div className="flex justify-between text-[11px] mb-1.5">
            <span className="text-[#9B9690]">Volume vs MRV</span>
            <span
              className="font-semibold"
              style={{
                color: muscle.volumePct >= 80 ? "#C0392B" :
                       muscle.volumePct >= 60 ? "#854F0B" : "#0F6E56",
              }}
            >
              {muscle.volumePct}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-[#EAE7DE] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${muscle.volumePct}%`,
                backgroundColor:
                  muscle.volumePct >= 80 ? "#C0392B" :
                  muscle.volumePct >= 60 ? "#854F0B" : "#0F6E56",
              }}
            />
          </div>
        </div>
      )}

      {/* Cycle modifier */}
      {muscle.cycleModifier !== 0 && (
        <div className="mx-5 mb-4 flex items-center gap-2">
          <span className="text-[11px] text-[#9B9690]">Cycle influence</span>
          <span
            className="text-[11px] font-semibold"
            style={{ color: muscle.cycleModifier > 0 ? "#0F6E56" : "#854F0B" }}
          >
            {muscle.cycleModifier > 0 ? "↑ Positive" : "↓ Reduce volume"}
          </span>
        </div>
      )}

      {/* Symptoms */}
      {muscle.symptoms.length > 0 && (
        <>
          <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#B0ADA6] px-5 mb-2">
            Reported Symptoms
          </div>
          <div className="px-5 space-y-2 mb-4">
            {muscle.symptoms.map((s, i) => (
              <div
                key={i}
                className="bg-[#FDF3F2] border border-[#F5C6C1] rounded-xl px-3 py-2.5 flex items-center justify-between"
              >
                <span className="text-[12px] text-[#5C1A14] capitalize">{s.label || s.symptomId}</span>
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
        </>
      )}

      {/* Insight banner */}
      <InsightBanner muscle={muscle} />
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type PanelTab = "overview" | "exercises";

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
        style={{ background: "#EEEDFE" }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      </div>
      <div>
        <div className="text-[14px] font-semibold text-[#1C1B18] mb-1">Select a region</div>
        <p className="text-[12px] text-[#9B9690] leading-relaxed max-w-[200px]">
          Click any highlighted area on the body to explore its recovery, training history, and recommended exercises.
        </p>
      </div>
    </div>
  );
}

// ─── Exported panel ───────────────────────────────────────────────────────────

export interface RegionDetailsPanelProps {
  selected:   MuscleRecord | null;
  onDeselect: () => void;
  layer?:     VisualizationLayer;
  className?: string;
}

export function RegionDetailsPanel({
  selected,
  onDeselect,
  className = "",
}: RegionDetailsPanelProps) {
  const [tab, setTab] = useState<PanelTab>("overview");

  // Reset tab when selection changes
  const key = selected?.id ?? "empty";

  if (!selected) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        {/* Panel header */}
        <div className="flex-shrink-0 px-5 py-4 border-b border-[#EAE7DE]/60">
          <div className="text-[13px] font-semibold text-[#1C1B18]">Region Details</div>
          <div className="text-[11px] text-[#9B9690] mt-0.5">Tap a muscle to explore</div>
        </div>
        <EmptyState />
      </div>
    );
  }

  const statusColor = STATUS_COLOR[selected.status];
  const chipBg =
    selected.status === "training"  ? "#EEEDFE" :
    selected.status === "injured"   ? "#FDF3F2" :
    selected.status === "fatigued"  ? "#FAEEDA" :
    selected.status === "ready"     ? "#EBF8F3" :
    selected.status === "recovering" ? "#E8F0FA" :
    "#F5F3EE";

  return (
    <div key={key} className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 border-b border-[#EAE7DE]/60">
        {/* Back row */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-2">
          <button
            onClick={onDeselect}
            aria-label="Back to overview"
            className="w-7 h-7 flex items-center justify-center rounded-full text-[#9B9690] hover:text-[#1C1B18] hover:bg-[#F1EFE8] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#534AB7]"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <span className="text-[11px] text-[#9B9690]">All regions</span>
        </div>

        {/* Muscle identity */}
        <div className="px-5 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-[16px] font-bold text-[#1C1B18] leading-tight">
                {selected.displayName}
              </h2>
              {selected.side !== "bilateral" && (
                <div className="text-[11px] text-[#9B9690] capitalize mt-0.5">{selected.side} side</div>
              )}
            </div>
            <Chip label={STATUS_LABEL[selected.status]} color={statusColor} bg={chipBg} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-[#EAE7DE]/60">
          {(["overview", "exercises"] as PanelTab[]).map(t => (
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
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "overview"
          ? <OverviewContent muscle={selected} />
          : <ExerciseIntelligencePanel muscle={selected} />
        }
      </div>
    </div>
  );
}
