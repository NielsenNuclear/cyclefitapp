// ─── lib/testing/scenarios.ts ─────────────────────────────────────────────────
// Phase 66 — Scenario Library
// Representative athlete scenarios for regression testing.
// These are synthetic data objects — NOT real users.
// Each scenario captures onboarding state + phase data + environmental signals.

import type { OnboardingData } from "@/lib/onboarding-types";
import type { PhaseData }       from "@/types/recommendation";

// ── Scenario type ─────────────────────────────────────────────────────────────

export interface TestScenario {
  id:          string;
  label:       string;
  description: string;
  tags:        string[];
  onboarding:  OnboardingData;
  phase:       PhaseData;
  signals: {
    readinessScore:  number;
    recoveryScore:   number;
    streakDays:      number;
    weeklyVolume:    number;
    fatigueEstimate: number;
    adherenceRate:   number;
    cycleDay:        number | null;
  };
}

// ── Phase data helpers ────────────────────────────────────────────────────────

function follicular(day = 8): PhaseData {
  return {
    name: "Follicular", cycleDay: day, cycleLength: 28,
    dayInPhase: day - 5, energyTrend: "Rising",
    hormonalContext: "Estrogen rising, progesterone low",
    physiologicalNote: "Energy and recovery typically improving.",
    daysUntilNextPhase: 6,
    hasCycleData: true,
  };
}

function ovulatory(day = 14): PhaseData {
  return {
    name: "Ovulatory", cycleDay: day, cycleLength: 28,
    dayInPhase: 0, energyTrend: "Peak",
    hormonalContext: "Estrogen peak, LH surge",
    physiologicalNote: "Peak energy window for many athletes.",
    daysUntilNextPhase: 2,
    hasCycleData: true,
  };
}

function luteal(day = 20): PhaseData {
  return {
    name: "Luteal", cycleDay: day, cycleLength: 28,
    dayInPhase: day - 16, energyTrend: "Variable",
    hormonalContext: "Progesterone rising, estrogen moderate",
    physiologicalNote: "Recovery may be slower; adapt load if needed.",
    daysUntilNextPhase: 8,
    hasCycleData: true,
  };
}

function menstrual(day = 2): PhaseData {
  return {
    name: "Menstrual", cycleDay: day, cycleLength: 28,
    dayInPhase: day - 1, energyTrend: "Low",
    hormonalContext: "Estrogen and progesterone both low",
    physiologicalNote: "Fatigue and discomfort common; listen to the body.",
    daysUntilNextPhase: 3,
    hasCycleData: true,
  };
}

// ── Base onboarding templates ─────────────────────────────────────────────────

const BASE: Partial<OnboardingData> = {
  goals: ["general_fitness"],
  equipment: ["dumbbells","resistance_bands"],
  cycleLength: 28,
  trainingYears: "3",
  trainingStyles: ["strength"],
  recoveryPractices: ["sleep"],
  sleepHours: 7,
  stressSources: [],
  lowEnergyTriggers: [],
  lastPeriodDate: "2026-06-25",
  cycleRegularity: "regular",
  trackingPreference: "app",
  symptoms: [],
  symptomSeverity: "mild",
  performancePriorities: ["consistency"],
  primaryGoalDeadline: "",
};

function mkUser(overrides: Partial<OnboardingData>): OnboardingData {
  return {
    ...BASE,
    name: "Test Athlete",
    email: "test@axis.dev",
    sleepQuality: "good",
    stressLevel: 3,
    energyPattern: "consistent_high",
    sessionsPerWeek: 3,
    trainingLevel: "intermediate",
    ...overrides,
  } as OnboardingData;
}

// ── Scenario library ──────────────────────────────────────────────────────────

