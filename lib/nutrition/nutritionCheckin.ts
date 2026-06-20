// ─── lib/nutrition/nutritionCheckin.ts ───────────────────────────────────────
// Phase 32F — Low-friction daily nutrition check-in.
// Three Yes/No questions: hit protein, hit hydration, ate vegetables/fruit.
// Storage key: axis_nutrition_checkin (180-day retention)

const STORAGE_KEY    = "axis_nutrition_checkin";
const RETENTION_DAYS = 180;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DailyNutritionCheckin {
  date:         string;   // YYYY-MM-DD (idempotent key)
  hitProtein:   boolean;
  hitHydration: boolean;
  hitVeggies:   boolean;
  completedAt:  string;   // ISO timestamp
}

export interface NutritionComplianceSummary {
  proteinRate:   number;   // 0–1 fraction of logged days where hitProtein
  hydrationRate: number;   // 0–1
  veggieRate:    number;   // 0–1
  sampleSize:    number;   // days logged
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function isClient(): boolean {
  return typeof window !== "undefined";
}

function cutoff(): string {
  const d = new Date();
  d.setDate(d.getDate() - RETENTION_DAYS);
  return d.toISOString().slice(0, 10);
}

function load(): DailyNutritionCheckin[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DailyNutritionCheckin[]) : [];
  } catch {
    return [];
  }
}

function persist(entries: DailyNutritionCheckin[]): void {
  if (!isClient()) return;
  const cut = cutoff();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.filter(e => e.date >= cut)));
  } catch {}
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Saves today's nutrition check-in. Idempotent — same date overwrites.
 */
export function saveDailyNutritionCheckin(checkin: DailyNutritionCheckin): void {
  const others = load().filter(e => e.date !== checkin.date);
  persist([checkin, ...others]);
}

/**
 * Returns the check-in for a specific date, or null if not recorded.
 */
export function getDailyNutritionCheckin(date: string): DailyNutritionCheckin | null {
  return load().find(e => e.date === date) ?? null;
}

/**
 * All check-ins, newest first.
 */
export function getNutritionCheckinHistory(): DailyNutritionCheckin[] {
  return load().sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Compliance rates across all stored check-ins.
 * Useful for the learning layer and intelligence card.
 */
export function getNutritionComplianceSummary(): NutritionComplianceSummary {
  const all = load();
  const n   = all.length;
  if (n === 0) {
    return { proteinRate: 0, hydrationRate: 0, veggieRate: 0, sampleSize: 0 };
  }
  const proteinRate   = all.filter(e => e.hitProtein).length   / n;
  const hydrationRate = all.filter(e => e.hitHydration).length / n;
  const veggieRate    = all.filter(e => e.hitVeggies).length   / n;
  return {
    proteinRate:   Math.round(proteinRate   * 100) / 100,
    hydrationRate: Math.round(hydrationRate * 100) / 100,
    veggieRate:    Math.round(veggieRate    * 100) / 100,
    sampleSize:    n,
  };
}
