// ─── lib/equipment/equipmentCompatibility.ts ─────────────────────────────────
// Derives equipment requirements from the free-text Exercise.equipment field
// and checks compatibility against a user's owned equipment list.
// Pure logic — no React, no side effects.

import type { Exercise, DifficultyLevel } from "@/lib/exercises/exerciseLibrary";
import { getMergedExercisePool } from "@/lib/exercises/customExercises";
import { getCustomEquipment } from "@/lib/equipment/customEquipment";
import { getMappingsForEquipment } from "@/lib/equipment/customExerciseMappings";

// ─── Compatibility group derivation ──────────────────────────────────────────
// Returns a list of OR-groups. Exercise is compatible when the user owns at
// least one item from EVERY group (AND of groups, OR within each group).
// An empty group means no equipment needed for that constraint.

export function deriveCompatibilityGroups(equipment: string): string[][] {
  const e = equipment.toLowerCase().trim();
  const groups: string[][] = [];

  // Pure bodyweight (no equipment needed)
  if (e === "bodyweight" || e === "bodyweight, wall") return [];

  // ── Cable machine ──────────────────────────────────────────────────────────
  if (e.includes("cable machine or resistance band")) {
    groups.push(["cable_machine", "resistance_band"]);
    return groups;
  }
  if (e.includes("cable machine") || (e.startsWith("cable") && !e.includes("cable rope"))) {
    groups.push(["cable_machine"]);
    if (e.includes("ankle strap")) groups.push(["ankle_strap"]);
    return groups;
  }

  // ── Named machines ─────────────────────────────────────────────────────────
  if (e.includes("leg press machine"))   { groups.push(["leg_press_machine"]);       return groups; }
  if (e.includes("leg extension machine")){ groups.push(["leg_extension_machine"]);  return groups; }
  if (e.includes("seated leg curl"))      { groups.push(["seated_leg_curl_machine"]); return groups; }
  if (e.includes("leg curl machine"))     { groups.push(["leg_curl_machine", "seated_leg_curl_machine"]); return groups; }
  if (e.includes("hack squat machine"))   { groups.push(["hack_squat_machine"]);     return groups; }
  if (e.includes("glute-ham raise machine")){ groups.push(["glute_ham_machine"]);    return groups; }
  if (e.includes("assisted pull-up machine")){ groups.push(["assisted_pullup_machine", "cable_machine"]); return groups; }
  if (e.includes("t-bar row machine") || (e.includes("t-bar") && e.includes("landmine"))) {
    groups.push(["t_bar_machine", "landmine"]); return groups;
  }

  // Generic "Machine" with no further detail — plate-loaded pressing/pulling machines only.
  // cable_machine is intentionally excluded: it has its own branch above and is not
  // a substitute for a plate-loaded machine (e.g. hack squat, chest press machine).
  if (e === "machine") {
    groups.push(["chest_press_machine", "pec_deck", "shoulder_press_machine", "machine_row"]);
    return groups;
  }

  // ── Barbells ───────────────────────────────────────────────────────────────
  if (e.includes("ez-bar")) {
    groups.push(["ez_bar", "barbell"]);
    if (e.includes("incline bench")) groups.push(["incline_bench", "adjustable_bench"]);
    else if (e.includes("bench")) groups.push(["flat_bench", "incline_bench", "adjustable_bench"]);
    return groups;
  }
  if (e.includes("trap bar")) {
    groups.push(["trap_bar"]);
    return groups;
  }
  if (e.includes("barbell or dumbbells") || e.includes("barbell or dumbbell") || e.includes("light dumbbell or barbell")) {
    groups.push(["barbell", "dumbbells"]);
    if (e.includes("heel wedge")) groups.push(["heel_wedge"]);
    return groups;
  }
  if (e.includes("back extension bench")) {
    groups.push(["back_extension_bench"]);
    return groups;
  }
  if (e.includes("barbell")) {
    groups.push(["barbell"]);
    groups.push(["weight_plates"]);
    if (e.includes("squat rack") && e.includes("bench")) {
      groups.push(["squat_rack"]);
      groups.push(["flat_bench", "incline_bench", "adjustable_bench"]);
    } else if (e.includes("squat rack")) {
      groups.push(["squat_rack"]);
    } else if (e.includes("incline bench")) {
      groups.push(["incline_bench", "adjustable_bench"]);
    } else if (e.includes("decline bench")) {
      groups.push(["decline_bench", "adjustable_bench"]);
    } else if (e.includes("bench") && !e.includes("incline") && !e.includes("decline")) {
      groups.push(["flat_bench", "incline_bench", "adjustable_bench"]);
    }
    if (e.includes("hip pad")) groups.push(["hip_thrust_pad", "flat_bench"]);
    if (e.includes("landmine")) groups.push(["landmine"]);
    if (e.includes("resistance band")) groups.push(["resistance_band"]);
    if (e.includes("deficit platform")) groups.push(["deficit_platform"]);
    if (e.includes("heel wedge")) groups.push(["heel_wedge"]);
    return groups;
  }

  // ── Dumbbells ──────────────────────────────────────────────────────────────
  if (e.includes("dumbbell or kettlebell")) {
    groups.push(["dumbbells", "kettlebell"]);
    return groups;
  }
  if (e.includes("dumbbells, kettlebells") || e.includes("dumbbells, kettlebell")) {
    groups.push(["dumbbells", "kettlebell", "farmer_handles"]);
    return groups;
  }
  if (e.includes("dumbbell") || e.includes("dumbbells")) {
    groups.push(["dumbbells"]);
    if (e.includes("incline bench")) groups.push(["incline_bench", "adjustable_bench"]);
    else if (e.includes("box") && !e.includes("squat")) groups.push(["step_box", "plyo_box"]);
    else if (e.includes("bench")) groups.push(["flat_bench", "incline_bench", "adjustable_bench"]);
    return groups;
  }

  // ── Kettlebell ─────────────────────────────────────────────────────────────
  if (e.includes("kettlebell")) {
    groups.push(["kettlebell"]);
    return groups;
  }

  // ── Pull-up bar ────────────────────────────────────────────────────────────
  if (e.includes("pull-up bar")) {
    groups.push(["pullup_bar", "gymnastic_rings", "suspension_trainer"]);
    if (e.includes("weight belt")) groups.push(["weight_belt"]);
    return groups;
  }

  // ── Parallel bars ──────────────────────────────────────────────────────────
  if (e.includes("parallel bars")) {
    groups.push(["parallel_bars", "dip_station"]);
    if (e.includes("weight belt")) groups.push(["weight_belt"]);
    return groups;
  }

  // ── Resistance band ────────────────────────────────────────────────────────
  if (e.includes("resistance band")) {
    groups.push(["resistance_band"]);
    return groups;
  }

  // ── Bodyweight with props ──────────────────────────────────────────────────
  if (e.includes("bodyweight, bench") || e.includes("bodyweight, incline bench")) {
    groups.push(["flat_bench", "incline_bench", "adjustable_bench", "step_box"]);
    return groups;
  }
  if (e.includes("bodyweight, box") || e.includes("box or step")) {
    groups.push(["step_box", "plyo_box"]);
    return groups;
  }
  if (e.includes("bodyweight, anchor point") || e.includes("anchor point")) {
    groups.push(["anchor_point", "pullup_bar"]);
    return groups;
  }

  // ── Accessories ────────────────────────────────────────────────────────────
  if (e.includes("foam roller"))    { groups.push(["foam_roller"]);    return groups; }
  if (e.includes("ab wheel"))       { groups.push(["ab_wheel"]);       return groups; }
  if (e.includes("medicine ball") || e.includes("weight plate or medicine ball")) {
    groups.push(["medicine_ball"]); return groups;
  }
  if (e.includes("weight plate"))   { return []; /* generic weight plate = no specific equip needed */ }
  if (e.includes("battle ropes"))   { groups.push(["battle_ropes"]);   return groups; }
  if (e.includes("plyometric box")) { groups.push(["plyo_box"]);       return groups; }
  if (e.includes("sled"))           { groups.push(["sled"]);            return groups; }
  if (e.includes("sandbag"))        { groups.push(["sandbag"]);         return groups; }
  if (e.includes("heel wedge"))     { groups.push(["heel_wedge"]);      return groups; }

  if (process.env.NODE_ENV === "development" && equipment.trim()) {
    console.warn(`[equipmentCompatibility] Unrecognized equipment string: "${equipment}" — treating as always compatible`);
  }
  return groups;
}

