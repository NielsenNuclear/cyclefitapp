"use client";

import { useRef, useMemo, useState, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import type { BodyIntelligenceSnapshot, MuscleGroupState, VisualizationMode } from "@/lib/bodyIntelligence/bodyIntelligenceTypes";
import { STATE_COLOR } from "@/lib/bodyIntelligence/bodyIntelligenceTypes";

// ─── Color logic (mirrors BodyViewer) ─────────────────────────────────────────

function stateToHex(muscle: MuscleGroupState, mode: VisualizationMode): string {
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
      if (muscle.state === "injured")    return "#C0392B";
      if (muscle.state === "protected")  return "#9B9690";
      if (muscle.symptoms.length > 0)    return "#854F0B";
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

// ─── Base body — warm neutral form, not interactive ───────────────────────────

const BODY_COLOR = new THREE.Color("#CBBFB5");
const BODY_MAT   = new THREE.MeshStandardMaterial({
  color: BODY_COLOR, roughness: 0.88, metalness: 0,
});

function BaseBody() {
  return (
    <group>
      {/* Head */}
      <mesh material={BODY_MAT} position={[0, 0.87, 0]} scale={[1, 1.1, 0.95]}>
        <sphereGeometry args={[0.115, 20, 16]} />
      </mesh>
      {/* Neck */}
      <mesh material={BODY_MAT} position={[0, 0.695, 0]}>
        <cylinderGeometry args={[0.052, 0.065, 0.115, 10]} />
      </mesh>
      {/* Upper torso */}
      <mesh material={BODY_MAT} position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.145, 0.162, 0.37, 10]} />
      </mesh>
      {/* Waist */}
      <mesh material={BODY_MAT} position={[0, 0.145, 0]}>
        <cylinderGeometry args={[0.118, 0.145, 0.22, 10]} />
      </mesh>
      {/* Hips */}
      <mesh material={BODY_MAT} position={[0, -0.08, 0]}>
        <cylinderGeometry args={[0.152, 0.130, 0.30, 10]} />
      </mesh>
      {/* Shoulder caps */}
      <mesh material={BODY_MAT} position={[-0.225, 0.555, 0]} scale={[1.15, 0.95, 0.95]}>
        <sphereGeometry args={[0.09, 10, 8]} />
      </mesh>
      <mesh material={BODY_MAT} position={[0.225, 0.555, 0]} scale={[1.15, 0.95, 0.95]}>
        <sphereGeometry args={[0.09, 10, 8]} />
      </mesh>
      {/* Upper arm L */}
      <mesh material={BODY_MAT} position={[-0.275, 0.33, 0]}>
        <capsuleGeometry args={[0.052, 0.22, 4, 10]} />
      </mesh>
      {/* Upper arm R */}
      <mesh material={BODY_MAT} position={[0.275, 0.33, 0]}>
        <capsuleGeometry args={[0.052, 0.22, 4, 10]} />
      </mesh>
      {/* Forearm L */}
      <mesh material={BODY_MAT} position={[-0.275, 0.055, 0]}>
        <capsuleGeometry args={[0.042, 0.22, 4, 10]} />
      </mesh>
      {/* Forearm R */}
      <mesh material={BODY_MAT} position={[0.275, 0.055, 0]}>
        <capsuleGeometry args={[0.042, 0.22, 4, 10]} />
      </mesh>
      {/* Upper leg L */}
      <mesh material={BODY_MAT} position={[-0.092, -0.40, 0]}>
        <capsuleGeometry args={[0.082, 0.34, 4, 10]} />
      </mesh>
      {/* Upper leg R */}
      <mesh material={BODY_MAT} position={[0.092, -0.40, 0]}>
        <capsuleGeometry args={[0.082, 0.34, 4, 10]} />
      </mesh>
      {/* Lower leg L */}
      <mesh material={BODY_MAT} position={[-0.092, -0.85, 0]}>
        <capsuleGeometry args={[0.060, 0.31, 4, 10]} />
      </mesh>
      {/* Lower leg R */}
      <mesh material={BODY_MAT} position={[0.092, -0.85, 0]}>
        <capsuleGeometry args={[0.060, 0.31, 4, 10]} />
      </mesh>
      {/* Feet L */}
      <mesh material={BODY_MAT} position={[-0.092, -1.07, 0.04]} scale={[1, 0.5, 1.4]}>
        <sphereGeometry args={[0.06, 8, 6]} />
      </mesh>
      {/* Feet R */}
      <mesh material={BODY_MAT} position={[0.092, -1.07, 0.04]} scale={[1, 0.5, 1.4]}>
        <sphereGeometry args={[0.06, 8, 6]} />
      </mesh>
    </group>
  );
}

