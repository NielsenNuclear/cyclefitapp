"use client";

/**
 * GltfBody — Phase 59 renderer
 *
 * Implements BodyRendererProps. Loads a GLTF model and maps its meshes
 * to muscle state from the Body Intelligence Engine.
 *
 * Node naming convention (model must follow this):
 *   Muscle meshes: "muscle_<muscleId>"    e.g. "muscle_quads_left"
 *   Base body:     anything without the "muscle_" prefix
 *
 * Swap in: change the lazy import in BodyIntelligenceViewer.tsx and set
 * NEXT_PUBLIC_BODY_MODEL_URL. No interaction, camera, or panel code changes.
 */

import { useRef, useMemo, useEffect } from "react";
import { useFrame }                   from "@react-three/fiber";
import type { ThreeEvent }            from "@react-three/fiber";
import { useGLTF, Html }              from "@react-three/drei";
import * as THREE                     from "three";

import type { BodyRendererProps, MuscleRecord } from "@/lib/bodyIntelligence/BodyStateEngine";
import { getOverlayAppearance, STATUS_LABEL }   from "./OverlaySystem";

// ─── Node-name helpers ────────────────────────────────────────────────────────

function muscleIdFromNode(name: string): string | null {
  return name.startsWith("muscle_") ? name.slice(7) : null;
}

// ─── Material factories ───────────────────────────────────────────────────────

const NEUTRAL = new THREE.Color("#C9A689");

function makeSkinMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color:     NEUTRAL.clone(),
    roughness: 0.80,
    metalness: 0,
  });
}

function makeMuscleMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color:             NEUTRAL.clone(),
    emissive:          NEUTRAL.clone(),
    emissiveIntensity: 0,
    roughness:         0.62,
    metalness:         0.02,
    transparent:       true,
    opacity:           0.88,
  });
}

// ─── Per-muscle animation state (mutated imperatively in useFrame) ────────────

interface AnimState {
  mat:   THREE.MeshStandardMaterial;
  cur:   THREE.Color;
  tgt:   THREE.Color;
  pulse: number;
}

// ─── Hover tooltip ────────────────────────────────────────────────────────────

function MuscleTooltip({ muscle, position }: { muscle: MuscleRecord; position: THREE.Vector3 }) {
  return (
    <Html
      position={[position.x, position.y + 0.09, position.z + 0.06]}
      center
      style={{ pointerEvents: "none", zIndex: 60 }}
    >
      <div
        style={{
          background:     "rgba(28,27,24,0.92)",
          backdropFilter: "blur(8px)",
          borderRadius:   12,
          padding:        "8px 13px",
          minWidth:       148,
          whiteSpace:     "nowrap",
          boxShadow:      "0 8px 24px rgba(0,0,0,0.35)",
          fontFamily:     "'DM Sans','Helvetica Neue',sans-serif",
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

// ─── Extended props ───────────────────────────────────────────────────────────

export interface GltfBodyProps extends BodyRendererProps {
  /** URL of the GLTF/GLB model. Set via NEXT_PUBLIC_BODY_MODEL_URL. */
  modelUrl:        string;
  /** Fired once with the model's world-space bounding box after load. */
  onBoundsReady?:  (bounds: THREE.Box3) => void;
  /** Fired once with a map of muscleId → world-space mesh center after load. */
  onAnchorsReady?: (anchors: Map<string, THREE.Vector3>) => void;
}

// ─── Main renderer ────────────────────────────────────────────────────────────

export function GltfBody({
  modelUrl,
  muscleMap,
  layer,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
  onBoundsReady,
  onAnchorsReady,
}: GltfBodyProps) {
  const { scene } = useGLTF(modelUrl);

  // Clone the cached scene — we replace materials on the clone, not the original
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  const animMap    = useRef<Map<string, AnimState>>(new Map());
  const posMap     = useRef<Map<string, THREE.Vector3>>(new Map());
  const disposable = useRef<THREE.MeshStandardMaterial[]>([]);

  useEffect(() => {
    const anims:     Map<string, AnimState>       = new Map();
    const poses:     Map<string, THREE.Vector3>   = new Map();
    const toDispose: THREE.MeshStandardMaterial[] = [];

    // Ensure all matrixWorld values reflect the current scene graph
    clonedScene.updateMatrixWorld(true);

    clonedScene.traverse(obj => {
      if (!(obj instanceof THREE.Mesh)) return;
      obj.castShadow    = true;
      obj.receiveShadow = true;

      const id = muscleIdFromNode(obj.name);

      if (id) {
        const mat = makeMuscleMat();
        obj.material = mat;
        toDispose.push(mat);

        anims.set(id, {
          mat,
          cur:   NEUTRAL.clone(),
          tgt:   NEUTRAL.clone(),
          pulse: 0,
        });

        // World-space center of this muscle mesh
        obj.geometry.computeBoundingBox();
        const localBox = obj.geometry.boundingBox;
        if (localBox) {
          const worldBox = localBox.clone().applyMatrix4(obj.matrixWorld);
          poses.set(id, worldBox.getCenter(new THREE.Vector3()));
        } else {
          const wc = new THREE.Vector3();
          obj.getWorldPosition(wc);
          poses.set(id, wc);
        }
      } else {
        const skin = makeSkinMat();
        obj.material = skin;
        toDispose.push(skin);
      }
    });

    animMap.current    = anims;
    posMap.current     = poses;
    disposable.current = toDispose;

    onBoundsReady?.(new THREE.Box3().setFromObject(clonedScene));
    onAnchorsReady?.(poses);

    return () => {
      for (const m of toDispose) m.dispose();
    };
  }, [clonedScene]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Per-frame color animation ─────────────────────────────────────────────

  useFrame((_, dt) => {
    for (const [id, state] of animMap.current) {
      const muscle = muscleMap.get(id);
      if (!muscle) continue;

      const isH = hoveredId  === id;
      const isS = selectedId === id;
      const app = getOverlayAppearance(muscle, layer, isH, isS);

      state.tgt.set(app.color);
      state.cur.lerp(state.tgt, Math.min(1, dt * 3.0));
      state.mat.color.copy(state.cur);
      state.mat.emissive.copy(state.cur);
      state.mat.opacity = THREE.MathUtils.lerp(state.mat.opacity, app.opacity, dt * 5);

      if (app.pulse) {
        state.pulse += dt * 1.9;
        state.mat.emissiveIntensity = 0.10 + Math.sin(state.pulse) * 0.07;
      } else {
        const tEI = isS ? 0.22 : isH ? 0.17 : 0;
        state.mat.emissiveIntensity = THREE.MathUtils.lerp(state.mat.emissiveIntensity, tEI, dt * 7);
      }
    }
  });

  // ── Tooltip ───────────────────────────────────────────────────────────────

  const hoveredMuscle = hoveredId ? muscleMap.get(hoveredId) : undefined;
  const hoveredPos    = hoveredId ? posMap.current.get(hoveredId) : undefined;

  return (
    <group>
      <primitive
        object={clonedScene}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onHover(muscleIdFromNode(e.object.name));
        }}
        onPointerOut={() => onHover(null)}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelect(muscleIdFromNode(e.object.name));
        }}
      />

      {hoveredMuscle && hoveredPos && !selectedId && (
        <MuscleTooltip muscle={hoveredMuscle} position={hoveredPos} />
      )}
    </group>
  );
}

/** Call this at module/page level to start fetching the model before the viewer mounts. */
export function preloadGltfBody(url: string) {
  useGLTF.preload(url);
}
