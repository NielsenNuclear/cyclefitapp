// ─── lib/movement/beginnerFoundations.ts ──────────────────────────────────────
// Beginner coaching cue injection and exercise selection guidelines.
// Applied as a post-processing pass inside generateWorkout when difficulty = Beginner.

// ─── Coaching cue map (exercise name fragment → cue) ─────────────────────────

const BEGINNER_CUES: Array<{ pattern: string; cue: string }> = [
  { pattern: "bench press",     cue: "Control the lowering phase — 3 seconds down, pause, press." },
  { pattern: "squat",           cue: "Maintain pressure through the whole foot. Keep chest tall." },
  { pattern: "deadlift",        cue: "Keep the bar close to your body. Hinge at the hips, not the waist." },
  { pattern: "row",             cue: "Retract your shoulder blade first before pulling with the arm." },
  { pattern: "pull-up",         cue: "Full hang at the bottom. Lead with the chest, not the chin." },
  { pattern: "chin-up",         cue: "Full hang at the bottom. Squeeze the lat to initiate the pull." },
  { pattern: "overhead press",  cue: "Brace your core. Keep ribs down — avoid arching the lower back." },
  { pattern: "lat pulldown",    cue: "Pull to the chest, not behind the neck. Lean back slightly." },
  { pattern: "romanian deadlift", cue: "Soft knee, hinge until you feel the hamstring stretch. Bar stays close." },
  { pattern: "hip thrust",      cue: "Drive through the heel. Full glute squeeze at the top." },
  { pattern: "lunge",           cue: "Keep the front knee tracking over the second toe." },
  { pattern: "leg press",       cue: "Feet shoulder-width apart. Don't let knees cave inward." },
  { pattern: "dip",             cue: "Control the descent. Stop when upper arms reach parallel." },
  { pattern: "curl",            cue: "Keep elbows pinned to your sides. Full extension at the bottom." },
  { pattern: "tricep",          cue: "Lock the upper arm in place — only the forearm moves." },
  { pattern: "lateral raise",   cue: "Lead with the elbow, not the wrist. Stop at shoulder height." },
  { pattern: "fly",             cue: "Slight bend in the elbow throughout. Squeeze at the top." },
  { pattern: "plank",           cue: "Squeeze glutes and abs. Neutral spine — no sagging hips." },
  { pattern: "glute bridge",    cue: "Drive hips to the ceiling. Pause and squeeze at the top." },
  { pattern: "push-up",         cue: "Straight line from head to heel. Lower until chest nears the floor." },
];

// ─── Stabiliser additions for beginners ──────────────────────────────────────

export const BEGINNER_STABILISERS = [
  "face_pull_mob",   // Face Pull
  "pallof_press_mob", // Pallof Press
  "bird_dog_mob",    // Bird Dog
  "dead_bug_mob",    // Dead Bug
  "glute_bridge_mob", // Glute Bridge
  "monster_walk",    // Monster Walk
];

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns a coaching cue for the given exercise name, or undefined if none found.
 * Uses partial matching (case-insensitive).
 */
export function getBeginnerCue(exerciseName: string): string | undefined {
  const lower = exerciseName.toLowerCase();
  return BEGINNER_CUES.find(c => lower.includes(c.pattern.toLowerCase()))?.cue;
}

/**
 * Returns whether this exercise is "foundation-safe" for beginners.
 * High-skill movements should be deprioritised in favour of machines and bodyweight.
 */
export function isFoundationSafe(exerciseName: string): boolean {
  const lower = exerciseName.toLowerCase();
  const highSkill = [
    "snatch", "clean and jerk", "clean & jerk", "muscle-up", "pistol",
    "handstand", "nordic", "jefferson", "zercher", "cambered",
  ];
  return !highSkill.some(s => lower.includes(s));
}