// ─── Muscle patch definition ──────────────────────────────────────────────────

interface PatchDef {
  muscleId:  string;   // matches MuscleGroupState.id
  position:  [number, number, number];
  scale:     [number, number, number];
}

// Front-facing patches (positive Z offset)
// Back-facing patches (negative Z offset)
const PATCH_DEFS: PatchDef[] = [
  // ── Shoulders ──────────────────────────────────────────────────────────────
  { muscleId: "anterior_delt_left",    position: [-0.224, 0.555, 0.065],  scale: [0.072, 0.072, 0.042] },
  { muscleId: "anterior_delt_right",   position: [ 0.224, 0.555, 0.065],  scale: [0.072, 0.072, 0.042] },
  { muscleId: "lateral_delt_left",     position: [-0.265, 0.555, 0.000],  scale: [0.062, 0.068, 0.042] },
  { muscleId: "lateral_delt_right",    position: [ 0.265, 0.555, 0.000],  scale: [0.062, 0.068, 0.042] },
  { muscleId: "posterior_delt_left",   position: [-0.224, 0.555, -0.065], scale: [0.072, 0.072, 0.042] },
  { muscleId: "posterior_delt_right",  position: [ 0.224, 0.555, -0.065], scale: [0.072, 0.072, 0.042] },
  { muscleId: "rotator_cuff_left",     position: [-0.235, 0.590, 0.000],  scale: [0.050, 0.050, 0.040] },
  { muscleId: "rotator_cuff_right",    position: [ 0.235, 0.590, 0.000],  scale: [0.050, 0.050, 0.040] },
  // ── Chest ──────────────────────────────────────────────────────────────────
  { muscleId: "pec_major_left",        position: [-0.110, 0.440, 0.148],  scale: [0.115, 0.095, 0.048] },
  { muscleId: "pec_major_right",       position: [ 0.110, 0.440, 0.148],  scale: [0.115, 0.095, 0.048] },
  { muscleId: "serratus_left",         position: [-0.165, 0.285, 0.130],  scale: [0.058, 0.105, 0.040] },
  { muscleId: "serratus_right",        position: [ 0.165, 0.285, 0.130],  scale: [0.058, 0.105, 0.040] },
  // ── Core ───────────────────────────────────────────────────────────────────
  { muscleId: "rectus_abdominis",      position: [ 0.000, 0.230, 0.152],  scale: [0.072, 0.155, 0.045] },
  { muscleId: "obliques_left",         position: [-0.128, 0.220, 0.125],  scale: [0.065, 0.125, 0.040] },
  { muscleId: "obliques_right",        position: [ 0.128, 0.220, 0.125],  scale: [0.065, 0.125, 0.040] },
  { muscleId: "transverse_abdominis",  position: [ 0.000, 0.145, 0.130],  scale: [0.110, 0.065, 0.038] },
  { muscleId: "hip_flexors_left",      position: [-0.085, 0.060, 0.125],  scale: [0.072, 0.080, 0.042] },
  { muscleId: "hip_flexors_right",     position: [ 0.085, 0.060, 0.125],  scale: [0.072, 0.080, 0.042] },
  // ── Arms (front) ───────────────────────────────────────────────────────────
  { muscleId: "bicep_left",            position: [-0.275, 0.330, 0.048],  scale: [0.050, 0.100, 0.038] },
  { muscleId: "bicep_right",           position: [ 0.275, 0.330, 0.048],  scale: [0.050, 0.100, 0.038] },
  { muscleId: "forearm_left",          position: [-0.275, 0.055, 0.038],  scale: [0.040, 0.095, 0.035] },
  { muscleId: "forearm_right",         position: [ 0.275, 0.055, 0.038],  scale: [0.040, 0.095, 0.035] },
  // ── Arms (back) ────────────────────────────────────────────────────────────
  { muscleId: "tricep_left",           position: [-0.275, 0.330, -0.048], scale: [0.050, 0.115, 0.038] },
  { muscleId: "tricep_right",          position: [ 0.275, 0.330, -0.048], scale: [0.050, 0.115, 0.038] },
  // ── Back ───────────────────────────────────────────────────────────────────
  { muscleId: "upper_trap",            position: [ 0.000, 0.625, -0.118], scale: [0.185, 0.072, 0.048] },
  { muscleId: "middle_trap",           position: [ 0.000, 0.480, -0.152], scale: [0.140, 0.065, 0.045] },
  { muscleId: "lower_trap",            position: [ 0.000, 0.368, -0.152], scale: [0.120, 0.058, 0.040] },
  { muscleId: "rhomboids",             position: [ 0.000, 0.435, -0.148], scale: [0.095, 0.075, 0.040] },
  { muscleId: "lat_left",              position: [-0.175, 0.375, -0.142], scale: [0.088, 0.148, 0.048] },
  { muscleId: "lat_right",             position: [ 0.175, 0.375, -0.142], scale: [0.088, 0.148, 0.048] },
  { muscleId: "erector_spinae",        position: [ 0.000, 0.290, -0.152], scale: [0.055, 0.215, 0.045] },
  { muscleId: "quadratus_lumborum_left",  position: [-0.062, 0.155, -0.135], scale: [0.052, 0.070, 0.040] },
  { muscleId: "quadratus_lumborum_right", position: [ 0.062, 0.155, -0.135], scale: [0.052, 0.070, 0.040] },
  // ── Glutes ─────────────────────────────────────────────────────────────────
  { muscleId: "glute_max_left",        position: [-0.110, -0.118, -0.132], scale: [0.118, 0.125, 0.075] },
  { muscleId: "glute_max_right",       position: [ 0.110, -0.118, -0.132], scale: [0.118, 0.125, 0.075] },
  { muscleId: "glute_med_left",        position: [-0.148, -0.045, -0.095], scale: [0.072, 0.072, 0.050] },
  { muscleId: "glute_med_right",       position: [ 0.148, -0.045, -0.095], scale: [0.072, 0.072, 0.050] },
  { muscleId: "abductors_left",        position: [-0.165, -0.055, -0.040], scale: [0.052, 0.095, 0.042] },
  { muscleId: "abductors_right",       position: [ 0.165, -0.055, -0.040], scale: [0.052, 0.095, 0.042] },
  // ── Upper leg (front) ──────────────────────────────────────────────────────
  { muscleId: "quads_left",            position: [-0.092, -0.408, 0.085],  scale: [0.080, 0.195, 0.055] },
  { muscleId: "quads_right",           position: [ 0.092, -0.408, 0.085],  scale: [0.080, 0.195, 0.055] },
  { muscleId: "adductors_left",        position: [-0.048, -0.408, 0.052],  scale: [0.048, 0.165, 0.040] },
  { muscleId: "adductors_right",       position: [ 0.048, -0.408, 0.052],  scale: [0.048, 0.165, 0.040] },
  // ── Upper leg (back) ───────────────────────────────────────────────────────
  { muscleId: "hamstrings_left",       position: [-0.092, -0.420, -0.090], scale: [0.080, 0.195, 0.058] },
  { muscleId: "hamstrings_right",      position: [ 0.092, -0.420, -0.090], scale: [0.080, 0.195, 0.058] },
  { muscleId: "hip_external_rotators_left",  position: [-0.100, -0.248, -0.082], scale: [0.058, 0.058, 0.040] },
  { muscleId: "hip_external_rotators_right", position: [ 0.100, -0.248, -0.082], scale: [0.058, 0.058, 0.040] },
  // ── Lower leg ──────────────────────────────────────────────────────────────
  { muscleId: "calves_left",           position: [-0.092, -0.855, -0.062], scale: [0.058, 0.165, 0.052] },
  { muscleId: "calves_right",          position: [ 0.092, -0.855, -0.062], scale: [0.058, 0.165, 0.052] },
  { muscleId: "tibialis_anterior_left",  position: [-0.092, -0.848, 0.058], scale: [0.040, 0.140, 0.038] },
  { muscleId: "tibialis_anterior_right", position: [ 0.092, -0.848, 0.058], scale: [0.040, 0.140, 0.038] },
  { muscleId: "peroneals_left",        position: [-0.108, -0.855, 0.010],  scale: [0.035, 0.125, 0.035] },
  { muscleId: "peroneals_right",       position: [ 0.108, -0.855, 0.010],  scale: [0.035, 0.125, 0.035] },
  // ── Neck ───────────────────────────────────────────────────────────────────
  { muscleId: "neck",                  position: [ 0.000, 0.718, 0.048],  scale: [0.045, 0.060, 0.030] },
  { muscleId: "upper_trap",            position: [ 0.000, 0.650, 0.000],  scale: [0.185, 0.062, 0.038] },
];

