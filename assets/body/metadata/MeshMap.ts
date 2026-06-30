/**
 * MeshMap.ts
 *
 * Maps from the actual Blender object names found in AxisFemale.blend to
 * BodyRegionRegistry IDs. Updated after running scripts/blender/inspect_mesh.py.
 *
 * Status: NEEDS CALIBRATION
 * Run `scripts/blender/inspect_mesh.py` to discover the real mesh names in
 * AxisFemale.blend, then fill in `blenderObjectName` for each entry.
 *
 * The renaming step in `scripts/blender/optimize_and_export.py` uses this
 * map to rename Blender mesh objects to the GLTF node names the engine expects.
 */

import type { BodyRegion } from "./BodyRegionRegistry";
import { BODY_REGION_REGISTRY } from "./BodyRegionRegistry";

// ─── Mesh entry ───────────────────────────────────────────────────────────────

export interface MeshMapEntry {
  /** Blender object name in the source .blend file */
  blenderObjectName: string | null;   // null = not yet identified / no separate mesh

  /** BodyRegion.id this mesh corresponds to */
  regionId:          string;

  /** GLTF export node name (what GltfBody.tsx looks for) */
  gltfNodeName:      string;

  /** Whether this is a complete region mesh or needs to be derived from the base mesh */
  meshStatus: "direct" | "needs_separation" | "use_overlay";

  notes?: string;
}

// ─── Mesh map ─────────────────────────────────────────────────────────────────
// Populated after running scripts/blender/inspect_mesh.py.
// Until then, all blenderObjectName values are null.

export const MESH_MAP: MeshMapEntry[] = [

  // ── Base body ────────────────────────────────────────────────────────────
  // The superheroine basemesh is a single body mesh. It becomes the base body
  // (skin). Individual muscle regions use anchor-based overlays until a
  // segmented model is provided.
  {
    blenderObjectName: "Body",  // largest mesh in AxisFemale.blend (18,004 verts)
    regionId:          "body_base",
    gltfNodeName:      "body",
    meshStatus:        "direct",
    notes:             "Main body mesh — exported as 'body' node; receives skin material",
  },

  // ── Muscle regions (overlay-based until mesh is segmented) ───────────────
  // These use anchor positions from BodyRegionRegistry.ts for now.
  // When a segmented model with separate muscle meshes is provided, change
  // meshStatus to "direct" and set blenderObjectName.

  { blenderObjectName: null, regionId: "neck",              gltfNodeName: "muscle_neck",              meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "anterior_delt",     gltfNodeName: "muscle_anterior_delt_left",   meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "anterior_delt",     gltfNodeName: "muscle_anterior_delt_right",  meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "lateral_delt",      gltfNodeName: "muscle_lateral_delt_left",    meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "lateral_delt",      gltfNodeName: "muscle_lateral_delt_right",   meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "posterior_delt",    gltfNodeName: "muscle_posterior_delt_left",  meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "posterior_delt",    gltfNodeName: "muscle_posterior_delt_right", meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "pec_major",         gltfNodeName: "muscle_pec_major_left",       meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "pec_major",         gltfNodeName: "muscle_pec_major_right",      meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "upper_trap",        gltfNodeName: "muscle_upper_trap",           meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "rhomboids",         gltfNodeName: "muscle_rhomboids",            meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "lat",               gltfNodeName: "muscle_lat_left",             meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "lat",               gltfNodeName: "muscle_lat_right",            meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "erector_spinae",    gltfNodeName: "muscle_erector_spinae",       meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "rectus_abdominis",  gltfNodeName: "muscle_rectus_abdominis",     meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "obliques",          gltfNodeName: "muscle_obliques_left",        meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "obliques",          gltfNodeName: "muscle_obliques_right",       meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "glute_max",         gltfNodeName: "muscle_glute_max_left",       meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "glute_max",         gltfNodeName: "muscle_glute_max_right",      meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "glute_med",         gltfNodeName: "muscle_glute_med_left",       meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "glute_med",         gltfNodeName: "muscle_glute_med_right",      meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "hip_flexors",       gltfNodeName: "muscle_hip_flexors_left",     meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "hip_flexors",       gltfNodeName: "muscle_hip_flexors_right",    meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "adductors",         gltfNodeName: "muscle_adductors_left",       meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "adductors",         gltfNodeName: "muscle_adductors_right",      meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "abductors",         gltfNodeName: "muscle_abductors_left",       meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "abductors",         gltfNodeName: "muscle_abductors_right",      meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "quads",             gltfNodeName: "muscle_quads_left",           meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "quads",             gltfNodeName: "muscle_quads_right",          meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "hamstrings",        gltfNodeName: "muscle_hamstrings_left",      meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "hamstrings",        gltfNodeName: "muscle_hamstrings_right",     meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "bicep",             gltfNodeName: "muscle_bicep_left",           meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "bicep",             gltfNodeName: "muscle_bicep_right",          meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "tricep",            gltfNodeName: "muscle_tricep_left",          meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "tricep",            gltfNodeName: "muscle_tricep_right",         meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "forearm",           gltfNodeName: "muscle_forearm_left",         meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "forearm",           gltfNodeName: "muscle_forearm_right",        meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "calves",            gltfNodeName: "muscle_calves_left",          meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "calves",            gltfNodeName: "muscle_calves_right",         meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "tibialis_anterior", gltfNodeName: "muscle_tibialis_left",        meshStatus: "use_overlay" },
  { blenderObjectName: null, regionId: "tibialis_anterior", gltfNodeName: "muscle_tibialis_right",       meshStatus: "use_overlay" },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export function meshEntryByGltfNode(gltfNodeName: string): MeshMapEntry | undefined {
  return MESH_MAP.find(e => e.gltfNodeName === gltfNodeName);
}

export function meshEntriesForRegion(regionId: string): MeshMapEntry[] {
  return MESH_MAP.filter(e => e.regionId === regionId);
}

/** Returns all Blender object names that need to be renamed during optimization */
export function blenderRenameMap(): Array<{ from: string; to: string }> {
  return MESH_MAP
    .filter(e => e.blenderObjectName !== null && e.meshStatus === "direct")
    .map(e => ({ from: e.blenderObjectName!, to: e.gltfNodeName }));
}

/** Validation: lists all expected GLTF nodes that are missing a Blender source */
export function getMissingMeshes(): MeshMapEntry[] {
  return MESH_MAP.filter(e => e.meshStatus === "direct" && e.blenderObjectName === null);
}
