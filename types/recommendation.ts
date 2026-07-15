// ─── types/recommendation.ts ─────────────────────────────────────────────────

export type PhaseName =
  | "Menstrual"
  | "Follicular"
  | "Ovulatory"
  | "Luteal"
  | "Late Luteal";

export type EnergyTrend   = "Rising" | "Peak" | "Variable" | "Declining" | "Low";
export type IntensityLevel = "Low" | "Light to Moderate" | "Moderate" | "Moderate to High" | "High";
export type ReadinessBadge = "Push" | "Maintain" | "Watch" | "Recover";

// ─── Phase metadata ───────────────────────────────────────────────────────────

export interface PhaseData {
  name: PhaseName;
  cycleDay: number;
  cycleLength: number;
  dayInPhase: number;
  energyTrend: EnergyTrend;
  hormonalContext: string;      // Brief, human-readable hormonal summary
  physiologicalNote: string;    // What's typically happening in the body
  daysUntilNextPhase: number;
  /**
   * False when lastPeriodDate was never provided (or is unparseable) and every
   * field above is a math placeholder (day 1 / Menstrual), not a real
   * observation. Phase-display components must check this before rendering
   * phase-specific judgment language — see lib/cycle/calculatePhase.ts.
   */
  hasCycleData: boolean;
}

// ─── Training state ───────────────────────────────────────────────────────────

export type TrainingState = "fresh" | "loaded" | "fatigued" | "overreached";

// ─── Training recommendation ──────────────────────────────────────────────────

export interface TrainingRecommendation {
  badge: ReadinessBadge;
  focus: string;
  intensity: IntensityLevel;
  headline: string;           // One-line coaching headline
  body: string;               // 1–2 sentence coaching rationale
  rationale: string;          // Scientific basis (for future "Why?" disclosure)
  suggestions: string[];      // Specific workout ideas
  signalDrivers: string[];    // Which signals drove this recommendation
  avoidNote?: string;         // Optional soft caution (never prescriptive)
}

// ─── Nutrition recommendation ─────────────────────────────────────────────────

export interface NutritionRecommendation {
  focus: string;
  headline: string;
  body: string;
  rationale: string;          // Scientific basis (for future "Why?" disclosure)
  priorities: string[];       // Key nutritional priorities today
  macroEmphasis: string;      // e.g. "Lean protein + complex carbs"
  hydration: string;
  keyNutrients: string[];     // e.g. ["Iron", "Magnesium"]
  timingNote?: string;
}

// ─── Recovery recommendation ──────────────────────────────────────────────────

export interface RecoveryRecommendation {
  focus: string;
  headline: string;
  body: string;
  rationale: string;          // Scientific basis (for future "Why?" disclosure)
  sleepTarget: string;
  sleepNote?: string;         // Phase-specific sleep architecture context
  practices: string[];
  stressNote?: string;
}

// ─── Full daily recommendation ────────────────────────────────────────────────

export interface DailyRecommendation {
  generatedAt: string;         // ISO timestamp
  phase: PhaseData;
  training: TrainingRecommendation;
  nutrition: NutritionRecommendation;
  recovery: RecoveryRecommendation;
  explanationPoints: ExplanationPoint[];
  disclaimer: string;
}

// ─── Explanation / transparency layer ────────────────────────────────────────

export interface ExplanationPoint {
  signal: string;             // e.g. "Cycle phase", "Sleep quality"
  observation: string;        // What the engine observed
  implication: string;        // What it means for recommendations
  weight: "Primary" | "Secondary" | "Advisory";
}