// ─── Compatibility check ──────────────────────────────────────────────────────

export function isEquipmentCompatible(exercise: Exercise, ownedIds: string[]): boolean {
  // Custom exercises declare their required gear explicitly (by exact name)
  // rather than through the free-text parser used for built-in exercises.
  if (exercise.customEquipmentRequired) {
    if (exercise.customEquipmentRequired.length === 0) return true;
    const ownedSet = new Set(ownedIds.map(id => id.toLowerCase()));
    return exercise.customEquipmentRequired.every(req => ownedSet.has(req.toLowerCase()));
  }

  if (ownedIds.length === 0) return true;
  const groups = deriveCompatibilityGroups(exercise.equipment);
  const ownedSet = new Set(ownedIds);
  return groups.every(group =>
    group.length === 0 || group.some(id => ownedSet.has(id))
  );
}

// ─── Effective difficulty ─────────────────────────────────────────────────────
// When the user has a less-precise tool than optimal (e.g. dumbbells instead
// of a barbell for compound pressing), the exercise feels slightly different.
// Simple heuristic: barbell exercises performed with dumbbells drop one tier.

export function effectiveDifficulty(exercise: Exercise, ownedIds: string[]): DifficultyLevel {
  const tiers: DifficultyLevel[] = ["Beginner", "Intermediate", "Advanced"];
  const base = exercise.difficulty;
  const eqLower = exercise.equipment.toLowerCase();
  const owned = new Set(ownedIds);

  if (
    eqLower.includes("barbell") &&
    !owned.has("barbell") &&
    (owned.has("dumbbells") || owned.has("kettlebell"))
  ) {
    const idx = tiers.indexOf(base);
    return idx > 0 ? tiers[idx - 1] : base;
  }
  return base;
}

