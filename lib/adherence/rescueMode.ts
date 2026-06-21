// ─── lib/adherence/rescueMode.ts ─────────────────────────────────────────────
// Phase 35C — Rescue Mode.
// When adherence risk is HIGH, Axis enters a 7-day reduced-expectation period.
// Volume is cut, session count reduced, nutrition simplified, recovery to one habit.
// Goal: reduce overwhelm, preserve momentum, prevent complete dropout.

import type { AdherenceRiskReport } from "./riskDetection";

const STORAGE_KEY    = "axis_rescue_mode";
const RESCUE_DAYS    = 7;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RescueModeAdjustments {
  targetSessions:     number;    // e.g. 2 (reduced from user's normal 4)
  sessionDurationMin: number;    // e.g. 25 min target
  volumeScale:        number;    // multiplier applied to generateWorkout (e.g. 0.55)
  nutritionFocus:     "protein_hydration" | "full";
  recoveryHabits:     number;    // 1 instead of 5
  sessionNote:        string;    // coaching message shown in WorkoutCard
}

export interface RescueModeState {
  active:      boolean;
  startDate:   string;
  endDate:     string;        // startDate + 7 days
  reason:      string;
  adjustments: RescueModeAdjustments;
  daysRemaining: number;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

interface StoredRescueMode {
  active:    boolean;
  startDate: string;
  endDate:   string;
  reason:    string;
}

function isClient(): boolean {
  return typeof window !== "undefined";
}

function load(): StoredRescueMode | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredRescueMode) : null;
  } catch {
    return null;
  }
}

function persist(state: StoredRescueMode): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ─── Adjustments builder ─────────────────────────────────────────────────────

function buildAdjustments(reason: string): RescueModeAdjustments {
  return {
    targetSessions:     2,
    sessionDurationMin: 25,
    volumeScale:        0.55,
    nutritionFocus:     "protein_hydration",
    recoveryHabits:     1,
    sessionNote:        `Rescue mode active — ${reason} Session volume reduced. Focus on showing up, not intensity.`,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function activateRescueMode(reason: string): void {
  if (!isClient()) return;
  const today   = new Date().toISOString().slice(0, 10);
  const end     = new Date();
  end.setDate(end.getDate() + RESCUE_DAYS);
  persist({
    active:    true,
    startDate: today,
    endDate:   end.toISOString().slice(0, 10),
    reason,
  });
}

export function deactivateRescueMode(): void {
  if (!isClient()) return;
  const stored = load();
  if (stored) persist({ ...stored, active: false });
}

export function getRescueModeState(today: string): RescueModeState | null {
  const stored = load();
  if (!stored || !stored.active) return null;
  if (today > stored.endDate) {
    // Auto-expire
    if (isClient()) persist({ ...stored, active: false });
    return null;
  }
  const endD  = new Date(stored.endDate);
  const todD  = new Date(today);
  const daysRemaining = Math.ceil((endD.getTime() - todD.getTime()) / (1000 * 60 * 60 * 24));
  return {
    active:       true,
    startDate:    stored.startDate,
    endDate:      stored.endDate,
    reason:       stored.reason,
    adjustments:  buildAdjustments(stored.reason),
    daysRemaining,
  };
}

// Auto-activate when risk is HIGH (called from dashboard, after risk is computed)
export function maybeAutoActivateRescueMode(
  risk:  AdherenceRiskReport,
  today: string,
): boolean {
  if (risk.level !== "high") return false;
  const current = getRescueModeState(today);
  if (current) return false;   // already active — don't reset the timer
  activateRescueMode("High skip risk detected.");
  return true;
}
