// ─── lib/bodyIntelligence/muscleGroups.ts ────────────────────────────────────
// Canonical muscle group registry.
// IDs match GLTF mesh node naming convention:
//   Bilateral trunk: muscle_<id>  (e.g. muscle_rectus_abdominis)
//   Paired limb:     muscle_<id>_left / muscle_<id>_right

export interface MuscleGroupDef {
  id:            string;
  displayName:   string;
  bilateral:     boolean;   // true = left+right nodes; false = single node
  bodyRegion:    "neck" | "shoulder" | "chest" | "arms" | "back" | "core" | "hips" | "legs" | "lower_leg";
  description:   string;
  // String values that appear in exerciseLibrary primaryMuscles / secondaryMuscles
  libraryNames:  string[];
}

export const MUSCLE_GROUPS: MuscleGroupDef[] = [
  // ── Neck & Upper Back ──────────────────────────────────────────────────────
  {
    id: "neck", displayName: "Neck", bilateral: false, bodyRegion: "neck",
    description: "Cervical flexors and extensors.",
    libraryNames: ["Neck"],
  },
  {
    id: "upper_trap", displayName: "Upper Trapezius", bilateral: false, bodyRegion: "shoulder",
    description: "Elevates the scapula; often overactive in desk workers.",
    libraryNames: ["Upper Trapezius", "Trapezius"],
  },
  {
    id: "middle_trap", displayName: "Mid Trapezius", bilateral: false, bodyRegion: "back",
    description: "Retracts the scapula; essential postural muscle.",
    libraryNames: ["Middle Trapezius"],
  },
  {
    id: "lower_trap", displayName: "Lower Trapezius", bilateral: false, bodyRegion: "back",
    description: "Depresses and stabilises the scapula.",
    libraryNames: ["Lower Trapezius"],
  },
  {
    id: "rhomboids", displayName: "Rhomboids", bilateral: false, bodyRegion: "back",
    description: "Retracts and elevates the scapula.",
    libraryNames: ["Rhomboids"],
  },
  {
    id: "erector_spinae", displayName: "Erector Spinae", bilateral: false, bodyRegion: "back",
    description: "Spinal extensors running the length of the spine.",
    libraryNames: ["Erector Spinae", "Spinal Erectors", "Spinal Extensors", "Spinal Erectors (eccentric lengthening)"],
  },
  // ── Shoulders ──────────────────────────────────────────────────────────────
  {
    id: "anterior_delt", displayName: "Anterior Deltoid", bilateral: true, bodyRegion: "shoulder",
    description: "Front of the shoulder; primary in pressing movements.",
    libraryNames: ["Anterior Deltoid"],
  },
  {
    id: "lateral_delt", displayName: "Lateral Deltoid", bilateral: true, bodyRegion: "shoulder",
    description: "Side of the shoulder; creates shoulder width.",
    libraryNames: ["Medial Deltoid", "Lateral Deltoid"],
  },
  {
    id: "posterior_delt", displayName: "Posterior Deltoid", bilateral: true, bodyRegion: "shoulder",
    description: "Rear of the shoulder; horizontal abduction.",
    libraryNames: ["Posterior Deltoid", "Rear Deltoid", "Posterior Shoulder"],
  },
  {
    id: "rotator_cuff", displayName: "Rotator Cuff", bilateral: true, bodyRegion: "shoulder",
    description: "Deep shoulder stabilisers — SITS muscles.",
    libraryNames: ["Rotator Cuff", "Infraspinatus", "Supraspinatus", "Teres Minor", "Shoulder Stabilisers"],
  },
  // ── Chest ──────────────────────────────────────────────────────────────────
  {
    id: "pec_major", displayName: "Pectoralis Major", bilateral: true, bodyRegion: "chest",
    description: "Large chest muscle; horizontal and vertical pressing.",
    libraryNames: [
      "Pectoralis Major", "Pectorals",
      "Pectoralis Major (clavicular head)", "Pectoralis Major (clavicular)",
      "Pectoralis Major (lower fibres)", "Pectoralis Major (lower)",
      "Pectoralis Major (lower/sternal)", "Pectoralis Major (sternal)",
      "Pectoralis Major (sternal/lower)",
    ],
  },
  {
    id: "serratus", displayName: "Serratus Anterior", bilateral: true, bodyRegion: "chest",
    description: "Protracts and upwardly rotates the scapula.",
    libraryNames: ["Serratus Anterior"],
  },
  // ── Arms ───────────────────────────────────────────────────────────────────
  {
    id: "bicep", displayName: "Biceps", bilateral: true, bodyRegion: "arms",
    description: "Elbow flexor and supinator.",
    libraryNames: ["Biceps", "Biceps Brachii", "Biceps Brachii (long head)", "Brachialis"],
  },
  {
    id: "tricep", displayName: "Triceps", bilateral: true, bodyRegion: "arms",
    description: "Elbow extensor; largest muscle of the upper arm.",
    libraryNames: ["Triceps", "Triceps Brachii", "Triceps Brachii (long head)", "Long Head of Triceps", "Anconeus"],
  },
  {
    id: "forearm", displayName: "Forearms", bilateral: true, bodyRegion: "arms",
    description: "Wrist flexors, extensors, and grip.",
    libraryNames: ["Forearm Flexors", "Brachioradialis"],
  },
  // ── Back ───────────────────────────────────────────────────────────────────
  {
    id: "lat", displayName: "Latissimus Dorsi", bilateral: true, bodyRegion: "back",
    description: "Largest back muscle; shoulder extension and adduction.",
    libraryNames: ["Latissimus Dorsi", "Latissimus Dorsi (unilateral emphasis)", "Lats", "Upper Back", "Teres Major"],
  },
  // ── Core ───────────────────────────────────────────────────────────────────
  {
    id: "rectus_abdominis", displayName: "Rectus Abdominis", bilateral: false, bodyRegion: "core",
    description: "Six-pack muscle; trunk flexion.",
    libraryNames: ["Rectus Abdominis", "Abdominals", "Core", "Spinal Flexors"],
  },
  {
    id: "obliques", displayName: "Obliques", bilateral: true, bodyRegion: "core",
    description: "Trunk rotation and lateral flexion.",
    libraryNames: ["Obliques", "Core (anti-rotation)", "Intercostals"],
  },
  {
    id: "transverse_abdominis", displayName: "Transverse Abdominis", bilateral: false, bodyRegion: "core",
    description: "Deep abdominal stabiliser; intra-abdominal pressure.",
    libraryNames: ["Transverse Abdominis"],
  },
  {
    id: "quadratus_lumborum", displayName: "Quadratus Lumborum", bilateral: true, bodyRegion: "core",
    description: "Deep lower back muscle; lateral flexion and lumbar stability.",
    libraryNames: ["Quadratus Lumborum", "Lumbar Spine"],
  },
  // ── Hips & Glutes ──────────────────────────────────────────────────────────
  {
    id: "glute_max", displayName: "Gluteus Maximus", bilateral: true, bodyRegion: "hips",
    description: "Primary hip extensor; largest muscle in the body.",
    libraryNames: ["Glutes"],
  },
  {
    id: "glute_med", displayName: "Gluteus Medius", bilateral: true, bodyRegion: "hips",
    description: "Hip abductor; pelvis stabiliser during gait.",
    libraryNames: ["Glute Medius", "Hip Abductors", "Hip Stabilisers"],
  },
  {
    id: "hip_flexors", displayName: "Hip Flexors", bilateral: true, bodyRegion: "hips",
    description: "Iliopsoas; hip flexion and lumbar stabilisation.",
    libraryNames: ["Hip Flexors", "Hip Flexors (Iliopsoas)"],
  },
  {
    id: "hip_external_rotators", displayName: "Hip Rotators", bilateral: true, bodyRegion: "hips",
    description: "Deep hip rotators including piriformis.",
    libraryNames: ["Hip External Rotators", "Hip Internal Rotators", "Hip Rotators", "Piriformis"],
  },
  {
    id: "adductors", displayName: "Adductors", bilateral: true, bodyRegion: "hips",
    description: "Inner thigh; hip adduction.",
    libraryNames: ["Adductors", "Hip Adductors"],
  },
  {
    id: "abductors", displayName: "Abductors / TFL", bilateral: true, bodyRegion: "hips",
    description: "Outer hip; hip abduction and IT band tension.",
    libraryNames: ["Hip Abductors", "TFL"],
  },
  // ── Upper Leg ──────────────────────────────────────────────────────────────
  {
    id: "quads", displayName: "Quadriceps", bilateral: true, bodyRegion: "legs",
    description: "Front of thigh; knee extension and squat prime mover.",
    libraryNames: [
      "Quadriceps", "Quadriceps (vastus medialis emphasis)",
      "Rectus Femoris", "Vastus Lateralis", "Vastus Medialis",
    ],
  },
  {
    id: "hamstrings", displayName: "Hamstrings", bilateral: true, bodyRegion: "legs",
    description: "Back of thigh; hip extension and knee flexion.",
    libraryNames: ["Hamstrings", "Hamstrings (eccentric emphasis)"],
  },
  // ── Lower Leg ──────────────────────────────────────────────────────────────
  {
    id: "calves", displayName: "Calves", bilateral: true, bodyRegion: "lower_leg",
    description: "Gastrocnemius and soleus; plantarflexion.",
    libraryNames: ["Calves", "Gastrocnemius", "Soleus"],
  },
  {
    id: "tibialis_anterior", displayName: "Tibialis Anterior", bilateral: true, bodyRegion: "lower_leg",
    description: "Shin; dorsiflexion and foot control.",
    libraryNames: ["Ankle Dorsiflexors", "Tibialis Anterior"],
  },
  {
    id: "peroneals", displayName: "Peroneals", bilateral: true, bodyRegion: "lower_leg",
    description: "Lateral lower leg; ankle eversion and stability.",
    libraryNames: ["Peroneals", "Ankle Stabilisers"],
  },
];

