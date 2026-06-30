"use client";

/**
 * PlaceholderBody
 *
 * Phase 58 body renderer — procedural geometry built from Three.js primitives.
 * Implements BodyRendererProps exactly so Phase 59 can drop in a GLTF renderer
 * by swapping this component while keeping all interaction and camera code intact.
 *
 * Separates rendering into two sub-concerns:
 *   BaseBodyMesh  — non-interactive body form (geometry only)
 *   MusclePatch   — interactive colored overlay per muscle group
 */

import { useRef, useMemo, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Html }     from "@react-three/drei";
import * as THREE   from "three";

import type { BodyRendererProps } from "@/lib/bodyIntelligence/BodyStateEngine";
import { getOverlayAppearance, STATUS_LABEL } from "./OverlaySystem";

// ─── Anchor table ─────────────────────────────────────────────────────────────
// Maps muscle IDs to world-space position + ellipsoid scale.
// Exported so CameraController can compute a focus position without importing
// the full renderer.

export interface MuscleAnchor {
  muscleId: string;
  /** World-space center of this muscle region */
  position: readonly [number, number, number];
  /** Ellipsoid radii — sphere of radius 1 scaled by this */
  scale:    readonly [number, number, number];
}

export const MUSCLE_ANCHORS: MuscleAnchor[] = [
  // Shoulders
  { muscleId: "anterior_delt_left",    position: [-0.224, 0.555, 0.065],  scale: [0.074, 0.072, 0.044] },
  { muscleId: "anterior_delt_right",   position: [ 0.224, 0.555, 0.065],  scale: [0.074, 0.072, 0.044] },
  { muscleId: "lateral_delt_left",     position: [-0.264, 0.555, 0.000],  scale: [0.062, 0.068, 0.044] },
  { muscleId: "lateral_delt_right",    position: [ 0.264, 0.555, 0.000],  scale: [0.062, 0.068, 0.044] },
  { muscleId: "posterior_delt_left",   position: [-0.224, 0.555, -0.066], scale: [0.074, 0.072, 0.044] },
  { muscleId: "posterior_delt_right",  position: [ 0.224, 0.555, -0.066], scale: [0.074, 0.072, 0.044] },
  { muscleId: "rotator_cuff_left",     position: [-0.234, 0.588, 0.000],  scale: [0.052, 0.052, 0.042] },
  { muscleId: "rotator_cuff_right",    position: [ 0.234, 0.588, 0.000],  scale: [0.052, 0.052, 0.042] },
  // Chest
  { muscleId: "pec_major_left",        position: [-0.112, 0.440, 0.148],  scale: [0.118, 0.096, 0.048] },
  { muscleId: "pec_major_right",       position: [ 0.112, 0.440, 0.148],  scale: [0.118, 0.096, 0.048] },
  { muscleId: "serratus_left",         position: [-0.165, 0.285, 0.130],  scale: [0.056, 0.106, 0.040] },
  { muscleId: "serratus_right",        position: [ 0.165, 0.285, 0.130],  scale: [0.056, 0.106, 0.040] },
  // Core
  { muscleId: "rectus_abdominis",      position: [ 0.000, 0.228, 0.152],  scale: [0.072, 0.158, 0.046] },
  { muscleId: "obliques_left",         position: [-0.128, 0.220, 0.126],  scale: [0.066, 0.126, 0.040] },
  { muscleId: "obliques_right",        position: [ 0.128, 0.220, 0.126],  scale: [0.066, 0.126, 0.040] },
  { muscleId: "transverse_abdominis",  position: [ 0.000, 0.145, 0.130],  scale: [0.112, 0.066, 0.038] },
  { muscleId: "hip_flexors_left",      position: [-0.086, 0.060, 0.126],  scale: [0.072, 0.082, 0.042] },
  { muscleId: "hip_flexors_right",     position: [ 0.086, 0.060, 0.126],  scale: [0.072, 0.082, 0.042] },
  // Arms — front
  { muscleId: "bicep_left",            position: [-0.275, 0.330, 0.048],  scale: [0.050, 0.100, 0.038] },
  { muscleId: "bicep_right",           position: [ 0.275, 0.330, 0.048],  scale: [0.050, 0.100, 0.038] },
  { muscleId: "forearm_left",          position: [-0.275, 0.055, 0.038],  scale: [0.040, 0.095, 0.034] },
  { muscleId: "forearm_right",         position: [ 0.275, 0.055, 0.038],  scale: [0.040, 0.095, 0.034] },
  // Arms — back
  { muscleId: "tricep_left",           position: [-0.275, 0.330, -0.050], scale: [0.050, 0.116, 0.038] },
  { muscleId: "tricep_right",          position: [ 0.275, 0.330, -0.050], scale: [0.050, 0.116, 0.038] },
  // Back
  { muscleId: "upper_trap",            position: [ 0.000, 0.624, -0.118], scale: [0.188, 0.074, 0.048] },
  { muscleId: "middle_trap",           position: [ 0.000, 0.480, -0.152], scale: [0.142, 0.066, 0.046] },
  { muscleId: "lower_trap",            position: [ 0.000, 0.368, -0.152], scale: [0.122, 0.058, 0.042] },
  { muscleId: "rhomboids",             position: [ 0.000, 0.434, -0.148], scale: [0.096, 0.076, 0.040] },
  { muscleId: "lat_left",              position: [-0.176, 0.374, -0.142], scale: [0.090, 0.150, 0.048] },
  { muscleId: "lat_right",             position: [ 0.176, 0.374, -0.142], scale: [0.090, 0.150, 0.048] },
  { muscleId: "erector_spinae",        position: [ 0.000, 0.288, -0.152], scale: [0.056, 0.218, 0.046] },
  { muscleId: "quadratus_lumborum_left",  position: [-0.062, 0.155, -0.136], scale: [0.052, 0.070, 0.040] },
  { muscleId: "quadratus_lumborum_right", position: [ 0.062, 0.155, -0.136], scale: [0.052, 0.070, 0.040] },
  // Glutes
  { muscleId: "glute_max_left",        position: [-0.110, -0.120, -0.133], scale: [0.120, 0.126, 0.076] },
  { muscleId: "glute_max_right",       position: [ 0.110, -0.120, -0.133], scale: [0.120, 0.126, 0.076] },
  { muscleId: "glute_med_left",        position: [-0.148, -0.046, -0.096], scale: [0.072, 0.074, 0.052] },
  { muscleId: "glute_med_right",       position: [ 0.148, -0.046, -0.096], scale: [0.072, 0.074, 0.052] },
  { muscleId: "abductors_left",        position: [-0.165, -0.056, -0.040], scale: [0.052, 0.096, 0.042] },
  { muscleId: "abductors_right",       position: [ 0.165, -0.056, -0.040], scale: [0.052, 0.096, 0.042] },
  // Upper leg — front
  { muscleId: "quads_left",            position: [-0.092, -0.408, 0.086],  scale: [0.082, 0.196, 0.056] },
  { muscleId: "quads_right",           position: [ 0.092, -0.408, 0.086],  scale: [0.082, 0.196, 0.056] },
  { muscleId: "adductors_left",        position: [-0.048, -0.408, 0.053],  scale: [0.048, 0.168, 0.040] },
  { muscleId: "adductors_right",       position: [ 0.048, -0.408, 0.053],  scale: [0.048, 0.168, 0.040] },
  // Upper leg — back
  { muscleId: "hamstrings_left",       position: [-0.092, -0.420, -0.092], scale: [0.082, 0.196, 0.058] },
  { muscleId: "hamstrings_right",      position: [ 0.092, -0.420, -0.092], scale: [0.082, 0.196, 0.058] },
  { muscleId: "hip_external_rotators_left",  position: [-0.100, -0.248, -0.082], scale: [0.058, 0.058, 0.040] },
  { muscleId: "hip_external_rotators_right", position: [ 0.100, -0.248, -0.082], scale: [0.058, 0.058, 0.040] },
  // Lower leg
  { muscleId: "calves_left",           position: [-0.092, -0.854, -0.062], scale: [0.058, 0.166, 0.052] },
  { muscleId: "calves_right",          position: [ 0.092, -0.854, -0.062], scale: [0.058, 0.166, 0.052] },
  { muscleId: "tibialis_anterior_left",  position: [-0.092, -0.848, 0.058], scale: [0.040, 0.142, 0.038] },
  { muscleId: "tibialis_anterior_right", position: [ 0.092, -0.848, 0.058], scale: [0.040, 0.142, 0.038] },
  { muscleId: "peroneals_left",        position: [-0.108, -0.854, 0.012],  scale: [0.034, 0.126, 0.034] },
  { muscleId: "peroneals_right",       position: [ 0.108, -0.854, 0.012],  scale: [0.034, 0.126, 0.034] },
  // Neck
  { muscleId: "neck",                  position: [ 0.000, 0.718, 0.048],  scale: [0.046, 0.062, 0.030] },
];

