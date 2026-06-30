"use client";

import { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// Smooth cubic ease-in-out
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export interface SceneCameraProps {
  /** World-space bounding box of the entire body — used for auto-fit and reset zoom */
  bodyBounds:   THREE.Box3;
  /** When a muscle is selected, the viewport should focus on this point (null = full body) */
  focusTarget:  THREE.Vector3 | null;
  /** Approximate visual radius of the focused region, for zoom calculation */
  focusRadius?: number;
}

interface TransitionState {
  active:       boolean;
  t:            number;
  startPos:     THREE.Vector3;
  endPos:       THREE.Vector3;
  startTarget:  THREE.Vector3;
  endTarget:    THREE.Vector3;
}

export function SceneCamera({ bodyBounds, focusTarget, focusRadius = 0.30 }: SceneCameraProps) {
  const { camera, size } = useThree();
  const controlsRef = useRef<any>(null);
  const initialized = useRef(false);

  const trans = useRef<TransitionState>({
    active:      false,
    t:           0,
    startPos:    new THREE.Vector3(),
    endPos:      new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endTarget:   new THREE.Vector3(),
  });

  // ── Utility: compute distance that fits the body bounding sphere ────────────

  function fitDistance(sphere: THREE.Sphere, fillFraction = 0.76): number {
    const pc = camera as THREE.PerspectiveCamera;
    const fov    = (pc.fov * Math.PI) / 180;
    const aspect = size.width / size.height;
    // Height-limited: body fills fillFraction of viewport height
    const dH = sphere.radius / (fillFraction * Math.tan(fov / 2));
    // Width-limited (relevant on portrait/narrow viewports)
    const dW = sphere.radius / (fillFraction * Math.tan(fov / 2) * aspect);
    return Math.max(dH, dW) * 1.06;
  }

  function bodyCenter(): THREE.Vector3 {
    return bodyBounds.getCenter(new THREE.Vector3());
  }

  // ── One-time initialization — fires on the first frame once controls exist ──

  useFrame(() => {
    if (initialized.current || !controlsRef.current) return;
    initialized.current = true;

    const sphere = new THREE.Sphere();
    bodyBounds.getBoundingSphere(sphere);
    const center = sphere.center;
    const dist   = fitDistance(sphere);

    const pc = camera as THREE.PerspectiveCamera;
    camera.position.set(center.x, center.y, center.z + dist);
    pc.near = Math.max(0.04, dist * 0.004);
    pc.far  = dist * 22;
    pc.lookAt(center);
    pc.updateProjectionMatrix();

    controlsRef.current.target.copy(center);
    controlsRef.current.minDistance = dist * 0.22;
    controlsRef.current.maxDistance = dist * 3.2;
    controlsRef.current.update();

    // Sync transition state so a deselect immediately after init doesn't jitter
    trans.current.startPos.copy(camera.position);
    trans.current.startTarget.copy(center);
    trans.current.endPos.copy(camera.position);
    trans.current.endTarget.copy(center);
  });

  // ── Trigger a smooth transition whenever focusTarget changes ───────────────

  useEffect(() => {
    if (!initialized.current || !controlsRef.current) return;

    const t = trans.current;
    t.startPos.copy(camera.position);
    t.startTarget.copy(controlsRef.current.target);

    if (focusTarget) {
      // Zoom into the selected patch region
      const pc = camera as THREE.PerspectiveCamera;
      const fov   = (pc.fov * Math.PI) / 180;
      const zDist = (focusRadius / Math.tan(fov / 2)) * 1.55;
      const isBack = focusTarget.z < -0.05;
      t.endPos.set(
        focusTarget.x * 0.30,
        focusTarget.y,
        isBack ? focusTarget.z - zDist : focusTarget.z + zDist,
      );
      t.endTarget.copy(focusTarget);
    } else {
      // Reset to full-body view, preserving current horizontal angle
      const sphere = new THREE.Sphere();
      bodyBounds.getBoundingSphere(sphere);
      const center = sphere.center;
      const dist   = fitDistance(sphere);

      // Keep current azimuth — feel natural, not snapping to front
      const curDir = camera.position.clone().sub(controlsRef.current.target);
      curDir.y = 0;
      const horiz = curDir.length() > 0.001 ? curDir.normalize() : new THREE.Vector3(0, 0, 1);
      t.endPos.set(
        center.x + horiz.x * dist,
        center.y,
        center.z + horiz.z * dist,
      );
      t.endTarget.copy(center);
    }

    t.t = 0;
    t.active = true;
    controlsRef.current.enabled = false; // hand-animate during transition
  }, [focusTarget]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Per-frame transition animation ─────────────────────────────────────────

  useFrame((_, dt) => {
    const t = trans.current;
    if (!t.active || !controlsRef.current) return;

    t.t = Math.min(1, t.t + dt * 2.4);
    const alpha = easeInOutCubic(t.t);

    camera.position.lerpVectors(t.startPos, t.endPos, alpha);
    camera.lookAt(new THREE.Vector3().lerpVectors(t.startTarget, t.endTarget, alpha));

    if (t.t >= 1) {
      camera.position.copy(t.endPos);
      camera.lookAt(t.endTarget);
      controlsRef.current.target.copy(t.endTarget);
      controlsRef.current.enabled = true;
      controlsRef.current.update();
      t.active = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.055}
      enablePan={false}
      // Prevent flipping upside-down
      minPolarAngle={Math.PI * 0.06}
      maxPolarAngle={Math.PI * 0.90}
    />
  );
}
