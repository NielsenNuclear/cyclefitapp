"use client";

/**
 * CameraController
 *
 * Owns all camera behaviour:
 *   – Orbit, zoom, pan (via OrbitControls)
 *   – Auto-fit to model bounding box on first frame
 *   – Smooth focus transitions when a muscle is selected
 *   – Reset to full-body view on deselect
 *   – Double-click resets to default position
 *
 * Accepts a generic `bodyBounds: THREE.Box3` so it works with any renderer
 * (placeholder or GLTF). No knowledge of muscles or interaction state.
 */

import { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { OrbitControls }     from "@react-three/drei";
import * as THREE            from "three";

// Smooth cubic ease
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export interface CameraControllerProps {
  /** Body bounding box — used to auto-fit and compute reset position */
  bodyBounds:   THREE.Box3;
  /**
   * World-space point to focus on when a muscle is selected.
   * Set to null to reset to full-body view.
   */
  focusTarget:  THREE.Vector3 | null;
  /**
   * Visual radius of the focus region — controls how close the camera zooms.
   * Defaults to 0.28 units (approximately a single major muscle group).
   */
  focusRadius?: number;
}

interface Transition {
  active:      boolean;
  t:           number;           // 0 → 1 progress
  startPos:    THREE.Vector3;
  endPos:      THREE.Vector3;
  startTarget: THREE.Vector3;
  endTarget:   THREE.Vector3;
}

export function CameraController({
  bodyBounds,
  focusTarget,
  focusRadius = 0.28,
}: CameraControllerProps) {
  const { camera, size, gl } = useThree();
  const controlsRef          = useRef<any>(null);
  const initialized          = useRef(false);

  const trans = useRef<Transition>({
    active:      false,
    t:           0,
    startPos:    new THREE.Vector3(),
    endPos:      new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endTarget:   new THREE.Vector3(),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────

  function getBodySphere(): THREE.Sphere {
    const s = new THREE.Sphere();
    bodyBounds.getBoundingSphere(s);
    return s;
  }

  function computeOrbitDistance(sphere: THREE.Sphere, fillFraction = 0.78): number {
    const pc     = camera as THREE.PerspectiveCamera;
    const fov    = (pc.fov * Math.PI) / 180;
    const aspect = size.width / size.height;
    const dH     = sphere.radius / (fillFraction * Math.tan(fov / 2));
    const dW     = sphere.radius / (fillFraction * Math.tan(fov / 2) * aspect);
    return Math.max(dH, dW) * 1.06;
  }

  function startTransition(endPos: THREE.Vector3, endTarget: THREE.Vector3) {
    if (!controlsRef.current) return;
    const t = trans.current;
    t.startPos.copy(camera.position);
    t.startTarget.copy(controlsRef.current.target);
    t.endPos.copy(endPos);
    t.endTarget.copy(endTarget);
    t.t = 0;
    t.active = true;
    controlsRef.current.enabled = false;
  }

  // ── One-time init (fires on first frame when controls are mounted) ─────────

  useFrame(() => {
    if (initialized.current || !controlsRef.current) return;
    initialized.current = true;

    const sphere = getBodySphere();
    const center = sphere.center;
    const dist   = computeOrbitDistance(sphere);

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

    trans.current.startPos.copy(camera.position);
    trans.current.startTarget.copy(center);
  });

  // ── React to focusTarget changes ──────────────────────────────────────────

  useEffect(() => {
    if (!initialized.current || !controlsRef.current) return;

    if (focusTarget) {
      // Zoom into the selected muscle patch
      const pc    = camera as THREE.PerspectiveCamera;
      const fov   = (pc.fov * Math.PI) / 180;
      const zDist = (focusRadius / Math.tan(fov / 2)) * 1.6;
      const isBack = focusTarget.z < -0.05;

      const endPos = new THREE.Vector3(
        focusTarget.x * 0.30,
        focusTarget.y,
        isBack ? focusTarget.z - zDist : focusTarget.z + zDist,
      );
      startTransition(endPos, focusTarget.clone());
    } else {
      // Return to full-body view, preserving current horizontal angle
      const sphere = getBodySphere();
      const center = sphere.center;
      const dist   = computeOrbitDistance(sphere);

      const curDir = camera.position.clone().sub(controlsRef.current.target);
      curDir.y = 0;
      const horiz = curDir.length() > 0.001 ? curDir.normalize() : new THREE.Vector3(0, 0, 1);

      const endPos = new THREE.Vector3(
        center.x + horiz.x * dist,
        center.y,
        center.z + horiz.z * dist,
      );
      startTransition(endPos, center.clone());
    }
  }, [focusTarget]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Per-frame transition animation ───────────────────────────────────────

  useFrame((_, dt) => {
    const t = trans.current;
    if (!t.active || !controlsRef.current) return;

    t.t = Math.min(1, t.t + dt * 2.2);
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

  // ── Double-click to reset ─────────────────────────────────────────────────

  useEffect(() => {
    const canvas = gl.domElement;
    function onDblClick() {
      if (!controlsRef.current || !initialized.current) return;
      const sphere = getBodySphere();
      const center = sphere.center;
      const dist   = computeOrbitDistance(sphere);
      const endPos = new THREE.Vector3(center.x, center.y, center.z + dist);
      startTransition(endPos, center.clone());
    }
    canvas.addEventListener("dblclick", onDblClick);
    return () => canvas.removeEventListener("dblclick", onDblClick);
  }, [gl]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.055}
      enablePan={false}
      // Prevent upside-down flipping
      minPolarAngle={Math.PI * 0.06}
      maxPolarAngle={Math.PI * 0.90}
    />
  );
}
