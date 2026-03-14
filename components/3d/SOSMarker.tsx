'use client';

import { useState, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore, selectSOS } from '@/lib/store';

// ─── Single SOS beacon ──────────────────────────────────────────────────────

function SOSBeacon({
  position,
  timestamp,
  strength,
  gridLabel,
}: {
  position: [number, number, number];
  timestamp: number;
  strength: number;
  gridLabel: string;
}) {
  const lineRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Subtle pulse for the vertical line
    if (lineRef.current) {
      (lineRef.current.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(t * 4) * 0.2;
    }
  });

  const elapsed = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <group 
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'default';
      }}
    >
      {/* Hitarea for interaction */}
      <mesh visible={false}>
        <sphereGeometry args={[12, 16, 16]} />
      </mesh>

      {/* Simple Vertical Line (Red Pulsing) */}
      <mesh ref={lineRef} position={[0, 25, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 50, 8]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={0.6} />
      </mesh>

      {/* Ground Point */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <circleGeometry args={[2.5, 32]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={0.8} />
      </mesh>

      {/* Vivid RED SOS Label */}
      <Html center position={[0, 60, 0]} distanceFactor={40} zIndexRange={[0, 0]}>
        <div className="pointer-events-none flex flex-col items-center gap-0 transition-all duration-500"
          style={{
            transform: hovered ? 'scale(1.5)' : 'scale(1)',
          }}
        >
          {/* Main SOS Text (No background) */}
          <div className="flex flex-col items-center">
            <span 
              className="text-[#ff0000] text-7xl font-black tracking-widest leading-none drop-shadow-[0_0_25px_rgba(255,0,0,0.9)] animate-pulse"
              style={{
                WebkitTextStroke: '1px rgba(255, 0, 0, 0.5)'
              }}
            >
              SOS
            </span>
            
            {/* Sector Details (Subtle) */}
            <div className="mt-4 px-3 py-1 bg-red-600/10 border border-red-500/30 backdrop-blur-sm">
              <div className="text-[12px] font-mono text-red-500 font-black tracking-widest uppercase">
                {gridLabel} | {mins}m {secs}s
              </div>
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
}

// ─── All SOS markers ─────────────────────────────────────────────────────────

export function SOSMarkers() {
  const sosSignals = useStore(selectSOS);

  return (
    <group>
      {sosSignals.map((sos) => (
        <SOSBeacon
          key={sos.id}
          position={sos.position}
          timestamp={sos.timestamp}
          strength={sos.strength}
          gridLabel={sos.gridLabel}
        />
      ))}
    </group>
  );
}
