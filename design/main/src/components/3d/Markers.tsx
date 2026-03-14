import { Html } from '@react-three/drei';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

export interface MarkerData {
  position: [number, number, number];
  type: 'safe' | 'danger';
  delay: number;
}

function Marker({ position, type, delay }: MarkerData) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Bobbing animation along Z axis since the terrain is on XY plane
      groupRef.current.position.z = position[2] + Math.sin(state.clock.elapsedTime * 2 + delay) * 2.0;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <Html center>
        <div className="pointer-events-none flex flex-col items-center">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full border ${
            type === 'safe' 
              ? 'bg-white/10 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.4)]' 
              : 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_30px_rgba(255,0,0,0.8)]'
          } backdrop-blur-md`}>
            {type === 'safe' ? (
              <ShieldCheck className="w-4 h-4" />
            ) : (
              <ShieldAlert className="w-4 h-4 animate-pulse" />
            )}
          </div>
          {/* Vertical line down to terrain */}
          <div className={`w-[1px] h-16 mx-auto ${
            type === 'safe' ? 'bg-gradient-to-b from-white to-transparent' : 'bg-gradient-to-b from-red-500 to-transparent'
          }`} />
        </div>
      </Html>
    </group>
  );
}

export function Markers({ markers }: { markers: MarkerData[] }) {
  return (
    <>
      {markers.map((marker, i) => (
        <Marker key={i} {...marker} />
      ))}
    </>
  );
}
