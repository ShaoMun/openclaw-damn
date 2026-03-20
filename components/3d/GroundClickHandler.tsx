'use client';

import { ThreeEvent } from '@react-three/fiber';
import { useStore } from '@/lib/store';

function calculateDistance(pos1: [number, number, number], pos2: [number, number, number]): number {
  const dx = pos1[0] - pos2[0];
  const dz = pos1[2] - pos2[2];
  return Math.sqrt(dx * dx + dz * dz);
}

export function GroundClickHandler() {
  const addClickMarker = useStore((s) => s.addClickMarker);
  const addDroneLocalReasoning = useStore((s) => s.addDroneLocalReasoning);
  const drones = useStore((s) => s.drones);

  const handleClick = async (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();

    const point = event.point;
    const clickPosition: [number, number, number] = [point.x, 15, point.z];

    // Add RED SOS marker - the continuous detection system will handle triggering
    addClickMarker({
      position: clickPosition,
      isHuman: false,
      discovered: false,
      timestamp: Date.now(),
    });

    // Check if any scout is currently in range to give immediate feedback
    const scouts = drones.filter(d => d.role === 'scout' && d.status === 'online');
    if (scouts.length === 0) {
      console.error('No scout available');
      return;
    }

    // Find scout whose current scan area covers the clicked point
    let triggeredScout = null;
    let minDistance = Infinity;
    for (const scout of scouts) {
      const dist = calculateDistance(scout.position, clickPosition);
      if (dist <= 35) { // Scout scan radius
        triggeredScout = scout;
        break;
      }
      if (dist < minDistance) {
        minDistance = dist;
      }
    }

    if (triggeredScout) {
      // Scout is in range - will be triggered immediately by detection system
      addDroneLocalReasoning({
        droneId: triggeredScout.id,
        thought: `[ALERT] SOS signal detected in current scan sector - Initiating response`,
        action: "Target acquired",
        outcome: "success",
        duration: 1000,
      });
    } else {
      // No scout in range - find closest scout for status
      let closestScout = scouts[0];
      minDistance = Infinity;
      for (const scout of scouts) {
        const dist = calculateDistance(scout.position, clickPosition);
        if (dist < minDistance) {
          minDistance = dist;
          closestScout = scout;
        }
      }

      // Alert: closest scout but out of range - waiting for detection
      addDroneLocalReasoning({
        droneId: closestScout.id,
        thought: `[ALERT] SOS detected at distance ${minDistance.toFixed(0)}m - OUT OF SCAN RANGE. Awaiting detection...`,
        action: "Monitoring",
        outcome: "partial",
        duration: 2000,
      });
    }
  };

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} onClick={handleClick}>
      <planeGeometry args={[300, 300]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
}
