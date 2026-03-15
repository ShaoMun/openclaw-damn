'use client';

import { useRef, useMemo, useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { useStore, selectDrones, type Drone, type DroneRole } from '@/lib/store';

// ─── Constants ───────────────────────────────────────────────────────────────

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

// ─── Drone Model (OBJ + MTL) ────────────────────────────────────────────────

const TARGET_SIZE = 5;

function DroneModel({ status }: { role: DroneRole; status: string }) {
  // Load MTL first, then OBJ with materials applied
  const materials = useLoader(MTLLoader, '/Drone.mtl');
  const obj = useLoader(OBJLoader, '/Drone.obj', (loader) => {
    materials.preload();
    loader.setMaterials(materials);
  });

  const element = useMemo(() => {
    if (!obj) return null;
    const root = obj.clone(true);
    const color = new THREE.Color('#ffffff');

    // Override materials for stylistic consistency
    root.traverse((child: any) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 2.0,
          metalness: 1,
          roughness: 0,
        });
      }
    });

    // Auto-scale to fit within TARGET_SIZE
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    const scaleFactor = TARGET_SIZE / maxDim;

    const center = new THREE.Vector3();
    box.getCenter(center);

    return (
      <group>
        <primitive
          object={root}
          scale={[scaleFactor, scaleFactor, scaleFactor]}
          position={[
            -center.x * scaleFactor,
            -center.y * scaleFactor,
            -center.z * scaleFactor,
          ]}
        />
      </group>
    );
  }, [obj, status]);

  return element;
}



// ─── Single drone ────────────────────────────────────────────────────────────

function DroneUnit({ drone }: { drone: Drone }) {
  const groupRef = useRef<THREE.Group>(null);
  const selectDrone = useStore((s) => s.selectDrone);
  const isSelected = useStore((s) => s.selectedDroneId === drone.id);
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
