// ─── lib/movement/mobilityLibrary.ts ──────────────────────────────────────────
// Complete in-memory library for warmup, mobility, activation, and recovery.
// No I/O — pure data. All other movement engines import from here.

// ─── Types ────────────────────────────────────────────────────────────────────

export type MobilityCategory =
  | "static_stretch"
  | "dynamic_stretch"
  | "activation"
  | "joint_mobility"
  | "recovery_mobility"
  | "cardio_warmup";

export type BodyRegion =
  | "neck"
  | "shoulders"
  | "thoracic"
  | "lower_back"
  | "hips"
  | "glutes"
  | "hamstrings"
  | "quadriceps"
  | "calves"
  | "ankles"
  | "wrists"
  | "forearms"
  | "core"
  | "full_body";

export interface MobilityEntry {
  id:                string;
  name:              string;
  category:          MobilityCategory;
  bodyRegion:        BodyRegion;
  difficulty:        "beginner" | "intermediate" | "advanced";
  durationSeconds:   number;
  equipment:         string[];           // empty = no equipment
  contraindications: string[];           // symptom IDs that should exclude this
  sides?:            boolean;            // true = do both sides
  reps?:             number;             // for rep-based (not timed) items
}

// ─── Cardio Warmup Options ────────────────────────────────────────────────────

export const CARDIO_WARMUPS: Array<{
  id: string; name: string; equipment: string[]; intensityNote: string;
}> = [
  { id: "walk",         name: "Brisk Walk",        equipment: [],                   intensityNote: "Easy pace" },
  { id: "incline_walk", name: "Incline Walk",       equipment: ["treadmill"],        intensityNote: "5–8% grade, easy pace" },
  { id: "treadmill",    name: "Light Jog",          equipment: ["treadmill"],        intensityNote: "Conversational pace" },
  { id: "assault_bike", name: "Assault Bike",       equipment: ["assault_bike"],     intensityNote: "Easy RPM, low resistance" },
  { id: "bike_erg",     name: "Bike Erg",           equipment: ["stationary_bike"],  intensityNote: "Easy cadence" },
  { id: "rower",        name: "Row Erg",            equipment: ["rowing_machine"],   intensityNote: "Easy strokes, 18–22 SPM" },
  { id: "elliptical",   name: "Elliptical",         equipment: ["elliptical"],       intensityNote: "Low resistance" },
  { id: "stair",        name: "Stair Climber",      equipment: ["stair_climber"],    intensityNote: "Easy pace" },
  { id: "jump_rope",    name: "Jump Rope",          equipment: ["jump_rope"],        intensityNote: "Steady rhythm" },
  { id: "march",        name: "March in Place",     equipment: [],                   intensityNote: "Knees to hip height" },
];

// ─── Main Library ─────────────────────────────────────────────────────────────