// ─── Animated muscle patch mesh ───────────────────────────────────────────────

interface PatchMeshProps {
  def:        PatchDef;
  muscle:     MuscleGroupState | undefined;
  mode:       VisualizationMode;
  isSelected: boolean;
  isHovered:  boolean;
  onHover:    (m: MuscleGroupState | null) => void;
  onClick:    (m: MuscleGroupState) => void;
}

function PatchMesh({ def, muscle, mode, isSelected, isHovered, onHover, onClick }: PatchMeshProps) {
  const meshRef   = useRef<THREE.Mesh>(null!);
  const curColor  = useRef(new THREE.Color());
  const tgtColor  = useRef(new THREE.Color());
  const pulseT    = useRef(0);

  const hexColor = muscle ? stateToHex(muscle, mode) : "#EAE7DE";

  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color:             new THREE.Color(hexColor),
      emissive:          new THREE.Color(hexColor),
      emissiveIntensity: 0,
      roughness:         0.65,
      metalness:         0,
      transparent:       true,
      opacity:           hexColor === "#EAE7DE" ? 0 : 0.88,
    });
    curColor.current.set(hexColor);
    return m;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const m = meshRef.current.material as THREE.MeshStandardMaterial;

    // Color lerp
    tgtColor.current.set(hexColor);
    curColor.current.lerp(tgtColor.current, Math.min(1, delta * 2.5));
    m.color.copy(curColor.current);
    m.emissive.copy(curColor.current);

    // Opacity
    const targetOp = hexColor === "#EAE7DE" ? 0 : (isHovered || isSelected ? 1 : 0.82);
    m.opacity = THREE.MathUtils.lerp(m.opacity, targetOp, delta * 4);

    // Pulse for scheduled or injured
    if (muscle?.state === "scheduled" || muscle?.state === "injured") {
      pulseT.current += delta * (muscle.state === "injured" ? 2.8 : 1.8);
      m.emissiveIntensity = 0.10 + Math.sin(pulseT.current) * 0.07;
    } else {
      m.emissiveIntensity = isHovered ? 0.18 : isSelected ? 0.22 : 0;
    }

    // Scale pop on hover
    const targetScale = isHovered ? 1.06 : 1.0;
    meshRef.current.scale.setScalar(
      THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, delta * 8),
    );
  });

  if (!muscle) return null;

  return (
    <mesh
      ref={meshRef}
      position={def.position}
      scale={def.scale}
      material={mat}
      renderOrder={1}
      onPointerEnter={e => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
        onHover(muscle);
      }}
      onPointerLeave={e => {
        e.stopPropagation();
        document.body.style.cursor = "default";
        onHover(null);
      }}
      onClick={e => {
        e.stopPropagation();
        onClick(muscle);
      }}
    >
      <sphereGeometry args={[1, 12, 9]} />
    </mesh>
  );
}

