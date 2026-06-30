/**
 * BodyRegionRegistry.ts
 *
 * THE single interface between the 3D model and every Axis intelligence engine.
 *
 * Architecture guarantee: nothing downstream of this registry may reference
 * GLTF mesh names, anchor positions, or body-model implementation details
 * directly. All access goes through the lookup functions below.
 *
 * Replacing AxisFemale.glb with a different model requires only:
 *   1. Updating `gltfNodeName` in the entries below
 *   2. Updating the anchor positions below
 *   Nothing else changes.
 *
 * Body region IDs are stable and match lib/bodyIntelligence/muscleGroups.ts.
 *
 * Region count: 26 base regions → 44 GLTF nodes (bilateral regions have left + right nodes)
 */

export type BodySide     = "left" | "right" | "bilateral";
export type BodyArea     = "neck" | "shoulder" | "chest" | "back" | "core" | "hips" | "legs" | "lower_leg" | "arms";

export interface BodyRegion {
  /** Stable ID — matches MuscleGroupDef.id in lib/bodyIntelligence/muscleGroups.ts */
  id:           string;
  displayName:  string;
  side:         BodySide;
  area:         BodyArea;

  /**
   * GLTF mesh node name(s) for this region in AxisFemale.glb.
   * null = this region uses anchor-based overlays (see anchorPosition) rather
   * than a dedicated mesh node.
   *
   * Convention: "muscle_<id>" (bilateral) or "muscle_<id>_left" / "_right".
   * When a segmented model is provided, populate these. The current AxisFemale.glb
   * is a base mesh — all regions use anchor overlays.
   */
  gltfNodeName:       string | null;
  gltfNodeNameLeft?:  string | null;
  gltfNodeNameRight?: string | null;

  /**
   * World-space anchor position [x, y, z] in the AxisFemale.glb coordinate system.
   * Used by the overlay engine to place muscle patches.
   * [0, 0, 0] = not yet calibrated for this model.
   */
  anchorPosition:      [number, number, number];
  anchorPositionLeft?:  [number, number, number];
  anchorPositionRight?: [number, number, number];

  /** Approximate visual radius for the overlay patch */
  overlayRadius: number;

  /** Source of truth for exercise matching — see MuscleGroupDef.libraryNames */
  libraryNames: string[];
}

// ─── Registry ─────────────────────────────────────────────────────────────────
// Anchor positions are in AxisFemale.glb local space (Y-up, standing pose).
// Run scripts/blender/calibrate_anchors.py after any model change to update.
// All positions are placeholder [0,0,0] until calibration against the real model.

