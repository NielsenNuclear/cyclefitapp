"use client";

import type { BodySnapshot, MuscleRecord, VisualizationLayer } from "@/lib/bodyIntelligence/BodyStateEngine";
import { STATUS_COLOR, STATUS_LABEL, LAYER_META }               from "../rendering/OverlaySystem";
import { OverlaySelector }                                       from "./OverlaySelector";

// ─── Status priority ──────────────────────────────────────────────────────────

const STATUS_ORDER: MuscleRecord["status"][] = [
  "training", "injured", "fatigued", "recovering", "secondary", "ready", "rest",
];

// ─── Shared primitives ────────────────────────────────────────────────────────

function SideSection({
  title,
  children,
  noPad,
}: {
  title:    string;
  children: React.ReactNode;
  noPad?:   boolean;
}) {
  return (
    <div className={`mb-5 ${noPad ? "" : "px-4"}`}>
      <div className={`text-[9px] font-bold uppercase tracking-[0.14em] text-[#B0ADA6] mb-2 ${noPad ? "px-4" : ""}`}>
        {title}
      </div>
      {children}
    </div>
  );
}

// ─── Recovery ring ────────────────────────────────────────────────────────────

function RecoveryRing({ pct }: { pct: number }) {
  const r     = 26;
  const circ  = 2 * Math.PI * r;
  const dash  = Math.max(0, Math.min(pct / 100, 1)) * circ;
  const color =
    pct >= 75 ? "#0F6E56" :
    pct >= 50 ? "#534AB7" :
    pct >= 30 ? "#854F0B" : "#C0392B";
  const label =
    pct >= 80 ? "Excellent" :
    pct >= 60 ? "Good" :
    pct >= 40 ? "Moderate" : "Low";

  return (
    <div className="flex items-center gap-3">
      <svg width="64" height="64" viewBox="0 0 64 64" className="flex-shrink-0 -rotate-90">
        <circle
          cx="32" cy="32" r={r}
          fill="none"
          stroke="#EAE7DE"
          strokeWidth="5.5"
        />
        <circle
          cx="32" cy="32" r={r}
          fill="none"
          stroke={color}
          strokeWidth="5.5"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div>
        <div className="text-[22px] font-bold text-[#1C1B18] leading-none">{pct}<span className="text-[13px] font-medium text-[#9B9690]">%</span></div>
        <div className="text-[11px] font-semibold mt-0.5" style={{ color }}>{label}</div>
        <div className="text-[10px] text-[#9B9690] mt-0.5">avg recovery</div>
      </div>
    </div>
  );
}

// ─── Left sidebar ─────────────────────────────────────────────────────────────

export interface LeftSidebarProps {
  snapshot:     BodySnapshot | null;
  layer:        VisualizationLayer;
  onLayerChange: (l: VisualizationLayer) => void;
}

export function LeftSidebar({ snapshot, layer, onLayerChange }: LeftSidebarProps) {
  const muscles = snapshot?.muscles ?? [];

  // Deduplicate bilateral muscles (show each muscle group once)
  const seen     = new Set<string>();
  const unique: MuscleRecord[] = [];
  for (const m of muscles) {
    const base = m.id.replace(/_(?:left|right)$/, "");
    if (!seen.has(base)) { seen.add(base); unique.push(m); }
  }

  // Status counts
  const counts: Partial<Record<MuscleRecord["status"], number>> = {};
  for (const m of unique) {
    counts[m.status] = (counts[m.status] ?? 0) + 1;
  }

  // Average recovery
  const avgRecovery = unique.length
    ? Math.round(unique.reduce((s, m) => s + m.recoveryPct, 0) / unique.length)
    : null;

  // Today's training targets (primary + secondary)
  const focusToday = unique.filter(m => m.status === "training" || m.status === "secondary");

  // Legend for active layer
  const activeLegend = LAYER_META.find(m => m.id === layer)?.legend ?? [];

  return (
    <div className="h-full flex flex-col overflow-y-auto overflow-x-hidden py-5 scrollbar-none">

      {/* Readiness */}
      <SideSection title="Readiness">
        {avgRecovery !== null ? (
          <RecoveryRing pct={avgRecovery} />
        ) : (
          <div className="h-16 flex items-center">
            <div className="w-5 h-5 rounded-full border-2 border-[#534AB7] border-t-transparent animate-spin" />
          </div>
        )}
      </SideSection>

      {/* Today's focus */}
      {focusToday.length > 0 && (
        <SideSection title="Today's Focus">
          <div className="space-y-1.5">
            {focusToday.map(m => (
              <div key={m.id} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: STATUS_COLOR[m.status] }}
                />
                <span className="text-[12px] text-[#1C1B18] leading-none">{m.displayName}</span>
              </div>
            ))}
          </div>
        </SideSection>
      )}

      {/* Muscle status breakdown */}
      {unique.length > 0 && (
        <SideSection title="Muscles">
          <div className="space-y-1.5">
            {STATUS_ORDER.filter(s => (counts[s] ?? 0) > 0).map(s => (
              <div key={s} className="flex items-center gap-2.5">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: STATUS_COLOR[s] }}
                />
                <span className="text-[11px] text-[#6B6860] flex-1 leading-none">{STATUS_LABEL[s]}</span>
                <span className="text-[11px] font-semibold text-[#1C1B18] tabular-nums">
                  {counts[s]}
                </span>
              </div>
            ))}
          </div>
        </SideSection>
      )}

      {/* Divider */}
      <div className="h-px bg-[#EAE7DE]/60 mx-4 mb-5" />

      {/* Overlay selector */}
      <SideSection title="Visualization" noPad>
        <div className="px-2">
          <OverlaySelector layer={layer} onChange={onLayerChange} variant="vertical" />
        </div>
      </SideSection>

      {/* Active layer legend */}
      {activeLegend.length > 0 && (
        <SideSection title="Legend">
          <div className="space-y-1.5">
            {activeLegend.map(l => (
              <div key={l.label} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: l.color }}
                />
                <span className="text-[11px] text-[#6B6860]">{l.label}</span>
              </div>
            ))}
          </div>
        </SideSection>
      )}
    </div>
  );
}
