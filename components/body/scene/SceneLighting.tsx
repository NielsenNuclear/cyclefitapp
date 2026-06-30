"use client";

import { ContactShadows } from "@react-three/drei";

// Foot level of the procedural body — shadow sits here
const FLOOR_Y = -1.16;

export function SceneLighting() {
  return (
    <>
      {/* Warm fill */}
      <ambientLight intensity={0.38} color="#F8F3EC" />

      {/* Sky/ground hemisphere — purple-tinted sky, warm ground */}
      <hemisphereLight args={["#C5BCEC", "#4A3A20", 0.52]} />

      {/* Primary key light — top-right-front, casts shadows */}
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

      {/* Rim light — back left, separates figure from background */}
      <directionalLight position={[-3.5, 3.5, -3]} intensity={0.30} color="#D0CCFF" />

      {/* Subtle upward bounce */}
      <directionalLight position={[0, -2, 4]} intensity={0.10} color="#FFF8F0" />

      {/* Soft contact shadow underneath the figure */}
      <ContactShadows
        position={[0, FLOOR_Y, 0]}
        opacity={0.22}
        scale={3.2}
        blur={3.8}
        far={2}
        color="#1C1810"
      />
    </>
  );
}