// Pre-computed bounds for camera auto-fit
export const BODY_BOUNDS = new THREE.Box3(
  new THREE.Vector3(-0.34, -1.16, -0.23),
  new THREE.Vector3( 0.34,  1.00,  0.23),
);

// ─── Base body (non-interactive) ─────────────────────────────────────────────

const BASE_MAT = new THREE.MeshStandardMaterial({
  color: new THREE.Color("#C4B6AD"),
  roughness: 0.84,
  metalness: 0.02,
});

function BaseBodyMesh() {
  return (
    <group>
      {/* Head */}
      <mesh material={BASE_MAT} position={[0, 0.87, 0]} scale={[1, 1.10, 0.94]} castShadow>
        <sphereGeometry args={[0.114, 24, 18]} />
      </mesh>
      {/* Neck */}
      <mesh material={BASE_MAT} position={[0, 0.695, 0]} castShadow>
        <cylinderGeometry args={[0.052, 0.064, 0.114, 12]} />
      </mesh>
      {/* Upper torso */}
      <mesh material={BASE_MAT} position={[0, 0.418, 0]} castShadow>
        <cylinderGeometry args={[0.146, 0.162, 0.370, 12]} />
      </mesh>
      {/* Waist */}
      <mesh material={BASE_MAT} position={[0, 0.144, 0]} castShadow>
        <cylinderGeometry args={[0.118, 0.146, 0.218, 12]} />
      </mesh>
      {/* Hips */}
      <mesh material={BASE_MAT} position={[0, -0.080, 0]} castShadow>
        <cylinderGeometry args={[0.152, 0.130, 0.298, 12]} />
      </mesh>
      {/* Shoulders */}
      <mesh material={BASE_MAT} position={[-0.226, 0.555, 0]} scale={[1.14, 0.94, 0.94]} castShadow>
        <sphereGeometry args={[0.090, 12, 10]} />
      </mesh>
      <mesh material={BASE_MAT} position={[ 0.226, 0.555, 0]} scale={[1.14, 0.94, 0.94]} castShadow>
        <sphereGeometry args={[0.090, 12, 10]} />
      </mesh>
      {/* Upper arms */}
      <mesh material={BASE_MAT} position={[-0.276, 0.330, 0]} castShadow>
        <capsuleGeometry args={[0.052, 0.220, 5, 12]} />
      </mesh>
      <mesh material={BASE_MAT} position={[ 0.276, 0.330, 0]} castShadow>
        <capsuleGeometry args={[0.052, 0.220, 5, 12]} />
      </mesh>
      {/* Forearms */}
      <mesh material={BASE_MAT} position={[-0.276, 0.054, 0]} castShadow>
        <capsuleGeometry args={[0.042, 0.220, 5, 12]} />
      </mesh>
      <mesh material={BASE_MAT} position={[ 0.276, 0.054, 0]} castShadow>
        <capsuleGeometry args={[0.042, 0.220, 5, 12]} />
      </mesh>
      {/* Upper legs */}
      <mesh material={BASE_MAT} position={[-0.092, -0.400, 0]} castShadow>
        <capsuleGeometry args={[0.082, 0.342, 5, 12]} />
      </mesh>
      <mesh material={BASE_MAT} position={[ 0.092, -0.400, 0]} castShadow>
        <capsuleGeometry args={[0.082, 0.342, 5, 12]} />
      </mesh>
      {/* Lower legs */}
      <mesh material={BASE_MAT} position={[-0.092, -0.852, 0]} castShadow>
        <capsuleGeometry args={[0.060, 0.310, 5, 12]} />
      </mesh>
      <mesh material={BASE_MAT} position={[ 0.092, -0.852, 0]} castShadow>
        <capsuleGeometry args={[0.060, 0.310, 5, 12]} />
      </mesh>
      {/* Feet */}
      <mesh material={BASE_MAT} position={[-0.092, -1.068, 0.042]} scale={[1, 0.48, 1.38]} receiveShadow>
        <sphereGeometry args={[0.062, 10, 8]} />
      </mesh>
      <mesh material={BASE_MAT} position={[ 0.092, -1.068, 0.042]} scale={[1, 0.48, 1.38]} receiveShadow>
        <sphereGeometry args={[0.062, 10, 8]} />
      </mesh>
    </group>
  );
}

