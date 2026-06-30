"use client";

import { useRef, useMemo, useState, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type {
  BodyIntelligenceSnapshot,
  MuscleGroupState,
  VisualizationMode,
} from "@/lib/bodyIntelligence/bodyIntelligenceTypes";
import { STATE_COLOR } from "@/lib/bodyIntelligence/bodyIntelligenceTypes";

// ─── Bounding box (world-space extent of the procedural body) ─────────────────
// Used by SceneCamera to auto-fit and reset zoom after deselect.

export const BODY_BOUNDS = new THREE.Box3(
  new THREE.Vector3(-0.34, -1.16, -0.23),
  new THREE.Vector3( 0.34,  1.00,  0.23),
);

// ─── Muscle patch definitions ─────────────────────────────────────────────────
// Each entry maps a muscle-state id → world-space position + ellipsoid scale.
// Exported so SceneCamera can look up the focus position for a selected muscle.

export interface PatchDef {
  muscleId: string;
  position: readonly [number, number, number];
  scale:    readonly [number, number, number];
}

export const PATCH_DEFS: PatchDef[] = [
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
  // Core — front
  { muscleId: "rectus_abdominis",      position: [ 0.000, 0.228, 0.152],  scale: [0.072, 0.158, 0.046] },
  { muscleId: "obliques_left",         position: [-0.128, 0.220, 0.126],  scale: [0.066, 0.126, 0.040] },
  { muscleId: "obliques_right",        position: [ 0.128, 0.220, 0.126],  scale: [0.066, 0.126, 0.040] },
  { muscleId: "transverse_abdominis",  position: [ 0.000, 0.145, 0.130],  scale: [0.112, 0.066, 0.038] },
  { muscleId: "hip_flexors_left",      position: [-0.086, 0.060, 0.126],  scale: [0.072, 0.082, 0.042] },
  { muscleId: "hip_flexors_right",     position: [ 0.086, 0.060, 0.126],  scale: [0.072, 0.082, 0.042] },
  // Arms — front (bicep, forearm)
  { muscleId: "bicep_left",            position: [-0.275, 0.330, 0.048],  scale: [0.050, 0.100, 0.038] },
  { muscleId: "bicep_right",           position: [ 0.275, 0.330, 0.048],  scale: [0.050, 0.100, 0.038] },
  { muscleId: "forearm_left",          position: [-0.275, 0.055, 0.038],  scale: [0.040, 0.095, 0.034] },
  { muscleId: "forearm_right",         position: [ 0.275, 0.055, 0.038],  scale: [0.040, 0.095, 0.034] },
  // Arms — back (tricep)
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

// ─── Color derivation ────────────────────────────────────────────────────────

export function stateToHex(muscle: MuscleGroupState, mode: VisualizationMode): string {
  switch (mode) {
    case "recovery":
      if (muscle.recoveryPercent >= 80) return "#0F6E56";
      if (muscle.recoveryPercent >= 60) return "#1B5FA0";
      if (muscle.recoveryPercent >= 40) return "#854F0B";
      return "#C0392B";
    case "fatigue":
      if (muscle.fatigueLevel === "low")      return "#0F6E56";
      if (muscle.fatigueLevel === "moderate") return "#854F0B";
      return "#C0392B";
    case "injury":
      if (muscle.state === "injured")   return "#C0392B";
      if (muscle.state === "protected") return "#9B9690";
      if (muscle.symptoms.length > 0)   return "#854F0B";
      return "#EAE7DE";
    case "volume":
      if (muscle.volumeScore >= 80) return "#C0392B";
      if (muscle.volumeScore >= 60) return "#854F0B";
      if (muscle.volumeScore >= 30) return "#0F6E56";
      return "#EAE7DE";
    case "frequency":
      if (muscle.weeklyFrequency >= 3) return "#534AB7";
      if (muscle.weeklyFrequency >= 2) return "#1B5FA0";
      if (muscle.weeklyFrequency >= 1) return "#0F6E56";
      return "#EAE7DE";
    case "cycle_influence":
      if (muscle.cycleModifier > 0.1)  return "#0F6E56";
      if (muscle.cycleModifier < -0.1) return "#854F0B";
      return "#C8C5BC";
    case "mobility":
      return muscle.mobilityFlag ? "#854F0B" : "#EAE7DE";
    default:
      return STATE_COLOR[muscle.state] ?? "#EAE7DE";
  }
}

// ─── Base body (non-interactive) ─────────────────────────────────────────────

const BODY_MAT = new THREE.MeshStandardMaterial({
  color: new THREE.Color("#C5B8B0"),
  roughness: 0.82,
  metalness: 0.02,
  envMapIntensity: 0.3,
});

function BaseBody() {
  return (
    <group receiveShadow castShadow>
      <mesh material={BODY_MAT} position={[0, 0.87, 0]} scale={[1, 1.10, 0.94]} receiveShadow castShadow>
        <sphereGeometry args={[0.114, 24, 18]} />
      </mesh>
      <mesh material={BODY_MAT} position={[0, 0.695, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.052, 0.064, 0.114, 12]} />
      </mesh>
      <mesh material={BODY_MAT} position={[0, 0.418, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.146, 0.162, 0.370, 12]} />
      </mesh>
      <mesh material={BODY_MAT} position={[0, 0.144, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.118, 0.146, 0.218, 12]} />
      </mesh>
      <mesh material={BODY_MAT} position={[0, -0.080, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.152, 0.130, 0.298, 12]} />
      </mesh>
      {/* Shoulders */}
      <mesh material={BODY_MAT} position={[-0.226, 0.555, 0]} scale={[1.14, 0.94, 0.94]} receiveShadow castShadow>
        <sphereGeometry args={[0.090, 12, 10]} />
      </mesh>
      <mesh material={BODY_MAT} position={[ 0.226, 0.555, 0]} scale={[1.14, 0.94, 0.94]} receiveShadow castShadow>
        <sphereGeometry args={[0.090, 12, 10]} />
      </mesh>
      {/* Upper arms */}
      <mesh material={BODY_MAT} position={[-0.276, 0.330, 0]} receiveShadow castShadow>
        <capsuleGeometry args={[0.052, 0.220, 5, 12]} />
      </mesh>
      <mesh material={BODY_MAT} position={[ 0.276, 0.330, 0]} receiveShadow castShadow>
        <capsuleGeometry args={[0.052, 0.220, 5, 12]} />
      </mesh>
      {/* Forearms */}
      <mesh material={BODY_MAT} position={[-0.276, 0.054, 0]} receiveShadow castShadow>
        <capsuleGeometry args={[0.042, 0.220, 5, 12]} />
      </mesh>
      <mesh material={BODY_MAT} position={[ 0.276, 0.054, 0]} receiveShadow castShadow>
        <capsuleGeometry args={[0.042, 0.220, 5, 12]} />
      </mesh>
      {/* Upper legs */}
      <mesh material={BODY_MAT} position={[-0.092, -0.400, 0]} receiveShadow castShadow>
        <capsuleGeometry args={[0.082, 0.342, 5, 12]} />
      </mesh>
      <mesh material={BODY_MAT} position={[ 0.092, -0.400, 0]} receiveShadow castShadow>
        <capsuleGeometry args={[0.082, 0.342, 5, 12]} />
      </mesh>
      {/* Lower legs */}
      <mesh material={BODY_MAT} position={[-0.092, -0.852, 0]} receiveShadow castShadow>
        <capsuleGeometry args={[0.060, 0.310, 5, 12]} />
      </mesh>
      <mesh material={BODY_MAT} position={[ 0.092, -0.852, 0]} receiveShadow castShadow>
        <capsuleGeometry args={[0.060, 0.310, 5, 12]} />
      </mesh>
      {/* Feet */}
      <mesh material={BODY_MAT} position={[-0.092, -1.068, 0.042]} scale={[1, 0.48, 1.38]} receiveShadow>
        <sphereGeometry args={[0.062, 10, 8]} />
      </mesh>
      <mesh material={BODY_MAT} position={[ 0.092, -1.068, 0.042]} scale={[1, 0.48, 1.38]} receiveShadow>
        <sphereGeometry args={[0.062, 10, 8]} />
      </mesh>
    </group>
  );
}

// ─── Animated muscle patch ────────────────────────────────────────────────────

interface MusclePatchProps {
  def:        PatchDef;
  muscle:     MuscleGroupState;
  mode:       VisualizationMode;
  isSelected: boolean;
  isHovered:  boolean;
  onEnter:    () => void;
  onLeave:    () => void;
  onClick:    () => void;
}

function MusclePatch({ def, muscle, mode, isSelected, isHovered, onEnter, onLeave, onClick }: MusclePatchProps) {
  const meshRef  = useRef<THREE.Mesh>(null!);
  const curColor = useRef(new THREE.Color());
  const tgtColor = useRef(new THREE.Color());
  const pulseT   = useRef(0);

  const hexColor = stateToHex(muscle, mode);
  const isInert  = hexColor === "#EAE7DE";

  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color:             new THREE.Color(hexColor),
      emissive:          new THREE.Color(hexColor),
      emissiveIntensity: 0,
      roughness:         0.58,
      metalness:         0.04,
      transparent:       true,
      opacity:           isInert ? 0 : 0.86,
      depthWrite:        false,
    });
    curColor.current.set(hexColor);
    return m;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, dt) => {
    if (!meshRef.current) return;
    const m = meshRef.current.material as THREE.MeshStandardMaterial;

    // Smooth color transition
    tgtColor.current.set(hexColor);
    curColor.current.lerp(tgtColor.current, Math.min(1, dt * 2.8));
    m.color.copy(curColor.current);
    m.emissive.copy(curColor.current);

    // Opacity
    const targetOp = isInert ? 0 : isSelected ? 1 : isHovered ? 0.96 : 0.82;
    m.opacity = THREE.MathUtils.lerp(m.opacity, targetOp, dt * 5);

    // Emissive glow
    const isPulse = muscle.state === "scheduled" || muscle.state === "injured";
    if (isPulse) {
      pulseT.current += dt * (muscle.state === "injured" ? 3.0 : 1.9);
      m.emissiveIntensity = 0.10 + Math.sin(pulseT.current) * 0.07;
    } else {
      const targetEI = isSelected ? 0.24 : isHovered ? 0.18 : 0;
      m.emissiveIntensity = THREE.MathUtils.lerp(m.emissiveIntensity, targetEI, dt * 6);
    }

    // Scale pop
    const tgtS = isHovered ? 1.07 : isSelected ? 1.04 : 1;
    const cur  = meshRef.current.scale.x;
    meshRef.current.scale.setScalar(THREE.MathUtils.lerp(cur, tgtS, dt * 9));
  });

  if (isInert && !isSelected && !isHovered) return null;

  return (
    <mesh
      ref={meshRef}
      position={def.position as [number, number, number]}
      scale={def.scale as [number, number, number]}
      renderOrder={2}
      onPointerEnter={e => { e.stopPropagation(); document.body.style.cursor = "pointer"; onEnter(); }}
      onPointerLeave={e => { e.stopPropagation(); document.body.style.cursor = "default"; onLeave(); }}
      onClick={e => { e.stopPropagation(); onClick(); }}
    >
      <sphereGeometry args={[1, 14, 10]} />
    </mesh>
  );
}

