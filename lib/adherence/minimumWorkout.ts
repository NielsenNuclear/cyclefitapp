// ─── lib/adherence/minimumWorkout.ts ─────────────────────────────────────────
// Phase 34G — Minimum Viable Workout (rescue session).
// When skip risk is high, present a 10–15 min bodyweight alternative.
// No equipment needed. Derived from the planned workout's focus area.

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MinVWExercise {
  name:    string;
  sets:    number;
  reps:    string;       // e.g. "10" | "30s"
  restSec: number;
}

export interface MinimumViableWorkout {
  name:        string;
  durationMin: number;
  exercises:   MinVWExercise[];
  rationale:   string;
}

// ─── Focus area mapping ───────────────────────────────────────────────────────

type FocusArea = "upper" | "lower" | "fullBody" | "core";

function deriveFocusArea(dayName: string): FocusArea {
  const n = dayName.toLowerCase();
  if (n.includes("push") || n.includes("chest") || n.includes("pull") || n.includes("back") || n.includes("shoulder") || n.includes("upper")) return "upper";
  if (n.includes("leg") || n.includes("lower") || n.includes("glute") || n.includes("quad") || n.includes("hinge")) return "lower";
  if (n.includes("core") || n.includes("abs") || n.includes("mobility") || n.includes("flexibility")) return "core";
  return "fullBody";
}

// ─── Rescue session library ───────────────────────────────────────────────────

const RESCUE_SESSIONS: Record<FocusArea, MinimumViableWorkout> = {
  upper: {
    name:        "Upper Body Express",
    durationMin: 12,
    exercises: [
      { name: "Push-Ups",             sets: 3, reps: "10",  restSec: 30 },
      { name: "Pike Push-Ups",        sets: 3, reps: "8",   restSec: 30 },
      { name: "Doorframe Row",        sets: 3, reps: "10",  restSec: 30 },
    ],
    rationale: "Three movements — horizontal push, overhead push, and horizontal pull — hit your entire upper body in under 15 minutes.",
  },
  lower: {
    name:        "Lower Body Express",
    durationMin: 12,
    exercises: [
      { name: "Bodyweight Squats",    sets: 3, reps: "15",  restSec: 30 },
      { name: "Reverse Lunges",       sets: 3, reps: "10/side", restSec: 30 },
      { name: "Glute Bridges",        sets: 3, reps: "15",  restSec: 30 },
    ],
    rationale: "Knee-dominant, hip-dominant, and glute isolation — three patterns that cover your lower body stimulus without any equipment.",
  },
  fullBody: {
    name:        "Full Body Express",
    durationMin: 15,
    exercises: [
      { name: "Burpees",              sets: 3, reps: "5",   restSec: 40 },
      { name: "Push-Ups",             sets: 3, reps: "8",   restSec: 30 },
      { name: "Bodyweight Squats",    sets: 3, reps: "12",  restSec: 30 },
      { name: "Mountain Climbers",    sets: 3, reps: "20s", restSec: 30 },
    ],
    rationale: "A full-body circuit combining power, push, squat, and core — delivers a complete stimulus in 15 minutes.",
  },
  core: {
    name:        "Core & Mobility Express",
    durationMin: 10,
    exercises: [
      { name: "Dead Bug",             sets: 3, reps: "6/side", restSec: 20 },
      { name: "Plank",                sets: 3, reps: "30s",    restSec: 20 },
      { name: "Bird Dog",             sets: 3, reps: "8/side", restSec: 20 },
    ],
    rationale: "Anti-extension, isometric bracing, and anti-rotation — three core patterns that build stability without equipment.",
  },
};

// ─── Public API ───────────────────────────────────────────────────────────────

export function getMinimumViableWorkout(dayName: string): MinimumViableWorkout {
  return RESCUE_SESSIONS[deriveFocusArea(dayName)];
}
