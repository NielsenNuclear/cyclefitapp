// ─── lib/autoregulation/fatigueModel.ts ──────────────────────────────────────
// Phase 37D — Accumulated fatigue score (0–100) from multiple stressors.
// Distinct from predictFatigue() which forecasts tomorrow; this captures today.
// Stored daily in axis_fatigue_score.

// ─── Types ────────────────────────────────────────────────────────────────────

export type FatigueZone = "fresh" | "normal" | "fatigued" | "overreached";

export interface FatigueScoreEntry {
  date:       string;
  score:      number;       // 0–100
  zone:       FatigueZone;
  components: {
    trainingLoad: number;   // 0–100 sub-score
    recoveryBank: number;   // 0–100 sub-score (inverted: low bank = high fatigue)
    sleep:        number;   // 0–100 sub-score (inverted: poor sleep = high fatigue)
    stress:       number;   // 0–100 sub-score
    symptoms:     number;   // 0–100 sub-score
  };
}

export interface CurrentFatigueInput {
  weeklyTrainingLoad: number;     // e.g. loadReport.weeklyVolume (0–15+)
  recoveryBankScore:  number;     // 0–100 (high = good bank)
  sleepQuality:       string;     // "excellent"|"good"|"variable"|"poor"
  stressLevel:        number;     // 1–10
  symptomCount:       number;
  symptomSeverityMean: number;    // 0–4
  burnoutRiskScore:   number;     // 0–100
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY    = "axis_fatigue_score";
const RETENTION_DAYS = 90;

function isClient(): boolean {
  return typeof window !== "undefined";
}

function loadHistory(): FatigueScoreEntry[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FatigueScoreEntry[]) : [];
  } catch {
    return [];
  }
}

function persist(entries: FatigueScoreEntry[]): void {
  if (!isClient()) return;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const pruned = entries.filter(e => e.date >= cutoff.toISOString().slice(0, 10));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
  } catch {}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleepToFatigueScore(quality: string): number {
  switch (quality) {
    case "excellent": return 10;
    case "good":      return 25;
    case "variable":  return 50;
    case "poor":      return 80;
    default:          return 30;
  }
}

function toZone(score: number): FatigueZone {
  if (score <= 30) return "fresh";
  if (score <= 60) return "normal";
  if (score <= 80) return "fatigued";
  return "overreached";
}

// ─── Main exports ─────────────────────────────────────────────────────────────

export function computeCurrentFatigueScore(input: CurrentFatigueInput): FatigueScoreEntry {
  // Normalise training load: 0–8 sessions/sets → 0–100
  const trainingLoadSub = Math.min(100, Math.round((input.weeklyTrainingLoad / 10) * 100));

  // Recovery bank: inverted (high bank = low sub-score)
  const recoveryBankSub = Math.max(0, 100 - input.recoveryBankScore);

  // Sleep: poor sleep → high fatigue
  const sleepSub = sleepToFatigueScore(input.sleepQuality);

  // Stress (1–10 → 0–100)
  const stressSub = Math.min(100, Math.round(((input.stressLevel - 1) / 9) * 100));

  // Symptoms (0–4 mean × count weight)
  const symptomSub = Math.min(100, Math.round((input.symptomSeverityMean / 4) * 80 + input.symptomCount * 5));

  // Weighted composite
  const score = Math.round(
    trainingLoadSub * 0.25 +
    recoveryBankSub * 0.25 +
    sleepSub        * 0.20 +
    stressSub       * 0.15 +
    symptomSub      * 0.15,
  );

  // Burnout risk bumps the score if already elevated
  const adjusted = input.burnoutRiskScore > 70
    ? Math.min(100, score + 10)
    : score;

  const date = new Date().toISOString().slice(0, 10);

  return {
    date,
    score: adjusted,
    zone:  toZone(adjusted),
    components: {
      trainingLoad: trainingLoadSub,
      recoveryBank: recoveryBankSub,
      sleep:        sleepSub,
      stress:       stressSub,
      symptoms:     symptomSub,
    },
  };
}

export function saveFatigueScore(entry: FatigueScoreEntry): void {
  const history = loadHistory().filter(e => e.date !== entry.date);
  history.push(entry);
  persist(history);
}

export function getFatigueScoreHistory(): FatigueScoreEntry[] {
  return loadHistory().sort((a, b) => b.date.localeCompare(a.date));
}

export function getLatestFatigueScore(): FatigueScoreEntry | null {
  return getFatigueScoreHistory()[0] ?? null;
}
