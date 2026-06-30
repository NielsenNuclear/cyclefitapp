# Axis Body Intelligence — Asset Pipeline

## Quick reference

| What you need | Where it is |
|---|---|
| Original source asset | `assets/body/source/Superheroine_Basemesh_by_AlexLashko_V2.blend` |
| Working copy (edit this) | `assets/body/working/AxisFemale.blend` |
| Runtime model | `public/models/AxisFemale.glb` |
| Pipeline scripts | `scripts/blender/` |
| Body region registry | `assets/body/metadata/BodyRegionRegistry.ts` |
| Mesh name map | `assets/body/metadata/MeshMap.ts` |
| Overlay config | `assets/body/metadata/OverlayDefinitions.ts` |

---

## Source asset

**File:** `assets/body/source/Superheroine_Basemesh_by_AlexLashko_V2.blend`
**Original location:** `uploads_files_479925_Superheroine_Basemesh_by_AlexLashko_Blender_V2/`
**Author:** Alex Lashko
**Size:** ~87 MB
**License:** Review before public distribution

This file is **read-only**. Never open or modify it directly. All work happens on the working copy.

---

## Working copy

**File:** `assets/body/working/AxisFemale.blend`

This is the editable working copy. The optimization pipeline runs on this file.
To reset: `Copy-Item assets/body/source/Superheroine_Basemesh_by_AlexLashko_V2.blend assets/body/working/AxisFemale.blend -Force`

---

## Optimization pipeline (requires Blender 3.3+)

### Step 1 — Inspect the mesh

Run once to discover mesh names in the .blend:

```
blender --background assets/body/working/AxisFemale.blend ^
        --python scripts/blender/inspect_mesh.py
```

Output: `assets/body/metadata/mesh_inventory.json`

Then open `MeshMap.ts` and fill in `blenderObjectName` for each region using the names
from `mesh_inventory.json`.

### Step 2 — Optimize and export

```
blender --background assets/body/working/AxisFemale.blend ^
        --python scripts/blender/optimize_and_export.py
```

What the script does:
- Removes cameras, lights, empty helpers, and hair systems
- Applies all transforms (location/rotation/scale → identity)
- Recalculates normals (outside-facing)
- Renames the primary body mesh to `"body"`
- Exports `assets/body/export/AxisFemale.glb` (with Draco if available)
- Copies the GLB to `public/models/AxisFemale.glb`

### Step 3 — Activate in the app

Add to `.env.local`:
```
NEXT_PUBLIC_BODY_MODEL_URL=/models/AxisFemale.glb
```

Restart the dev server. Open `/body`. The GLTF renderer (`GltfBody.tsx`) will load automatically.

---

## Export settings

| Setting | Value |
|---|---|
| Format | GLB (binary GLTF 2.0) |
| Coordinate system | Y-up (GLTF standard) |
| Draco compression | Level 6 (requires Blender 3.3+) |
| Cameras | Excluded |
| Lights | Excluded |
| Animations | Excluded |
| Morph targets | Excluded |
| Materials | PBR pass-through |

---

## Architecture

```
AxisFemale.glb
    ↓
BodyRegionRegistry.ts  ← single source of truth for region IDs ↔ mesh nodes
    ↓
GltfBody.tsx           ← renderer (implements BodyRendererProps)
    ↓
OverlaySystem.ts       ← colour/material computation per muscle state
    ↓
CameraController.tsx   ← auto-fit + focus transitions
    ↓
DetailPanel.tsx        ← muscle info + ExerciseIntelligencePanel
```

**Invariant:** Nothing below `BodyRegionRegistry.ts` may reference GLTF mesh node names
directly. All mesh name knowledge lives in the registry.

---

## Current model state

The superheroine basemesh is **a single continuous body mesh** — it does not have
separate mesh objects per muscle region. This means:

- The `body` mesh node renders the full anatomical body (skin material)
- Muscle regions use **anchor-based ellipsoid overlays** (same as `PlaceholderBody.tsx`)
- All `muscle_*` GLTF node names in `BodyRegionRegistry.ts` are **reserved for a future segmented model**

To get fully interactive muscle mesh selection (click directly on a muscle surface rather than
an overlaid ellipsoid), you need a model with separate mesh objects per region.

### When you have a segmented model

1. Replace `assets/body/working/AxisFemale.blend` with the new model
2. Run `scripts/blender/inspect_mesh.py` to discover mesh names
3. Update `MeshMap.ts` — fill in `blenderObjectName` for each region, set `meshStatus: "direct"`
4. Run `scripts/blender/optimize_and_export.py` to export the new GLB
5. Copy to `public/models/AxisFemale.glb`
6. Update anchor positions in `BodyRegionRegistry.ts` if needed
7. Zero application code changes required — `GltfBody.tsx` will automatically
   find the `muscle_*` nodes via the registry

---

## Body region IDs

All 26 regions, their IDs (stable across model changes), and bilateral status:

| ID | Display Name | Bilateral | Area |
|---|---|---|---|
| `neck` | Neck | No | neck |
| `anterior_delt` | Anterior Deltoid | Yes | shoulder |
| `lateral_delt` | Lateral Deltoid | Yes | shoulder |
| `posterior_delt` | Posterior Deltoid | Yes | shoulder |
| `rotator_cuff` | Rotator Cuff | Yes | shoulder |
| `pec_major` | Pectoralis Major | Yes | chest |
| `upper_trap` | Upper Trapezius | No | back |
| `rhomboids` | Rhomboids | No | back |
| `lat` | Latissimus Dorsi | Yes | back |
| `erector_spinae` | Erector Spinae | No | back |
| `rectus_abdominis` | Rectus Abdominis | No | core |
| `obliques` | Obliques | Yes | core |
| `glute_max` | Gluteus Maximus | Yes | hips |
| `glute_med` | Gluteus Medius | Yes | hips |
| `hip_flexors` | Hip Flexors | Yes | hips |
| `adductors` | Adductors | Yes | hips |
| `abductors` | Abductors / TFL | Yes | hips |
| `quads` | Quadriceps | Yes | legs |
| `hamstrings` | Hamstrings | Yes | legs |
| `bicep` | Biceps | Yes | arms |
| `tricep` | Triceps | Yes | arms |
| `forearm` | Forearms | Yes | arms |
| `calves` | Calves | Yes | lower_leg |
| `tibialis_anterior` | Tibialis Anterior | Yes | lower_leg |

---

## Replacing the model entirely

To swap `AxisFemale.glb` for a completely different asset (different style, higher-resolution anatomy, etc.):

1. Place the new `.blend` in `assets/body/working/` (rename to `AxisFemale.blend` or update scripts)
2. Run `inspect_mesh.py` to learn its mesh structure
3. Update `MeshMap.ts` with the new Blender object names
4. Update anchor positions in `BodyRegionRegistry.ts` (run `scripts/blender/calibrate_anchors.py` when written)
5. Run `optimize_and_export.py`
6. Copy output to `public/models/AxisFemale.glb`

**Zero changes required** in: `GltfBody.tsx`, `CameraController.tsx`, `DetailPanel.tsx`,
`ExerciseIntelligencePanel.tsx`, `OverlaySystem.ts`, or any intelligence engine.
