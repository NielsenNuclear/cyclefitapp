"use client";

import { useMemo, Suspense } from "react";
import { Canvas }    from "@react-three/fiber";
import * as THREE    from "three";
import type {
  BodyIntelligenceSnapshot,
  MuscleGroupState,
  VisualizationMode,
} from "@/lib/bodyIntelligence/bodyIntelligenceTypes";
import { SceneLighting }          from "./scene/SceneLighting";
import { ProceduralBodyGeometry, PATCH_DEFS, BODY_BOUNDS } from "./scene/ProceduralBodyGeometry";
import { SceneCamera }            from "./scene/SceneCamera";

// Reused across renders
const CANVAS_STYLE: React.CSSProperties = {
  background: "transparent",
  width: "100%",
  height: "100%",
  display: "block",
};

// Controls hint — overlaid at the bottom of the viewport
function ControlsHint({ hasModel }: { hasModel: boolean }) {
  return (
    <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
      <div className="bg-[#1C1B18]/40 backdrop-blur-sm text-white/70 text-[10px] px-3 py-1.5 rounded-full">
        {hasModel ? "Drag · Scroll · Click muscle" : "Drag · Scroll · Click — procedural preview"}
      </div>
    </div>
  );
}

// Loading skeleton shown while Canvas initialises
function ViewportSkeleton() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 rounded-full border-2 border-[#534AB7] border-t-transparent animate-spin" />
      <div className="text-[12px] text-[#9B9690]">Loading viewer…</div>
    </div>
  );
}

// ─── Scene content (inside Canvas) ───────────────────────────────────────────

interface SceneProps {
  snapshot:       BodyIntelligenceSnapshot;
  mode:           VisualizationMode;
  selectedMuscle: MuscleGroupState | null;
  onMuscleSelect: (m: MuscleGroupState | null) => void;
  focusTarget:    THREE.Vector3 | null;
}

function Scene({ snapshot, mode, selectedMuscle, onMuscleSelect, focusTarget }: SceneProps) {
  return (
    <>
      <SceneLighting />
      <SceneCamera
        bodyBounds={BODY_BOUNDS}
        focusTarget={focusTarget}
        focusRadius={0.28}
      />
      <Suspense fallback={null}>
        <ProceduralBodyGeometry
          snapshot={snapshot}
          mode={mode}
          selectedMuscle={selectedMuscle}
          onMuscleSelect={onMuscleSelect}
        />
      </Suspense>
    </>
  );
}

// ─── Exported viewport ────────────────────────────────────────────────────────

export interface BodyViewportProps {
  snapshot:       BodyIntelligenceSnapshot;
  mode:           VisualizationMode;
  selectedMuscle: MuscleGroupState | null;
  onMuscleSelect: (m: MuscleGroupState | null) => void;
  /** True when NEXT_PUBLIC_BODY_MODEL_URL is set (shows hint text accordingly) */
  hasGltfModel?:  boolean;
  className?:     string;
}

export function BodyViewport({
  snapshot,
  mode,
  selectedMuscle,
  onMuscleSelect,
  hasGltfModel = false,
  className = "",
}: BodyViewportProps) {
  // Compute the world-space focus point for the selected muscle
  const focusTarget = useMemo<THREE.Vector3 | null>(() => {
    if (!selectedMuscle) return null;
    const patch = PATCH_DEFS.find(p => p.muscleId === selectedMuscle.id);
    if (!patch) return null;
    return new THREE.Vector3(...patch.position);
  }, [selectedMuscle?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Suspense fallback={<ViewportSkeleton />}>
        <Canvas
          shadows
          camera={{ fov: 42, near: 0.05, far: 50, position: [0, 0, 4] }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          style={CANVAS_STYLE}
          performance={{ min: 0.5 }}
          dpr={[1, 1.5]} // cap at 1.5 to avoid GPU overload on retina
        >
          <Scene
            snapshot={snapshot}
            mode={mode}
            selectedMuscle={selectedMuscle}
            onMuscleSelect={onMuscleSelect}
            focusTarget={focusTarget}
          />
        </Canvas>
      </Suspense>

      <ControlsHint hasModel={hasGltfModel} />
    </div>
  );
}
