// ─── lib/intelligence/confidence/ConfidenceTypes.ts ──────────────────────────
// Phase 67 — shared types for the confidence system.

export type ConfidenceLevel =
  | "High"
  | "Moderate"
  | "Building"
  | "Limited"
  | "Insufficient";

export interface ConfidenceDimension {
  name:      string;
  score:     number;    // 0–1
  weight:    number;    // relative importance, all weights sum to 1.0
  available: boolean;   // false when source data is absent
  notes?:    string;
}

export interface ConfidenceProfile {
  level:          ConfidenceLevel;
  compositeScore: number;           // 0–1 weighted aggregate
  dimensions: {
    calibration:             ConfidenceDimension;
    verification:            ConfidenceDimension;
    dataCompleteness:        ConfidenceDimension;
    personalizationMaturity: ConfidenceDimension;
    predictionStability:     ConfidenceDimension;
    historicalContext:       ConfidenceDimension;
  };
  maturityStage: MaturityStage;
  // UX Stabilization Batch 9 — per-user computed value (see
  // ConfidenceCalculator.ts's workoutsToNextStage()), not stage-level
  // static metadata; null once at long_term_profile (no next stage).
  workoutsToNextStage: number | null;
  generatedAt:   string;
}

export type MaturityStage =
  | "getting_started"       // 0–10 workouts
  | "learning"              // 11–25 workouts
  | "personalized"          // 26–50 workouts
  | "highly_personalized"   // 51–100 workouts
  | "long_term_profile";    // 100+ workouts

export interface MaturityStageInfo {
  stage:                MaturityStage;
  label:                string;
  description:          string;
  minWorkouts:          number;
  maxWorkouts:          number | null;
  nextStage:            MaturityStage | null;
}

export const MATURITY_STAGES: MaturityStageInfo[] = [
  {
    stage: "getting_started",
    label: "Getting Started",
    description: "Axis is building your baseline using general training principles.",
    minWorkouts: 0, maxWorkouts: 10,
    nextStage: "learning",
  },
  {
    stage: "learning",
    label: "Learning",
    description: "Axis is identifying patterns specific to your training responses.",
    minWorkouts: 11, maxWorkouts: 25,
    nextStage: "personalized",
  },
  {
    stage: "personalized",
    label: "Personalized",
    description: "Axis has a reliable model of your recovery and performance patterns.",
    minWorkouts: 26, maxWorkouts: 50,
    nextStage: "highly_personalized",
  },
  {
    stage: "highly_personalized",
    label: "Highly Personalized",
    description: "Axis has deep pattern knowledge across multiple training cycles.",
    minWorkouts: 51, maxWorkouts: 100,
    nextStage: "long_term_profile",
  },
  {
    stage: "long_term_profile",
    label: "Long-Term Athlete Profile",
    description: "Axis has built a comprehensive longitudinal profile of your physiology.",
    minWorkouts: 101, maxWorkouts: null,
    nextStage: null,
  },
];

export interface ConfidenceExplanation {
  summary:         string;
  level:           ConfidenceLevel;
  strengths:       string[];
  gaps:            string[];
  improvements:    string[];
  maturityContext: string;
}

export interface ConfidenceSnapshot {
  date:           string;     // YYYY-MM-DD
  level:          ConfidenceLevel;
  compositeScore: number;
  maturityStage:  MaturityStage;
}
