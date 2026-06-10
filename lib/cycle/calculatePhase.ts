// ─── lib/cycle/calculatePhase.ts ─────────────────────────────────────────────
// Pure function. No side effects. No UI imports.
// Accepts last period date + cycle length → returns structured PhaseData.

import type { PhaseData, PhaseName, EnergyTrend } from "@/types/recommendation";

interface PhaseWindow {
  name: PhaseName;
  startDay: number;   // Inclusive (1-indexed)
  endDay:   number;   // Inclusive
}

/**
 * Returns the four phase windows for a given cycle length.
 * Research basis: menstrual ~days 1–5, follicular ~6 to ovulation-2,
 * ovulation window ≈ 2–3 days, luteal remainder.
 */
function getPhaseWindows(cycleLength: number): PhaseWindow[] {
  const ovulationDay   = Math.round(cycleLength - 14); // LH surge approx
  const menstrualEnd   = 5;
  const follicularEnd  = ovulationDay - 2;
  const ovulatoryEnd   = ovulationDay + 1;

  return [
    { name: "Menstrual",  startDay: 1,               endDay: menstrualEnd   },
    { name: "Follicular", startDay: menstrualEnd + 1, endDay: follicularEnd  },
    { name: "Ovulatory",  startDay: follicularEnd + 1, endDay: ovulatoryEnd  },
    { name: "Luteal",     startDay: ovulatoryEnd + 1,  endDay: cycleLength   },
  ];
}

/** Resolve cycle day from last period date. Wraps cleanly across cycles. */
function getCycleDay(lastPeriodDate: string, cycleLength: number): number {
  if (!lastPeriodDate) return 1;  // guard: empty string → day 1 (safe default)

  const now    = new Date();
  const period = new Date(lastPeriodDate);

  // Guard: unparseable date string → day 1
  if (isNaN(period.getTime())) return 1;

  // Treat times as date-only to avoid timezone drift
  now.setHours(0, 0, 0, 0);
  period.setHours(0, 0, 0, 0);

  const daysDiff = Math.floor((now.getTime() - period.getTime()) / 86_400_000);

  if (daysDiff < 0) {
    // Date is in the future — default to day 1
    return 1;
  }

  // Wrap into current cycle (0-indexed mod, then +1)
  return (daysDiff % cycleLength) + 1;
}

/** Phase-specific energy trends — research-informed, probabilistic. */
function getEnergyTrend(phase: PhaseName, dayInPhase: number): EnergyTrend {
  switch (phase) {
    case "Menstrual":    return "Low";
    case "Follicular":   return "Rising";
    case "Ovulatory":    return "Peak";
    case "Luteal":       return dayInPhase <= 5 ? "Variable" : "Declining";
    case "Late Luteal":  return "Declining";
    default:             return "Variable";
  }
}

/** Returns the human-readable hormonal context for each phase. */
function getHormonalContext(phase: PhaseName): string {
  const map: Record<PhaseName, string> = {
    Menstrual:   "Estrogen and progesterone are both low. Prostaglandins drive uterine shedding.",
    Follicular:  "Estrogen is rising as follicles develop. FSH is stimulating follicle maturation.",
    Ovulatory:   "Estrogen peaks, triggering an LH surge. Testosterone may briefly increase.",
    Luteal:      "Progesterone rises and dominates. Estrogen has a secondary rise before both drop.",
    "Late Luteal": "Progesterone and estrogen decline sharply as menstruation approaches.",
  };
  return map[phase];
}

/** Returns a short physiological note for UI context. */
function getPhysiologicalNote(phase: PhaseName): string {
  const map: Record<PhaseName, string> = {
    Menstrual:
      "Energy may be lower than usual, particularly in the first 1–2 days. Individual response varies widely — some women train well throughout.",
    Follicular:
      "Rising estrogen supports improved mood, motivation, and recovery. Insulin sensitivity tends to be higher in this phase.",
    Ovulatory:
      "Many women experience a window of peak energy and confidence. This is often the best phase for high-intensity efforts.",
    Luteal:
      "Progesterone elevation may reduce recovery efficiency slightly. Appetite and body temperature commonly increase.",
    "Late Luteal":
      "PMS symptoms may emerge. Energy fluctuations are common. Carbohydrate cravings are physiologically driven — not a lack of willpower.",
  };
  return map[phase];
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface CalculatePhaseInput {
  lastPeriodDate: string;   // "YYYY-MM-DD"
  cycleLength: number;      // days
  cycleRegularity?: string; // affects advisory weight
}

export function calculatePhase(input: CalculatePhaseInput): PhaseData {
  const { lastPeriodDate, cycleLength } = input;

  const cycleDay = getCycleDay(lastPeriodDate, cycleLength);
  const windows  = getPhaseWindows(cycleLength);

  // Find current phase window
  const window = windows.find(
    (w) => cycleDay >= w.startDay && cycleDay <= w.endDay
  ) ?? windows[windows.length - 1]; // fallback: luteal

  // Refine luteal: flag "Late Luteal" in final 4 days
  let phaseName: PhaseName = window.name;
  if (window.name === "Luteal" && cycleDay >= cycleLength - 4) {
    phaseName = "Late Luteal";
  }

  const dayInPhase         = cycleDay - window.startDay + 1;
  const daysUntilNextPhase = window.endDay - cycleDay + 1;

  return {
    name:               phaseName,
    cycleDay,
    cycleLength,
    dayInPhase,
    energyTrend:        getEnergyTrend(phaseName, dayInPhase),
    hormonalContext:    getHormonalContext(phaseName),
    physiologicalNote:  getPhysiologicalNote(phaseName),
    daysUntilNextPhase,
  };
}

/** Convenience: returns just the phase name from a date string. */
export function getPhaseNameFromDate(
  lastPeriodDate: string,
  cycleLength: number
): PhaseName {
  return calculatePhase({ lastPeriodDate, cycleLength }).name;
}
