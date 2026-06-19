// ─── lib/periodization/periodizationState.ts ──────────────────────────────────
// Pure state machine: given MesocycleState + optional early-deload flag,
// returns a fully-computed PeriodizationStatus.

import type { GoalType }                     from "@/lib/exercises/goalBasedSelection";
import type { PeriodizationPhase, PhaseConfig } from "./goalProfiles";
import { getPeriodizationProfile, PHASE_DESCRIPTIONS } from "./goalProfiles";
import type { MesocycleState }               from "./mesocycle";

export type { PeriodizationPhase };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PeriodizationStatus {
  phase:               PeriodizationPhase;
  label:               string;
  description:         string;
  mesocycleWeek:       number;        // current week in block (1-indexed)
  blockLengthWeeks:    number;
  phaseWeek:           number;        // week within the current phase (1-indexed)
  phaseLength:         number;        // total weeks in the current phase
  weeksUntilNextPhase: number;
  nextPhase:           PeriodizationPhase;
  nextPhaseLabel:      string;
  blockProgress:       number;        // 0–1
  setsOffset:          number;
  rpeOffset:           number;
  deloadReps?:         string;
  forcedEarly:         boolean;       // true if adaptive deload overrode the schedule
}

// ─── Phase resolution ─────────────────────────────────────────────────────────

/** Find which phase the given mesocycleWeek falls in. */
function resolvePhase(
  mesocycleWeek: number,
  phases:        PhaseConfig[],
): { config: PhaseConfig; phaseWeek: number; phaseIndex: number } {
  let remaining = mesocycleWeek;
  for (let i = 0; i < phases.length; i++) {
    if (remaining <= phases[i].weeks) {
      return { config: phases[i], phaseWeek: remaining, phaseIndex: i };
    }
    remaining -= phases[i].weeks;
  }
  // Clamp to last phase if somehow past end
  const last = phases[phases.length - 1];
  return { config: last, phaseWeek: last.weeks, phaseIndex: phases.length - 1 };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computePeriodizationStatus(
  mesocycle:    MesocycleState,
  forceDeload?: boolean,
): PeriodizationStatus {
  const profile = getPeriodizationProfile(mesocycle.goal);
  const phases  = profile.phases;
  const week    = Math.max(1, Math.min(mesocycle.mesocycleWeek, mesocycle.blockLengthWeeks));

  const deloadConfig = phases.find(p => p.phase === "deload") ?? phases[phases.length - 1];

  // If adaptive deload triggered early and we're NOT already in a deload, override
  const useDeload = forceDeload && deloadConfig.phase !== "deload"
    ? false   // will be handled below
    : false;

  let resolved = resolvePhase(week, phases);
  let forcedEarly = false;

  if (forceDeload && resolved.config.phase !== "deload") {
    // Override: treat current week as deload week 1
    resolved = {
      config:     deloadConfig,
      phaseWeek:  1,
      phaseIndex: phases.indexOf(deloadConfig),
    };
    forcedEarly = true;
  }

  const { config, phaseWeek, phaseIndex } = resolved;

  // Next phase (wraps around to first phase)
  const nextConfig = phases[(phaseIndex + 1) % phases.length];
  const weeksUntilNextPhase = config.weeks - phaseWeek;

  return {
    phase:               config.phase,
    label:               config.label,
    description:         PHASE_DESCRIPTIONS[config.phase],
    mesocycleWeek:       week,
    blockLengthWeeks:    mesocycle.blockLengthWeeks,
    phaseWeek,
    phaseLength:         config.weeks,
    weeksUntilNextPhase,
    nextPhase:           nextConfig.phase,
    nextPhaseLabel:      nextConfig.label,
    blockProgress:       (week - 1) / mesocycle.blockLengthWeeks,
    setsOffset:          config.setsOffset,
    rpeOffset:           config.rpeOffset,
    deloadReps:          config.deloadReps,
    forcedEarly,
  };
}
