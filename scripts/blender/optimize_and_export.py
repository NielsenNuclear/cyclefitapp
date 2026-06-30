"""
optimize_and_export.py — Axis Body Intelligence pipeline, Step 2

Optimizes AxisFemale.blend and exports AxisFemale.glb.

IMPORTANT: Run this on assets/body/working/AxisFemale.blend ONLY.
Never open or modify assets/body/source/.

Usage (headless):
  blender --background assets/body/working/AxisFemale.blend \
          --python scripts/blender/optimize_and_export.py

Or open Blender, switch to the Scripting workspace, open this file, Run.

What this script does:
  1. Remove unused objects (cameras, lights, empty helpers)
  2. Remove / simplify hair systems if present
  3. Apply all transforms (location / rotation / scale → identity)
  4. Verify and recalculate normals (outside-facing)
  5. Rename the main body mesh to "body" (standard base node name)
  6. Export as assets/body/export/AxisFemale.glb
     - Y-up coordinate system (GLTF standard)
     - Draco mesh compression (requires Blender 3.3+ with draco addon)
     - No cameras, no lights in export
     - Materials: PBR (BSDF) pass-through
  7. Copy the GLB to public/models/AxisFemale.glb for Next.js serving

After export, set in .env.local:
  NEXT_PUBLIC_BODY_MODEL_URL=/models/AxisFemale.glb
"""

import bpy
import os
import shutil
import sys

# ─── Paths ────────────────────────────────────────────────────────────────────

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))

WORKING_BLEND = os.path.join(PROJECT_ROOT, "assets", "body", "working", "AxisFemale.blend")
EXPORT_GLB    = os.path.join(PROJECT_ROOT, "assets", "body", "export", "AxisFemale.glb")
PUBLIC_GLB    = os.path.join(PROJECT_ROOT, "public", "models", "AxisFemale.glb")

# ─── Step 1: Remove unused objects ───────────────────────────────────────────

def remove_unused_objects():
    print("\n[1/5] Removing unused objects...")
    remove_types = {"CAMERA", "LIGHT", "LIGHT_PROBE", "SPEAKER", "EMPTY"}
    to_remove = [o for o in bpy.data.objects if o.type in remove_types]
    for obj in to_remove:
        print(f"     Removing {obj.type}: {obj.name}")
        bpy.data.objects.remove(obj, do_unlink=True)

    # Remove particle systems (hair)
    for obj in bpy.data.objects:
        if obj.type == "MESH" and obj.particle_systems:
            for ps in obj.particle_systems:
                if ps.settings.type == "HAIR":
                    print(f"     Removing hair particle system '{ps.name}' from '{obj.name}'")
                    obj.modifiers.remove(obj.modifiers.get(ps.name) or obj.modifiers[0])

    # Remove standalone hair/curve objects
    hair_types = {"CURVES", "CURVE"}
    hair_objs  = [o for o in bpy.data.objects if o.type in hair_types]
    for obj in hair_objs:
        print(f"     Removing hair object: {obj.name}")
        bpy.data.objects.remove(obj, do_unlink=True)

    print(f"     Done. Objects remaining: {len(bpy.data.objects)}")


# ─── Step 2: Apply transforms ─────────────────────────────────────────────────

def apply_transforms():
    print("\n[2/5] Applying transforms...")
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.select_all(action="DESELECT")
    print("     Transforms applied to all objects.")


# ─── Step 3: Recalculate normals ──────────────────────────────────────────────

def fix_normals():
    print("\n[3/5] Recalculating normals...")
    mesh_objs = [o for o in bpy.data.objects if o.type == "MESH"]
    for obj in mesh_objs:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.mesh.normals_make_consistent(inside=False)
        bpy.ops.object.mode_set(mode="OBJECT")
        obj.select_set(False)
        print(f"     Normals OK: {obj.name}")


# ─── Step 4: Rename main body mesh ────────────────────────────────────────────

