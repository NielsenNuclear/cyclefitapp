// @replaced-by-phase-58 — see components/body/BodyViewer.tsx for new entry point
// This file is kept only to avoid breaking the GLTF path import in page.tsx (legacy).
// The active viewer is BodyViewer (default export below).

"use client";

import { Suspense, useRef, useState, useCallback, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls, Html, Environment } from "@react-three/drei";
import * as THREE from "three";
import type { BodyIntelligenceSnapshot, MuscleGroupState, VisualizationMode } from "@/lib/bodyIntelligence/bodyIntelligenceTypes";
import { STATE_COLOR } from "@/lib/bodyIntelligence/bodyIntelligenceTypes";
import { findMuscleByGltfNode } from "@/lib/bodyIntelligence/muscleStateEngine";

// ─── Color helpers ────────────────────────────────────────────────────────────

function stateToHex(muscle: MuscleGroupState, mode: VisualizationMode): string {
  switch (mode) {
    case "recovery":
      // Green = high recovery, red = low
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

    default: // "today"
      return STATE_COLOR[muscle.state] ?? "#EAE7DE";
  }
}

// ─── Animated muscle mesh ─────────────────────────────────────────────────────

interface MuscleMeshProps {
  node:       THREE.Mesh;
  muscle:     MuscleGroupState | undefined;
  mode:       VisualizationMode;
  isSelected: boolean;
  isHovered:  boolean;
  onHover:    (muscle: MuscleGroupState | null) => void;
  onClick:    (muscle: MuscleGroupState) => void;
}

function MuscleMesh({ node, muscle, mode, isSelected, isHovered, onHover, onClick }: MuscleMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const targetColorRef = useRef(new THREE.Color());
  const currentColorRef = useRef(new THREE.Color());
  const pulseRef = useRef(0);

  const hexColor = muscle ? stateToHex(muscle, mode) : "#EAE7DE";

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;

    // Smooth color interpolation
    targetColorRef.current.set(hexColor);
    currentColorRef.current.lerp(targetColorRef.current, Math.min(1, delta * 3));
    mat.color.copy(currentColorRef.current);

    // Pulse for scheduled muscles
    if (muscle?.state === "scheduled") {
      pulseRef.current += delta * 2;
      mat.emissiveIntensity = 0.08 + Math.sin(pulseRef.current) * 0.06;
    } else if (muscle?.state === "injured") {
      pulseRef.current += delta * 3;
      mat.emissiveIntensity = 0.12 + Math.sin(pulseRef.current) * 0.08;
    } else {
      mat.emissiveIntensity = isHovered ? 0.12 : isSelected ? 0.15 : 0;
    }

    // Opacity for non-selected when something is selected
    const targetOpacity = isSelected ? 1 : 1;
    mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, delta * 5);
  });

  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color:          new THREE.Color(hexColor),
      emissive:       new THREE.Color(hexColor),
      emissiveIntensity: 0,
      roughness:      0.7,
      metalness:      0.0,
      transparent:    true,
      opacity:        1,
    });
    currentColorRef.current.set(hexColor);
    return m;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <mesh
      ref={meshRef}
      geometry={node.geometry}
      material={mat}
      position={node.position}
      rotation={node.rotation}
      scale={node.scale}
      castShadow
      receiveShadow
      onPointerEnter={e => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
        if (muscle) onHover(muscle);
      }}
      onPointerLeave={e => {
        e.stopPropagation();
        document.body.style.cursor = "default";
        onHover(null);
      }}
      onClick={e => {
        e.stopPropagation();
        if (muscle) onClick(muscle);
      }}
    />
  );
}

// ─── Non-muscle mesh (base body) ──────────────────────────────────────────────

function BodyBaseMesh({ node }: { node: THREE.Mesh }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color:     new THREE.Color("#D4C8BC"),
    roughness: 0.85,
    metalness: 0,
  }), []);

  return (
    <mesh
      geometry={node.geometry}
      material={mat}
      position={node.position}
      rotation={node.rotation}
      scale={node.scale}
      receiveShadow
    />
  );
}

// ─── Hover tooltip (HTML overlay) ─────────────────────────────────────────────

