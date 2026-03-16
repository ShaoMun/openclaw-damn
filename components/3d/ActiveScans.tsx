'use client';

import { useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStore } from '@/lib/store';
import { getWorldYFromTerrain } from '@/lib/terrain';

function ScanTargets({
  startTime,
  duration,
  targets,
  onComplete,
}: {
  startTime: number;
  duration: number;
  targets: { x: number; z: number; isHuman: boolean }[];
  onComplete: () => void;
}) {
  const [activeTargets, setActiveTargets] = useState<typeof targets>([]);

  useFrame(() => {
    const elapsed = Date.now() - startTime;
    if (elapsed > duration) {
      onComplete();
      return;
    }

    if (elapsed > 500 && activeTargets.length !== targets.length) {
      setActiveTargets(targets);
    }
  });

  return (
    <group>
      {/* Detected Targets mapped to terrain height */}
      {activeTargets.map((t, i) => {
        // Calculate the world Y coordinate exactly on the terrain
        const worldY = getWorldYFromTerrain(t.x, t.z);
        return (
          <group key={i} position={[t.x, worldY + 0.5, t.z]} rotation={[-Math.PI / 2, 0, 0]}>
            {/* Target core */}
            <mesh>
              <circleGeometry args={[1.5, 16]} />
              <meshBasicMaterial 
                color={t.isHuman ? "#ff0000" : "#ffaa00"} 
                transparent 
                opacity={0.9} 
                depthTest={false}
              />
            </mesh>
            {/* Target pulse ring */}
            <mesh>
              <ringGeometry args={[1.8, 2.2, 32]} />
              <meshBasicMaterial 
                color={t.isHuman ? "#ff3333" : "#ffff00"} 
                transparent 
                opacity={0.6}
                depthTest={false}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function ActiveScans() {
  const activeScans = useStore((s) => s.activeScans);
  const removeActiveScan = useStore((s) => s.removeActiveScan);

  if (!activeScans || activeScans.length === 0) return null;

  return (
    <group>
      {activeScans.map((scan) => (
        <ScanTargets
          key={scan.id}
          startTime={scan.startTime}
          duration={scan.duration}
          targets={scan.targets}
          onComplete={() => removeActiveScan(scan.id)}
        />
      ))}
    </group>
  );
}
