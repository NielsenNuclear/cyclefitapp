// ─── lib/movement/recoveryFinishers.ts ────────────────────────────────────────
// Builds a 5–10 minute recovery / cooldown block after the main workout.

import type { SplitType }        from "@/lib/exercises/workoutSplits";
import type { MovementReadiness } from "./movementReadiness";
import type { MobilityItem }     from "./generateWarmup";
import type { MobilityEntry }    from "./mobilityLibrary";
import { MOBILITY_LIBRARY, filterByEquipment, formatDuration } from "./mobilityLibrary";

// ─── Public type ──────────────────────────────────────────────────────────────

export interface RecoveryBlock {
  stretches:    MobilityItem[];
  breathwork?:  string;          // optional breathing protocol text
  totalMinutes: number;
}

// ─── Split-specific cooldown sequences ────────────────────────────────────────

const SPLIT_COOLDOWN: Record<string, string[]> = {
  leg:    ["standing_hamstring", "standing_quad", "hip_flexor_stretch", "wall_calf_stretch", "pigeon_stretch"],
  push:   ["cross_body_stretch", "thread_needle", "open_book", "wrist_flexor"],
  pull:   ["standing_hamstring", "open_book", "cat_cow", "cross_body_stretch"],
  upper:  ["cross_body_stretch", "neck_side_stretch", "open_book", "wrist_flexor"],
  full:   ["worlds_greatest", "hip_flexor_stretch", "cat_cow", "open_book", "neck_side_stretch"],
};

function getDayKey(dayName: string): string {
  const d = dayName.toLowerCase();
  if (d.includes("leg") || d.includes("lower"))  return "leg";
  if (d.includes("push") || d.includes("chest")) return "push";
  if (d.includes("pull") || d.includes("back"))  return "pull";
  if (d.includes("upper"))                        return "upper";
  return "full";
}

function toItem(entry: MobilityEntry, note?: string): MobilityItem {
  return { id: entry.id, name: entry.name, duration: formatDuration(entry), notes: note };
}

// ─── Breathwork protocols ─────────────────────────────────────────────────────

const BREATHWORK: Record<string, string> = {
  high_stress: "Box breathing: 4s inhale → 4s hold → 4s exhale → 4s hold. 5 rounds.",
  poor_sleep:  "4-7-8 breathing: 4s inhale → 7s hold → 8s exhale. 4 rounds.",
  normal:      "",
};

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateRecoveryFinisher(input: {
  splitType:         SplitType;
  dayName:           string;
  movementReadiness: MovementReadiness;
  stressLevel:       number;   // 1–10
  sleepQuality:      string;   // "excellent" | "good" | "variable" | "poor"
  userEquipment:     string[];
}): RecoveryBlock {
  const { dayName, movementReadiness, stressLevel, sleepQuality, userEquipment } = input;

  const dayKey  = getDayKey(dayName);
  const baseIds = SPLIT_COOLDOWN[dayKey] ?? SPLIT_COOLDOWN.full;

  // Extra items for focus areas from movement readiness
  const focusIds = movementReadiness.focusAreas.flatMap(region =>
    MOBILITY_LIBRARY
      .filter(m =>
        m.bodyRegion === region &&
        (m.category === "static_stretch" || m.category === "recovery_mobility")
      )
      .slice(0, 1)
      .map(m => m.id)
  );

  const allIds    = [...new Set([...baseIds, ...focusIds])];
  const stretches = allIds
    .map(id => MOBILITY_LIBRARY.find(m => m.id === id))
    .filter((m): m is MobilityEntry => m !== undefined)
    .filter(m => filterByEquipment([m], userEquipment).length > 0)
    .slice(0, movementReadiness.extendedWarmup ? 7 : 5)
    .map(m => toItem(m));

  // Breathwork selection
  const isHighStress = stressLevel >= 7;
  const isPoorSleep  = sleepQuality === "poor" || sleepQuality === "variable";
  const breathwork   = isHighStress
    ? BREATHWORK.high_stress
    : isPoorSleep
    ? BREATHWORK.poor_sleep
    : undefined;

  const stretchSecs   = stretches.reduce((s, _) => s + 45, 0);
  const breathSecs    = breathwork ? 120 : 0;
  const totalMinutes  = Math.max(5, Math.round((stretchSecs + breathSecs) / 60));

  return { stretches, breathwork: breathwork || undefined, totalMinutes };
}