// ─── Per-muscle animated overlay ─────────────────────────────────────────────

interface MusclePatchProps {
  anchor:     MuscleAnchor;
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
  anchor, color, emissive, targetOp, pulse,
  isHovered, isSelected, onEnter, onLeave, onClick,
}: MusclePatchProps) {
  const meshRef   = useRef<THREE.Mesh>(null!);
  const curColor  = useRef(new THREE.Color(color));
  const tgtColor  = useRef(new THREE.Color(color));
  const pulseT    = useRef(0);

  // One material per patch — created once, mutated every frame
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color:             new THREE.Color(color),
    emissive:          new THREE.Color(emissive),
    emissiveIntensity: 0,
    roughness:         0.58,
    metalness:         0.04,
    transparent:       true,
    opacity:           targetOp,
    depthWrite:        false,
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, dt) => {
    if (!meshRef.current) return;
    const m = mat;

    // Color lerp
    tgtColor.current.set(color);
    curColor.current.lerp(tgtColor.current, Math.min(1, dt * 3.5));
    m.color.copy(curColor.current);
    m.emissive.copy(curColor.current);

    // Opacity
    m.opacity = THREE.MathUtils.lerp(m.opacity, targetOp, dt * 5.5);

    // Emissive intensity
    if (pulse) {
      pulseT.current += dt * (isHovered ? 2.4 : 1.9);
      m.emissiveIntensity = 0.10 + Math.sin(pulseT.current) * 0.07;
    } else {
      const tEI = isSelected ? 0.22 : isHovered ? 0.17 : 0;
      m.emissiveIntensity = THREE.MathUtils.lerp(m.emissiveIntensity, tEI, dt * 7);
    }

    // Scale pop
    const tS = isHovered ? 1.07 : isSelected ? 1.04 : 1;
    const cS = meshRef.current.scale.x;
    if (Math.abs(cS - tS) > 0.001) {
      meshRef.current.scale.setScalar(THREE.MathUtils.lerp(cS, tS, dt * 10));
    }
  });

  if (targetOp === 0 && !pulse) return null;

  return (
    <mesh
      ref={meshRef}
      position={anchor.position as [number, number, number]}
      scale={anchor.scale as [number, number, number]}
      renderOrder={2}
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

interface TooltipProps {
  label:       string;
  status:      string;
  recoveryPct: number;
  daysSince:   number | null;
  frequency:   number;
  position:    readonly [number, number, number];
}

function HoverTooltip({ label, status, recoveryPct, daysSince, frequency, position }: TooltipProps) {
  return (
    <Html
      position={[position[0], position[1] + 0.13, position[2]]}
      center
      style={{ pointerEvents: "none", zIndex: 60, whiteSpace: "nowrap" }}
    >
      <div
        style={{
          background:    "rgba(28,27,24,0.92)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderRadius: 12,
          padding:      "8px 12px",
          minWidth:     144,
          boxShadow:    "0 8px 24px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 12, color: "#FFFFFF", marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 11, color: "#A8A5A0", lineHeight: 1.55 }}>
          <div>{status} · {recoveryPct}% recovered</div>
          {daysSince === 0 && <div>Trained today</div>}
          {daysSince !== null && daysSince > 0 && <div>{daysSince}d since last session</div>}
          {frequency > 0 && <div>{frequency}× this week</div>}
        </div>
      </div>
    </Html>
  );
}

// ─── Main renderer — implements BodyRendererProps ─────────────────────────────

export function PlaceholderBody({
  muscleMap,
  layer,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
}: BodyRendererProps) {
  const handleEnter  = useCallback((id: string) => onHover(id), [onHover]);
  const handleLeave  = useCallback(() => onHover(null), [onHover]);
  const handleClick  = useCallback((id: string) => onSelect(id), [onSelect]);

  const hoveredMuscle = hoveredId ? muscleMap.get(hoveredId) : undefined;
  const hoveredAnchor = hoveredId ? MUSCLE_ANCHORS.find(a => a.muscleId === hoveredId) : undefined;

  return (
    <group>
      <BaseBodyMesh />

      {MUSCLE_ANCHORS.map((anchor, i) => {
        const muscle = muscleMap.get(anchor.muscleId);
        if (!muscle) return null;

        const isHovered  = hoveredId  === anchor.muscleId;
        const isSelected = selectedId === anchor.muscleId;
        const appearance = getOverlayAppearance(muscle, layer, isHovered, isSelected);

        return (
          <MusclePatch
            key={`${anchor.muscleId}-${i}`}
            anchor={anchor}
            color={appearance.color}
            emissive={appearance.emissive}
            targetOp={appearance.opacity}
            pulse={appearance.pulse}
            isHovered={isHovered}
            isSelected={isSelected}
            onEnter={() => handleEnter(anchor.muscleId)}
            onLeave={handleLeave}
            onClick={() => handleClick(anchor.muscleId)}
          />
        );
      })}

      {/* Tooltip — only when hovering and nothing is selected */}
      {hoveredMuscle && hoveredAnchor && !selectedId && (
        <HoverTooltip
          label={hoveredMuscle.displayName}
          status={STATUS_LABEL[hoveredMuscle.status]}
          recoveryPct={hoveredMuscle.recoveryPct}
          daysSince={hoveredMuscle.daysSinceTrained}
          frequency={hoveredMuscle.weeklyFrequency}
          position={hoveredAnchor.position}
        />
      )}
    </group>
  );
}