function HoverTooltip({ muscle }: { muscle: MuscleGroupState }) {
  return (
    <Html
      center
      style={{
        pointerEvents:    "none",
        whiteSpace:       "nowrap",
        transform:        "translateY(-12px)",
        zIndex:           50,
      }}
    >
      <div
        className="bg-[#1C1B18] text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg shadow-xl space-y-0.5"
        style={{ minWidth: 140 }}
      >
        <div className="font-semibold text-[12px]">{muscle.displayName.replace(/ \((left|right)\)$/, "")}</div>
        <div className="text-[#A8A5A0]">Recovery {muscle.recoveryPercent}%</div>
        {muscle.daysSinceTraining !== null && (
          <div className="text-[#A8A5A0]">
            Last trained {muscle.daysSinceTraining === 0 ? "today" : `${muscle.daysSinceTraining}d ago`}
          </div>
        )}
      </div>
    </Html>
  );
}

// ─── GLTF scene renderer ──────────────────────────────────────────────────────

interface GltfSceneProps {
  modelUrl:    string;
  snapshot:    BodyIntelligenceSnapshot;
  mode:        VisualizationMode;
  selected:    MuscleGroupState | null;
  onHover:     (muscle: MuscleGroupState | null) => void;
  onSelect:    (muscle: MuscleGroupState) => void;
  hovered:     MuscleGroupState | null;
}

function GltfScene({ modelUrl, snapshot, mode, selected, onHover, onSelect, hovered }: GltfSceneProps) {
  const { scene } = useGLTF(modelUrl);

  const { muscleMeshes, baseMeshes } = useMemo(() => {
    const mm: Array<{ node: THREE.Mesh; muscle: MuscleGroupState | undefined; nodeName: string }> = [];
    const bm: Array<THREE.Mesh> = [];

    scene.traverse(obj => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (obj.name.startsWith("muscle_")) {
        const muscle = findMuscleByGltfNode(snapshot, obj.name);
        mm.push({ node: obj, muscle, nodeName: obj.name });
      } else {
        bm.push(obj);
      }
    });
    return { muscleMeshes: mm, baseMeshes: bm };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, snapshot.date]);

  return (
    <group>
      {baseMeshes.map((node, i) => (
        <BodyBaseMesh key={i} node={node} />
      ))}
      {muscleMeshes.map(({ node, muscle, nodeName }) => {
        const isSelected = !!(selected && muscle && selected.id === muscle.id);
        const isHovered  = !!(hovered  && muscle && hovered.id  === muscle.id);
        return (
          <MuscleMesh
            key={nodeName}
            node={node}
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
        <Html position={[0, 0, 0]} center>
          <HoverTooltip muscle={hovered} />
        </Html>
      )}
    </group>
  );
}

// ─── Loading fallback ─────────────────────────────────────────────────────────

function LoadingBody() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-[#534AB7] border-t-transparent animate-spin" />
        <div className="text-[12px] text-[#9B9690]">Loading body model…</div>
      </div>
    </Html>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────

export interface BodyViewerProps {
  modelUrl:   string;
  snapshot:   BodyIntelligenceSnapshot;
  mode:       VisualizationMode;
  onMuscleSelect: (muscle: MuscleGroupState | null) => void;
  selectedMuscle: MuscleGroupState | null;
  className?: string;
}

export function BodyViewer({
  modelUrl,
  snapshot,
  mode,
  onMuscleSelect,
  selectedMuscle,
  className = "",
}: BodyViewerProps) {
  const [hovered, setHovered] = useState<MuscleGroupState | null>(null);

  const handleHover = useCallback((m: MuscleGroupState | null) => setHovered(m), []);
  const handleSelect = useCallback((m: MuscleGroupState) => {
    onMuscleSelect(selectedMuscle?.id === m.id ? null : m);
  }, [selectedMuscle, onMuscleSelect]);

  return (
    <div
      className={`relative w-full h-full ${className}`}
      onClick={e => {
        // Click on background deselects
        if ((e.target as HTMLElement).tagName === "CANVAS") {
          onMuscleSelect(null);
        }
      }}
    >
      <Canvas
        shadows
        camera={{ position: [0, 1.2, 3.5], fov: 40, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
        performance={{ min: 0.5 }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[3, 8, 5]}
          intensity={1.4}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-3, 4, -2]} intensity={0.4} />

        <Suspense fallback={<LoadingBody />}>
          <GltfScene
            modelUrl={modelUrl}
            snapshot={snapshot}
            mode={mode}
            selected={selectedMuscle}
            hovered={hovered}
            onHover={handleHover}
            onSelect={handleSelect}
          />
        </Suspense>

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={1.5}
          maxDistance={8}
          target={[0, 0.8, 0]}
          enableDamping
          dampingFactor={0.05}
          minPolarAngle={0}
          maxPolarAngle={Math.PI}
        />
      </Canvas>
    </div>
  );
}
