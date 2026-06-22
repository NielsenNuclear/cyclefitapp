// ─── lib/memory/situationMemory.ts ───────────────────────────────────────────
// 45A/B — Situation Memory + Similar Situation Retrieval
// Records context → decision → outcome triads and retrieves the most similar
// past situations to inform today's coaching. This is the foundation of
// Axis's long-term coaching memory.

const STORAGE_KEY    = "axis_situation_memory";
const RETENTION_DAYS = 1825;  // 5 years

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SituationContext {
  cyclePhase:      string;    // e.g. "Follicular Phase"
  readinessBucket: "low" | "moderate" | "high";    // < 55, 55–74, 75+
  stressLevel:     number;   // 0–4 raw
  fatigueZone:     string;   // "fresh" | "normal" | "fatigued" | "overreached"
  weekday:         number;   // 0 = Sun
}

export interface SituationDecision {
  recommendationType: string;   // "push" | "maintain" | "recover" | etc
  workoutMode:        string;   // "full" | "condensed" | "minimum_effective" | "recovery"
}

export interface SituationOutcome {
  workoutCompleted: boolean;
  nextDayReadiness: number;      // readiness score the next day
  readinessDelta:   number;      // next day – today
}

export interface SituationMemoryEntry {
  id:       string;    // date
  date:     string;
  context:  SituationContext;
  decision: SituationDecision;
  outcome?: SituationOutcome;  // filled in next day
  scored:   boolean;
}

export interface SimilarSituation {
  entry:      SituationMemoryEntry;
  similarity: number;   // 0–100
  daysAgo:    number;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

function isClient(): boolean { return typeof window !== "undefined"; }

function load(): SituationMemoryEntry[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SituationMemoryEntry[]) : [];
  } catch { return []; }
}

function persist(entries: SituationMemoryEntry[]): void {
  if (!isClient()) return;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cut = cutoff.toISOString().slice(0, 10);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.filter(e => e.date >= cut)));
  } catch {}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readinessBucket(score: number): SituationContext["readinessBucket"] {
  if (score < 55) return "low";
  if (score < 75) return "moderate";
  return "high";
}

function situationSimilarity(a: SituationContext, b: SituationContext): number {
  let score = 0;
  if (a.cyclePhase === b.cyclePhase)                score += 35;
  if (a.readinessBucket === b.readinessBucket)       score += 30;
  if (Math.abs(a.stressLevel - b.stressLevel) <= 1) score += 20;
  if (a.fatigueZone === b.fatigueZone)               score += 15;
  return score;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function recordSituation(
  date:          string,
  readinessScore: number,
  stressLevel:   number,
  fatigueZone:   string,
  cyclePhase:    string,
  decision:      SituationDecision,
): void {
  const context: SituationContext = {
    cyclePhase,
    readinessBucket: readinessBucket(readinessScore),
    stressLevel,
    fatigueZone,
    weekday: new Date().getDay(),
  };
  const existing = load().filter(e => e.id !== date);
  const entry: SituationMemoryEntry = { id: date, date, context, decision, scored: false };
  persist([entry, ...existing]);
}

export function scoreSituationOutcome(
  date:            string,
  nextDayReadiness: number,
  workoutCompleted: boolean,
  todayReadiness:  number,
): void {
  const entries = load();
  const entry   = entries.find(e => e.id === date);
  if (!entry || entry.scored) return;

  entry.outcome = {
    workoutCompleted,
    nextDayReadiness,
    readinessDelta: nextDayReadiness - todayReadiness,
  };
  entry.scored = true;
  persist(entries);
}

export function findSimilarSituations(
  context:  SituationContext,
  today:    string,
  limit = 5,
): SimilarSituation[] {
  const entries = load().filter(e => e.date !== today && e.scored && e.outcome !== undefined);

  return entries
    .map(e => ({
      entry:      e,
      similarity: situationSimilarity(context, e.context),
      daysAgo:    Math.round((new Date(today).getTime() - new Date(e.date).getTime()) / 86400000),
    }))
    .filter(s => s.similarity >= 50)
    .sort((a, b) => b.similarity - a.similarity || a.daysAgo - b.daysAgo)
    .slice(0, limit);
}

export function getSituationHistory(): SituationMemoryEntry[] {
  return load();
}