// ─── Custom mapping substitution ─────────────────────────────────────────────
// If the user owns a custom equipment item explicitly mapped (see
// customExerciseMappings.ts) to a built-in exercise sharing the target's
// movement pattern, surface that exercise under the custom equipment's name
// (e.g. a "Pendulum Squat Machine" mapped to Hack Squat performs the same
// pattern, just branded as the gear the user actually has).

function findCustomMappingSubstitute(exercise: Exercise, ownedIds: string[], pool: Exercise[]): Exercise | null {
  const ownedSet = new Set(ownedIds);
  const ownedCustom = getCustomEquipment().filter(e => e.active && ownedSet.has(e.name));
  if (ownedCustom.length === 0) return null;

  let best: { exercise: Exercise; equipmentName: string; isPrimary: boolean } | null = null;
  for (const equipment of ownedCustom) {
    for (const mapping of getMappingsForEquipment(equipment.id)) {
      const matched = pool.find(e => e.name === mapping.exerciseName);
      if (!matched || matched.movementPattern !== exercise.movementPattern) continue;
      const isPrimary = mapping.effectiveness === "primary";
      if (!best || (isPrimary && !best.isPrimary)) {
        best = { exercise: matched, equipmentName: equipment.name, isPrimary };
      }
    }
  }
  if (!best) return null;

  return { ...best.exercise, name: best.equipmentName, equipment: best.equipmentName };
}

// ─── Equipment-aware substitution ────────────────────────────────────────────
// Finds the best substitute exercise that the user can actually perform with
// their equipment, walking a priority cascade:
//   1. Exact match    — the exercise is already performable as-is.
//   2. Built-in        — same movement pattern + muscle overlap, compatible
//                         with owned equipment, within one difficulty tier.
//   3. Custom mapping  — an owned custom equipment item is explicitly mapped
//                         to an exercise sharing the same movement pattern.
//   4. Movement fallback — same movement pattern, equipment-compatible, with
//                           muscle/difficulty constraints relaxed.
//   5. Bodyweight       — last resort, guarantees a usable substitute.

export function findEquipmentCompatibleSubstitute(
  exercise:  Exercise,
  ownedIds:  string[],
  difficulty?: DifficultyLevel,
): Exercise | null {
  const targetDifficulty = difficulty ?? exercise.difficulty;
  const tiers: DifficultyLevel[] = ["Beginner", "Intermediate", "Advanced"];
  const targetIdx = tiers.indexOf(targetDifficulty);
  const byDifficultyGap = (a: Exercise, b: Exercise) =>
    Math.abs(tiers.indexOf(a.difficulty) - targetIdx) - Math.abs(tiers.indexOf(b.difficulty) - targetIdx);
  const pool = getMergedExercisePool();

  // Tier 1 — exact equipment match
  if (isEquipmentCompatible(exercise, ownedIds)) return exercise;

  // Tier 2 — built-in substitution
  const builtInCandidates = pool.filter(candidate => {
    if (candidate.name === exercise.name) return false;
    if (candidate.movementPattern !== exercise.movementPattern) return false;
    const muscleMatch = candidate.primaryMuscles.some(m => exercise.primaryMuscles.includes(m));
    if (!muscleMatch) return false;
    if (!isEquipmentCompatible(candidate, ownedIds)) return false;
    return Math.abs(targetIdx - tiers.indexOf(candidate.difficulty)) <= 1;
  });
  if (builtInCandidates.length > 0) {
    return [...builtInCandidates].sort(byDifficultyGap)[0];
  }

  // Tier 3 — custom mapping substitution
  const customMatch = findCustomMappingSubstitute(exercise, ownedIds, pool);
  if (customMatch) return customMatch;

  // Tier 4 — movement-pattern fallback (muscle/difficulty constraints relaxed)
  const patternCandidates = pool.filter(candidate =>
    candidate.name !== exercise.name &&
    candidate.movementPattern === exercise.movementPattern &&
    isEquipmentCompatible(candidate, ownedIds)
  );
  if (patternCandidates.length > 0) {
    return [...patternCandidates].sort(byDifficultyGap)[0];
  }

  // Tier 5 — bodyweight fallback
  const bodyweightCandidates = pool.filter(candidate =>
    candidate.name !== exercise.name &&
    candidate.equipment.toLowerCase().startsWith("bodyweight") &&
    candidate.primaryMuscles.some(m => exercise.primaryMuscles.includes(m))
  );
  if (bodyweightCandidates.length > 0) {
    return [...bodyweightCandidates].sort(byDifficultyGap)[0];
  }

  return null;
}

// ─── Unlock count helper ──────────────────────────────────────────────────────
// Returns how many exercises a given item would unlock if added to ownedIds.

export function countExercisesUnlocked(
  candidateId: string,
  ownedIds:    string[],
): number {
  const withItem = [...ownedIds, candidateId];
  let unlocked = 0;
  for (const ex of getMergedExercisePool()) {
    if (!isEquipmentCompatible(ex, ownedIds) && isEquipmentCompatible(ex, withItem)) {
      unlocked++;
    }
  }
  return unlocked;
}