// ─── Lookup helpers ────────────────────────────────────────────────────────────

const BY_ID = new Map(MUSCLE_GROUPS.map(g => [g.id, g]));

export function getMuscleGroupById(id: string): MuscleGroupDef | undefined {
  return BY_ID.get(id);
}

// Returns all muscle group IDs that match a library muscle name string
const LIBRARY_NAME_TO_IDS = new Map<string, string[]>();
for (const g of MUSCLE_GROUPS) {
  for (const name of g.libraryNames) {
    const key = name.toLowerCase();
    const arr = LIBRARY_NAME_TO_IDS.get(key) ?? [];
    arr.push(g.id);
    LIBRARY_NAME_TO_IDS.set(key, arr);
  }
}

export function muscleGroupIdsForLibraryName(libraryName: string): string[] {
  return LIBRARY_NAME_TO_IDS.get(libraryName.toLowerCase()) ?? [];
}

// All GLTF node names this system will look for
export function allGltfNodeNames(): string[] {
  const names: string[] = [];
  for (const g of MUSCLE_GROUPS) {
    if (g.bilateral) {
      names.push(`muscle_${g.id}_left`);
      names.push(`muscle_${g.id}_right`);
    } else {
      names.push(`muscle_${g.id}`);
    }
  }
  return names;
}