export const BODY_REGION_REGISTRY: BodyRegion[] = [

  // ── Neck ──────────────────────────────────────────────────────────────────
  {
    id: "neck", displayName: "Neck", side: "bilateral", area: "neck",
    gltfNodeName: "muscle_neck",
    anchorPosition:  [0.00,  1.55, 0.02],
    overlayRadius:   0.06,
    libraryNames: ["Neck"],
  },

  // ── Shoulders ─────────────────────────────────────────────────────────────
  {
    id: "anterior_delt", displayName: "Anterior Deltoid", side: "bilateral", area: "shoulder",
    gltfNodeName: null, gltfNodeNameLeft: "muscle_anterior_delt_left", gltfNodeNameRight: "muscle_anterior_delt_right",
    anchorPosition: [0.00, 1.30, 0.12],
    anchorPositionLeft:  [-0.18, 1.30,  0.10],
    anchorPositionRight: [ 0.18, 1.30,  0.10],
    overlayRadius: 0.07,
    libraryNames: ["Anterior Deltoid"],
  },
  {
    id: "lateral_delt", displayName: "Lateral Deltoid", side: "bilateral", area: "shoulder",
    gltfNodeName: null, gltfNodeNameLeft: "muscle_lateral_delt_left", gltfNodeNameRight: "muscle_lateral_delt_right",
    anchorPosition: [0.00, 1.28, 0.00],
    anchorPositionLeft:  [-0.22, 1.28, 0.00],
    anchorPositionRight: [ 0.22, 1.28, 0.00],
    overlayRadius: 0.07,
    libraryNames: ["Medial Deltoid", "Lateral Deltoid"],
  },
  {
    id: "posterior_delt", displayName: "Posterior Deltoid", side: "bilateral", area: "shoulder",
    gltfNodeName: null, gltfNodeNameLeft: "muscle_posterior_delt_left", gltfNodeNameRight: "muscle_posterior_delt_right",
    anchorPosition: [0.00, 1.28, -0.10],
    anchorPositionLeft:  [-0.20, 1.28, -0.10],
    anchorPositionRight: [ 0.20, 1.28, -0.10],
    overlayRadius: 0.07,
    libraryNames: ["Posterior Deltoid", "Rear Deltoid", "Posterior Shoulder"],
  },
  {
    id: "rotator_cuff", displayName: "Rotator Cuff", side: "bilateral", area: "shoulder",
    gltfNodeName: null, gltfNodeNameLeft: "muscle_rotator_cuff_left", gltfNodeNameRight: "muscle_rotator_cuff_right",
    anchorPosition: [0.00, 1.26, -0.06],
    anchorPositionLeft:  [-0.20, 1.26, -0.06],
    anchorPositionRight: [ 0.20, 1.26, -0.06],
    overlayRadius: 0.06,
    libraryNames: ["Rotator Cuff", "Infraspinatus", "Supraspinatus", "Teres Minor", "Shoulder Stabilisers"],
  },

  // ── Chest ─────────────────────────────────────────────────────────────────
  {
    id: "pec_major", displayName: "Pectoralis Major", side: "bilateral", area: "chest",
    gltfNodeName: null, gltfNodeNameLeft: "muscle_pec_major_left", gltfNodeNameRight: "muscle_pec_major_right",
    anchorPosition: [0.00, 1.15, 0.13],
    anchorPositionLeft:  [-0.14, 1.15, 0.13],
    anchorPositionRight: [ 0.14, 1.15, 0.13],
    overlayRadius: 0.11,
    libraryNames: ["Pectoralis Major", "Pectorals"],
  },

  // ── Upper Back ────────────────────────────────────────────────────────────
  {
    id: "upper_trap", displayName: "Upper Trapezius", side: "bilateral", area: "back",
    gltfNodeName: "muscle_upper_trap",
    anchorPosition: [0.00, 1.42, -0.06],
    overlayRadius: 0.09,
    libraryNames: ["Upper Trapezius", "Trapezius"],
  },
  {
    id: "rhomboids", displayName: "Rhomboids", side: "bilateral", area: "back",
    gltfNodeName: "muscle_rhomboids",
    anchorPosition: [0.00, 1.22, -0.12],
    overlayRadius: 0.08,
    libraryNames: ["Rhomboids"],
  },
  {
    id: "lat", displayName: "Latissimus Dorsi", side: "bilateral", area: "back",
    gltfNodeName: null, gltfNodeNameLeft: "muscle_lat_left", gltfNodeNameRight: "muscle_lat_right",
    anchorPosition: [0.00, 1.05, -0.10],
    anchorPositionLeft:  [-0.15, 1.05, -0.10],
    anchorPositionRight: [ 0.15, 1.05, -0.10],
    overlayRadius: 0.12,
    libraryNames: ["Latissimus Dorsi", "Lats", "Upper Back", "Teres Major"],
  },

  // ── Lower Back ────────────────────────────────────────────────────────────
  {
    id: "erector_spinae", displayName: "Erector Spinae", side: "bilateral", area: "back",
    gltfNodeName: "muscle_erector_spinae",
    anchorPosition: [0.00, 0.82, -0.10],
    overlayRadius: 0.09,
    libraryNames: ["Erector Spinae", "Spinal Erectors", "Spinal Extensors"],
  },

  // ── Core ──────────────────────────────────────────────────────────────────
  {
    id: "rectus_abdominis", displayName: "Rectus Abdominis", side: "bilateral", area: "core",
    gltfNodeName: "muscle_rectus_abdominis",
    anchorPosition: [0.00, 0.95, 0.12],
    overlayRadius: 0.09,
    libraryNames: ["Rectus Abdominis", "Abdominals", "Core"],
  },
  {
    id: "obliques", displayName: "Obliques", side: "bilateral", area: "core",
    gltfNodeName: null, gltfNodeNameLeft: "muscle_obliques_left", gltfNodeNameRight: "muscle_obliques_right",
    anchorPosition: [0.00, 0.95, 0.08],
    anchorPositionLeft:  [-0.12, 0.95, 0.08],
    anchorPositionRight: [ 0.12, 0.95, 0.08],
    overlayRadius: 0.08,
    libraryNames: ["Obliques", "Core (anti-rotation)"],
  },

  // ── Hips & Glutes ─────────────────────────────────────────────────────────
  {
    id: "glute_max", displayName: "Gluteus Maximus", side: "bilateral", area: "hips",
    gltfNodeName: null, gltfNodeNameLeft: "muscle_glute_max_left", gltfNodeNameRight: "muscle_glute_max_right",
    anchorPosition: [0.00, 0.60, -0.16],
    anchorPositionLeft:  [-0.12, 0.60, -0.16],
    anchorPositionRight: [ 0.12, 0.60, -0.16],
    overlayRadius: 0.13,
    libraryNames: ["Glutes"],
  },
  {
    id: "glute_med", displayName: "Gluteus Medius", side: "bilateral", area: "hips",
    gltfNodeName: null, gltfNodeNameLeft: "muscle_glute_med_left", gltfNodeNameRight: "muscle_glute_med_right",
    anchorPosition: [0.00, 0.72, -0.10],
    anchorPositionLeft:  [-0.16, 0.72, -0.10],
    anchorPositionRight: [ 0.16, 0.72, -0.10],
    overlayRadius: 0.09,
    libraryNames: ["Glute Medius", "Hip Abductors", "Hip Stabilisers"],
  },
  {
    id: "hip_flexors", displayName: "Hip Flexors", side: "bilateral", area: "hips",
    gltfNodeName: null, gltfNodeNameLeft: "muscle_hip_flexors_left", gltfNodeNameRight: "muscle_hip_flexors_right",
    anchorPosition: [0.00, 0.72, 0.08],
    anchorPositionLeft:  [-0.09, 0.72, 0.08],
    anchorPositionRight: [ 0.09, 0.72, 0.08],
    overlayRadius: 0.08,
    libraryNames: ["Hip Flexors", "Hip Flexors (Iliopsoas)"],
  },
  {
    id: "adductors", displayName: "Adductors", side: "bilateral", area: "hips",
    gltfNodeName: null, gltfNodeNameLeft: "muscle_adductors_left", gltfNodeNameRight: "muscle_adductors_right",
    anchorPosition: [0.00, 0.38, 0.04],
    anchorPositionLeft:  [-0.06, 0.38, 0.04],
    anchorPositionRight: [ 0.06, 0.38, 0.04],
    overlayRadius: 0.09,
    libraryNames: ["Adductors", "Hip Adductors"],
  },
  {
    id: "abductors", displayName: "Abductors / TFL", side: "bilateral", area: "hips",
    gltfNodeName: null, gltfNodeNameLeft: "muscle_abductors_left", gltfNodeNameRight: "muscle_abductors_right",
    anchorPosition: [0.00, 0.55, 0.00],
    anchorPositionLeft:  [-0.18, 0.55, 0.00],
    anchorPositionRight: [ 0.18, 0.55, 0.00],
    overlayRadius: 0.08,
    libraryNames: ["Hip Abductors", "TFL"],
  },

  // ── Upper Leg ─────────────────────────────────────────────────────────────
  {
    id: "quads", displayName: "Quadriceps", side: "bilateral", area: "legs",
    gltfNodeName: null, gltfNodeNameLeft: "muscle_quads_left", gltfNodeNameRight: "muscle_quads_right",
    anchorPosition: [0.00, 0.22, 0.10],
    anchorPositionLeft:  [-0.10, 0.22, 0.10],
    anchorPositionRight: [ 0.10, 0.22, 0.10],
    overlayRadius: 0.12,
    libraryNames: ["Quadriceps", "Rectus Femoris", "Vastus Lateralis", "Vastus Medialis"],
  },
  {
    id: "hamstrings", displayName: "Hamstrings", side: "bilateral", area: "legs",
    gltfNodeName: null, gltfNodeNameLeft: "muscle_hamstrings_left", gltfNodeNameRight: "muscle_hamstrings_right",
    anchorPosition: [0.00, 0.22, -0.12],
    anchorPositionLeft:  [-0.10, 0.22, -0.12],
    anchorPositionRight: [ 0.10, 0.22, -0.12],
    overlayRadius: 0.11,
    libraryNames: ["Hamstrings"],
  },

  // ── Arms ──────────────────────────────────────────────────────────────────
  {
    id: "bicep", displayName: "Biceps", side: "bilateral", area: "arms",
    gltfNodeName: null, gltfNodeNameLeft: "muscle_bicep_left", gltfNodeNameRight: "muscle_bicep_right",
    anchorPosition: [0.00, 1.08, 0.06],
    anchorPositionLeft:  [-0.26, 1.08, 0.06],
    anchorPositionRight: [ 0.26, 1.08, 0.06],
    overlayRadius: 0.07,
    libraryNames: ["Biceps", "Biceps Brachii", "Brachialis"],
  },
  {
    id: "tricep", displayName: "Triceps", side: "bilateral", area: "arms",
    gltfNodeName: null, gltfNodeNameLeft: "muscle_tricep_left", gltfNodeNameRight: "muscle_tricep_right",
    anchorPosition: [0.00, 1.08, -0.06],
    anchorPositionLeft:  [-0.26, 1.08, -0.06],
    anchorPositionRight: [ 0.26, 1.08, -0.06],
    overlayRadius: 0.07,
    libraryNames: ["Triceps", "Triceps Brachii", "Long Head of Triceps"],
  },
  {
    id: "forearm", displayName: "Forearms", side: "bilateral", area: "arms",
    gltfNodeName: null, gltfNodeNameLeft: "muscle_forearm_left", gltfNodeNameRight: "muscle_forearm_right",
    anchorPosition: [0.00, 0.88, 0.04],
    anchorPositionLeft:  [-0.27, 0.88, 0.04],
    anchorPositionRight: [ 0.27, 0.88, 0.04],
    overlayRadius: 0.06,
    libraryNames: ["Forearm Flexors", "Brachioradialis"],
  },

  // ── Lower Leg ─────────────────────────────────────────────────────────────
  {
    id: "calves", displayName: "Calves", side: "bilateral", area: "lower_leg",
    gltfNodeName: null, gltfNodeNameLeft: "muscle_calves_left", gltfNodeNameRight: "muscle_calves_right",
    anchorPosition: [0.00, -0.60, -0.10],
    anchorPositionLeft:  [-0.09, -0.60, -0.10],
    anchorPositionRight: [ 0.09, -0.60, -0.10],
    overlayRadius: 0.08,
    libraryNames: ["Calves", "Gastrocnemius", "Soleus"],
  },
  {
    id: "tibialis_anterior", displayName: "Tibialis Anterior", side: "bilateral", area: "lower_leg",
    gltfNodeName: null, gltfNodeNameLeft: "muscle_tibialis_left", gltfNodeNameRight: "muscle_tibialis_right",
    anchorPosition: [0.00, -0.55, 0.09],
    anchorPositionLeft:  [-0.09, -0.55, 0.09],
    anchorPositionRight: [ 0.09, -0.55, 0.09],
    overlayRadius: 0.06,
    libraryNames: ["Ankle Dorsiflexors", "Tibialis Anterior"],
  },
];

