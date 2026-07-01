"use client";

/**
 * HybridBody — GLTF skin + overlay-patch interaction
 *
 * ROOT CAUSE OF BROKEN INTERACTION (documented here for future reference):
 *   AxisFemale.glb is a single-mesh basemesh. It contains 5 mesh nodes:
 *   "body", "Eyebrows", "Eyelashes", "Eyes", "Hair" — none named "muscle_*".
 *   GltfBody.tsx requires muscle_* named nodes (per-region mesh splitting in
 *   Blender). Since none exist, muscleIdFromNode() always returns null, and
 *   every pointer event calls onHover(null) / onSelect(null).
 *
 * PRODUCTION PATH:
 *   When a mesh-separated model is available (separate geometry per region,
 *   nodes renamed muscle_<id> in Blender), switch back to GltfBody.tsx.
 *   Run: scripts/blender/optimize_and_export.py after mesh separation.
 *
 * THIS RENDERER:
 *   Loads the GLTF model as a pure visual skin (raycast disabled on every mesh).
 *   Overlays MusclePatch ellipsoid spheres — drawn from PlaceholderBody's anchor
 *   table, transformed into GLTF coordinate space — as the interaction layer.
 *
 * COORDINATE TRANSFORM (PlaceholderBody → GLTF space):
 *   Derived from:
 *     Placeholder height: Y ∈ [-1.16, 1.00] = 2.16 m  (feet to head)
 *     GLTF body height:   Y ∈ [0.00, 1.744] = 1.742 m  (Blender Z, Y-up export)
 *   Scale Y/X = 1.742 / 2.16 ≈ 0.806
 *   Scale Z   = 0.286 / 0.46  ≈ 0.62  (model is shallower front-to-back)
 *   Offset Y  = GLTF_feet_Y - Placeholder_feet_Y * SY = 0.0 - (-1.16 * 0.806) = 0.935
 *   Run scripts/blender/calibrate_anchors.py once a segmented model exists
 *   to replace these estimates with ground-truth positions.
 */

import { useRef, useMemo, useEffect } from "react";
import { useFrame }                   from "@react-three/fiber";
import { useGLTF, Html }              from "@react-three/drei";
import * as THREE                     from "three";

import type { BodyRendererProps, MuscleRecord } from "@/lib/bodyIntelligence/BodyStateEngine";
import { getOverlayAppearance, STATUS_LABEL }   from "./OverlaySystem";
import { MUSCLE_ANCHORS, BODY_BOUNDS }          from "./PlaceholderBody";
import type { GltfBodyProps }                   from "./GltfBody";

// ─── Coordinate transform ─────────────────────────────────────────────────────

const SX = 0.806;   // lateral scale
const SY = 0.806;   // vertical scale
const SZ = 0.62;    // depth scale (model shallower front-to-back than placeholder)
const OY = 0.935;   // Y offset (GLTF feet at Y≈0, Placeholder feet at Y≈-1.16)

function toGltfPos(pos: readonly [number, number, number]): [number, number, number] {
  return [pos[0] * SX, pos[1] * SY + OY, pos[2] * SZ];
}
function toGltfScale(s: readonly [number, number, number]): [number, number, number] {
  return [s[0] * SX, s[1] * SY, s[2] * SZ];
}

// ─── Skin material ────────────────────────────────────────────────────────────

const SKIN_MAT = new THREE.MeshStandardMaterial({
  color:     new THREE.Color("#C9A689"),
  roughness: 0.82,
  metalness: 0,
});

// ─── Interactive muscle patch ─────────────────────────────────────────────────

interface PatchProps {
  position:   [number, number, number];
  scale:      [number, number, number];
  color:      string;
  emissive:   string;
  targetOp:   number;
  pulse:      boolean;
  isHovered:  boolean;
  isSelected: boolean;
  onEnter:    () => void;
  onLeave:    () => void;
  onClick:    () => void;
}

