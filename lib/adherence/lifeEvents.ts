// ─── lib/adherence/lifeEvents.ts ─────────────────────────────────────────────
// Phase 35G — Life Event Mode.
// User-triggered mode for when real life disrupts the training plan.
// Axis immediately adjusts weekly expectations and surfaces lighter recommendations.

const STORAGE_KEY = "axis_life_events";

// ─── Types ────────────────────────────────────────────────────────────────────

export const LIFE_EVENT_TYPES = [
  "travel",
  "work_stress",
  "family_obligations",
  "poor_sleep_week",
  "illness",
  "period_symptoms",
  "mental_burnout",
] as const;

export type LifeEventType = (typeof LIFE_EVENT_TYPES)[number];

export const LIFE_EVENT_LABELS: Record<LifeEventType, string> = {
  travel:              "Travel",
  work_stress:         "Work stress",
  family_obligations:  "Family obligations",
  poor_sleep_week:     "Poor sleep week",
  illness:             "Illness",
  period_symptoms:     "Period symptoms",
  mental_burnout:      "Mental burnout",
};

export interface LifeEventAdjustments {
  sessionsPerWeekOverride: number;   // reduced target
  volumeScale:             number;   // 0.5–0.8
  nutritionFocus:          string;   // e.g. "Protein + hydration"
  expectationNote:         string;   // coaching message
}

export interface ActiveLifeEvent {
  type:          LifeEventType;
  startDate:     string;
  endDate:       string;
  durationDays:  number;
  daysRemaining: number;
  adjustments:   LifeEventAdjustments;
}

interface StoredLifeEvent {
  type:      LifeEventType;
  startDate: string;
  endDate:   string;
}

// ─── Adjustment profiles ─────────────────────────────────────────────────────

const ADJUSTMENTS: Record<LifeEventType, LifeEventAdjustments> = {
  travel: {
    sessionsPerWeekOverride: 2,
    volumeScale:             0.65,
    nutritionFocus:          "Protein + hydration",
    expectationNote:         "You're travelling — 2 bodyweight sessions and protein focus is a win.",
  },
  work_stress: {
    sessionsPerWeekOverride: 2,
    volumeScale:             0.70,
    nutritionFocus:          "Protein + regular meals",
    expectationNote:         "High work stress period. Shorter sessions reduce cortisol load better than rest.",
  },
  family_obligations: {
    sessionsPerWeekOverride: 2,
    volumeScale:             0.70,
    nutritionFocus:          "Protein + hydration",
    expectationNote:         "Family comes first. Two sessions keeps momentum without adding pressure.",
  },
  poor_sleep_week: {
    sessionsPerWeekOverride: 2,
    volumeScale:             0.60,
    nutritionFocus:          "Protein + anti-inflammatory foods",
    expectationNote:         "Poor sleep reduces recovery. Lighter training protects your progress.",
  },
  illness: {
    sessionsPerWeekOverride: 0,
    volumeScale:             0.00,
    nutritionFocus:          "Protein + hydration + rest",
    expectationNote:         "Rest is training when you're ill. Training resumes once symptoms clear.",
  },
  period_symptoms: {
    sessionsPerWeekOverride: 2,
    volumeScale:             0.60,
    nutritionFocus:          "Iron-rich foods + hydration",
    expectationNote:         "Heavy symptoms? Two gentle sessions this week. Your body is doing a lot.",
  },
  mental_burnout: {
    sessionsPerWeekOverride: 2,
    volumeScale:             0.55,
    nutritionFocus:          "Regular meals + magnesium",
    expectationNote:         "Burnout is real. Move gently, eat consistently, and protect sleep this week.",
  },
};

// ─── Storage helpers ──────────────────────────────────────────────────────────

function isClient(): boolean {
  return typeof window !== "undefined";
}

function load(): StoredLifeEvent | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredLifeEvent) : null;
  } catch {
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function recordLifeEvent(type: LifeEventType, durationDays: number): void {
  if (!isClient()) return;
  const start = new Date();
  const end   = new Date();
  end.setDate(end.getDate() + durationDays);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    type,
    startDate: start.toISOString().slice(0, 10),
    endDate:   end.toISOString().slice(0, 10),
  }));
}

export function clearLifeEvent(): void {
  if (!isClient()) return;
  localStorage.removeItem(STORAGE_KEY);
}

export function getActiveLifeEvent(today: string): ActiveLifeEvent | null {
  const stored = load();
  if (!stored) return null;
  if (today > stored.endDate) {
    clearLifeEvent();
    return null;
  }
  const endD  = new Date(stored.endDate);
  const todD  = new Date(today);
  const startD = new Date(stored.startDate);
  const durationDays  = Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.ceil((endD.getTime() - todD.getTime()) / (1000 * 60 * 60 * 24));

  return {
    type:         stored.type,
    startDate:    stored.startDate,
    endDate:      stored.endDate,
    durationDays,
    daysRemaining,
    adjustments:  ADJUSTMENTS[stored.type],
  };
}