// ─── Hover tooltip (lives in Canvas via Html) ─────────────────────────────────

function HoverTooltip({ muscle, position }: { muscle: MuscleGroupState; position: readonly [number, number, number] }) {
  const name = muscle.displayName.replace(/ \((left|right)\)$/, "");
  return (
    <Html
      position={[position[0], position[1] + 0.12, position[2]]}
      center
      style={{ pointerEvents: "none", zIndex: 60, whiteSpace: "nowrap" }}
    >
      <div
        className="bg-[#1C1B18]/92 text-white text-[11px] font-medium px-3 py-2 rounded-xl shadow-2xl"
        style={{ backdropFilter: "blur(8px)", minWidth: 140 }}
      >
        <div className="font-semibold text-[12px] mb-0.5">{name}</div>
        <div className="text-[#A8A5A0]">Recovery {muscle.recoveryPercent}%</div>
        {muscle.daysSinceTraining === 0 && <div className="text-[#A8A5A0]">Trained today</div>}
        {muscle.daysSinceTraining !== null && muscle.daysSinceTraining > 0 && (
          <div className="text-[#A8A5A0]">{muscle.daysSinceTraining}d since last session</div>
        )}
        {muscle.weeklyFrequency > 0 && (
          <div className="text-[#A8A5A0]">{muscle.weeklyFrequency}× this week</div>
        )}
      </div>
    </Html>
  );
}