function MusclePatch({
  position, scale, color, emissive, targetOp, pulse,
  isHovered, isSelected, onEnter, onLeave, onClick,
}: PatchProps) {
  const meshRef  = useRef<THREE.Mesh>(null!);
  const curColor = useRef(new THREE.Color(color));
  const tgtColor = useRef(new THREE.Color(color));
  const pulseT   = useRef(0);

  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color:             new THREE.Color(color),
    emissive:          new THREE.Color(emissive),
    emissiveIntensity: 0,
    roughness:         0.55,
    metalness:         0.04,
    transparent:       true,
    opacity:           targetOp,
    depthWrite:        false,
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Dispose on unmount
  useEffect(() => () => mat.dispose(), [mat]);

  useFrame((_, dt) => {
    if (!meshRef.current) return;

    tgtColor.current.set(color);
    curColor.current.lerp(tgtColor.current, Math.min(1, dt * 3.5));
    mat.color.copy(curColor.current);
    mat.emissive.copy(curColor.current);
    mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOp, dt * 5.5);

    if (pulse) {
      pulseT.current += dt * (isHovered ? 2.4 : 1.9);
      mat.emissiveIntensity = 0.10 + Math.sin(pulseT.current) * 0.07;
    } else {
      const tEI = isSelected ? 0.22 : isHovered ? 0.17 : 0;
      mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, tEI, dt * 7);
    }

    const tS = isHovered ? 1.07 : isSelected ? 1.04 : 1.0;
    const cS = meshRef.current.scale.x / scale[0]; // normalized
    if (Math.abs(cS - tS) > 0.001) {
      const lerped = THREE.MathUtils.lerp(cS, tS, dt * 10);
      meshRef.current.scale.set(scale[0] * lerped, scale[1] * lerped, scale[2] * lerped);
    }
  });

  if (targetOp <= 0 && !pulse) return null;

  return (
    <mesh
      ref={meshRef}
      position={position}
      scale={scale}
      renderOrder={3}
      material={mat}
      onPointerEnter={e => { e.stopPropagation(); onEnter(); }}
      onPointerLeave={e => { e.stopPropagation(); onLeave(); }}
      onClick={e => { e.stopPropagation(); onClick(); }}
    >
      <sphereGeometry args={[1, 14, 10]} />
    </mesh>
  );
}

// ─── Hover tooltip ────────────────────────────────────────────────────────────

function MuscleTooltip({
  muscle,
  position,
}: {
  muscle:   MuscleRecord;
  position: [number, number, number];
}) {
  return (
    <Html
      position={[position[0], position[1] + 0.10, position[2]]}
      center
      style={{ pointerEvents: "none", zIndex: 60, whiteSpace: "nowrap" }}
    >
      <div
        style={{
          background:          "rgba(28,27,24,0.92)",
          backdropFilter:      "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderRadius:        12,
          padding:             "8px 13px",
          minWidth:            148,
          boxShadow:           "0 8px 24px rgba(0,0,0,0.35)",
          fontFamily:          "'DM Sans','Helvetica Neue',sans-serif",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 12, color: "#FFFFFF", marginBottom: 3 }}>
          {muscle.displayName}
        </div>
        <div style={{ fontSize: 11, color: "#A8A5A0", lineHeight: 1.6 }}>
          <div>{STATUS_LABEL[muscle.status]} · {muscle.recoveryPct}% recovered</div>
          {muscle.daysSinceTrained === 0 && <div>Trained today</div>}
          {(muscle.daysSinceTrained ?? 0) > 0 && (
            <div>{muscle.daysSinceTrained}d since last session</div>
          )}
          {muscle.weeklyFrequency > 0 && <div>{muscle.weeklyFrequency}× this week</div>}
        </div>
      </div>
    </Html>
  );
}

// ─── Main renderer ────────────────────────────────────────────────────────────

export interface HybridBodyDebugInfo {
  meshNames:     string[];
  anchorCount:   number;
  activePatches: number;
  mode:          "hybrid";
}

export interface HybridBodyProps extends GltfBodyProps {
  onDebugInfo?: (info: HybridBodyDebugInfo) => void;
}

