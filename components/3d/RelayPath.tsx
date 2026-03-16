"use client";

import { useRef, useMemo } from "react";
import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useStore, selectRelays, selectSOS, type RelayPath } from "@/lib/store";
import { dronePositions } from "./Drones";

// ─── Single relay path ───────────────────────────────────────────────────────

function RelayLine({
  path,
  isSelected,
  sosPosition,
}: {
  path: RelayPath;
  isSelected: boolean;
  sosPosition: [number, number, number] | null;
}) {
  const activeMessagePaths = useStore((s) => s.activeMessagePaths);
  const lineRef = useRef<any>(null);

  // Check if any segment of this path is actively passing a message
  const isActive = useMemo(() => {
    if (activeMessagePaths.size === 0) return false;
    
    for (let i = 0; i < path.droneIds.length - 1; i++) {
      const pairId = [path.droneIds[i], path.droneIds[i+1]].sort().join('-');
      if (activeMessagePaths.has(pairId)) return true;
    }
    
    return false;
  }, [activeMessagePaths, path.droneIds]);

  // Initial points for the Line component to prevent crashing before useFrame kicks in
  const initialPoints = useMemo(() => {
    const store = useStore.getState();
    const points: THREE.Vector3[] = [];
    if (sosPosition) points.push(new THREE.Vector3(...sosPosition));
    for (const droneId of path.droneIds) {
      const drone = store.drones.find(d => d.id === droneId);
      if (drone) points.push(new THREE.Vector3(...drone.position));
    }
    return points.length > 0 ? points : [new THREE.Vector3(0,0,0), new THREE.Vector3(0,1,0)];
  }, [path.droneIds, sosPosition]);

  useFrame((state) => {
    if (lineRef.current) {
      // 1. Update points dynamically to track exact drone visual positions
      const flatPoints: number[] = [];
      if (sosPosition) {
        flatPoints.push(sosPosition[0], sosPosition[1], sosPosition[2]);
      }
      
      const store = useStore.getState();
      for (const droneId of path.droneIds) {
        const dPos = dronePositions.get(droneId);
        if (dPos) {
          flatPoints.push(dPos.x, dPos.y, dPos.z);
        } else {
          // Fallback
          const drone = store.drones.find(d => d.id === droneId);
          if (drone) {
            flatPoints.push(drone.position[0], drone.position[1], drone.position[2]);
          }
        }
      }
      
      if (flatPoints.length >= 6) { // Need at least 2 points (x,y,z each)
        if (lineRef.current.geometry?.setPositions) {
          lineRef.current.geometry.setPositions(flatPoints);
        }
      }

      // 2. Update material color and opacity
      if (lineRef.current.material) {
        const material = lineRef.current.material;
        const baseOpacity = isSelected ? 0.9 : (isActive ? 0.8 : 0.4);
        
        if (isActive) {
          // Shimmer effect
          const shimmer = Math.sin(state.clock.elapsedTime * 15.0) * 0.5 + 0.5;
          material.opacity = baseOpacity + shimmer * 0.2;
          material.color.setHex(0x00ffff); // Cyan/blue glow when active
        } else {
          material.opacity = baseOpacity;
          material.color.setHex(isSelected ? 0xff3333 : 0xffffff);
        }
      }
    }
  });

  const lineWidth = isSelected ? 2.5 : (isActive ? 3.0 : 1.5);

  return (
    <group>
      <Line
        ref={lineRef}
        points={initialPoints}
        color={isSelected ? "#ff3333" : "#ffffff"}
        lineWidth={lineWidth}
        transparent
        dashed={true}
        dashSize={2}
        gapSize={1}
      />
    </group>
  );
}

