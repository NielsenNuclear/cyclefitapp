/**
 * OverlaySystem
 *
 * Pure functions. No React, no Three.js imports.
 * Maps (MuscleRecord, VisualizationLayer, InteractionState) → visual properties.
 *
 * This is the single source of truth for all muscle coloring.
 * Adding a new visualization layer = adding a case here only.
 */

import type { MuscleRecord, MuscleStatus, VisualizationLayer } from "@/lib/bodyIntelligence/BodyStateEngine";

// ─── Semantic colors (design-system aligned) ──────────────────────────────────

export const STATUS_COLOR: Record<MuscleStatus, string> = {
  training:   "#534AB7",  // brand purple
  secondary:  "#8B84D4",  // lighter purple
  recovering: "#1B5FA0",  // blue
  ready:      "#0F6E56",  // success green
  fatigued:   "#854F0B",  // warning amber
  injured:    "#C0392B",  // error red
  protected:  "#9B9690",  // neutral grey
  rest:       "#C8C5BC",  // light grey
  unknown:    "#EAE7DE",  // surface
};

export const STATUS_LABEL: Record<MuscleStatus, string> = {
  training:   "Today's Focus",
  secondary:  "Secondary Target",
  recovering: "Recovering",
  ready:      "Ready",
  fatigued:   "Elevated Fatigue",
  injured:    "Injury Flag",
  protected:  "Protected",
  rest:       "Rest Day",
  unknown:    "No Data",
};

// ─── Overlay appearance ────────────────────────────────────────────────────────

export interface OverlayAppearance {
  color:     string;   // hex — base fill
  emissive:  string;   // hex — glow color
  opacity:   number;   // 0–1
  pulse:     boolean;  // animated beat
}

export function getOverlayAppearance(
  muscle:     MuscleRecord,
  layer:      VisualizationLayer,
  isHovered:  boolean,
  isSelected: boolean,
): OverlayAppearance {
  const color  = layerColor(muscle, layer);
  const inert  = color === STATUS_COLOR.unknown;

  const baseOp = inert ? 0 : 0.82;
  const opacity = inert
    ? 0
    : isSelected ? 1.0
    : isHovered  ? 0.96
    : baseOp;

  const pulse = !inert && (muscle.status === "training" || muscle.status === "injured");

  return { color, emissive: color, opacity, pulse };
}

// ─── Per-layer color logic ────────────────────────────────────────────────────

function layerColor(muscle: MuscleRecord, layer: VisualizationLayer): string {
  switch (layer) {

    case "status":
      return STATUS_COLOR[muscle.status];

    case "recovery":
      if (muscle.recoveryPct >= 80) return "#0F6E56";
      if (muscle.recoveryPct >= 60) return "#1B5FA0";
      if (muscle.recoveryPct >= 40) return "#854F0B";
      return "#C0392B";

    case "fatigue":
      if (muscle.fatigueLevel === "low")      return "#0F6E56";
      if (muscle.fatigueLevel === "moderate") return "#854F0B";
      return "#C0392B";

    case "injury":
      if (muscle.status === "injured")   return "#C0392B";
      if (muscle.status === "protected") return "#9B9690";
      if (muscle.symptoms.length > 0)    return "#854F0B";
      return STATUS_COLOR.unknown;

    case "volume":
      if (muscle.volumePct >= 80) return "#C0392B";
      if (muscle.volumePct >= 60) return "#854F0B";
      if (muscle.volumePct >= 30) return "#0F6E56";
      return STATUS_COLOR.unknown;

    case "frequency":
      if (muscle.weeklyFrequency >= 3) return "#534AB7";
      if (muscle.weeklyFrequency >= 2) return "#1B5FA0";
      if (muscle.weeklyFrequency >= 1) return "#0F6E56";
      return STATUS_COLOR.unknown;

    case "cycle":
      if (muscle.cycleModifier > 0.1)  return "#0F6E56";
      if (muscle.cycleModifier < -0.1) return "#854F0B";
      return "#C8C5BC";

    case "mobility":
      return muscle.mobilityFlag ? "#854F0B" : STATUS_COLOR.unknown;

    default:
      return STATUS_COLOR.unknown;
  }
}

// ─── Layer metadata (for UI labels and legends) ───────────────────────────────

export interface LayerMeta {
  id:          VisualizationLayer;
  label:       string;
  description: string;
  legend: Array<{ label: string; color: string }>;
}

export const LAYER_META: LayerMeta[] = [
  {
    id: "status", label: "Today", description: "Scheduled vs recovering",
    legend: [
      { label: "Today's Focus",  color: STATUS_COLOR.training   },
      { label: "Secondary",      color: STATUS_COLOR.secondary  },
      { label: "Recovering",     color: STATUS_COLOR.recovering },
      { label: "Ready",          color: STATUS_COLOR.ready      },
      { label: "Fatigued",       color: STATUS_COLOR.fatigued   },
      { label: "Injured",        color: STATUS_COLOR.injured    },
    ],
  },
  {
    id: "recovery", label: "Recovery", description: "Per-muscle recovery %",
    legend: [
      { label: "80–100%", color: "#0F6E56" },
      { label: "60–79%",  color: "#1B5FA0" },
      { label: "40–59%",  color: "#854F0B" },
      { label: "0–39%",   color: "#C0392B" },
    ],
  },
  {
    id: "fatigue", label: "Fatigue", description: "Accumulated fatigue level",
    legend: [
      { label: "Low",      color: "#0F6E56" },
      { label: "Moderate", color: "#854F0B" },
      { label: "High",     color: "#C0392B" },
    ],
  },
  {
    id: "injury", label: "Injury", description: "Symptoms and protection",
    legend: [
      { label: "Injured",    color: "#C0392B" },
      { label: "Symptoms",   color: "#854F0B" },
      { label: "Protected",  color: "#9B9690" },
    ],
  },
  {
    id: "volume", label: "Volume", description: "Weekly sets vs MRV",
    legend: [
      { label: ">80% MRV",  color: "#C0392B" },
      { label: "60–80%",    color: "#854F0B" },
      { label: "<30%",      color: "#0F6E56" },
    ],
  },
  {
    id: "frequency", label: "Frequency", description: "Weekly session count",
    legend: [
      { label: "3+ sessions", color: "#534AB7" },
      { label: "2 sessions",  color: "#1B5FA0" },
      { label: "1 session",   color: "#0F6E56" },
    ],
  },
  {
    id: "cycle", label: "Cycle", description: "Hormonal phase modifier",
    legend: [
      { label: "Positive influence",  color: "#0F6E56" },
      { label: "Reduce volume",       color: "#854F0B" },
      { label: "Neutral",             color: "#C8C5BC" },
    ],
  },
  {
    id: "mobility", label: "Mobility", description: "Restriction flags",
    legend: [
      { label: "Restriction flagged", color: "#854F0B" },
    ],
  },
];
