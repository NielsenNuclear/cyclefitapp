// ─── lib/periodization/cycleSynergy.ts ────────────────────────────────────────
// Aligns periodization phase recommendations with the user's personal cycle.
// When a prime training window coincides with accumulation, suggests advancing
// to peak timing — the feature that makes Axis unique.

import type { LearnedPattern }      from "@/lib/cycleLearning/types";
import type { PeriodizationPhase }  from "./goalProfiles";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CycleSynergySignal {
  inPrimeWindow:       boolean;
  primeWindowStart:    number;   // cycle day
  primeWindowEnd:      number;
  currentCycleDay:     number | null;
  suggestPeakTiming:   boolean;   // true = push toward peak/intensification now
  suggestDeload:       boolean;   // true = luteal/menstrual → protect recovery
  alignmentNote:       string;
  alignmentLabel:      "Optimal" | "Favorable" | "Neutral" | "Protect";
}

// ─── Prime window detection ───────────────────────────────────────────────────

const DEFAULT_PRIME_START = 8;
const DEFAULT_PRIME_END   = 13;

/**
 * Computes the prime training window boundaries from learned patterns.
 * If a user consistently has limiting symptoms in the default window,
 * the window shifts forward.
 */
function computePrimeWindow(patterns: LearnedPattern[]): [number, number] {
  // Count high-confidence limiting symptoms that fall in the default window
  const limitingInWindow = patterns.filter(p =>
    p.confidence !== "low" &&
    p.averageCycleDay >= DEFAULT_PRIME_START &&
    p.averageCycleDay <= DEFAULT_PRIME_END &&
    (p.symptomId.includes("pain") || p.symptomId.includes("fatigue") ||
     p.symptomId.includes("cramps") || p.symptomId === "low_energy") &&
    p.averageSeverity >= 2,
  );

  // If recurring severe symptoms in the default window, shift forward by ~3 days
  if (limitingInWindow.length >= 2) {
    return [DEFAULT_PRIME_START + 3, DEFAULT_PRIME_END + 3];
  }
  return [DEFAULT_PRIME_START, DEFAULT_PRIME_END];
}

// ─── Luteal / menstrual protection window ────────────────────────────────────

function isProtectionWindow(cycleDay: number, cycleLength: number): boolean {
  // Late luteal ≈ last 5 days; menstrual ≈ first 5 days
  return cycleDay >= cycleLength - 4 || cycleDay <= 5;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeCycleSynergy(input: {
  cycleDay:            number | null;
  cycleLength:         number;
  patterns:            LearnedPattern[];
  currentPhase:        PeriodizationPhase;
}): CycleSynergySignal {
  const { cycleDay, cycleLength, patterns, currentPhase } = input;
  const [primeStart, primeEnd] = computePrimeWindow(patterns);

  if (cycleDay === null) {
    return {
      inPrimeWindow:    false,
      primeWindowStart: primeStart,
      primeWindowEnd:   primeEnd,
      currentCycleDay:  null,
      suggestPeakTiming: false,
      suggestDeload:    false,
      alignmentNote:    "Log your period to unlock cycle-aligned periodization.",
      alignmentLabel:   "Neutral",
    };
  }

  const inPrimeWindow = cycleDay >= primeStart && cycleDay <= primeEnd;
  const inProtection  = isProtectionWindow(cycleDay, cycleLength);

  // In prime window and not already at peak/deload → suggest advancing intensity
  const suggestPeakTiming = inPrimeWindow &&
    (currentPhase === "accumulation" || currentPhase === "intensification");

  // In protection window and training hard → suggest deload or back off
  const suggestDeload = inProtection &&
    (currentPhase === "peak" || currentPhase === "intensification");

  let alignmentLabel: CycleSynergySignal["alignmentLabel"];
  let alignmentNote: string;

  if (inPrimeWindow && suggestPeakTiming) {
    alignmentLabel = "Optimal";
    alignmentNote  = `You're in your prime training window (days ${primeStart}–${primeEnd}). This is the ideal time to push intensity — Axis has scheduled your heavier sessions here.`;
  } else if (inPrimeWindow) {
    alignmentLabel = "Favorable";
    alignmentNote  = `Prime training window active (days ${primeStart}–${primeEnd}). Energy and recovery are typically highest now.`;
  } else if (inProtection && suggestDeload) {
    alignmentLabel = "Protect";
    alignmentNote  = "Late cycle phase detected — your body is signalling recovery. Axis is moderating intensity to protect your next cycle.";
  } else if (inProtection) {
    alignmentLabel = "Protect";
    alignmentNote  = "Late luteal or menstrual phase. Prioritise recovery quality over performance output.";
  } else {
    alignmentLabel = "Neutral";
    alignmentNote  = `Building toward your prime window (days ${primeStart}–${primeEnd} of your cycle).`;
  }

  return {
    inPrimeWindow,
    primeWindowStart: primeStart,
    primeWindowEnd:   primeEnd,
    currentCycleDay:  cycleDay,
    suggestPeakTiming,
    suggestDeload,
    alignmentNote,
    alignmentLabel,
  };
}