function PowerLine({ fromId, toId }: { fromId: string; toId: string }) {
  const lineRef = useRef<any>(null);

  const initialPoints = useMemo(() => {
    const store = useStore.getState();
    const fromDrone = store.drones.find((d) => d.id === fromId);
    const toDrone = store.drones.find((d) => d.id === toId);
    if (fromDrone && toDrone) {
      return [
        new THREE.Vector3(...fromDrone.position),
        new THREE.Vector3(...toDrone.position),
      ];
    }
    return [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0)];
  }, [fromId, toId]);

  useFrame((state) => {
    if (lineRef.current) {
      const dPosFrom = dronePositions.get(fromId);
      const dPosTo = dronePositions.get(toId);
      const flatPoints: number[] = [];

      if (dPosFrom && dPosTo) {
        flatPoints.push(dPosFrom.x, dPosFrom.y, dPosFrom.z);
        flatPoints.push(dPosTo.x, dPosTo.y, dPosTo.z);
      } else {
        const store = useStore.getState();
        const fromDrone = store.drones.find((d) => d.id === fromId);
        const toDrone = store.drones.find((d) => d.id === toId);
        if (fromDrone && toDrone) {
          flatPoints.push(...fromDrone.position);
          flatPoints.push(...toDrone.position);
        }
      }

      if (flatPoints.length === 6 && lineRef.current.geometry?.setPositions) {
        lineRef.current.geometry.setPositions(flatPoints);
      }

      // Solid blue animated line
      if (lineRef.current.material) {
        const material = lineRef.current.material;
        const pulse = Math.sin(state.clock.elapsedTime * 10.0) * 0.2 + 0.8; // subtle pulse
        material.opacity = pulse;
        material.color.setHex(0x0088ff);
      }
    }
  });

  return (
    <group>
      <Line
        ref={lineRef}
        points={initialPoints}
        color="#0088ff"
        lineWidth={3.0}
        transparent
      />
    </group>
  );
}

function ActiveMessageLine({ fromId, toId }: { fromId: string; toId: string }) {
  const lineRef = useRef<any>(null);

  const initialPoints = useMemo(() => {
    const store = useStore.getState();
    const fromDrone = store.drones.find((d) => d.id === fromId);
    const toDrone = store.drones.find((d) => d.id === toId);
    if (fromDrone && toDrone) {
      return [
        new THREE.Vector3(...fromDrone.position),
        new THREE.Vector3(...toDrone.position),
      ];
    }
    return [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0)];
  }, [fromId, toId]);

  useFrame((state) => {
    if (lineRef.current) {
      const dPosFrom = dronePositions.get(fromId);
      const dPosTo = dronePositions.get(toId);
      const flatPoints: number[] = [];

      if (dPosFrom && dPosTo) {
        flatPoints.push(dPosFrom.x, dPosFrom.y, dPosFrom.z);
        flatPoints.push(dPosTo.x, dPosTo.y, dPosTo.z);
      } else {
        const store = useStore.getState();
        const fromDrone = store.drones.find((d) => d.id === fromId);
        const toDrone = store.drones.find((d) => d.id === toId);
        if (fromDrone && toDrone) {
          flatPoints.push(...fromDrone.position);
          flatPoints.push(...toDrone.position);
        }
      }

      if (flatPoints.length === 6 && lineRef.current.geometry?.setPositions) {
        lineRef.current.geometry.setPositions(flatPoints);
      }

      if (lineRef.current.material) {
        const material = lineRef.current.material;
        const shimmer = Math.sin(state.clock.elapsedTime * 15.0) * 0.5 + 0.5;
        material.opacity = 0.8 + shimmer * 0.2;
        material.color.setHex(0x00ffff);
      }
    }
  });

  return (
    <group>
      <Line
        ref={lineRef}
        points={initialPoints}
        color="#00ffff"
        lineWidth={2.0}
        transparent
        dashed={true}
        dashSize={2}
        gapSize={1}
      />
    </group>
  );
}

export function RelayPaths() {
  const paths = useStore(selectRelays);
  const sosSignals = useStore(selectSOS);
  const activeMessagePaths = useStore((s) => s.activeMessagePaths);
  const activePowerPaths = useStore((s) => s.activePowerPaths);
  const selectedSOSId = useStore((s) => s.selectedSOSId);
  const visible = useStore((s) => s.showRelayPaths);

  if (!visible) return null;

  return (
    <group>
      {/* Only render paths that are actively transmitting messages (shimmering cyan/blue dashed line) */}
      {Array.from(activeMessagePaths).map((pathId) => {
        const [fromId, toId] = pathId.split('-');
        return <ActiveMessageLine key={`msg-${pathId}`} fromId={fromId} toId={toId} />;
      })}

      {/* Only render power paths that are actively charging (solid blue line) */}
      {Array.from(activePowerPaths).map((pathId) => {
        const [fromId, toId] = pathId.split('-');
        return <PowerLine key={`pwr-${pathId}`} fromId={fromId} toId={toId} />;
      })}
    </group>
  );
}
