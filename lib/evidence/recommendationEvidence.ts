// ─── lib/evidence/recommendationEvidence.ts ──────────────────────────────────
// 42A — Recommendation Evidence Layer
// Every recommendation Axis makes is backed by a transparent evidence chain:
// which signals drove it, how confident, and how many prior observations.

const STORAGE_KEY    = "axis_recommendation_evidence";
const RETENTION_DAYS = 180;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SupportingSignal {
  label:  string;
  value:  string;
  weight: "high" | "medium" | "low";
}

export interface RecommendationEvidence {
  id:             string;   // date (one per day)
  date:           string;
  recommendation: string;
  signals:        SupportingSignal[];
  confidence:     number;   // 0–100
  sampleSize:     number;   // total prior workouts
  rationale:      string;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

function isClient(): boolean { return typeof window !== "undefined"; }

function load(): RecommendationEvidence[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecommendationEvidence[]) : [];
  } catch { return []; }
}

function persist(entries: RecommendationEvidence[]): void {
  if (!isClient()) return;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cut = cutoff.toISOString().slice(0, 10);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.filter(e => e.date >= cut)));
  } catch {}
}

export function saveRecommendationEvidence(evidence: RecommendationEvidence): void {
  persist([evidence, ...load().filter(e => e.id !== evidence.id)]);
}

export function getRecommendationEvidence(date: string): RecommendationEvidence | null {
  return load().find(e => e.id === date) ?? null;
}

export function getRecentEvidence(days = 30): RecommendationEvidence[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return load().filter(e => e.date >= cutoff.toISOString().slice(0, 10));
}

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildRecommendationEvidence(params: {
  date:           string;
  recommendation: string;
  readinessScore: number;
  recoveryScore:  number;
  stressLevel:    number;
  sleepQuality:   string;
  confidence:     number;
  totalWorkouts:  number;
  extraSignals?:  SupportingSignal[];
}): RecommendationEvidence {
  const {
    date, recommendation, readinessScore, recoveryScore,
    stressLevel, sleepQuality, confidence, totalWorkouts,
    extraSignals = [],
  } = params;

  const signals: SupportingSignal[] = [
    { label: "Readiness", value: `${readinessScore}/100`,                                              weight: "high"   },
    { label: "Recovery",  value: `${recoveryScore}/100`,                                               weight: "high"   },
    { label: "Stress",    value: stressLevel <= 2 ? "Low" : stressLevel <= 3 ? "Moderate" : "High",   weight: "medium" },
    { label: "Sleep",     value: sleepQuality,                                                          weight: "medium" },
    ...extraSignals,
  ];

  const rationale =
    `Based on readiness ${readinessScore}/100, recovery ${recoveryScore}/100, and ` +
    `${totalWorkouts} prior sessions. Confidence: ${confidence}%.`;

  return { id: date, date, recommendation, signals, confidence, sampleSize: totalWorkouts, rationale };
}
