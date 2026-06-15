// ─── lib/equipment/equipmentProfile.ts ───────────────────────────────────────
// Equipment profile storage and capability scoring.
// Pure logic — no React, no side effects.

import { allExercises } from "@/lib/exercises/exerciseLibrary";
import { isEquipmentCompatible, countExercisesUnlocked } from "./equipmentCompatibility";
import { EQUIPMENT_CATALOG, EQUIPMENT_BY_ID, type EquipmentItem } from "./equipmentCatalog";

// ─── Storage ──────────────────────────────────────────────────────────────────

export function getUserEquipment(): string[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem("axis_onboarding");
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data.equipment) ? data.equipment : [];
  } catch {
    return [];
  }
}

export function setUserEquipment(ids: string[]): void {
  const raw = localStorage.getItem("axis_onboarding");
  const data: Record<string, unknown> = raw ? JSON.parse(raw) : {};
  data.equipment = ids;
  localStorage.setItem("axis_onboarding", JSON.stringify(data));
}

// ─── Capability profile ───────────────────────────────────────────────────────

export interface EquipmentCapabilityProfile {
  capabilityScore:     number;   // 0–100 (% of total exercises unlocked)
  unlockedCount:       number;
  totalExercises:      number;
  strengthScore:       number;   // 0–100 (barbell/dumbbell compound exercises)
  hypertrophyScore:    number;   // 0–100 (machine + cable isolation exercises)
  explosiveScore:      number;   // 0–100 (full-body / power exercises)
  missingHighValue:    Array<{ item: EquipmentItem; unlocksCount: number }>;
}

export function computeEquipmentProfile(ownedIds: string[]): EquipmentCapabilityProfile {
  const totalExercises = allExercises.length;

  // Unlocked count
  const unlockedCount = allExercises.filter(ex =>
    isEquipmentCompatible(ex, ownedIds)
  ).length;

  const capabilityScore = Math.round((unlockedCount / totalExercises) * 100);

  // Strength score: compound barbell + heavy dumbbell movements
  const strengthExercises = allExercises.filter(ex =>
    ["Upper Push", "Upper Pull", "Lower Quad", "Lower Posterior"].includes(ex.category) &&
    ["Barbell", "Dumbbells"].some(k => ex.equipment.toLowerCase().includes(k.toLowerCase()))
  );
  const unlockedStrength = strengthExercises.filter(ex => isEquipmentCompatible(ex, ownedIds)).length;
  const strengthScore = strengthExercises.length > 0
    ? Math.round((unlockedStrength / strengthExercises.length) * 100)
    : 0;

  // Hypertrophy score: machine + cable isolation
  const hypertrophyExercises = allExercises.filter(ex =>
    ["cable machine", "machine"].some(k => ex.equipment.toLowerCase().startsWith(k)) ||
    ex.equipment.toLowerCase().includes("leg press") ||
    ex.equipment.toLowerCase().includes("leg extension") ||
    ex.equipment.toLowerCase().includes("leg curl") ||
    ex.equipment.toLowerCase().includes("hack squat") ||
    ex.equipment.toLowerCase().includes("assisted pull-up machine")
  );
  const unlockedHypertrophy = hypertrophyExercises.filter(ex => isEquipmentCompatible(ex, ownedIds)).length;
  const hypertrophyScore = hypertrophyExercises.length > 0
    ? Math.round((unlockedHypertrophy / hypertrophyExercises.length) * 100)
    : 0;

  // Explosive score: full body / power exercises
  const explosiveExercises = allExercises.filter(ex =>
    ex.category === "Full Body" || ex.movementPattern === "Explosive"
  );
  const unlockedExplosive = explosiveExercises.filter(ex => isEquipmentCompatible(ex, ownedIds)).length;
  const explosiveScore = explosiveExercises.length > 0
    ? Math.round((unlockedExplosive / explosiveExercises.length) * 100)
    : 0;

  // Missing high-value items
  const notOwned = EQUIPMENT_CATALOG.filter(
    item => !ownedIds.includes(item.id) && item.priority === "high_value"
  );
  const missingWithCounts = notOwned.map(item => ({
    item,
    unlocksCount: countExercisesUnlocked(item.id, ownedIds),
  }));
  // Sort by unlock count descending, top 5
  missingWithCounts.sort((a, b) => b.unlocksCount - a.unlocksCount);
  const missingHighValue = missingWithCounts.filter(m => m.unlocksCount > 0).slice(0, 5);

  return {
    capabilityScore,
    unlockedCount,
    totalExercises,
    strengthScore,
    hypertrophyScore,
    explosiveScore,
    missingHighValue,
  };
}
