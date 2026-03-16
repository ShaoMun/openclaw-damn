"use client";

import { useRef, useMemo } from "react";
import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useStore, selectRelays, selectSOS, type RelayPath } from "@/lib/store";
import { dronePositions } from "./Drones";

function PersistentConnectionLine({ fromId, toId }: { fromId: string; toId: string }) {
  const lineRef = useRef<any>(null);
  const activeMessagePaths = useStore((s) => s.activeMessagePaths);

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

  const isActive = useMemo(() => {
    const pairId = [fromId, toId].sort().join('-');
    return activeMessagePaths.has(pairId);
  }, [activeMessagePaths, fromId, toId]);

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
        
        if (isActive) {
          // Active shimmer
          const shimmer = Math.sin(state.clock.elapsedTime * 15.0) * 0.5 + 0.5;
          material.opacity = 0.8 + shimmer * 0.2;
          material.color.setHex(0x00ffff);
          
          // Note: MeshLineMaterial uses uniform properties
          if (material.uniforms) {
            if (material.uniforms.opacity) material.uniforms.opacity.value = 0.8 + shimmer * 0.2;
            if (material.uniforms.color) material.uniforms.color.value.setHex(0x00ffff);
            if (material.uniforms.lineWidth) material.uniforms.lineWidth.value = 2.5;
          }
        } else {
          // Dim persistent connection
          material.color.setHex(0xaaaaaa);
          const pulse = Math.sin(state.clock.elapsedTime * 2.0) * 0.1 + 0.3;
          material.opacity = pulse;
          
          // Note: MeshLineMaterial uses uniform properties
          if (material.uniforms) {
            if (material.uniforms.opacity) material.uniforms.opacity.value = pulse;
            if (material.uniforms.color) material.uniforms.color.value.setHex(0xaaaaaa);
            if (material.uniforms.lineWidth) material.uniforms.lineWidth.value = 1.0;
          }
        }
      }
    }
  });

  return (
    <group>
      <Line
        ref={lineRef}
        points={initialPoints}
        color="#aaaaaa"
        lineWidth={isActive ? 2.5 : 1.0}
        transparent
        dashed={true}
        dashSize={2}
        gapSize={1}
      />
    </group>
  );
}

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

      if (lineRef.current.material) {
        const material = lineRef.current.material;
        const pulse = Math.sin(state.clock.elapsedTime * 10.0) * 0.2 + 0.8;
        material.opacity = pulse;
        material.color.setHex(0x0088ff);
        
        if (material.uniforms) {
          if (material.uniforms.opacity) material.uniforms.opacity.value = pulse;
          if (material.uniforms.color) material.uniforms.color.value.setHex(0x0088ff);
        }
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
        
        // Active shimmer
        const shimmer = Math.sin(state.clock.elapsedTime * 15.0) * 0.5 + 0.5;
        material.opacity = 0.8 + shimmer * 0.2;
        material.color.setHex(0x00ffff);
        
        if (material.uniforms) {
          if (material.uniforms.opacity) material.uniforms.opacity.value = 0.8 + shimmer * 0.2;
          if (material.uniforms.color) material.uniforms.color.value.setHex(0x00ffff);
        }
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

function DynamicRelayConnection({ index }: { index: number }) {
  const lineRef = useRef<any>(null);

  useFrame((state) => {
    if (!lineRef.current) return;

    const store = useStore.getState();
    const relayDrones = store.drones.filter(d => d.role === 'relay' && d.status === 'online');
    const otherDrones = store.drones.filter(d => d.role !== 'relay' && d.status === 'online');

    // Collect all valid pairs
    const pairs: { r: THREE.Vector3, o: THREE.Vector3 }[] = [];
    relayDrones.forEach(relay => {
      const rPos = dronePositions.get(relay.id);
      if (!rPos) return;
      otherDrones.forEach(other => {
        const oPos = dronePositions.get(other.id);
        if (!oPos) return;
        if (rPos.distanceTo(oPos) < 55) {
          pairs.push({ r: rPos, o: oPos });
        }
      });
    });

    // Add relay-to-relay connections too
    for (let i = 0; i < relayDrones.length; i++) {
       for (let j = i + 1; j < relayDrones.length; j++) {
         const r1Pos = dronePositions.get(relayDrones[i].id);
         const r2Pos = dronePositions.get(relayDrones[j].id);
         if (r1Pos && r2Pos && r1Pos.distanceTo(r2Pos) < 70) { // Relays have slightly longer range to each other
            pairs.push({ r: r1Pos, o: r2Pos });
         }
       }
    }

    if (index < pairs.length) {
      const pair = pairs[index];
      const flatPoints = [pair.r.x, pair.r.y, pair.r.z, pair.o.x, pair.o.y, pair.o.z];
      
      // Force geometry update
      if (lineRef.current.geometry?.setPositions) {
        lineRef.current.geometry.setPositions(flatPoints);
      }
      
      if (lineRef.current.parent) {
         lineRef.current.parent.visible = true;
      }
      
      if (lineRef.current.material) {
        const material = lineRef.current.material;
        
        // Beautiful sweeping pulse effect
        // Use the distance to make shorter connections brighter and longer connections dimmer
        const dist = pair.r.distanceTo(pair.o);
        const distanceFade = Math.max(0, 1.0 - (dist / 55.0)); 
        
        // Time-based wave traveling down the line
        const wave = Math.sin(state.clock.elapsedTime * 3.0 - (pair.r.x * 0.1)) * 0.5 + 0.5;
        
        // Final opacity calculation
        const opacity = (0.15 + wave * 0.3) * distanceFade;
        
        material.opacity = opacity;
        material.color.setHex(0x00aaff); // Vibrant cyan/blue
        
        if (material.uniforms) {
          if (material.uniforms.opacity) material.uniforms.opacity.value = opacity;
          if (material.uniforms.color) material.uniforms.color.value.setHex(0x00aaff);
        }
      }
    } else {
      if (lineRef.current.parent) {
         lineRef.current.parent.visible = false;
      }
    }
  });

  return (
    <group visible={false}>
      <Line
        ref={lineRef}
        points={[new THREE.Vector3(0,0,0), new THREE.Vector3(0,1,0)]}
        color="#00aaff"
        lineWidth={1.5}
        transparent
        dashed={true}
        dashSize={3}
        dashScale={2}
        gapSize={1.5}
      />
    </group>
  );
}

function DynamicRelayConnections() {
  const maxConnections = 30; // Increased to handle relay-to-relay connections
  return (
    <group>
      {Array.from({ length: maxConnections }).map((_, i) => (
        <DynamicRelayConnection key={`dyn-relay-${i}`} index={i} />
      ))}
    </group>
  );
}

export function RelayPaths() {
  const paths = useStore(selectRelays);
  const sosSignals = useStore(selectSOS);
  const activeMessagePaths = useStore((s) => s.activeMessagePaths);
  const activePowerPaths = useStore((s) => s.activePowerPaths);
  const establishedConnections = useStore((s) => s.establishedConnections);
  const selectedSOSId = useStore((s) => s.selectedSOSId);
  const visible = useStore((s) => s.showRelayPaths);

  if (!visible) return null;

  // Debug logging
  if (activeMessagePaths.size > 0 || establishedConnections.size > 0) {
    console.log("RelayPaths State:", {
      activeMessages: Array.from(activeMessagePaths),
      connections: Array.from(establishedConnections)
    });
  }

  return (
    <group>
      {/* Render dynamic relay connections (router lines) */}
      <DynamicRelayConnections />

      {/* Render persistent connection lines (P2P and Group chats) */}
      {Array.from(establishedConnections).map((pathId) => {
        const [fromId, toId] = pathId.split('-');
        return <PersistentConnectionLine key={`conn-${pathId}`} fromId={fromId} toId={toId} />;
      })}

      {/* Render active message lines that are NOT part of persistent connections */}
      {Array.from(activeMessagePaths).map((pathId) => {
        // If it's already rendered as a persistent connection, we don't render an extra line,
        // we just let the PersistentConnectionLine change its own shader state to active!
        if (establishedConnections.has(pathId)) return null;
        
        const [fromId, toId] = pathId.split('-');
        return <ActiveMessageLine key={`msg-${pathId}`} fromId={fromId} toId={toId} />;
      })}

      {/* Render power paths that are actively charging (solid blue line) */}
      {Array.from(activePowerPaths).map((pathId) => {
        const [fromId, toId] = pathId.split('-');
        return <PowerLine key={`pwr-${pathId}`} fromId={fromId} toId={toId} />;
      })}
    </group>
  );
}
