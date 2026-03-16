'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { useStore, selectDrones, type Drone, type DroneRole } from '@/lib/store';

// ─── Global drone position tracker for chat bubbles ─────────────────────────────

export const dronePositions = new Map<string, THREE.Vector3>();

function updateDronePosition(droneId: string, position: THREE.Vector3) {
  dronePositions.set(droneId, position.clone());
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MOVEMENT_SPEED = 0.3;
const TARGET_TOLERANCE = 0.5;

const ROLE_LABEL: Record<DroneRole, string> = {
  relay:  'Relay',
  wifi:   'WiFi',
  supply: 'Cargo',
  scout:  'Scout',
  charger: 'Power',
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
  const hoverGroupRef = useRef<THREE.Group>(null);
  const selectDrone = useStore((s) => s.selectDrone);
  const setSwitchDialogDroneId = useStore((s) => s.setSwitchDialogDroneId);
  const updateDrone = useStore((s) => s.updateDrone);
  const selectedDroneId = useStore((s) => s.selectedDroneId);
  const isSelected = useStore((s) => s.selectedDroneId === drone.id);
  const [hovered, setHovered] = useState(false);
  
  const localPositionRef = useRef<THREE.Vector3>(
    new THREE.Vector3(...drone.position)
  );

  // Sync local position ref with store position (from simulation hover effects)
  useEffect(() => {
    localPositionRef.current.set(...drone.position);
  }, [drone.position]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const offset = parseInt(drone.id.replace(/\D/g, ''), 10) || 0;
    
    // Interpolate towards target position if set
    if (drone.targetPosition) {
      const target = new THREE.Vector3(...drone.targetPosition);
      const current = localPositionRef.current;
      const direction = new THREE.Vector3().subVectors(target, current);
      const distance = direction.length();
      
      if (distance > TARGET_TOLERANCE) {
        direction.normalize().multiplyScalar(MOVEMENT_SPEED);
        current.add(direction);
        groupRef.current.position.copy(current);
      } else {
        localPositionRef.current.copy(target);
        groupRef.current.position.copy(target);
        
        // Update store with new position and clear target
        updateDrone(drone.id, {
          position: [target.x, target.y, target.z],
          targetPosition: undefined,
        });
      }
    } else {
      groupRef.current.position.copy(localPositionRef.current);
    }
    
    // Update global position tracker for chat bubbles
    const worldPosition = new THREE.Vector3();
    groupRef.current.getWorldPosition(worldPosition);
    updateDronePosition(drone.id, worldPosition);
    
    // Fast Patrol logic for Relay Drones
    let isRelayPatrol = false;
    
    if (!isRelayPatrol) {
      // Interpolate towards target position if set
      if (drone.targetPosition) {
        const target = new THREE.Vector3(...drone.targetPosition);
        const current = localPositionRef.current;
        const direction = new THREE.Vector3().subVectors(target, current);
        const distance = direction.length();
        
        if (distance > TARGET_TOLERANCE) {
          direction.normalize().multiplyScalar(MOVEMENT_SPEED);
          current.add(direction);
          groupRef.current.position.copy(current);
        } else {
          localPositionRef.current.copy(target);
          groupRef.current.position.copy(target);
          
          // Update store with new position and clear target
          updateDrone(drone.id, {
            position: [target.x, target.y, target.z],
            targetPosition: undefined,
          });
        }
      } else {
        groupRef.current.position.copy(localPositionRef.current);
      }
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    
    if (selectedDroneId === null) {
      selectDrone(drone.id);
    } else if (selectedDroneId === drone.id) {
      selectDrone(null);
    } else {
      setSwitchDialogDroneId(drone.id);
    }
  };

  return (
    <group
      ref={groupRef}
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
      <group ref={hoverGroupRef}>
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
        <Html center position={[0, 6, 0]} zIndexRange={[0, 0]}>
          <div
            className="pointer-events-none flex items-center gap-2 whitespace-nowrap px-2.5 py-1 rounded-sm font-mono border shadow-xl transition-all duration-300"
            style={{
              borderColor: 'rgba(255, 255, 255, 0.1)',
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              color: '#ffffff',
              opacity: isSelected || hovered ? 1 : 0.6,
              transform: isSelected || hovered ? 'scale(1.15)' : 'scale(1)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[drone.status]}`} />
                <span className="text-[10px] opacity-90 uppercase tracking-wider font-bold">{ROLE_LABEL[drone.role]}</span>
              </div>
            </div>
          </div>
        </Html>
      </group>
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
