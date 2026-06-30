"use client";

/**
 * SceneLighting
 *
 * Lighting setup for the body viewer.
 * Ambient + hemisphere + directional key light + contact shadow.
 * Separated so Phase 59 can tune it independently of the body renderer.
 */

import { ContactShadows } from "@react-three/drei";

export function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.38} color="#F8F3EC" />
      {/* Sky/ground — purple-tinted sky, warm earth ground */}
      <hemisphereLight args={["#C5BCEC", "#4A3A20", 0.52]} />
      {/* Key light — top right front, casts shadows */}
      <directionalLight
        position={[3.5, 7, 5]}
        intensity={1.55}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={28}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={5}
        shadow-camera-bottom={-3}
        shadow-bias={-0.0008}
      />
      {/* Rim light — back left, cool purple separates figure from bg */}
      <directionalLight position={[-3.5, 3.5, -3]} intensity={0.30} color="#D0CCFF" />
      {/* Subtle upward bounce */}
      <directionalLight position={[0, -2, 4]} intensity={0.10} color="#FFF8F0" />
      {/* Soft contact shadow at foot level */}
      <ContactShadows
        position={[0, -1.16, 0]}
        opacity={0.22}
        scale={3.2}
        blur={3.8}
        far={2}
        color="#1C1810"
      />
    </>
  );
}
