"""
inspect_mesh.py — Axis Body Intelligence pipeline, Step 1

Prints a full inventory of every object in AxisFemale.blend.
Run this FIRST to understand the mesh structure before editing anything.

Usage (headless):
  blender --background assets/body/working/AxisFemale.blend \
          --python scripts/blender/inspect_mesh.py

Or open Blender, go to the Scripting workspace, open this file, and press Run.

Output written to: assets/body/metadata/mesh_inventory.json
"""

import bpy
import json
import os
import sys

OUTPUT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "assets", "body", "metadata", "mesh_inventory.json"
)


def collect_inventory():
    inventory = {
        "blendFile":  bpy.data.filepath,
        "objects":    [],
        "materials":  [],
        "vertexGroups": {},
    }

    for obj in bpy.data.objects:
        entry = {
            "name":       obj.name,
            "type":       obj.type,                  # MESH, ARMATURE, CAMERA, LIGHT, etc.
            "visible":    not obj.hide_viewport,
            "parent":     obj.parent.name if obj.parent else None,
            "location":   list(obj.location),
            "scale":      list(obj.scale),
        }

        if obj.type == "MESH":
            mesh = obj.data
            entry["vertexCount"]    = len(mesh.vertices)
            entry["faceCount"]      = len(mesh.polygons)
            entry["uvMaps"]         = [uv.name for uv in mesh.uv_layers]
            entry["materials"]      = [
                (s.material.name if s.material else None) for s in obj.material_slots
            ]
            entry["vertexGroups"]   = [vg.name for vg in obj.vertex_groups]
            entry["hasShapeKeys"]   = bool(mesh.shape_keys)

            # Bounding box in world space
            bbox = [obj.matrix_world @ v.co for v in mesh.vertices]
            if bbox:
                xs = [v.x for v in bbox]; ys = [v.y for v in bbox]; zs = [v.z for v in bbox]
                entry["worldBbox"] = {
                    "min": [min(xs), min(ys), min(zs)],
                    "max": [max(xs), max(ys), max(zs)],
                    "center": [
                        (min(xs) + max(xs)) / 2,
                        (min(ys) + max(ys)) / 2,
                        (min(zs) + max(zs)) / 2,
                    ],
                }

        inventory["objects"].append(entry)

    # Materials summary
    for mat in bpy.data.materials:
        inventory["materials"].append({
            "name":   mat.name,
            "usePBR": mat.use_nodes,
        })

    return inventory


def main():
    print("\n=== Axis Mesh Inspector ===")
    inv = collect_inventory()

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(inv, f, indent=2)

    print(f"\nObjects found: {len(inv['objects'])}")
    for o in inv["objects"]:
        verts = o.get("vertexCount", "-")
        print(f"  [{o['type']:8s}] {o['name']:<40s}  verts={verts}")

    print(f"\nFull inventory written to: {OUTPUT_PATH}")
    print("\nNext step: review mesh_inventory.json, then fill in")
    print("blenderObjectName entries in assets/body/metadata/MeshMap.ts")


main()
