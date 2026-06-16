// ─── lib/equipment/customExerciseMappings.ts ─────────────────────────────────
// Maps user-defined custom equipment to existing exercises it can effectively
// perform, so the generator can treat e.g. a "Pendulum Squat Machine" as
// satisfying the same movement patterns as Hack Squat / Leg Press.
// Pure logic — no React, no side effects.

const STORAGE_KEY = "axis_custom_exercise_mappings";
const MAX_ENTRIES  = 500;

export type MappingEffectiveness = "primary" | "secondary";

export interface CustomExerciseMapping {
  id:            string;
  equipmentId:   string;
  exerciseName:  string;
  effectiveness: MappingEffectiveness;
  createdAt:     string;
}

export interface CustomExerciseMappingResult {
  ok:     boolean;
  error?: string;
  item?:  CustomExerciseMapping;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

export function getMappings(): CustomExerciseMapping[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMappings(items: CustomExerciseMapping[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ENTRIES)));
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export function addMapping(input: {
  equipmentId:   string;
  exerciseName:  string;
  effectiveness: MappingEffectiveness;
}): CustomExerciseMappingResult {
  const existing = getMappings();
  if (existing.length >= MAX_ENTRIES) {
    return { ok: false, error: `You can track up to ${MAX_ENTRIES} exercise mappings.` };
  }
  if (existing.some(m => m.equipmentId === input.equipmentId && m.exerciseName === input.exerciseName)) {
    return { ok: false, error: "This equipment is already mapped to that exercise." };
  }

  const item: CustomExerciseMapping = {
    id:            `mapping_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    equipmentId:   input.equipmentId,
    exerciseName:  input.exerciseName,
    effectiveness: input.effectiveness,
    createdAt:     new Date().toISOString(),
  };
  saveMappings([...existing, item]);
  return { ok: true, item };
}

export function removeMapping(id: string): void {
  const existing = getMappings();
  saveMappings(existing.filter(m => m.id !== id));
}

export function getMappingsForEquipment(equipmentId: string): CustomExerciseMapping[] {
  return getMappings().filter(m => m.equipmentId === equipmentId);
}