// ─── Main exported geometry component ────────────────────────────────────────

export interface ProceduralBodyGeometryProps {
  snapshot:       BodyIntelligenceSnapshot;
  mode:           VisualizationMode;
  selectedMuscle: MuscleGroupState | null;
  onMuscleSelect: (muscle: MuscleGroupState | null) => void;
}

export function ProceduralBodyGeometry({
  snapshot,
  mode,
  selectedMuscle,
  onMuscleSelect,
}: ProceduralBodyGeometryProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const muscleById = useMemo(() => {
    const m = new Map<string, MuscleGroupState>();
    for (const ms of snapshot.muscles) m.set(ms.id, ms);
    return m;
  }, [snapshot]);

  const handleEnter  = useCallback((id: string) => setHoveredId(id), []);
  const handleLeave  = useCallback(() => { setHoveredId(null); document.body.style.cursor = "default"; }, []);
  const handleClick  = useCallback((muscle: MuscleGroupState) => {
    onMuscleSelect(selectedMuscle?.id === muscle.id ? null : muscle);
  }, [selectedMuscle, onMuscleSelect]);

  const hoveredDef    = hoveredId   ? PATCH_DEFS.find(p => p.muscleId === hoveredId)   : undefined;
  const hoveredMuscle = hoveredId   ? muscleById.get(hoveredId) : undefined;

  return (
    <group>
      <BaseBody />

      {PATCH_DEFS.map((def, i) => {
        const muscle = muscleById.get(def.muscleId);
        if (!muscle) return null;
        return (
          <MusclePatch
            key={`${def.muscleId}-${i}`}
            def={def}
            muscle={muscle}
            mode={mode}
            isSelected={selectedMuscle?.id === muscle.id}
            isHovered={hoveredId === def.muscleId}
            onEnter={() => handleEnter(def.muscleId)}
            onLeave={handleLeave}
            onClick={() => handleClick(muscle)}
          />
        );
      })}

      {hoveredMuscle && hoveredDef && !selectedMuscle && (
        <HoverTooltip muscle={hoveredMuscle} position={hoveredDef.position} />
      )}
    </group>
  );
}
