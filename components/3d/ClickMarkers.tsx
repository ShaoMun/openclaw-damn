'use client';

import { useRef } from 'react';
import { useStore } from '@/lib/store';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function ClickMarkers() {
  const clickMarkers = useStore((s) => s.clickMarkers);

  return (
    <>
      {clickMarkers.map((marker) => {
        const color = marker.isHuman ? '#00ff00' : '#ff0000';
        return (
          <group key={marker.id} position={marker.position}>
            {/* Blinking dot (red for SOS/discovered, green for rescued) */}
            <mesh position={[0, 1, 0]}>
              <sphereGeometry args={[0.8, 16, 16]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.8}
              />
            </mesh>

            {/* Blinking effect */}
            <BlinkingRing position={[0, 1, 0]} color={color} />

            {/* Vertical beam */}
            <mesh position={[0, 5, 0]}>
              <cylinderGeometry args={[0.15, 0.15, 10]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.3}
              />
            </mesh>

            {/* Ground ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
              <ringGeometry args={[2, 2.5, 32]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.4}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

function BlinkingRing({ position, color }: { position: [number, number, number]; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      // Pulsing scale effect
      const scale = 1 + Math.sin(clock.getElapsedTime() * 3) * 0.2;
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={position}>
      <ringGeometry args={[1.2, 1.5, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