// ─── Lookup index (built at module load — O(1) access) ────────────────────────

const BY_ID          = new Map<string, BodyRegion>(BODY_REGION_REGISTRY.map(r => [r.id, r]));
const BY_MESH_NODE   = new Map<string, BodyRegion>();

for (const r of BODY_REGION_REGISTRY) {
  const register = (name: string | null | undefined) => { if (name) BY_MESH_NODE.set(name, r); };
  register(r.gltfNodeName);
  register(r.gltfNodeNameLeft);
  register(r.gltfNodeNameRight);
}

// ─── Public API ────────────────────────────────────────────────────────────────

export function regionById(id: string): BodyRegion | undefined {
  return BY_ID.get(id);
}

export function regionByMeshNode(nodeName: string): BodyRegion | undefined {
  return BY_MESH_NODE.get(nodeName);
}

export function muscleIdFromMeshNode(nodeName: string): string | null {
  return BY_MESH_NODE.get(nodeName)?.id ?? null;
}

export function meshNodesForRegion(id: string): string[] {
  const r = BY_ID.get(id);
  if (!r) return [];
  const out: string[] = [];
  if (r.gltfNodeName)       out.push(r.gltfNodeName);
  if (r.gltfNodeNameLeft)   out.push(r.gltfNodeNameLeft);
  if (r.gltfNodeNameRight)  out.push(r.gltfNodeNameRight);
  return out;
}

export function anchorForRegion(
  id:   string,
  side: "left" | "right" | "center" = "center",
): [number, number, number] {
  const r = BY_ID.get(id);
  if (!r) return [0, 0, 0];
  if (side === "left"  && r.anchorPositionLeft)  return r.anchorPositionLeft;
  if (side === "right" && r.anchorPositionRight) return r.anchorPositionRight;
  return r.anchorPosition;
}

/** All expected GLTF node names — for validation after export */
export function allExpectedMeshNodes(): string[] {
  const nodes: string[] = [];
  for (const r of BODY_REGION_REGISTRY) {
    if (r.gltfNodeName)       nodes.push(r.gltfNodeName);
    if (r.gltfNodeNameLeft)   nodes.push(r.gltfNodeNameLeft);
    if (r.gltfNodeNameRight)  nodes.push(r.gltfNodeNameRight);
  }
  return nodes;
}
