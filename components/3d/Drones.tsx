'use client';

import { useRef, useMemo, useState } from 'react';
import { useFBX, Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore, selectDrones, type Drone, type DroneRole } from '@/lib/store';

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLE_COLOR: Record<DroneRole, string> = {
  relay:  '#ffffff',
  wifi:   '#ffffff',
  supply: '#ffffff',
};

const ROLE_LABEL: Record<DroneRole, string> = {
  relay:  'Relay',
  wifi:   'WiFi',
  supply: 'Cargo',
};

const STATUS_DOT: Record<string, string> = {
  online:  'bg-white',
  offline: 'bg-white/20',
  syncing: 'bg-white/50 animate-pulse',
};

// ─── Procedural Drone Fallback ───────────────────────────────────────────────

function DroneModel({ role, status }: { role: DroneRole; status: string }) {
  const [error, setError] = useState(false);
  let fbx: any = null;
  
  try {
    fbx = useFBX('/drone.fbx');
  } catch (e) {
    if (!error) setError(true);
  }

  const model = useMemo(() => {
    const color = new THREE.Color('#ffffff');
    
    if (error || !fbx) {
      const group = new THREE.Group();
      const core = new THREE.Mesh(
        new THREE.OctahedronGeometry(2, 0),
        new THREE.MeshStandardMaterial({ 
          color, 
          emissive: color, 
          emissiveIntensity: 0.8,
          metalness: 1,
          roughness: 0
        })
      );
      group.add(core);
      return <primitive object={group} />;
    }

    const cloned = fbx.clone(true);
    cloned.traverse((child: any) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: status === 'online' ? 2.0 : 0.2,
          metalness: 1,
          roughness: 0,
          transparent: true,
          opacity: status === 'offline' ? 0.3 : 1,
        });
      }
    });
    return <primitive object={cloned} scale={0.12} />;
  }, [fbx, error, role, status]);

  return model;
}

// ─── Single drone ────────────────────────────────────────────────────────────

function DroneUnit({ drone }: { drone: Drone }) {
  const groupRef = useRef<THREE.Group>(null);
  const selectDrone = useStore((s) => s.selectDrone);
  const isSelected = useStore((s) => s.selectedDroneId === drone.id);
  const showCoverageZones = useStore((s) => s.showCoverageZones);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const offset = parseInt(drone.id.replace(/\D/g, ''), 10) || 0;
    groupRef.current.position.y =
      drone.position[1] + Math.sin(clock.elapsedTime * 1.5 + offset) * 1.2;
    groupRef.current.rotation.y += 0.005;
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    selectDrone(isSelected ? null : drone.id);
  };

  return (
    <group
      ref={groupRef}
      position={drone.position}
      onClick={handleClick}
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
      <DroneModel role={drone.role} status={drone.status} />

      {/* Selection Glow */}
      {isSelected && (
        <group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
            <ringGeometry args={[5, 5.5, 64]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
          </mesh>
          <pointLight color="#ffffff" intensity={3} distance={20} />
        </group>
      )}

      {/* WiFi Field (Minimalist) */}
      {showCoverageZones && drone.role === 'wifi' && drone.status === 'online' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -drone.position[1] + 0.1, 0]}>
          <circleGeometry args={[22, 64]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.02} />
        </mesh>
      )}

      {/* Label (Black on White HUD feel) */}
      <Html center position={[0, 8, 0]} distanceFactor={20} zIndexRange={[0, 0]}>
        <div
          className="pointer-events-none flex items-center gap-2 whitespace-nowrap px-3 py-1 rounded-sm font-mono border backdrop-blur-md shadow-xl transition-all duration-300"
          style={{
            fontSize: 10,
            borderColor: 'rgba(255, 255, 255, 0.2)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            opacity: isSelected || hovered ? 1 : 0.5,
            transform: isSelected || hovered ? 'scale(1.3)' : 'scale(1)',
          }}
        >
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[drone.status]}`} />
              <span className="font-bold">{drone.id}</span>
              <span className="opacity-30">/</span>
              <span className="opacity-80 uppercase tracking-tighter">{ROLE_LABEL[drone.role]}</span>
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
}

// ─── All drones ──────────────────────────────────────────────────────────────

export function Drones() {
  const drones = useStore(selectDrones);

  return (
    <group>
      {drones.map((d) => (
        <DroneUnit key={d.id} drone={d} />
      ))}
    </group>
  );
}
