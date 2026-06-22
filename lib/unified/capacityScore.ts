// ─── lib/unified/capacityScore.ts ────────────────────────────────────────────
// 44A — Unified Capacity Score
// Single 0–100 composite that answers: "How much do I have in the tank today?"
// Synthesises readiness, recovery, lifestyle, nutrition, cycle, and fatigue.

const STORAGE_KEY    = "axis_capacity_history";
const RETENTION_DAYS = 365;

// ─── Types ────────────────────────────────────────────────────────────────────

export type CapacityTier = "peak" | "ready" | "moderate" | "limited" | "rest";

export interface CapacityComponents {
  readiness:   number;   // 0–100
  recovery:    number;   // 0–100
  lifestyle:   number;   // 0–100 (energy availability)
  nutrition:   number;   // 0–100 compliance estimate
  cyclePhase:  number;   // 0–100 phase modifier
  fatigue:     number;   // 0–100 (inverted fatigue score)
}

export interface CapacityScore {
  score:       number;
  tier:        CapacityTier;
  components:  CapacityComponents;
  headline:    string;
  date:        string;
}

export interface StoredCapacityEntry {
  date:  string;
  score: number;
  tier:  CapacityTier;
}

// ─── Tier mapping ─────────────────────────────────────────────────────────────

function scoreToTier(s: number): CapacityTier {
  if (s >= 85) return "peak";
  if (s >= 70) return "ready";
  if (s >= 55) return "moderate";
  if (s >= 40) return "limited";
  return "rest";
}

const HEADLINES: Record<CapacityTier, string> = {
  peak:     "All systems high — ideal for a demanding session.",
  ready:    "You're ready to train effectively.",
  moderate: "Capacity is moderate — a quality session is achievable.",
  limited:  "Capacity is limited — keep it purposeful and brief.",
  rest:     "Your body is asking for rest today.",
};

// ─── Cycle phase modifier ─────────────────────────────────────────────────────

function cyclePhaseScore(phaseName: string): number {
  const p = phaseName.toLowerCase();
  if (p.includes("ovulation"))     return 90;
  if (p.includes("follicular"))    return 80;
  if (p.includes("luteal") && !p.includes("pre")) return 65;
  if (p.includes("pre-menstrual") || p.includes("late")) return 45;
  if (p.includes("menstrual"))     return 50;
  return 70; // unknown
}

// ─── Storage ──────────────────────────────────────────────────────────────────

function isClient(): boolean { return typeof window !== "undefined"; }

function loadHistory(): StoredCapacityEntry[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredCapacityEntry[]) : [];
  } catch { return []; }
}

function persist(entries: StoredCapacityEntry[]): void {
  if (!isClient()) return;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cut = cutoff.toISOString().slice(0, 10);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.filter(e => e.date >= cut)));
  } catch {}
}

// ─── Main exports ─────────────────────────────────────────────────────────────

export function computeCapacityScore(params: {
  date:              string;
  readinessScore:    number;
  recoveryScore:     number;
  energyScore:       number;
  nutritionCompliance: number;  // 0–100
  cyclePhase:        string;
  fatigueScore:      number;    // 0–100 raw fatigue (will be inverted)
}): CapacityScore {
  const {
    date, readinessScore, recoveryScore, energyScore,
    nutritionCompliance, cyclePhase, fatigueScore,
  } = params;

  const components: CapacityComponents = {
    readiness:   readinessScore,
    recovery:    recoveryScore,
    lifestyle:   energyScore,
    nutrition:   nutritionCompliance,
    cyclePhase:  cyclePhaseScore(cyclePhase),
    fatigue:     Math.max(0, 100 - fatigueScore),
  };

  const score = Math.round(
    components.readiness  * 0.30 +
    components.recovery   * 0.20 +
    components.fatigue    * 0.20 +
    components.lifestyle  * 0.15 +
    components.cyclePhase * 0.10 +
    components.nutrition  * 0.05,
  );

  const tier = scoreToTier(score);

  return { score, tier, components, headline: HEADLINES[tier], date };
}

export function saveCapacityScore(entry: StoredCapacityEntry): void {
  const existing = loadHistory().filter(e => e.date !== entry.date);
  persist([entry, ...existing]);
}

export function getCapacityHistory(days = 30): StoredCapacityEntry[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return loadHistory().filter(e => e.date >= cutoff.toISOString().slice(0, 10));
}
