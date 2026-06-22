// ─── lib/lifestyle/lifeContextEngine.ts ───────────────────────────────────────
// Phase 39I — Life Context Engine.
// Master lifestyle orchestrator. Consumes all Phase 39 signals and produces
// a single LifeContext that sits alongside the Phase 37 Training Decision.
// Pure function — no storage.

import type { EnergyAvailability, EnergyAvailabilityLevel } from "./energyAvailability";
import type { DailyTimeBudget }                              from "./timeBudget";
import type { TravelModeState }                              from "./travelMode";
import type { LifestyleBurnoutReport }                       from "./burnoutDetection";
import type { ScheduleLearningProfile }                      from "./scheduleLearning";
import type { ScheduledLifeEventWithContext }                 from "./lifeStressCalendar";
import type { ActiveLifeEvent }                              from "@/lib/adherence/lifeEvents";
import { WORKOUT_MODE_CONFIGS, type WorkoutMode }            from "./workoutModes";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LifeContextAdjustments {
  volumeScale:       number;
  equipmentOverride: string[] | null;   // null = use user's default equipment
  skipRecommended:   boolean;
}

export interface LifeContext {
  recommendedMode:     WorkoutMode;
  timeTarget:          number;           // minutes
  adherenceLikelihood: number;           // 0–100 probability of session completion
  energyLevel:         EnergyAvailabilityLevel;
  rationale:           string[];
  headline:            string;
  adjustments:         LifeContextAdjustments;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function modeFromBudget(minutes: number): WorkoutMode {
  if (minutes <= 15) return "minimum_effective";
  if (minutes <= 30) return "condensed";
  if (minutes <= 45) return "condensed";
  return "full";
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildLifeContext(input: {
  energyAvailability:    EnergyAvailability;
  timeBudget:            DailyTimeBudget;
  travelMode:            TravelModeState;
  lifestyleBurnout:      LifestyleBurnoutReport;
  scheduleLearning:      ScheduleLearningProfile;
  activeLifeEvent:       ActiveLifeEvent | null;
  upcomingEvents:        ScheduledLifeEventWithContext[];
  readinessScore:        number;
}): LifeContext {
  const rationale: string[] = [];

  // ── Mode ─────────────────────────────────────────────────────────────────
  let mode: WorkoutMode =
    input.lifestyleBurnout.risk === "critical" ? "recovery"
    : input.lifestyleBurnout.risk === "high"   ? "minimum_effective"
    : modeFromBudget(input.timeBudget.minutes);

  // ── Volume scale ─────────────────────────────────────────────────────────
  let volumeScale = WORKOUT_MODE_CONFIGS[mode].targetMinutes / 60;  // 0.25–1.0

  // Active life event overrides
  if (input.activeLifeEvent) {
    volumeScale = Math.min(volumeScale, input.activeLifeEvent.adjustments.volumeScale);
    rationale.push(`Life event (${input.activeLifeEvent.type.replace("_", " ")}) is active — volume scaled to ${Math.round(volumeScale * 100)}%.`);
  }

  // Travel mode
  const equipmentOverride = input.travelMode.isActive ? input.travelMode.equipmentOverride : null;
  if (input.travelMode.isActive) {
    volumeScale = Math.min(volumeScale, input.travelMode.volumeScale);
    rationale.push(input.travelMode.note);
    if (mode === "full") mode = "condensed";
  }

  // Lifestyle burnout escalation
  if (input.lifestyleBurnout.risk === "high" || input.lifestyleBurnout.risk === "critical") {
    rationale.push(...input.lifestyleBurnout.signals.slice(0, 2));
  }

  // Energy availability context
  rationale.push(input.energyAvailability.recommendation);

  // Schedule note
  if (input.scheduleLearning.bestTimeSlot) {
    rationale.push(`Your completion rate is highest during ${input.scheduleLearning.bestTimeSlot} sessions.`);
  }

  // Upcoming events
  const nearEvent = input.upcomingEvents.find(e => !e.isActive && e.daysUntil <= 3);
  if (nearEvent) {
    rationale.push(`${nearEvent.label} is ${nearEvent.daysUntil === 0 ? "tomorrow" : `in ${nearEvent.daysUntil} days`} — today's session has been lightened in preparation.`);
    volumeScale = Math.min(volumeScale, nearEvent.adjustments.volumeScale + 0.1);
  }

  volumeScale = clamp(Math.round(volumeScale * 100) / 100, 0.3, 1.0);

  // ── Adherence likelihood ─────────────────────────────────────────────────
  let adherenceLikelihood = 70;  // baseline
  adherenceLikelihood += (input.readinessScore - 50) * 0.4;
  adherenceLikelihood -= (10 - Math.min(10, input.energyAvailability.score / 10)) * 1.5;
  if (input.activeLifeEvent)             adherenceLikelihood -= 15;
  if (input.lifestyleBurnout.risk === "high")     adherenceLikelihood -= 20;
  if (input.lifestyleBurnout.risk === "critical") adherenceLikelihood -= 30;
  if (input.travelMode.isActive)         adherenceLikelihood -= 10;
  if (mode === "condensed" || mode === "minimum_effective") adherenceLikelihood += 10; // shorter = more likely
  adherenceLikelihood = clamp(Math.round(adherenceLikelihood), 5, 98);

  // ── Skip recommendation ──────────────────────────────────────────────────
  const skipRecommended =
    input.lifestyleBurnout.risk === "critical" ||
    (input.activeLifeEvent?.type === "illness" && input.energyAvailability.level === "low");

  if (skipRecommended) rationale.push("Rest is the training today — your body needs full recovery.");

  // ── Headline ─────────────────────────────────────────────────────────────
  const headline =
    skipRecommended
      ? "Rest day recommended — your body will benefit more from recovery today."
      : mode === "full"
        ? `Full session — ${input.timeBudget.minutes} minutes available.`
        : mode === "condensed"
          ? `Condensed session — ${input.timeBudget.minutes} minutes, high-value movements only.`
          : mode === "minimum_effective"
            ? `Minimum effective dose — ${input.timeBudget.minutes} minutes is enough to maintain progress.`
            : "Recovery session — light movement and mobility today.";

  return {
    recommendedMode:     mode,
    timeTarget:          input.timeBudget.minutes,
    adherenceLikelihood,
    energyLevel:         input.energyAvailability.level,
    rationale:           rationale.slice(0, 4),
    headline,
    adjustments: {
      volumeScale,
      equipmentOverride,
      skipRecommended,
    },
  };
}