// ─── Hover tooltip ─────────────────────────────────────────────────────────────

function Tooltip({ muscle }: { muscle: MuscleGroupState }) {
  return (
    <Html center style={{ pointerEvents: "none", zIndex: 50, whiteSpace: "nowrap" }}>
      <div className="bg-[#1C1B18]/95 text-white text-[11px] font-medium px-3 py-2 rounded-xl shadow-2xl backdrop-blur-sm"
        style={{ minWidth: 148 }}>
        <div className="font-semibold text-[12px] mb-1">
          {muscle.displayName.replace(/ \((left|right)\)$/, "")}
        </div>
        <div className="text-[#A8A5A0]">Recovery {muscle.recoveryPercent}%</div>
        {muscle.daysSinceTraining !== null && (
          <div className="text-[#A8A5A0]">
            {muscle.daysSinceTraining === 0 ? "Trained today" : `Trained ${muscle.daysSinceTraining}d ago`}
          </div>
        )}
        {muscle.weeklyFrequency > 0 && (
          <div className="text-[#A8A5A0]">{muscle.weeklyFrequency}× this week</div>
        )}
      </div>
    </Html>
  );
}

// ─── Full scene ────────────────────────────────────────────────────────────────

interface SceneProps {
  snapshot:    BodyIntelligenceSnapshot;
  mode:        VisualizationMode;
  selected:    MuscleGroupState | null;
  hovered:     MuscleGroupState | null;
  onHover:     (m: MuscleGroupState | null) => void;
  onSelect:    (m: MuscleGroupState) => void;
}

