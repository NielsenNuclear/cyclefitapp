"use client";

/**
 * BodyDebugPanel — removable interaction debugger
 *
 * Shows live state of the interaction pipeline:
 *   hovered mesh ID, hovered region, selected region, mode.
 *
 * TO REMOVE: delete this file and remove <BodyDebugPanel> from
 * BodyIntelligenceViewer.tsx. No other files reference it.
 *
 * Toggle with the keyboard shortcut: Shift+D
 */

import { useState, useEffect } from "react";
import type { MuscleRecord }   from "@/lib/bodyIntelligence/BodyStateEngine";
import type { VisualizationLayer } from "@/lib/bodyIntelligence/BodyStateEngine";
import { STATUS_COLOR, STATUS_LABEL } from "../rendering/OverlaySystem";

export interface BodyDebugState {
  mode:         "hybrid" | "gltf-native" | "placeholder";
  hoveredId:    string | null;
  selectedId:   string | null;
  hovered:      MuscleRecord | null;
  selected:     MuscleRecord | null;
  layer:        VisualizationLayer;
  meshNames:    string[];
  anchorCount:  number;
  muscleCount:  number;
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-start gap-2 py-0.5">
      <span className="text-[10px] text-[#9B9690] flex-shrink-0 w-[110px] leading-[1.5]">{label}</span>
      <span
        className="text-[10px] font-mono leading-[1.5] break-all"
        style={{ color: accent ?? "#E8E5DE" }}
      >
        {value}
      </span>
    </div>
  );
}

function StatusDot({ status }: { status: MuscleRecord["status"] }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full mr-1.5 flex-shrink-0"
      style={{ backgroundColor: STATUS_COLOR[status], verticalAlign: "middle" }}
    />
  );
}

export function BodyDebugPanel({ state }: { state: BodyDebugState }) {
  const [visible, setVisible] = useState(true);

  // Shift+D toggles the panel
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.shiftKey && e.key === "D") setVisible(v => !v);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="absolute top-16 right-4 z-50 text-[9px] text-[#9B9690] bg-[rgba(28,27,24,0.55)] hover:bg-[rgba(28,27,24,0.75)] rounded-lg px-2 py-1 transition-colors"
        style={{ backdropFilter: "blur(6px)", fontFamily: "monospace" }}
        aria-label="Show debug panel (Shift+D)"
      >
        DEBUG
      </button>
    );
  }

  const modeColor =
    state.mode === "hybrid"      ? "#FFB347" :
    state.mode === "gltf-native" ? "#0F6E56" : "#9B9690";

  return (
    <div
      className="absolute top-16 right-4 z-50 rounded-2xl overflow-hidden select-none"
      style={{
        background:          "rgba(14,13,11,0.88)",
        backdropFilter:      "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border:              "1px solid rgba(255,255,255,0.08)",
        width:               280,
        fontFamily:          "monospace",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#FF5F57] flex-shrink-0" />
          <span className="text-[10px] font-bold text-white/80 tracking-wider uppercase">
            Body Debug
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-[#9B9690]">Shift+D</span>
          <button
            onClick={() => setVisible(false)}
            className="w-5 h-5 flex items-center justify-center rounded text-[#9B9690] hover:text-white hover:bg-white/10 transition-colors text-[11px]"
            aria-label="Hide debug panel"
          >
            ×
          </button>
        </div>
      </div>

      <div className="px-3 py-2 space-y-0.5">
        {/* Mode */}
        <Row
          label="Renderer mode"
          value={state.mode}
          accent={modeColor}
        />
        {state.mode === "hybrid" && (
          <div className="text-[9px] text-[#FFB347]/70 ml-[118px] leading-tight pb-1">
            GLTF skin + overlay patches<br />
            (no muscle_* nodes in GLB)
          </div>
        )}

        <div className="h-px bg-white/10 my-1.5" />

        {/* Mesh info */}
        <Row
          label="GLB meshes"
          value={state.meshNames.length > 0 ? state.meshNames.join(", ") : "none"}
          accent={state.meshNames.length > 0 ? "#A8A5A0" : "#C0392B"}
        />
        <Row label="Muscle_* nodes"
          value={state.meshNames.filter(n => n.startsWith("muscle_")).length.toString()}
          accent={state.meshNames.filter(n => n.startsWith("muscle_")).length > 0 ? "#0F6E56" : "#C0392B"}
        />
        <Row label="Overlay anchors"  value={`${state.anchorCount}`} />
        <Row label="Muscle records"   value={`${state.muscleCount}`} />

        <div className="h-px bg-white/10 my-1.5" />

        {/* Hover */}
        <Row
          label="Hovered ID"
          value={state.hoveredId ?? "—"}
          accent={state.hoveredId ? "#C4C1F5" : "#4A4845"}
        />
        {state.hovered ? (
          <div className="ml-[118px] text-[9px] leading-tight pb-0.5" style={{ color: STATUS_COLOR[state.hovered.status] }}>
            <StatusDot status={state.hovered.status} />
            {STATUS_LABEL[state.hovered.status]} · {state.hovered.recoveryPct}% recovery
          </div>
        ) : null}

        <div className="h-px bg-white/10 my-1.5" />

        {/* Selection */}
        <Row
          label="Selected ID"
          value={state.selectedId ?? "—"}
          accent={state.selectedId ? "#8B84D4" : "#4A4845"}
        />
        {state.selected ? (
          <div className="ml-[118px] text-[9px] leading-tight pb-0.5" style={{ color: STATUS_COLOR[state.selected.status] }}>
            <StatusDot status={state.selected.status} />
            {state.selected.displayName} · {state.selected.fatigueLevel} fatigue
          </div>
        ) : null}

        <div className="h-px bg-white/10 my-1.5" />

        {/* Layer */}
        <Row label="Active layer" value={state.layer} />

        {/* Raycast hint */}
        <div className="h-px bg-white/10 my-1.5" />
        <div className="text-[9px] text-[#4A4845] leading-tight py-0.5">
          {state.mode === "hybrid"
            ? "Raycast: patches only (GLTF raycast disabled)"
            : "Raycast: muscle_* mesh nodes"}
        </div>
        {state.mode === "hybrid" && (
          <div className="text-[9px] leading-tight py-0.5" style={{ color: "#FFB347" }}>
            Next step: split mesh in Blender → rename muscle_* → re-export → GltfBody
          </div>
        )}
      </div>
    </div>
  );
}