export const MOBILITY_LIBRARY: MobilityEntry[] = [

  // ── NECK ──────────────────────────────────────────────────────────────────
  {
    id: "neck_rotations", name: "Neck Rotations", category: "joint_mobility",
    bodyRegion: "neck", difficulty: "beginner", durationSeconds: 30,
    equipment: [], contraindications: [], sides: false,
  },
  {
    id: "neck_side_stretch", name: "Neck Side Stretch", category: "static_stretch",
    bodyRegion: "neck", difficulty: "beginner", durationSeconds: 30,
    equipment: [], contraindications: [], sides: true,
  },
  {
    id: "chin_tucks", name: "Chin Tucks", category: "joint_mobility",
    bodyRegion: "neck", difficulty: "beginner", durationSeconds: 30,
    equipment: [], contraindications: [], reps: 10,
  },

  // ── SHOULDERS ─────────────────────────────────────────────────────────────
  {
    id: "cross_body_stretch", name: "Cross-Body Shoulder Stretch", category: "static_stretch",
    bodyRegion: "shoulders", difficulty: "beginner", durationSeconds: 30,
    equipment: [], contraindications: [], sides: true,
  },
  {
    id: "sleeper_stretch", name: "Sleeper Stretch", category: "static_stretch",
    bodyRegion: "shoulders", difficulty: "intermediate", durationSeconds: 45,
    equipment: [], contraindications: ["shoulder_pain"], sides: true,
  },
  {
    id: "band_dislocates", name: "Band Shoulder Dislocates", category: "dynamic_stretch",
    bodyRegion: "shoulders", difficulty: "beginner", durationSeconds: 45,
    equipment: ["resistance_band"], contraindications: ["shoulder_pain"], reps: 10,
  },
  {
    id: "wall_slides", name: "Wall Slides", category: "activation",
    bodyRegion: "shoulders", difficulty: "beginner", durationSeconds: 40,
    equipment: [], contraindications: [], reps: 10,
  },
  {
    id: "shoulder_cars", name: "Shoulder CARs", category: "joint_mobility",
    bodyRegion: "shoulders", difficulty: "beginner", durationSeconds: 45,
    equipment: [], contraindications: [], sides: true, reps: 5,
  },

  // ── THORACIC SPINE ────────────────────────────────────────────────────────
  {
    id: "thread_needle", name: "Thread the Needle", category: "dynamic_stretch",
    bodyRegion: "thoracic", difficulty: "beginner", durationSeconds: 40,
    equipment: [], contraindications: [], sides: true,
  },
  {
    id: "open_book", name: "Open Book Stretch", category: "dynamic_stretch",
    bodyRegion: "thoracic", difficulty: "beginner", durationSeconds: 45,
    equipment: [], contraindications: [], sides: true, reps: 8,
  },
  {
    id: "cat_cow", name: "Cat Cow", category: "dynamic_stretch",
    bodyRegion: "thoracic", difficulty: "beginner", durationSeconds: 45,
    equipment: [], contraindications: [], reps: 10,
  },
  {
    id: "thoracic_extension", name: "Thoracic Extension over Foam Roller", category: "joint_mobility",
    bodyRegion: "thoracic", difficulty: "beginner", durationSeconds: 45,
    equipment: ["foam_roller"], contraindications: [],
  },

  // ── LOWER BACK ────────────────────────────────────────────────────────────
  {
    id: "childs_pose", name: "Child's Pose", category: "static_stretch",
    bodyRegion: "lower_back", difficulty: "beginner", durationSeconds: 45,
    equipment: [], contraindications: [],
  },
  {
    id: "prayer_stretch", name: "Prayer Stretch", category: "static_stretch",
    bodyRegion: "lower_back", difficulty: "beginner", durationSeconds: 40,
    equipment: [], contraindications: [],
  },
  {
    id: "pelvic_tilts", name: "Pelvic Tilts", category: "joint_mobility",
    bodyRegion: "lower_back", difficulty: "beginner", durationSeconds: 30,
    equipment: [], contraindications: [], reps: 15,
  },

  // ── HIPS ──────────────────────────────────────────────────────────────────
  {
    id: "ninety_ninety", name: "90/90 Hip Stretch", category: "static_stretch",
    bodyRegion: "hips", difficulty: "beginner", durationSeconds: 60,
    equipment: [], contraindications: [], sides: true,
  },
  {
    id: "hip_flexor_stretch", name: "Hip Flexor Stretch (Kneeling)", category: "static_stretch",
    bodyRegion: "hips", difficulty: "beginner", durationSeconds: 45,
    equipment: [], contraindications: [], sides: true,
  },
  {
    id: "worlds_greatest", name: "World's Greatest Stretch", category: "dynamic_stretch",
    bodyRegion: "hips", difficulty: "beginner", durationSeconds: 60,
    equipment: [], contraindications: [], sides: true, reps: 5,
  },
  {
    id: "pigeon_stretch", name: "Pigeon Stretch", category: "static_stretch",
    bodyRegion: "hips", difficulty: "intermediate", durationSeconds: 60,
    equipment: [], contraindications: [], sides: true,
  },
  {
    id: "couch_stretch_hip", name: "Couch Stretch", category: "static_stretch",
    bodyRegion: "hips", difficulty: "beginner", durationSeconds: 60,
    equipment: [], contraindications: [], sides: true,
  },
  {
    id: "hip_cars", name: "Hip CARs", category: "joint_mobility",
    bodyRegion: "hips", difficulty: "beginner", durationSeconds: 60,
    equipment: [], contraindications: [], sides: true, reps: 5,
  },

  // ── GLUTES ────────────────────────────────────────────────────────────────
  {
    id: "figure_four", name: "Figure-Four Stretch", category: "static_stretch",
    bodyRegion: "glutes", difficulty: "beginner", durationSeconds: 45,
    equipment: [], contraindications: [], sides: true,
  },
  {
    id: "glute_bridge_mob", name: "Glute Bridge (Mobility)", category: "activation",
    bodyRegion: "glutes", difficulty: "beginner", durationSeconds: 40,
    equipment: [], contraindications: [], reps: 15,
  },
  {
    id: "single_leg_bridge", name: "Single-Leg Glute Bridge", category: "activation",
    bodyRegion: "glutes", difficulty: "beginner", durationSeconds: 40,
    equipment: [], contraindications: [], sides: true, reps: 10,
  },

  // ── HAMSTRINGS ────────────────────────────────────────────────────────────
  {
    id: "toe_reach", name: "Standing Toe Reach", category: "static_stretch",
    bodyRegion: "hamstrings", difficulty: "beginner", durationSeconds: 30,
    equipment: [], contraindications: [],
  },
  {
    id: "standing_hamstring", name: "Standing Hamstring Stretch", category: "static_stretch",
    bodyRegion: "hamstrings", difficulty: "beginner", durationSeconds: 40,
    equipment: [], contraindications: [], sides: true,
  },
  {
    id: "banded_hamstring", name: "Banded Hamstring Stretch", category: "static_stretch",
    bodyRegion: "hamstrings", difficulty: "beginner", durationSeconds: 45,
    equipment: ["resistance_band"], contraindications: [], sides: true,
  },
  {
    id: "leg_swings", name: "Leg Swings", category: "dynamic_stretch",
    bodyRegion: "hamstrings", difficulty: "beginner", durationSeconds: 30,
    equipment: [], contraindications: [], sides: true, reps: 15,
  },

  // ── QUADRICEPS ────────────────────────────────────────────────────────────
  {
    id: "standing_quad", name: "Standing Quad Stretch", category: "static_stretch",
    bodyRegion: "quadriceps", difficulty: "beginner", durationSeconds: 30,
    equipment: [], contraindications: [], sides: true,
  },
  {
    id: "couch_stretch_quad", name: "Couch Stretch (Quad Focus)", category: "static_stretch",
    bodyRegion: "quadriceps", difficulty: "beginner", durationSeconds: 60,
    equipment: [], contraindications: [], sides: true,
  },

  // ── CALVES ────────────────────────────────────────────────────────────────
  {
    id: "wall_calf_stretch", name: "Wall Calf Stretch", category: "static_stretch",
    bodyRegion: "calves", difficulty: "beginner", durationSeconds: 30,
    equipment: [], contraindications: [], sides: true,
  },
  {
    id: "bent_knee_calf", name: "Bent-Knee Calf Stretch", category: "static_stretch",
    bodyRegion: "calves", difficulty: "beginner", durationSeconds: 30,
    equipment: [], contraindications: [], sides: true,
  },

  // ── ANKLES ────────────────────────────────────────────────────────────────
  {
    id: "ankle_circles", name: "Ankle Circles", category: "joint_mobility",
    bodyRegion: "ankles", difficulty: "beginner", durationSeconds: 30,
    equipment: [], contraindications: [], sides: true, reps: 10,
  },
  {
    id: "knee_over_toe_mob", name: "Knee-Over-Toe Mobilization", category: "joint_mobility",
    bodyRegion: "ankles", difficulty: "beginner", durationSeconds: 40,
    equipment: [], contraindications: [], sides: true, reps: 10,
  },

  // ── WRISTS ────────────────────────────────────────────────────────────────
  {
    id: "wrist_flexor", name: "Wrist Flexor Stretch", category: "static_stretch",
    bodyRegion: "wrists", difficulty: "beginner", durationSeconds: 30,
    equipment: [], contraindications: [], sides: true,
  },
  {
    id: "wrist_extensor", name: "Wrist Extensor Stretch", category: "static_stretch",
    bodyRegion: "wrists", difficulty: "beginner", durationSeconds: 30,
    equipment: [], contraindications: [], sides: true,
  },

  // ── FOREARMS ──────────────────────────────────────────────────────────────
  {
    id: "forearm_rotations", name: "Forearm Rotations", category: "joint_mobility",
    bodyRegion: "forearms", difficulty: "beginner", durationSeconds: 30,
    equipment: [], contraindications: [], reps: 10,
  },
  {
    id: "grip_mobility", name: "Grip Mobility (Open/Close)", category: "joint_mobility",
    bodyRegion: "forearms", difficulty: "beginner", durationSeconds: 20,
    equipment: [], contraindications: [], reps: 15,
  },

  // ── CORE ──────────────────────────────────────────────────────────────────
  {
    id: "dead_bug_mob", name: "Dead Bug", category: "activation",
    bodyRegion: "core", difficulty: "beginner", durationSeconds: 45,
    equipment: [], contraindications: [], reps: 8,
  },
  {
    id: "bird_dog_mob", name: "Bird Dog", category: "activation",
    bodyRegion: "core", difficulty: "beginner", durationSeconds: 40,
    equipment: [], contraindications: [], sides: true, reps: 8,
  },
  {
    id: "plank_mob", name: "Plank Hold", category: "activation",
    bodyRegion: "core", difficulty: "beginner", durationSeconds: 30,
    equipment: [], contraindications: [],
  },
  {
    id: "side_plank_mob", name: "Side Plank", category: "activation",
    bodyRegion: "core", difficulty: "beginner", durationSeconds: 30,
    equipment: [], contraindications: [], sides: true,
  },
  {
    id: "pallof_press_mob", name: "Pallof Press", category: "activation",
    bodyRegion: "core", difficulty: "beginner", durationSeconds: 40,
    equipment: ["cable_machine", "resistance_band"], contraindications: [], sides: true, reps: 10,
  },

  // ── UPPER BODY ACTIVATION ─────────────────────────────────────────────────
  {
    id: "band_pull_apart", name: "Band Pull-Apart", category: "activation",
    bodyRegion: "shoulders", difficulty: "beginner", durationSeconds: 30,
    equipment: ["resistance_band"], contraindications: [], reps: 15,
  },
  {
    id: "face_pull_mob", name: "Face Pull (Activation)", category: "activation",
    bodyRegion: "shoulders", difficulty: "beginner", durationSeconds: 30,
    equipment: ["cable_machine", "resistance_band"], contraindications: [], reps: 15,
  },
  {
    id: "scap_pushup", name: "Scapular Push-Up", category: "activation",
    bodyRegion: "shoulders", difficulty: "beginner", durationSeconds: 30,
    equipment: [], contraindications: [], reps: 10,
  },
  {
    id: "band_row_act", name: "Band Row (Activation)", category: "activation",
    bodyRegion: "thoracic", difficulty: "beginner", durationSeconds: 30,
    equipment: ["resistance_band"], contraindications: [], reps: 15,
  },
  {
    id: "external_rotation", name: "External Rotation (Band)", category: "activation",
    bodyRegion: "shoulders", difficulty: "beginner", durationSeconds: 30,
    equipment: ["resistance_band"], contraindications: [], sides: true, reps: 15,
  },
  {
    id: "ytw", name: "YTWs", category: "activation",
    bodyRegion: "shoulders", difficulty: "beginner", durationSeconds: 45,
    equipment: ["dumbbell", "resistance_band"], contraindications: [], reps: 10,
  },

  // ── LOWER BODY ACTIVATION ─────────────────────────────────────────────────
  {
    id: "bw_squat_act", name: "Bodyweight Squat (Activation)", category: "activation",
    bodyRegion: "quadriceps", difficulty: "beginner", durationSeconds: 30,
    equipment: [], contraindications: [], reps: 15,
  },
  {
    id: "monster_walk", name: "Monster Walk (Band)", category: "activation",
    bodyRegion: "glutes", difficulty: "beginner", durationSeconds: 45,
    equipment: ["resistance_band"], contraindications: [],
  },
  {
    id: "lateral_walk", name: "Lateral Band Walk", category: "activation",
    bodyRegion: "glutes", difficulty: "beginner", durationSeconds: 40,
    equipment: ["resistance_band"], contraindications: [],
  },
  {
    id: "step_up_act", name: "Step-Up (Bodyweight)", category: "activation",
    bodyRegion: "quadriceps", difficulty: "beginner", durationSeconds: 40,
    equipment: [], contraindications: [], sides: true, reps: 10,
  },
  {
    id: "single_leg_rdl_act", name: "Single-Leg RDL (Bodyweight)", category: "activation",
    bodyRegion: "hamstrings", difficulty: "beginner", durationSeconds: 40,
    equipment: [], contraindications: [], sides: true, reps: 8,
  },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export function getMobilityById(id: string): MobilityEntry | undefined {
  return MOBILITY_LIBRARY.find(m => m.id === id);
}

export function getMobilityByRegion(region: BodyRegion): MobilityEntry[] {
  return MOBILITY_LIBRARY.filter(m => m.bodyRegion === region);
}

export function getMobilityByCategory(category: MobilityCategory): MobilityEntry[] {
  return MOBILITY_LIBRARY.filter(m => m.category === category);
}

export function filterByEquipment(
  items:     MobilityEntry[],
  available: string[],
): MobilityEntry[] {
  if (available.length === 0) return items;
  const set = new Set(available);
  return items.filter(m =>
    m.equipment.length === 0 || m.equipment.some(e => set.has(e))
  );
}

/** Format a MobilityEntry into a display string for the card. */
export function formatDuration(entry: MobilityEntry): string {
  if (entry.reps) {
    const side = entry.sides ? " each side" : "";
    return `${entry.reps} reps${side}`;
  }
  const side = entry.sides ? " each side" : "";
  return `${entry.durationSeconds}s${side}`;
}