function Scene({ snapshot, mode, selected, hovered, onHover, onSelect }: SceneProps) {
  const muscleById = useMemo(() => {
    const map = new Map<string, MuscleGroupState>();
    for (const m of snapshot.muscles) map.set(m.id, m);
    return map;
  }, [snapshot]);

  return (
    <group>
      <BaseBody />
      {PATCH_DEFS.map((def, i) => {
        const muscle = muscleById.get(def.muscleId);
        const isSelected = !!(selected && muscle && selected.id === muscle.id);
        const isHovered  = !!(hovered  && muscle && hovered.id  === muscle.id);
        return (
          <PatchMesh
            key={`${def.muscleId}-${i}`}
            def={def}
            muscle={muscle}
            mode={mode}
            isSelected={isSelected}
            isHovered={isHovered}
            onHover={onHover}
            onClick={onSelect}
          />
        );
      })}
      {hovered && (
        <Html position={[0, 0.2, 0]} center>
          <Tooltip muscle={hovered} />
        </Html>
      )}
    </group>
  );
}

// ─── Exported viewer ───────────────────────────────────────────────────────────

export interface ProceduralBodyViewerProps {
  snapshot:       BodyIntelligenceSnapshot;
  mode:           VisualizationMode;
  onMuscleSelect: (muscle: MuscleGroupState | null) => void;
  selectedMuscle: MuscleGroupState | null;
  className?:     string;
}

export function ProceduralBodyViewer({
  snapshot,
  mode,
  onMuscleSelect,
  selectedMuscle,
  className = "",
}: ProceduralBodyViewerProps) {
  const [hovered, setHovered] = useState<MuscleGroupState | null>(null);

  const handleHover  = useCallback((m: MuscleGroupState | null) => setHovered(m), []);
  const handleSelect = useCallback((m: MuscleGroupState) => {
    onMuscleSelect(selectedMuscle?.id === m.id ? null : m);
  }, [selectedMuscle, onMuscleSelect]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Canvas
        shadows
        camera={{ position: [0, 0, 3.2], fov: 42, near: 0.05, far: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
        performance={{ min: 0.5 }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[2, 6, 4]}  intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-2, 3, -2]} intensity={0.35} />
        <directionalLight position={[0, -2, 3]}  intensity={0.15} />

        <Scene
          snapshot={snapshot}
          mode={mode}
          selected={selectedMuscle}
          hovered={hovered}
          onHover={handleHover}
          onSelect={handleSelect}
        />

        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={1.4}
          maxDistance={7}
          target={[0, 0, 0]}
          enableDamping
          dampingFactor={0.06}
        />
      </Canvas>
    </div>
  );
}
