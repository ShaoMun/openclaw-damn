import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useStore, selectGrid, type CellState } from '@/lib/store';

// ─── Constants ───────────────────────────────────────────────────────────────

const STATE_COLOR: Record<CellState, THREE.Color> = {
  connected: new THREE.Color('#ffffff'),
  dead:      new THREE.Color('#333333'),
  covered:   new THREE.Color('#cccccc'),
  sos:       new THREE.Color('#ffffff'),
};

const TILE_SIZE = 9.2;  // distinct gaps
const TILE_HEIGHT = 0.2;

// ─── Component ───────────────────────────────────────────────────────────────

export function GridOverlay() {
  const gridCells = useStore(selectGrid);
  const showGrid = useStore((s) => s.showGridOverlay);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const timeRef = useRef(0);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const { count, baseColors } = useMemo(() => {
    const colors: THREE.Color[] = [];
    const fadeStart = 50;
    const fadeEnd = 95;

    gridCells.forEach((cell) => {
      const dist = Math.sqrt(cell.x * cell.x + cell.y * cell.y);
      let fade = 1.0 - Math.max(0, Math.min(1, (dist - fadeStart) / (fadeEnd - fadeStart)));
      // Square the fade for a smoother, steeper drop-off
      fade = fade * fade;

      const base = STATE_COLOR[cell.state].clone();
      base.multiplyScalar(fade);
      colors.push(base);
    });
    return { count: gridCells.length, baseColors: colors };
  }, [gridCells]);

  // Build instancedMesh matrices
  useMemo(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();

    gridCells.forEach((cell, i) => {
      dummy.position.set(cell.x, -4.8, cell.y);
      dummy.scale.set(TILE_SIZE, TILE_HEIGHT, TILE_SIZE);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, baseColors[i]);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [gridCells, baseColors]);

  // Gentle pulse for specific states
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    timeRef.current += delta;

    const pulse = 0.5 + Math.sin(timeRef.current * 4) * 0.5;
    const tmpColor = new THREE.Color();

    gridCells.forEach((cell, i) => {
      if (cell.state === 'sos' || cell.state === 'dead' || i === hoveredIdx) {
        let factor = 1.0;
        if (cell.state === 'sos') factor = 1.0 + pulse;
        else if (cell.state === 'dead') factor = 0.6 + pulse * 0.4;
        
        // Boost color if hovered
        if (i === hoveredIdx) factor *= 1.5;

        tmpColor.copy(baseColors[i]).multiplyScalar(factor);
        meshRef.current!.setColorAt(i, tmpColor);
      } else {
        meshRef.current!.setColorAt(i, baseColors[i]);
      }
    });

    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  if (!showGrid) return null;

  const hoveredCell = hoveredIdx !== null ? gridCells[hoveredIdx] : null;

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, count]}
        onPointerMove={(e) => {
          e.stopPropagation();
          setHoveredIdx(e.instanceId ?? null);
        }}
        onPointerOut={() => setHoveredIdx(null)}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial 
          transparent 
          opacity={0.15} 
          emissiveIntensity={2}
          metalness={0.8}
          roughness={0.2}
        />
      </instancedMesh>

      {hoveredCell && (
        <Html 
          position={[hoveredCell.x, -2, hoveredCell.y]} 
          center 
          distanceFactor={15}
          pointerEvents="none"
        >
          <div className="flex flex-col items-center gap-1 transition-all duration-300 transform scale-125">
            <div className="bg-black/60 backdrop-blur-md border border-white/20 px-2 py-1 rounded-sm shadow-2xl">
              <div className="text-[7px] font-mono text-white/40 uppercase tracking-widest leading-none mb-0.5">Sector Info</div>
              <div className="text-[10px] font-mono font-bold text-white whitespace-nowrap">
                LOC_{hoveredCell.x.toFixed(0)}_{hoveredCell.y.toFixed(0)} | {hoveredCell.state.toUpperCase()}
              </div>
            </div>
            <div className="w-[1px] h-4 bg-gradient-to-b from-white/40 to-transparent" />
          </div>
        </Html>
      )}
    </group>
  );
}
