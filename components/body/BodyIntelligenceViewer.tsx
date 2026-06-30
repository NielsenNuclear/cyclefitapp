"use client";

/**
 * BodyIntelligenceViewer — Phase 59
 *
 * Main entry point for the Body Intelligence System.
 * Owns: Canvas, 60/40 responsive layout, hook wiring.
 *
 * Renderer selection (set NEXT_PUBLIC_BODY_MODEL_URL to activate GLTF):
 *   GLTF model → GltfBody (rendering/GltfBody.tsx)          — Phase 59+
 *   Placeholder → PlaceholderBody (rendering/PlaceholderBody.tsx) — fallback
 *
 * Separation of concerns:
 *   Data        → useBodyState
 *   Interaction → useBodyInteraction
 *   Colors      → OverlaySystem
 *   Geometry    → GltfBody | PlaceholderBody (same BodyRendererProps contract)
 *   Camera      → CameraController
 *   Lighting    → SceneLighting
 *   Panel       → DetailPanel
 */

import { useState, useMemo, lazy, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";

import type { VisualizationLayer, MuscleRecord, BodySnapshot } from "@/lib/bodyIntelligence/BodyStateEngine";
import { useBodyState }               from "./hooks/useBodyState";
import { useBodyInteraction }         from "./hooks/useBodyInteraction";
import { MUSCLE_ANCHORS, BODY_BOUNDS } from "./rendering/PlaceholderBody";
import { SceneLighting }              from "./viewer/SceneLighting";
import { CameraController }           from "./viewer/CameraController";
import { DetailPanel }                from "./panels/DetailPanel";
import { LAYER_META }                 from "./rendering/OverlaySystem";

const MODEL_URL = process.env.NEXT_PUBLIC_BODY_MODEL_URL ?? "";

// Lazy — keeps R3F + Three.js out of the SSR bundle
const PlaceholderBody = lazy(() =>
  import("./rendering/PlaceholderBody").then(m => ({ default: m.PlaceholderBody })),
);
const GltfBody = lazy(() =>
  import("./rendering/GltfBody").then(m => ({ default: m.GltfBody })),
);

// ─── Shared primitives ────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
      <div className="w-10 h-10 rounded-full border-2 border-[#534AB7] border-t-transparent animate-spin" />
      <div className="text-[12px] text-[#9B9690]">Loading…</div>
    </div>
  );
}

function ControlsHint() {
  return (
    <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none">
      <div
        className="text-white/65 text-[10px] px-3 py-1.5 rounded-full"
        style={{ background: "rgba(28,27,24,0.40)", backdropFilter: "blur(6px)" }}
      >
        Drag · Scroll · Click muscle · Double-click to reset
      </div>
    </div>
  );
}

// ─── Scene root (inside <Canvas>) ────────────────────────────────────────────

interface SceneProps {
  muscleMap:       Map<string, MuscleRecord>;
  layer:           VisualizationLayer;
  hoveredId:       string | null;
  selectedId:      string | null;
  focusTarget:     THREE.Vector3 | null;
  bodyBounds:      THREE.Box3;
  onHover:         (id: string | null) => void;
  onSelect:        (id: string | null) => void;
  onBoundsReady?:  (bounds: THREE.Box3) => void;
  onAnchorsReady?: (anchors: Map<string, THREE.Vector3>) => void;
}

function BodyScene({
  muscleMap, layer, hoveredId, selectedId,
  focusTarget, bodyBounds,
  onHover, onSelect,
  onBoundsReady, onAnchorsReady,
}: SceneProps) {
  const rendererProps = { muscleMap, layer, hoveredId, selectedId, onHover, onSelect };
  return (
    <>
      <SceneLighting />
      <CameraController bodyBounds={bodyBounds} focusTarget={focusTarget} focusRadius={0.28} />
      <Suspense fallback={null}>
        {MODEL_URL ? (
          <GltfBody
            {...rendererProps}
            modelUrl={MODEL_URL}
            onBoundsReady={onBoundsReady}
            onAnchorsReady={onAnchorsReady}
          />
        ) : (
          <PlaceholderBody {...rendererProps} />
        )}
      </Suspense>
    </>
  );
}

// ─── Mobile bottom sheet ──────────────────────────────────────────────────────

interface SheetProps { isOpen: boolean; onDismiss: () => void; children: React.ReactNode; }

function BottomSheet({ isOpen, onDismiss, children }: SheetProps) {
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" aria-hidden="true" onClick={onDismiss} />
      )}
      <div
        className={`
          fixed inset-x-0 bottom-0 z-40 lg:hidden
          bg-[#FAF9F5] rounded-t-3xl border-t border-[#EAE7DE] shadow-2xl
          max-h-[72vh] flex flex-col
          transform transition-transform duration-300 ease-out
          ${isOpen ? "translate-y-0" : "translate-y-full"}
        `}
        role="dialog"
        aria-modal={isOpen}
        aria-hidden={!isOpen}
      >
        <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#C8C5BC]" />
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">{children}</div>
      </div>
    </>
  );
}