export const SCENARIO_LIBRARY: TestScenario[] = [
  // ── 1. Baseline: healthy, intermediate, follicular ─────────────────────────
  {
    id: "baseline-intermediate-follicular",
    label: "Baseline — Intermediate / Follicular",
    description: "Well-rested intermediate athlete in follicular phase. Should produce a moderate-to-high volume recommendation.",
    tags: ["baseline","intermediate","follicular"],
    onboarding: mkUser({ trainingLevel: "intermediate", sessionsPerWeek: 3, sleepQuality: "good", stressLevel: 3 }),
    phase: follicular(9),
    signals: { readinessScore: 78, recoveryScore: 80, streakDays: 4, weeklyVolume: 12, fatigueEstimate: 25, adherenceRate: 0.82, cycleDay: 9 },
  },

  // ── 2. Beginner, poor sleep ────────────────────────────────────────────────
  {
    id: "beginner-poor-sleep",
    label: "Beginner — Poor Sleep",
    description: "Just-starting athlete with poor sleep. Volume should be low; recovery emphasis.",
    tags: ["beginner","poor-sleep","recovery"],
    onboarding: mkUser({ trainingLevel: "just_starting", sessionsPerWeek: 2, sleepQuality: "poor", stressLevel: 7 }),
    phase: follicular(7),
    signals: { readinessScore: 38, recoveryScore: 42, streakDays: 1, weeklyVolume: 4, fatigueEstimate: 60, adherenceRate: 0.55, cycleDay: 7 },
  },

  // ── 3. Elite athlete, peak phase ──────────────────────────────────────────
  {
    id: "elite-ovulatory-peak",
    label: "Elite — Ovulatory / Peak",
    description: "High-frequency competitive athlete at ovulatory peak. Should push volume.",
    tags: ["elite","ovulatory","high-readiness"],
    onboarding: mkUser({ trainingLevel: "competitive", sessionsPerWeek: 5, sleepQuality: "excellent", stressLevel: 2 }),
    phase: ovulatory(14),
    signals: { readinessScore: 92, recoveryScore: 88, streakDays: 9, weeklyVolume: 22, fatigueEstimate: 15, adherenceRate: 0.94, cycleDay: 14 },
  },

  // ── 4. High recovery score ─────────────────────────────────────────────────
  {
    id: "high-recovery",
    label: "High Recovery — Ready to Train",
    description: "Athlete who has had rest days and has rebuilt full recovery reserves.",
    tags: ["high-recovery","ready"],
    onboarding: mkUser({ trainingLevel: "intermediate", sessionsPerWeek: 3, sleepQuality: "excellent", stressLevel: 2 }),
    phase: follicular(10),
    signals: { readinessScore: 88, recoveryScore: 92, streakDays: 0, weeklyVolume: 8, fatigueEstimate: 10, adherenceRate: 0.9, cycleDay: 10 },
  },

  // ── 5. Low recovery / high fatigue ────────────────────────────────────────
  {
    id: "low-recovery-fatigue",
    label: "Low Recovery — High Fatigue",
    description: "Overreached athlete with depleted recovery. Should trigger deload or reduction.",
    tags: ["low-recovery","fatigue","deload"],
    onboarding: mkUser({ trainingLevel: "intermediate", sessionsPerWeek: 5, sleepQuality: "poor", stressLevel: 8 }),
    phase: luteal(22),
    signals: { readinessScore: 32, recoveryScore: 28, streakDays: 12, weeklyVolume: 28, fatigueEstimate: 82, adherenceRate: 0.6, cycleDay: 22 },
  },

  // ── 6. Luteal phase — variable energy ─────────────────────────────────────
  {
    id: "luteal-variable",
    label: "Luteal — Variable Energy",
    description: "Mid-cycle athlete in luteal phase with typical variable energy pattern.",
    tags: ["luteal","variable-energy"],
    onboarding: mkUser({ trainingLevel: "intermediate", energyPattern: "variable", sessionsPerWeek: 3, sleepQuality: "variable" }),
    phase: luteal(19),
    signals: { readinessScore: 62, recoveryScore: 65, streakDays: 3, weeklyVolume: 11, fatigueEstimate: 40, adherenceRate: 0.72, cycleDay: 19 },
  },

  // ── 7. Menstrual phase — low ───────────────────────────────────────────────
  {
    id: "menstrual-low",
    label: "Menstrual — Low Energy",
    description: "Athlete during menstrual phase with low energy and discomfort. Conservative output expected.",
    tags: ["menstrual","low-energy","conservative"],
    onboarding: mkUser({ trainingLevel: "intermediate", sessionsPerWeek: 3, sleepQuality: "poor", stressLevel: 6 }),
    phase: menstrual(2),
    signals: { readinessScore: 44, recoveryScore: 50, streakDays: 2, weeklyVolume: 9, fatigueEstimate: 55, adherenceRate: 0.68, cycleDay: 2 },
  },

  // ── 8. New user (zero history) ────────────────────────────────────────────
  {
    id: "new-user-zero-history",
    label: "New User — No Training History",
    description: "Brand-new user with no logged sessions. Uncertainty should be high; safe defaults expected.",
    tags: ["new-user","zero-history","edge-case"],
    onboarding: mkUser({ trainingLevel: "just_starting", sessionsPerWeek: 2, sleepQuality: "good", stressLevel: 4 }),
    phase: follicular(8),
    signals: { readinessScore: 60, recoveryScore: 65, streakDays: 0, weeklyVolume: 0, fatigueEstimate: 20, adherenceRate: 0, cycleDay: 8 },
  },

  // ── 9. Powerlifting block — strength focus ─────────────────────────────────
  {
    id: "powerlifting-strength",
    label: "Powerlifting Block — Strength Focus",
    description: "Athlete in a heavy strength block, high volume, follicular phase.",
    tags: ["powerlifting","strength","high-volume"],
    onboarding: mkUser({ trainingLevel: "advanced", sessionsPerWeek: 4, goals: ["strength"], sleepQuality: "good", stressLevel: 3 }),
    phase: follicular(11),
    signals: { readinessScore: 74, recoveryScore: 70, streakDays: 6, weeklyVolume: 20, fatigueEstimate: 45, adherenceRate: 0.88, cycleDay: 11 },
  },

  // ── 10. Hypertrophy block — moderate load ─────────────────────────────────
  {
    id: "hypertrophy-block",
    label: "Hypertrophy Block — Moderate Load",
    description: "Intermediate athlete in hypertrophy phase with good recovery.",
    tags: ["hypertrophy","moderate-load"],
    onboarding: mkUser({ trainingLevel: "intermediate", sessionsPerWeek: 4, goals: ["muscle_building"], sleepQuality: "good", stressLevel: 4 }),
    phase: follicular(12),
    signals: { readinessScore: 72, recoveryScore: 76, streakDays: 5, weeklyVolume: 16, fatigueEstimate: 35, adherenceRate: 0.80, cycleDay: 12 },
  },

  // ── 11. Maximum stress ────────────────────────────────────────────────────
  {
    id: "maximum-stress",
    label: "Edge Case — Maximum Stress",
    description: "Athlete reporting maximum stress (10/10). Guardrails should limit recommendation intensity.",
    tags: ["edge-case","max-stress","guardrail"],
    onboarding: mkUser({ trainingLevel: "intermediate", stressLevel: 10, sleepQuality: "poor", sessionsPerWeek: 4 }),
    phase: luteal(21),
    signals: { readinessScore: 28, recoveryScore: 35, streakDays: 8, weeklyVolume: 18, fatigueEstimate: 75, adherenceRate: 0.62, cycleDay: 21 },
  },

  // ── 12. Zero stress, perfect sleep ───────────────────────────────────────
  {
    id: "perfect-state",
    label: "Edge Case — Perfect State",
    description: "Theoretically ideal state: zero stress, excellent sleep, ovulatory. Should maximize recommendation.",
    tags: ["edge-case","optimal","max-output"],
    onboarding: mkUser({ trainingLevel: "advanced", stressLevel: 0, sleepQuality: "excellent", sessionsPerWeek: 4, energyPattern: "consistent_high" }),
    phase: ovulatory(14),
    signals: { readinessScore: 97, recoveryScore: 95, streakDays: 7, weeklyVolume: 18, fatigueEstimate: 8, adherenceRate: 0.95, cycleDay: 14 },
  },

  // ── 13. Conflicting signals ───────────────────────────────────────────────
  {
    id: "conflicting-signals",
    label: "Conflicting Signals",
    description: "High readiness but high fatigue estimate and low recovery — conflicting data. Should err conservative.",
    tags: ["conflicting","edge-case"],
    onboarding: mkUser({ trainingLevel: "intermediate", sleepQuality: "excellent", stressLevel: 2, sessionsPerWeek: 5 }),
    phase: luteal(18),
    signals: { readinessScore: 82, recoveryScore: 38, streakDays: 10, weeklyVolume: 25, fatigueEstimate: 78, adherenceRate: 0.88, cycleDay: 18 },
  },

  // ── 14. Late luteal / PMS pattern ────────────────────────────────────────
  {
    id: "late-luteal-pms",
    label: "Late Luteal — PMS Pattern",
    description: "Athlete in late luteal phase with typical PMS-related readiness drop.",
    tags: ["late-luteal","pms","conservative"],
    onboarding: mkUser({ trainingLevel: "intermediate", sleepQuality: "poor", stressLevel: 6, energyPattern: "variable" }),
    phase: { name: "Late Luteal", cycleDay: 26, cycleLength: 28, dayInPhase: 10, energyTrend: "Declining", hormonalContext: "Progesterone dropping", physiologicalNote: "Pre-menstrual symptoms common.", daysUntilNextPhase: 2, hasCycleData: true },
    signals: { readinessScore: 42, recoveryScore: 48, streakDays: 3, weeklyVolume: 10, fatigueEstimate: 58, adherenceRate: 0.65, cycleDay: 26 },
  },

  // ── 15. Recovery-only / no equipment ─────────────────────────────────────
  {
    id: "recovery-only",
    label: "Recovery Focus — No Equipment",
    description: "Athlete in full recovery mode with minimal equipment. Gentle movement only.",
    tags: ["recovery","no-equipment","rest"],
    onboarding: mkUser({ trainingLevel: "just_starting", sessionsPerWeek: 2, equipment: [], sleepQuality: "poor", stressLevel: 9 }),
    phase: menstrual(3),
    signals: { readinessScore: 22, recoveryScore: 25, streakDays: 0, weeklyVolume: 3, fatigueEstimate: 85, adherenceRate: 0.5, cycleDay: 3 },
  },
];

/** Look up a scenario by id. */
export function getScenario(id: string): TestScenario | undefined {
  return SCENARIO_LIBRARY.find(s => s.id === id);
}

/** Filter scenarios by tag. */
export function getScenariosByTag(tag: string): TestScenario[] {
  return SCENARIO_LIBRARY.filter(s => s.tags.includes(tag));
}