def rename_body_mesh():
    """
    Rename the primary body mesh to "body" (the base node GltfBody expects).
    Strategy: prefer an object named "Body" (case-insensitive); fall back to
    the largest mesh that isn't Hair/Eyebrow/Eyelash/Eyes.
    """
    print("\n[4/5] Renaming body mesh...")
    mesh_objs = [o for o in bpy.data.objects if o.type == "MESH"]
    if not mesh_objs:
        print("     ERROR: No mesh objects found!")
        return

    # Try explicit name match first (covers the AxisFemale basemesh naming)
    SECONDARY_NAMES = {"hair", "eyebrows", "eyelashes", "eyes", "eyebrow", "eyelash"}
    primary = next(
        (o for o in mesh_objs if o.name.lower() == "body"),
        None,
    )
    if primary is None:
        # Fall back: largest mesh excluding known secondary objects
        candidates = [o for o in mesh_objs if o.name.lower() not in SECONDARY_NAMES]
        if not candidates:
            candidates = mesh_objs
        primary = max(candidates, key=lambda o: len(o.data.vertices))

    old_name = primary.name
    primary.name = "body"
    primary.data.name = "body"
    print(f"     Renamed '{old_name}' → 'body'  ({len(primary.data.vertices):,} vertices)")

    # List remaining meshes for reference
    for obj in mesh_objs[1:]:
        print(f"     Kept as-is: '{obj.name}'  ({len(obj.data.vertices):,} vertices)")


# ─── Step 5: Export GLB ───────────────────────────────────────────────────────

def export_glb():
    print("\n[5/5] Exporting AxisFemale.glb...")
    os.makedirs(os.path.dirname(EXPORT_GLB), exist_ok=True)

    base_kwargs = {
        "filepath":              EXPORT_GLB,
        "export_format":         "GLB",
        "use_selection":         False,

        # Coordinate system
        "export_yup":            True,

        # Geometry
        "export_apply":          True,
        "export_normals":        True,
        "export_tangents":       False,
        "export_texcoords":      True,
        "use_mesh_edges":        False,
        "use_mesh_vertices":     False,

        # Vertex colour — off (anatomy shading done in R3F)
        "export_vertex_color":   "NONE",

        # Materials
        "export_materials":      "EXPORT",
        "export_image_format":   "AUTO",

        # Animations — skip
        "export_animations":     False,
        "export_morph":          False,

        # Cameras / lights — excluded
        "export_cameras":        False,
        "export_lights":         False,
    }

    # Try Draco compression (available in Blender 5.1)
    try:
        bpy.ops.export_scene.gltf(
            **base_kwargs,
            export_draco_mesh_compression_enable=True,
            export_draco_mesh_compression_level=6,
        )
        print("     Draco compression: ENABLED (level 6)")
    except TypeError as exc:
        print(f"     Draco failed ({exc}) — exporting uncompressed")
        bpy.ops.export_scene.gltf(**base_kwargs)

    size_mb = os.path.getsize(EXPORT_GLB) / (1024 * 1024)
    print(f"     Exported: {EXPORT_GLB}  ({size_mb:.1f} MB)")

    # Copy to public/models/ for Next.js serving
    os.makedirs(os.path.dirname(PUBLIC_GLB), exist_ok=True)
    shutil.copy2(EXPORT_GLB, PUBLIC_GLB)
    print(f"     Copied to: {PUBLIC_GLB}")


# ─── Entry point ──────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  Axis Body Intelligence — Optimization & Export")
    print(f"  Source: {bpy.data.filepath}")
    print(f"  Output: {EXPORT_GLB}")
    print("=" * 60)

    remove_unused_objects()
    apply_transforms()
    fix_normals()
    rename_body_mesh()
    export_glb()

    print("\n" + "=" * 60)
    print("  Pipeline complete.")
    print("\n  Next steps:")
    print("  1. Add to .env.local:")
    print("       NEXT_PUBLIC_BODY_MODEL_URL=/models/AxisFemale.glb")
    print("  2. Verify in browser — open /body and confirm the model loads")
    print("  3. Run calibrate_anchors.py to update anchor positions")
    print("=" * 60)


main()