export function HybridBody({
  modelUrl,
  muscleMap,
  layer,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
  onBoundsReady,
  onAnchorsReady,
  onDebugInfo,
}: HybridBodyProps) {
  const { scene } = useGLTF(modelUrl);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    // ── Audit: log every mesh in the GLB ─────────────────────────────────────
    const meshNames: string[] = [];
    clonedScene.traverse(obj => {
      if (!(obj instanceof THREE.Mesh)) return;
      meshNames.push(obj.name || "(unnamed)");

      // Apply skin material
      obj.material    = SKIN_MAT;
      obj.castShadow  = true;
      obj.receiveShadow = true;

      // CRITICAL: disable raycast on every GLTF mesh.
      // The interaction layer is the MusclePatch overlay spheres below.
      // If GLTF meshes intercept rays, patches behind the skin are unreachable.
      obj.raycast = () => {};
    });

    console.group("[HybridBody] GLB mesh audit");
    console.log(`Model URL: ${modelUrl}`);
    console.log(`Mesh nodes found (${meshNames.length}):`, meshNames);
    const muscleNodes = meshNames.filter(n => n.startsWith("muscle_"));
    if (muscleNodes.length > 0) {
      console.log("✔ muscle_* nodes:", muscleNodes);
      console.log("→ Switch to GltfBody for native per-mesh interaction");
    } else {
      console.warn("✗ No muscle_* nodes — using overlay-patch interaction (HybridBody)");
      console.log("→ To enable per-mesh picking: split mesh by region in Blender,");
      console.log("  rename objects as muscle_<regionId>, re-export, switch to GltfBody");
    }
    console.groupEnd();

    // Report bounds (GLTF world-space box — used by CameraController)
    const bounds = new THREE.Box3().setFromObject(clonedScene);
    onBoundsReady?.(bounds);

    // Report muscle anchor positions in GLTF space — used by CameraController focus
    const anchors = new Map<string, THREE.Vector3>();
    for (const a of MUSCLE_ANCHORS) {
      const [x, y, z] = toGltfPos(a.position);
      anchors.set(a.muscleId, new THREE.Vector3(x, y, z));
    }
    onAnchorsReady?.(anchors);

    // Debug info
    onDebugInfo?.({
      meshNames,
      anchorCount:   MUSCLE_ANCHORS.length,
      activePatches: 0, // updated each render
      mode:          "hybrid",
    });
  }, [clonedScene]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tooltip data ──────────────────────────────────────────────────────────
  const hoveredAnchor  = hoveredId ? MUSCLE_ANCHORS.find(a => a.muscleId === hoveredId) : undefined;
  const hoveredMuscle  = hoveredId ? muscleMap.get(hoveredId) : undefined;
  const hoveredGltfPos = hoveredAnchor ? toGltfPos(hoveredAnchor.position) : undefined;

  return (
    <group>
      {/* GLTF visual skin — raycast disabled on every mesh */}
      <primitive object={clonedScene} />

      {/* Interactive muscle patches in GLTF coordinate space */}
      {MUSCLE_ANCHORS.map((anchor, i) => {
        const muscle = muscleMap.get(anchor.muscleId);
        if (!muscle) return null;

        const isHovered  = hoveredId  === anchor.muscleId;
        const isSelected = selectedId === anchor.muscleId;
        const appearance = getOverlayAppearance(muscle, layer, isHovered, isSelected);

        return (
          <MusclePatch
            key={`${anchor.muscleId}-${i}`}
            position={toGltfPos(anchor.position)}
            scale={toGltfScale(anchor.scale)}
            color={appearance.color}
            emissive={appearance.emissive}
            targetOp={appearance.opacity}
            pulse={appearance.pulse}
            isHovered={isHovered}
            isSelected={isSelected}
            onEnter={() => onHover(anchor.muscleId)}
            onLeave={() => onHover(null)}
            onClick={() => onSelect(anchor.muscleId)}
          />
        );
      })}

      {/* Hover tooltip */}
      {hoveredMuscle && hoveredGltfPos && !selectedId && (
        <MuscleTooltip muscle={hoveredMuscle} position={hoveredGltfPos} />
      )}
    </group>
  );
}

export function preloadHybridBody(url: string) {
  useGLTF.preload(url);
}
