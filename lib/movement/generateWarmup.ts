// ─── lib/movement/generateWarmup.ts ───────────────────────────────────────────
// Builds a WarmupBlock from split, movement readiness, symptoms, and equipment.

import type { SplitType }        from "@/lib/exercises/workoutSplits";
import type { MovementReadiness } from "./movementReadiness";
import type { SymptomModifier }  from "./symptomMovementModifiers";
import type { MobilityEntry }    from "./mobilityLibrary";
import {
  MOBILITY_LIBRARY,
  CARDIO_WARMUPS,
  getMobilityByCategory,
  filterByEquipment,
  formatDuration,
} from "./mobilityLibrary";

// ─── Public types (re-exported for use in GeneratedWorkout) ───────────────────

export interface MobilityItem {
  id:       string;
  name:     string;
  duration: string;   // formatted: "30s" | "10 reps" | "45s each side"
  notes?:   string;
}

export interface WarmupBlock {
  cardio: {
    name:      string;
    duration:  string;
    intensity: string;
  };
  mobility:     MobilityItem[];
  activation:   MobilityItem[];
  totalMinutes: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toItem(entry: MobilityEntry, note?: string): MobilityItem {
  return {
    id:       entry.id,
    name:     entry.name,
    duration: formatDuration(entry),
    notes:    note,
  };
}

function pickCardio(
  userEquipment: string[],
  splitType:     SplitType,
): WarmupBlock["cardio"] {
  const equipSet = new Set(userEquipment);

  // Prefer split-appropriate cardio
  const preferRow = splitType === "push_pull_legs" || splitType === "upper_lower";
  const preferBike = splitType === "push_pull_legs";

  const ordered = CARDIO_WARMUPS.filter(c =>
    c.equipment.length === 0 || c.equipment.some(e => equipSet.has(e))
  );

  if (preferRow && ordered.find(c => c.id === "rower")) {
    const rower = ordered.find(c => c.id === "rower")!;
    return { name: rower.name, duration: "5 min", intensity: rower.intensityNote };
  }
  if (preferBike && ordered.find(c => c.id === "bike_erg" || c.id === "assault_bike")) {
    const bike = ordered.find(c => c.id === "bike_erg" || c.id === "assault_bike")!;
    return { name: bike.name, duration: "5 min", intensity: bike.intensityNote };
  }

  const fallback = ordered[0] ?? CARDIO_WARMUPS.find(c => c.id === "march")!;
  return { name: fallback.name, duration: "5 min", intensity: fallback.intensityNote };
}

// ─── Split-specific mobility sequences ────────────────────────────────────────

const SPLIT_MOBILITY: Record<SplitType | "full_body", string[]> = {
  upper_lower: {
    upper: ["cross_body_stretch", "shoulder_cars", "thoracic_extension", "open_book", "wrist_flexor"],
    lower: ["worlds_greatest", "hip_cars", "leg_swings", "ninety_ninety", "ankle_circles"],
  } as unknown as string[],   // handled separately below
  push_pull_legs: [] as string[],  // handled by split day logic
  bro_split:      ["cross_body_stretch", "shoulder_cars", "thoracic_extension"],
  full_body:      ["worlds_greatest", "hip_cars", "open_book", "shoulder_cars", "ankle_circles"],
};

function getMobilityIdsForSplit(
  splitType: SplitType,
  dayName:   string,
): string[] {
  const day = dayName.toLowerCase();

  if (day.includes("leg") || day.includes("lower")) {
    return ["worlds_greatest", "hip_cars", "leg_swings", "ninety_ninety", "ankle_circles", "hip_flexor_stretch"];
  }
  if (day.includes("push") || day.includes("chest") || day.includes("shoulder")) {
    return ["cross_body_stretch", "shoulder_cars", "wall_slides", "thoracic_extension", "wrist_flexor"];
  }
  if (day.includes("pull") || day.includes("back") || day.includes("bicep")) {
    return ["open_book", "thread_needle", "shoulder_cars", "wrist_extensor", "forearm_rotations"];
  }
  if (day.includes("upper")) {
    return ["cross_body_stretch", "shoulder_cars", "open_book", "wrist_flexor"];
  }
  // Full body / default
  return ["worlds_greatest", "hip_cars", "open_book", "shoulder_cars", "ankle_circles"];
}

function getActivationIdsForSplit(
  splitType: SplitType,
  dayName:   string,
): string[] {
  const day = dayName.toLowerCase();

  if (day.includes("leg") || day.includes("lower")) {
    return ["bw_squat_act", "glute_bridge_mob", "monster_walk", "single_leg_rdl_act"];
  }
  if (day.includes("push") || day.includes("chest") || day.includes("shoulder")) {
    return ["scap_pushup", "band_pull_apart", "wall_slides", "external_rotation", "dead_bug_mob"];
  }
  if (day.includes("pull") || day.includes("back")) {
    return ["scap_pushup", "band_row_act", "face_pull_mob", "external_rotation", "bird_dog_mob", "dead_bug_mob"];
  }
  if (day.includes("upper")) {
    return ["scap_pushup", "band_pull_apart", "external_rotation", "bird_dog_mob", "dead_bug_mob"];
  }
  // Full body
  return ["bw_squat_act", "glute_bridge_mob", "scap_pushup", "band_pull_apart", "dead_bug_mob"];
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateWarmup(input: {
  splitType:         SplitType;
  dayName:           string;
  movementReadiness: MovementReadiness;
  symptomModifier:   SymptomModifier;
  energyLevel:       number;        // 0–4
  userEquipment:     string[];
}): WarmupBlock {
  const {
    splitType, dayName, movementReadiness, symptomModifier, energyLevel, userEquipment,
  } = input;

  // ── Cardio warmup ──
  const cardioDuration = energyLevel <= 1 ? "8 min"
    : movementReadiness.extendedWarmup    ? "7 min"
    : "5 min";
  const cardioBase = pickCardio(userEquipment, splitType);
  const cardio: WarmupBlock["cardio"] = { ...cardioBase, duration: cardioDuration };

  // ── Mobility block ──
  const baseIds  = getMobilityIdsForSplit(splitType, dayName);
  const focusIds = movementReadiness.focusAreas.flatMap(region =>
    MOBILITY_LIBRARY
      .filter(m => m.bodyRegion === region && m.category !== "activation")
      .slice(0, 2)
      .map(m => m.id)
  );
  // Symptom-added items go first
  const symptomItems: MobilityItem[] = filterByEquipment(
    symptomModifier.addMobility, userEquipment,
  ).map(m => toItem(m, symptomModifier.coachingNotes[0]));

  const allMobIds  = [...new Set([...focusIds, ...baseIds])];
  const baseItems: MobilityItem[] = allMobIds
    .map(id => MOBILITY_LIBRARY.find(m => m.id === id))
    .filter((m): m is MobilityEntry => m !== undefined)
    .filter(m => filterByEquipment([m], userEquipment).length > 0)
    .filter(m => !symptomModifier.addMobility.some(s => s.id === m.id))  // no duplicates
    .slice(0, movementReadiness.extendedWarmup ? 6 : 4)
    .map(m => toItem(m));

  const mobility = [...symptomItems, ...baseItems];

  // ── Activation block ──
  const actIds = getActivationIdsForSplit(splitType, dayName);
  const activation: MobilityItem[] = actIds
    .map(id => MOBILITY_LIBRARY.find(m => m.id === id))
    .filter((m): m is MobilityEntry => m !== undefined)
    .filter(m => filterByEquipment([m], userEquipment).length > 0)
    .slice(0, 4)
    .map(m => toItem(m));

  // ── Total time estimate ──
  const cardiMin   = parseInt(cardioDuration);
  const mobilSecs  = mobility.reduce((s, _) => s + 35, 0);   // avg 35s per item
  const actSecs    = activation.reduce((s, _) => s + 35, 0);
  const totalMinutes = Math.round(cardiMin + (mobilSecs + actSecs) / 60);

  return { cardio, mobility, activation, totalMinutes };
}