const CANVAS_STYLE: React.CSSProperties = {
  width: "100%", height: "100%", display: "block", background: "transparent",
};

// ─── Exported component ───────────────────────────────────────────────────────

export interface BodyIntelligenceViewerProps {
  defaultLayer?: VisualizationLayer;
  className?:    string;
}

export function BodyIntelligenceViewer({
  defaultLayer = "status",
  className    = "",
}: BodyIntelligenceViewerProps) {
  // Data
  const { snapshot, isLoading } = useBodyState();

  const muscleMap = useMemo(() => {
    const m = new Map<string, MuscleRecord>();
    if (snapshot) for (const r of snapshot.muscles) m.set(r.id, r);
    return m;
  }, [snapshot]);

  // Interaction
  const { selected, hoveredId, selectedId, onHover, onSelect, onDeselect } =
    useBodyInteraction(muscleMap);

  // Layer
  const [layer, setLayer] = useState<VisualizationLayer>(defaultLayer);

  // GLTF bounds / anchors — updated once after the GLTF model loads
  const [gltfBounds,  setGltfBounds]  = useState<THREE.Box3>(() => BODY_BOUNDS.clone());
  const [gltfAnchors, setGltfAnchors] = useState<Map<string, THREE.Vector3> | null>(null);

  const bodyBounds = MODEL_URL ? gltfBounds : BODY_BOUNDS;

  // Focus target — uses GLTF world positions when available, else anchor table
  const focusTarget = useMemo<THREE.Vector3 | null>(() => {
    if (!selectedId) return null;
    if (gltfAnchors) return gltfAnchors.get(selectedId) ?? null;
    const a = MUSCLE_ANCHORS.find(x => x.muscleId === selectedId);
    return a ? new THREE.Vector3(...a.position) : null;
  }, [selectedId, gltfAnchors]);

  return (
    <div className={`flex flex-col h-full bg-[#FAF9F5] overflow-hidden ${className}`}>

      {/* ── 60/40 split ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* 3D viewport */}
        <div className="flex-[3] relative min-w-0">
          {isLoading && !snapshot && <LoadingSpinner />}

          <Suspense fallback={null}>
            <Canvas
              shadows
              camera={{ fov: 42, near: 0.05, far: 50, position: [0, 0, 4] }}
              gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
              style={CANVAS_STYLE}
              performance={{ min: 0.5 }}
              dpr={[1, 1.5]}
            >
              {snapshot && (
                <BodyScene
                  muscleMap={muscleMap}
                  layer={layer}
                  hoveredId={hoveredId}
                  selectedId={selectedId}
                  focusTarget={focusTarget}
                  bodyBounds={bodyBounds}
                  onHover={onHover}
                  onSelect={onSelect}
                  onBoundsReady={MODEL_URL ? setGltfBounds  : undefined}
                  onAnchorsReady={MODEL_URL ? setGltfAnchors : undefined}
                />
              )}
            </Canvas>
          </Suspense>

          <ControlsHint />
        </div>

        {/* Detail panel — always visible on desktop */}
        <div className="hidden lg:flex flex-[2] flex-col border-l border-[#EAE7DE] min-w-[280px] max-w-[420px] overflow-hidden">
          <DetailPanel
            snapshot={snapshot}
            layer={layer}
            onLayerChange={setLayer}
            selected={selected}
            onDeselect={onDeselect}
          />
        </div>
      </div>

      {/* Mobile: layer switcher pills (when no muscle selected) */}
      {!selectedId && (
        <div className="lg:hidden flex-shrink-0 border-t border-[#EAE7DE] bg-white px-4 py-2.5 flex gap-2 overflow-x-auto scrollbar-none">
          {LAYER_META.map(m => (
            <button
              key={m.id}
              onClick={() => setLayer(m.id)}
              className={`flex-shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
                layer === m.id
                  ? "bg-[#534AB7] border-[#534AB7] text-white"
                  : "border-[#EAE7DE] text-[#6B6860] hover:bg-[#F5F3EE]"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {/* Mobile: detail panel as bottom sheet */}
      <BottomSheet isOpen={!!selectedId} onDismiss={onDeselect}>
        <DetailPanel
          snapshot={snapshot}
          layer={layer}
          onLayerChange={setLayer}
          selected={selected}
          onDeselect={onDeselect}
        />
      </BottomSheet>
    </div>
  );
}
