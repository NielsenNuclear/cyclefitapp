// ─── lib/movement/symptomMovementModifiers.ts ─────────────────────────────────
// Maps today's symptoms to additional mobility items and exercise restrictions.
// Used by the warmup generator and the workout generation pipeline.

import type { MobilityEntry } from "./mobilityLibrary";
import { getMobilityById }    from "./mobilityLibrary";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SymptomModifier {
  addMobility:    MobilityEntry[];   // items to prepend to warmup mobility block
  restrict:       string[];          // exercise name fragments to avoid (case-insensitive)
  coachingNotes:  string[];          // shown in workout rationale
}

// ─── Symptom rules ────────────────────────────────────────────────────────────

interface SymptomRule {
  addIds:    string[];   // MobilityEntry IDs from mobilityLibrary
  restrict:  string[];   // fragments of exercise names to avoid
  notes:     string[];
}

const SYMPTOM_RULES: Record<string, SymptomRule> = {
  back_pain: {
    addIds:   ["cat_cow", "childs_pose", "pelvic_tilts", "prayer_stretch"],
    restrict: ["deadlift", "good morning", "barbell row", "back extension"],
    notes:    ["Added spinal mobility prep. Avoid heavy axial loading today."],
  },
  back_stiffness: {
    addIds:   ["cat_cow", "childs_pose", "pelvic_tilts"],
    restrict: ["deadlift", "back extension"],
    notes:    ["Extra spinal mobility included for back stiffness."],
  },
  lower_back_pain: {
    addIds:   ["cat_cow", "childs_pose", "pelvic_tilts", "prayer_stretch"],
    restrict: ["deadlift", "good morning", "barbell row"],
    notes:    ["Lower back pain — prioritise decompression before any loading."],
  },
  shoulder_pain: {
    addIds:   ["wall_slides", "external_rotation", "cross_body_stretch", "shoulder_cars"],
    restrict: ["overhead press", "lateral raise", "upright row", "behind neck"],
    notes:    ["Shoulder prep added. Avoid overhead pressing if it provokes pain."],
  },
  shoulder_tightness: {
    addIds:   ["wall_slides", "cross_body_stretch", "shoulder_cars"],
    restrict: ["behind neck"],
    notes:    ["Shoulder mobility prep included for tightness."],
  },
  hip_tightness: {
    addIds:   ["ninety_ninety", "hip_cars", "worlds_greatest", "hip_flexor_stretch"],
    restrict: [],
    notes:    ["Hip opener sequence added — allow full warm-up before loading hip hinges."],
  },
  hip_pain: {
    addIds:   ["ninety_ninety", "hip_flexor_stretch", "hip_cars"],
    restrict: ["barbell squat", "sumo deadlift", "hip thrust"],
    notes:    ["Hip pain — reduce range of motion on loaded hip patterns."],
  },
  neck_tension: {
    addIds:   ["neck_rotations", "neck_side_stretch", "chin_tucks", "thread_needle"],
    restrict: ["shrugs", "behind neck"],
    notes:    ["Neck and upper-back mobility added for neck tension."],
  },
  neck_pain: {
    addIds:   ["neck_rotations", "neck_side_stretch", "chin_tucks"],
    restrict: ["shrugs", "behind neck", "overhead press"],
    notes:    ["Neck pain — gentle mobility only. Avoid heavy trap loading."],
  },
  knee_pain: {
    addIds:   ["ankle_circles", "leg_swings", "hip_cars", "standing_quad"],
    restrict: ["lunge", "jump", "leg extension"],
    notes:    ["Knee pain — extra lower-limb prep. Avoid deep flexion under load."],
  },
  calf_tightness: {
    addIds:   ["wall_calf_stretch", "bent_knee_calf", "ankle_circles", "knee_over_toe_mob"],
    restrict: [],
    notes:    ["Calf and ankle mobility added for lower-leg tightness."],
  },
  wrist_pain: {
    addIds:   ["wrist_flexor", "wrist_extensor", "forearm_rotations"],
    restrict: ["wrist curl", "front rack"],
    notes:    ["Wrist prep included. Use neutral grip or wrist wraps if needed."],
  },
  hamstring_tightness: {
    addIds:   ["leg_swings", "standing_hamstring", "toe_reach"],
    restrict: [],
    notes:    ["Extra hamstring prep added. Avoid bouncing at end-range."],
  },
  cramps: {
    addIds:   ["childs_pose", "hip_flexor_stretch", "pelvic_tilts", "cat_cow"],
    restrict: ["barbell squat", "deadlift"],
    notes:    ["Cramping — spinal and hip decompression included. Reduce intensity if discomfort persists."],
  },
  bloating: {
    addIds:   ["childs_pose", "pelvic_tilts", "cat_cow"],
    restrict: [],
    notes:    ["Core comfort included. Avoid tight waist bracing if uncomfortable."],
  },
  headache: {
    addIds:   ["neck_rotations", "neck_side_stretch", "chin_tucks"],
    restrict: ["overhead press", "shrugs"],
    notes:    ["Headache present — gentle neck mobility included. Avoid high-tension upper trap loading."],
  },
};

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildSymptomModifier(
  symptoms: Array<{ symptomId: string; severity: 0 | 1 | 2 | 3 }>,
): SymptomModifier {
  const addedIds   = new Set<string>();
  const restrictions = new Set<string>();
  const notes        = new Set<string>();

  for (const sym of symptoms) {
    const rule = SYMPTOM_RULES[sym.symptomId];
    if (!rule) continue;

    // Only apply restrictions for severity ≥ 1; add mobility for all
    rule.addIds.forEach(id => addedIds.add(id));
    if (sym.severity >= 1) {
      rule.restrict.forEach(r => restrictions.add(r));
    }
    rule.notes.forEach(n => notes.add(n));
  }

  const addMobility: MobilityEntry[] = [...addedIds]
    .map(id => getMobilityById(id))
    .filter((m): m is MobilityEntry => m !== undefined);

  return {
    addMobility,
    restrict:      [...restrictions],
    coachingNotes: [...notes],
  };
}

/** Returns true if an exercise name matches any restriction fragment. */
export function isRestricted(exerciseName: string, restrictions: string[]): boolean {
  const lower = exerciseName.toLowerCase();
  return restrictions.some(r => lower.includes(r.toLowerCase()));
}
