'use client';

import { useStore } from '@/lib/store';
import { ThreeEvent } from '@react-three/fiber';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function calculateDistance(pos1: [number, number, number], pos2: [number, number, number]): number {
  const dx = pos1[0] - pos2[0];
  const dz = pos1[2] - pos2[2];
  return Math.sqrt(dx * dx + dz * dz);
}

export function SOSHandler({ onSOSClick }: { onSOSClick: (point: { x: number; y: number; z: number }) => void }) {
  const addClickMarker = useStore((s) => s.addClickMarker);
  const updateClickMarker = useStore((s) => s.updateClickMarker);
  const drones = useStore((s) => s.drones);
  const addDroneLocalReasoning = useStore((s) => s.addDroneLocalReasoning);
  const setActiveMessagePath = useStore((s) => s.setActiveMessagePath);
  const clearDroneLocalReasoning = useStore((s) => s.clearDroneLocalReasoning);
  const setCameraFocus = useStore((s) => s.setCameraFocus);
  const updateDrone = useStore((s) => s.updateDrone);
  const addActiveScan = useStore((s) => s.addActiveScan);

  const zoomToDrones = (drone1Id: string, drone2Id: string) => {
    const drone1 = drones.find(d => d.id === drone1Id);
    const drone2 = drones.find(d => d.id === drone2Id);
    if (drone1 && drone2) {
      const midpoint: [number, number, number] = [
        (drone1.position[0] + drone2.position[0]) / 2,
        (drone1.position[1] + drone2.position[1]) / 2 + 10,
        (drone1.position[2] + drone2.position[2]) / 2,
      ];
      setCameraFocus(midpoint);
    }
  };

  const handleSOSFlow = async (point: { x: number; y: number; z: number }) => {
    const clickPosition: [number, number, number] = [point.x, 15, point.z];

    // Add RED SOS marker
    const markerId = `marker-${Date.now()}`;
    addClickMarker({
      position: clickPosition,
      isHuman: false,
      discovered: false,
      timestamp: Date.now(),
    });

    // Find CLOSEST scout drone
    const scouts = drones.filter(d => d.role === 'scout' && d.status === 'online');
    if (scouts.length === 0) {
      console.error('No scout available');
      return;
    }

    let closestScout = scouts[0];
    let minDistance = Infinity;
    for (const scout of scouts) {
      const dist = calculateDistance(scout.position, clickPosition);
      if (dist < minDistance) {
        minDistance = dist;
        closestScout = scout;
      }
    }

    const scoutDrone = closestScout;
    const travelTime = (minDistance / 15) * 1000;

    // ═══════════════════════════════════════════════════════════════
    // PHASE 1: SCOUT APPROACH - High opacity lidar scan en route
    // ═══════════════════════════════════════════════════════════════
    addActiveScan({
      droneId: scoutDrone.id,
      position: [point.x, 0, point.z],
      radius: 40,
      duration: travelTime + 10000,
      intensity: 1.0, // HIGH OPACITY
      targets: [{ x: point.x, z: point.z, isHuman: true }],
    });

    updateDrone(scoutDrone.id, { targetPosition: clickPosition });
    await delay(travelTime + 2000);

    // ═══════════════════════════════════════════════════════════════
    // PHASE 2: ON-SITE ANALYSIS
    // ═══════════════════════════════════════════════════════════════
    addDroneLocalReasoning({
      droneId: scoutDrone.id,
      thought: `[MCP] Tool: area_sweep.scan()`,
      action: "Initiating area analysis",
      outcome: "success",
      duration: 2000,
    });

    await delay(2000);

    addDroneLocalReasoning({
      droneId: scoutDrone.id,
      thought: `┌── SCANNING SECTOR: ${Math.abs(Math.floor(point.x / 10))}-${Math.abs(Math.floor(point.z / 10))}`,
      action: "Sweeping terrain",
      outcome: "success",
      duration: 1500,
    });

    await delay(1500);

    addDroneLocalReasoning({
      droneId: scoutDrone.id,
      thought: `│  ├─ Thermal signatures: 1 confirmed`,
      action: "Life signs detected",
      outcome: "success",
      duration: 1000,
    });

    await delay(1000);

    addDroneLocalReasoning({
      droneId: scoutDrone.id,
      thought: `│  ├─ Structural integrity: STABLE`,
      action: "Environment analysis",
      outcome: "success",
      duration: 1000,
    });

    await delay(1000);

    addDroneLocalReasoning({
      droneId: scoutDrone.id,
      thought: `│  └─ Victim status: STABLE_ADULT | Trauma: NONE`,
      action: "Subject assessment",
      outcome: "success",
      duration: 1000,
    });

    await delay(1000);

    // ═══════════════════════════════════════════════════════════════
    // PHASE 3: COORDINATION PLANNING
    // ═══════════════════════════════════════════════════════════════
    addDroneLocalReasoning({
      droneId: scoutDrone.id,
      thought: `[MCP] Tool: rescue_planning.coordinate()`,
      action: "Planning response",
      outcome: "success",
      duration: 1500,
    });

    await delay(1500);

    addDroneLocalReasoning({
      droneId: scoutDrone.id,
      thought: `┌── ASSESSMENT: MEDIUM_PRIORITY | 1 victim | Stable condition`,
      action: "Evaluating response",
      outcome: "success",
      duration: 1200,
    });

    await delay(1200);

    // Find nearest relay
    const relayDrones = drones.filter(d => d.role === 'relay' && d.status === 'online');
    if (relayDrones.length === 0) return;

    let closestRelay = relayDrones[0];
    let minRelayDist = Infinity;
    for (const relay of relayDrones) {
      const dist = calculateDistance(scoutDrone.position, relay.position);
      if (dist < minRelayDist) {
        minRelayDist = dist;
        closestRelay = relay;
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // CALL 1: Scout → Relay → Medical
    // ═══════════════════════════════════════════════════════════════
    addDroneLocalReasoning({
      droneId: scoutDrone.id,
      thought: `[MCP CLIENT] Tool: relay.send(to="${closestRelay.id}", request="medical_unit")`,
      action: "Contacting relay network",
      outcome: "success",
      duration: 1000,
    });

    setActiveMessagePath(scoutDrone.id, closestRelay.id, true);
    zoomToDrones(scoutDrone.id, closestRelay.id);

    await delay(1000);

    addDroneLocalReasoning({
      droneId: closestRelay.id,
      thought: `[MCP RELAY] Tool: message.receive(from="${scoutDrone.id}")`,
      action: "Request received",
      outcome: "success",
      duration: 800,
    });

    await delay(800);

    const medicalDrones = drones.filter(d => d.role === 'medical' && d.status === 'online');
    if (medicalDrones.length > 0) {
      const medicalDrone = medicalDrones[0];

      addDroneLocalReasoning({
        droneId: closestRelay.id,
        thought: `┌── ROUTING: medical_unit_request → PROTOCOL: EMERGENCY_DISPATCH`,
        action: "Processing route",
        outcome: "success",
        duration: 1000,
      });

      await delay(1000);

      addDroneLocalReasoning({
        droneId: closestRelay.id,
        thought: `│  └─ Tool: forward.to(target="${medicalDrone.id}", payload="emergency_location")`,
        action: "Forwarding request",
        outcome: "success",
        duration: 800,
      });

      setActiveMessagePath(closestRelay.id, medicalDrone.id, true);
      zoomToDrones(closestRelay.id, medicalDrone.id);

      await delay(800);

      addDroneLocalReasoning({
        droneId: medicalDrone.id,
        thought: `[MCP SERVER] Tool: emergency_request.receive()`,
        action: "Incoming emergency",
        outcome: "success",
        duration: 1000,
      });

      await delay(1000);

      addDroneLocalReasoning({
        droneId: medicalDrone.id,
        thought: `┌── ENTERING DECISION MODE...`,
        action: "Evaluating request",
        outcome: "partial",
        duration: 1500,
      });

      await delay(1500);

      addDroneLocalReasoning({
        droneId: medicalDrone.id,
        thought: `│  ├─ Assessment: Routine extraction | No backup needed`,
        action: "Decision made",
        outcome: "success",
        duration: 1000,
      });

      await delay(1000);

      addDroneLocalReasoning({
        droneId: medicalDrone.id,
        thought: `┌── DECISION: ACCEPT_MISSION → Deploying solo`,
        action: "Mission accepted",
        outcome: "success",
        duration: 800,
      });

      await delay(800);

      const medAngle = Math.PI * 0.25;
      const medTargetX = point.x + Math.cos(medAngle) * 10;
      const medTargetZ = point.z + Math.sin(medAngle) * 10;

      updateDrone(medicalDrone.id, { targetPosition: [medTargetX, 12, medTargetZ] });

      addDroneLocalReasoning({
        droneId: medicalDrone.id,
        thought: `│  └─ STATUS: En route to patient | ETA: ${(calculateDistance(medicalDrone.position, [medTargetX, 12, medTargetZ]) / 12).toFixed(1)}s`,
        action: "Movement initiated",
        outcome: "success",
        duration: 800,
      });

      await delay(800);
      await delay(2000);
      setActiveMessagePath(closestRelay.id, medicalDrone.id, false);
      setCameraFocus(null);

      await delay(500);
      addDroneLocalReasoning({
        droneId: closestRelay.id,
        thought: `[MCP RELAY] Tool: confirm.send(to="${scoutDrone.id}", status="medical_dispatched")`,
        action: "Confirmation sent",
        outcome: "success",
        duration: 600,
      });

      await delay(600);
      setActiveMessagePath(scoutDrone.id, closestRelay.id, false);
      setCameraFocus(null);

      await delay((calculateDistance(medicalDrone.position, [medTargetX, 12, medTargetZ]) / 12) * 1000);
    }

    // ═══════════════════════════════════════════════════════════════
    // CALL 2: Scout → Relay → Rescue
    // ═══════════════════════════════════════════════════════════════
    await delay(1000);

    addDroneLocalReasoning({
      droneId: scoutDrone.id,
      thought: `[MCP CLIENT] Tool: relay.send(to="${closestRelay.id}", request="rescue_unit")`,
      action: "Contacting relay network",
      outcome: "success",
      duration: 1000,
    });

    setActiveMessagePath(scoutDrone.id, closestRelay.id, true);
    zoomToDrones(scoutDrone.id, closestRelay.id);

    await delay(1000);

    addDroneLocalReasoning({
      droneId: closestRelay.id,
      thought: `[MCP RELAY] Tool: message.receive(from="${scoutDrone.id}")`,
      action: "Request received",
      outcome: "success",
      duration: 800,
    });

    await delay(800);

    const rescueDrones = drones.filter(d => d.role === 'rescue' && d.status === 'online');
    if (rescueDrones.length > 0) {
      const rescueDrone = rescueDrones[0];

      addDroneLocalReasoning({
        droneId: closestRelay.id,
        thought: `┌── ROUTING: rescue_unit_request → PROTOCOL: EXTRACTION_DISPATCH`,
        action: "Processing route",
        outcome: "success",
        duration: 1000,
      });

      await delay(1000);

      addDroneLocalReasoning({
        droneId: closestRelay.id,
        thought: `│  └─ Tool: forward.to(target="${rescueDrone.id}", payload="extraction_request")`,
        action: "Forwarding request",
        outcome: "success",
        duration: 800,
      });

      setActiveMessagePath(closestRelay.id, rescueDrone.id, true);
      zoomToDrones(closestRelay.id, rescueDrone.id);

      await delay(800);

      addDroneLocalReasoning({
        droneId: rescueDrone.id,
        thought: `[MCP SERVER] Tool: extraction_request.receive()`,
        action: "Incoming extraction",
        outcome: "success",
        duration: 1000,
      });

      await delay(1000);

      addDroneLocalReasoning({
        droneId: rescueDrone.id,
        thought: `┌── ENTERING DECISION MODE...`,
        action: "Evaluating request",
        outcome: "partial",
        duration: 1500,
      });

      await delay(1500);

      addDroneLocalReasoning({
        droneId: rescueDrone.id,
        thought: `│  ├─ Analysis: Standard extraction | Winch capacity: OK`,
        action: "Decision made",
        outcome: "success",
        duration: 1000,
      });

      await delay(1000);

      addDroneLocalReasoning({
        droneId: rescueDrone.id,
        thought: `┌── DECISION: ACCEPT_EXTRACTION → Deploying solo`,
        action: "Mission accepted",
        outcome: "success",
        duration: 800,
      });

      await delay(800);

      const rescueAngle = Math.PI * 0.75;
      const rescueTargetX = point.x + Math.cos(rescueAngle) * 12;
      const rescueTargetZ = point.z + Math.sin(rescueAngle) * 12;

      updateDrone(rescueDrone.id, { targetPosition: [rescueTargetX, 12, rescueTargetZ] });

      addDroneLocalReasoning({
        droneId: rescueDrone.id,
        thought: `│  └─ STATUS: En route to extraction zone | ETA: ${(calculateDistance(rescueDrone.position, [rescueTargetX, 12, rescueTargetZ]) / 14).toFixed(1)}s`,
        action: "Movement initiated",
        outcome: "success",
        duration: 800,
      });

      await delay(800);
      await delay(2000);
      setActiveMessagePath(closestRelay.id, rescueDrone.id, false);
      setCameraFocus(null);

      await delay(500);
      addDroneLocalReasoning({
        droneId: closestRelay.id,
        thought: `[MCP RELAY] Tool: confirm.send(to="${scoutDrone.id}", status="rescue_dispatched")`,
        action: "Confirmation sent",
        outcome: "success",
        duration: 600,
      });

      await delay(600);
      setActiveMessagePath(scoutDrone.id, closestRelay.id, false);
      setCameraFocus(null);

      await delay((calculateDistance(rescueDrone.position, [rescueTargetX, 12, rescueTargetZ]) / 14) * 1000);
    }

    // ═══════════════════════════════════════════════════════════════
    // CALL 3: Scout → Relay → Supply
    // ═══════════════════════════════════════════════════════════════
    await delay(1000);

    addDroneLocalReasoning({
      droneId: scoutDrone.id,
      thought: `[MCP CLIENT] Tool: relay.send(to="${closestRelay.id}", request="supply_unit")`,
      action: "Contacting relay network",
      outcome: "success",
      duration: 1000,
    });

    setActiveMessagePath(scoutDrone.id, closestRelay.id, true);
    zoomToDrones(scoutDrone.id, closestRelay.id);

    await delay(1000);

    addDroneLocalReasoning({
      droneId: closestRelay.id,
      thought: `[MCP RELAY] Tool: message.receive(from="${scoutDrone.id}")`,
      action: "Request received",
      outcome: "success",
      duration: 800,
    });

    await delay(800);

    const supplyDrones = drones.filter(d => d.role === 'supply' && d.status === 'online');
    if (supplyDrones.length > 0) {
      const supplyDrone = supplyDrones[0];

      addDroneLocalReasoning({
        droneId: closestRelay.id,
        thought: `┌── ROUTING: supply_unit_request → PROTOCOL: LOGISTICS_DISPATCH`,
        action: "Processing route",
        outcome: "success",
        duration: 1000,
      });

      await delay(1000);

      addDroneLocalReasoning({
        droneId: closestRelay.id,
        thought: `│  └─ Tool: forward.to(target="${supplyDrone.id}", payload="supply_request")`,
        action: "Forwarding request",
        outcome: "success",
        duration: 800,
      });

      setActiveMessagePath(closestRelay.id, supplyDrone.id, true);
      zoomToDrones(closestRelay.id, supplyDrone.id);

      await delay(800);

      addDroneLocalReasoning({
        droneId: supplyDrone.id,
        thought: `[MCP SERVER] Tool: supply_request.receive()`,
        action: "Incoming supply",
        outcome: "success",
        duration: 1000,
      });

      await delay(1000);

      addDroneLocalReasoning({
        droneId: supplyDrone.id,
        thought: `┌── ENTERING DECISION MODE...`,
        action: "Evaluating request",
        outcome: "partial",
        duration: 1500,
      });

      await delay(1500);

      addDroneLocalReasoning({
        droneId: supplyDrone.id,
        thought: `│  ├─ Payload: Medical supplies + Rations | Weight: OK`,
        action: "Decision made",
        outcome: "success",
        duration: 1000,
      });

      await delay(1000);

      addDroneLocalReasoning({
        droneId: supplyDrone.id,
        thought: `┌── DECISION: ACCEPT_DELIVERY → Deploying`,
        action: "Mission accepted",
        outcome: "success",
        duration: 800,
      });

      await delay(800);

      const supplyAngle = Math.PI * 1.25;
      const supplyTargetX = point.x + Math.cos(supplyAngle) * 15;
      const supplyTargetZ = point.z + Math.sin(supplyAngle) * 15;

      updateDrone(supplyDrone.id, { targetPosition: [supplyTargetX, 12, supplyTargetZ] });

      addDroneLocalReasoning({
        droneId: supplyDrone.id,
        thought: `│  └─ STATUS: En route to drop zone | ETA: ${(calculateDistance(supplyDrone.position, [supplyTargetX, 12, supplyTargetZ]) / 13).toFixed(1)}s`,
        action: "Movement initiated",
        outcome: "success",
        duration: 800,
      });

      await delay(800);
      await delay(2000);
      setActiveMessagePath(closestRelay.id, supplyDrone.id, false);
      setCameraFocus(null);

      await delay(500);
      addDroneLocalReasoning({
        droneId: closestRelay.id,
        thought: `[MCP RELAY] Tool: confirm.send(to="${scoutDrone.id}", status="supply_dispatched")`,
        action: "Confirmation sent",
        outcome: "success",
        duration: 600,
      });

      await delay(600);
      setActiveMessagePath(scoutDrone.id, closestRelay.id, false);
      setCameraFocus(null);

      await delay((calculateDistance(supplyDrone.position, [supplyTargetX, 12, supplyTargetZ]) / 13) * 1000);
    }

    // ═══════════════════════════════════════════════════════════════
    // MISSION COMPLETE
    // ═══════════════════════════════════════════════════════════════
    await delay(3000);

    updateClickMarker(markerId, { isHuman: true, discovered: true });

    clearDroneLocalReasoning(scoutDrone.id);
    relayDrones.forEach(r => clearDroneLocalReasoning(r.id));
    medicalDrones?.forEach(m => clearDroneLocalReasoning(m.id));
    rescueDrones?.forEach(r => clearDroneLocalReasoning(r.id));
    supplyDrones?.forEach(s => clearDroneLocalReasoning(s.id));
  };

  return null; // This component doesn't render anything
}

// Export the handler function for external use
export async function triggerSOSFlow(point: { x: number; y: number; z: number }) {
  // This will be called from Terrain's click handler
  // For now, we'll integrate it directly in Terrain
}
