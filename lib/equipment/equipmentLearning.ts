// ─── lib/equipment/equipmentLearning.ts ──────────────────────────────────────
// Tracks exercises skipped or substituted due to equipment incompatibility.
// Used to surface "what you're missing out on" insights.
// Pure logic — no React, no side effects.

const STORAGE_KEY = "axis_equipment_skips";
const MAX_ENTRIES = 200;

export interface EquipmentSkipEntry {
  date:          string;
  exerciseName:  string;
  missingEquip:  string[];
}

export function logEquipmentSkip(exerciseName: string, missingEquip: string[]): void {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(STORAGE_KEY);
  const entries: EquipmentSkipEntry[] = raw ? JSON.parse(raw) : [];
  entries.push({ date: new Date().toISOString().slice(0, 10), exerciseName, missingEquip });
  const pruned = entries.slice(-MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
}

export function getEquipmentSkips(): EquipmentSkipEntry[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export interface FrequentSkip {
  exerciseName: string;
  skipCount:    number;
  missingEquip: string[];
}

export function getFrequentSkips(topN = 5): FrequentSkip[] {
  const skips = getEquipmentSkips();
  const counts: Record<string, { count: number; missingEquip: string[] }> = {};
  for (const entry of skips) {
    if (!counts[entry.exerciseName]) {
      counts[entry.exerciseName] = { count: 0, missingEquip: entry.missingEquip };
    }
    counts[entry.exerciseName].count++;
  }
  return Object.entries(counts)
    .map(([exerciseName, { count, missingEquip }]) => ({ exerciseName, skipCount: count, missingEquip }))
    .sort((a, b) => b.skipCount - a.skipCount)
    .slice(0, topN);
}
