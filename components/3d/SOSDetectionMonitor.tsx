'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { useFrame } from '@react-three/fiber';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function calculateDistance(pos1: [number, number, number], pos2: [number, number, number]): number {
  const dx = pos1[0] - pos2[0];
  const dz = pos1[2] - pos2[2];
  return Math.sqrt(dx * dx + dz * dz);
}

export function SOSDetectionMonitor() {
  const clickMarkers = useStore((s) => s.clickMarkers);
  const drones = useStore((s) => s.drones);
  const addDroneLocalReasoning = useStore((s) => s.addDroneLocalReasoning);
  const setActiveMessagePath = useStore((s) => s.setActiveMessagePath);
  const clearDroneLocalReasoning = useStore((s) => s.clearDroneLocalReasoning);
  const setCameraFocus = useStore((s) => s.setCameraFocus);
  const updateDrone = useStore((s) => s.updateDrone);
  const updateClickMarker = useStore((s) => s.updateClickMarker);
  const addActiveScan = useStore((s) => s.addActiveScan);

  const isProcessing = useRef(false);
  const processedMarkers = useRef<Set<string>>(new Set());

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

  const triggerSOSResponse = async (markerId: string, clickPosition: [number, number, number], scoutDrone: any) => {
    if (isProcessing.current) return;
    isProcessing.current = true;

    const point = { x: clickPosition[0], z: clickPosition[2] };
    const travelTime = calculateDistance(scoutDrone.position, clickPosition) / 15 * 1000;

    try {
      // ═══════════════════════════════════════════════════════════════
      // PHASE 1: Scout switches to HIGH OPACITY and approaches
      // ═══════════════════════════════════════════════════════════════
      addActiveScan({
        droneId: scoutDrone.id,
        position: [point.x, 0, point.z],
        radius: 40,
        duration: travelTime + 12000,
        intensity: 1.0, // Switch to HIGH OPACITY
        targets: [{ x: point.x, z: point.z, isHuman: true }],
      });

      addDroneLocalReasoning({
        droneId: scoutDrone.id,
        thought: `[DETECTION] SOS signal detected within scan range - INITIATING RESPONSE`,
        action: "Switching to emergency mode",
        outcome: "success",
        duration: 1500,
      });

      await delay(1500);

      updateDrone(scoutDrone.id, { targetPosition: clickPosition });

      addDroneLocalReasoning({
        droneId: scoutDrone.id,
        thought: `└─ STATUS: En route to target | ETA: ${(travelTime / 1000).toFixed(1)}s`,
        action: "Deploying",
        outcome: "success",
        duration: 1000,
      });

      await delay(travelTime + 2000);

      // ═══════════════════════════════════════════════════════════════
      // PHASE 2: On-site analysis
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
        thought: `┌── SECTOR SCAN: T-${Math.abs(Math.floor(point.x / 10))}-${Math.abs(Math.floor(point.z / 10))}`,
        action: "Sweeping terrain",
        outcome: "success",
        duration: 1500,
      });

      await delay(1500);

      addDroneLocalReasoning({
        droneId: scoutDrone.id,
        thought: `│  ├─ Thermal: 1 adult | Stable`,
        action: "Life signs detected",
        outcome: "success",
        duration: 1000,
      });

      await delay(1000);

      addDroneLocalReasoning({
        droneId: scoutDrone.id,
        thought: `│  ├─ Environment: No hazards detected`,
        action: "Terrain analysis",
        outcome: "success",
        duration: 1000,
      });

      await delay(1000);

      addDroneLocalReasoning({
        droneId: scoutDrone.id,
        thought: `│  └─ Victim: STABLE_ADULT | Trauma: NONE`,
        action: "Subject assessment",
        outcome: "success",
        duration: 1000,
      });

      await delay(1000);

      // ═══════════════════════════════════════════════════════════════
      // PHASE 3: Scout goes to RELAY for coordination
      // ═══════════════════════════════════════════════════════════════
      addDroneLocalReasoning({
        droneId: scoutDrone.id,
        thought: `[MCP] Tool: relay_request.coordinate()`,
        action: "Seeking relay coordination",
        outcome: "success",
        duration: 1000,
      });

      await delay(1000);

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

      // Scout approaches relay
      addDroneLocalReasoning({
        droneId: scoutDrone.id,
        thought: `→ Moving to relay hub "${closestRelay.id}" | Distance: ${minRelayDist.toFixed(0)}m`,
        action: "Approaching relay",
        outcome: "success",
        duration: 800,
      });

      await delay(800);

      updateDrone(scoutDrone.id, {
        targetPosition: [closestRelay.position[0], 15, closestRelay.position[2]],
      });

      const relayApproachTime = (minRelayDist / 15) * 1000;
      await delay(relayApproachTime);

      // ═══════════════════════════════════════════════════════════════
      // PHASE 4: Scout → Relay (Data handoff)
      // ═══════════════════════════════════════════════════════════════
      setActiveMessagePath(scoutDrone.id, closestRelay.id, true);
      zoomToDrones(scoutDrone.id, closestRelay.id);

      addDroneLocalReasoning({
        droneId: scoutDrone.id,
        thought: `[MCP CLIENT] Tool: data.upload(to="${closestRelay.id}", type="sos_report")`,
        action: "Transmitting SOS data",
        outcome: "success",
        duration: 800,
      });

      await delay(800);

      addDroneLocalReasoning({
        droneId: scoutDrone.id,
        thought: `┌── PAYLOAD: { victim_count: 1, condition: "stable", location: [${point.x.toFixed(1)}, ${point.z.toFixed(1)}], urgency: "routine" }`,
        action: "Data packaged",
        outcome: "success",
        duration: 600,
      });

      await delay(600);

      addDroneLocalReasoning({
        droneId: closestRelay.id,
        thought: `[MCP RELAY] Tool: data.receive(from="${scoutDrone.id}")`,
        action: "Data received",
        outcome: "success",
        duration: 800,
      });

      await delay(800);

      addDroneLocalReasoning({
        droneId: closestRelay.id,
        thought: `┌── ENTERING DECISION MODE...`,
        action: "Analyzing requirements",
        outcome: "partial",
        duration: 2000,
      });

      await delay(2000);

      // Relay intelligence: decides which drones and whether to chain
      addDroneLocalReasoning({
        droneId: closestRelay.id,
        thought: `│  ├─ Analysis: Single victim | Stable | Routine extraction`,
        action: "Requirements identified",
        outcome: "success",
        duration: 1000,
      });

      await delay(1000);

      addDroneLocalReasoning({
        droneId: closestRelay.id,
        thought: `│  ├─ Resources needed: Medical, Rescue, Supply (3 total)`,
        action: "Resource calculation",
        outcome: "success",
        duration: 1000,
      });

      await delay(1000);

      addDroneLocalReasoning({
        droneId: closestRelay.id,
        thought: `│  ├─ Current battery: ${closestRelay.battery.toFixed(0)}% - Sufficient for 2 dispatches`,
        action: "Battery check",
        outcome: "success",
        duration: 800,
      });

      await delay(800);

      addDroneLocalReasoning({
        droneId: closestRelay.id,
        thought: `┌── DECISION: SEQUENTIAL_DISPATCH → Will chain to relay 2 after 2 drones`,
        action: "Strategy selected",
        outcome: "success",
        duration: 800,
      });

      await delay(800);

      setActiveMessagePath(scoutDrone.id, closestRelay.id, false);
      setCameraFocus(null);

      await delay(500);

      // Scout returns to patrol/standby
      addDroneLocalReasoning({
        droneId: scoutDrone.id,
        thought: `[MCP] Data handoff complete - Returning to patrol`,
        action: "Mission handoff",
        outcome: "success",
        duration: 800,
      });

      await delay(800);

      // ═══════════════════════════════════════════════════════════════
      // RELAY → MEDICAL DRONE
      // ═══════════════════════════════════════════════════════════════
      const medicalDrones = drones.filter(d => d.role === 'medical' && d.status === 'online');
      if (medicalDrones.length > 0) {
        const medicalDrone = medicalDrones[0];

        addDroneLocalReasoning({
          droneId: closestRelay.id,
          thought: `[MCP RELAY] Tool: dispatch.send(to="${medicalDrone.id}", request="medical_response")`,
          action: "Dispatching medical unit",
          outcome: "success",
          duration: 800,
        });

        setActiveMessagePath(closestRelay.id, medicalDrone.id, true);
        zoomToDrones(closestRelay.id, medicalDrone.id);

        await delay(800);

        addDroneLocalReasoning({
          droneId: medicalDrone.id,
          thought: `[MCP SERVER] Tool: mission.receive()`,
          action: "Incoming mission",
          outcome: "success",
          duration: 1000,
        });

        await delay(1000);

        addDroneLocalReasoning({
          droneId: medicalDrone.id,
          thought: `┌── ANALYZING MISSION PARAMETERS...`,
          action: "Evaluating request",
          outcome: "partial",
          duration: 1500,
        });

        await delay(1500);

        addDroneLocalReasoning({
          droneId: medicalDrone.id,
          thought: `│  ├─ Mission: Routine medical assessment`,
          action: "Mission understood",
          outcome: "success",
          duration: 800,
        });

        await delay(800);

        addDroneLocalReasoning({
          droneId: medicalDrone.id,
          thought: `│  └─ Equipment: Triage kit ready | Moving to target`,
          action: "Accepting mission",
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
          thought: `→ STATUS: En route to patient | ETA: ${(calculateDistance(medicalDrone.position, [medTargetX, 12, medTargetZ]) / 12).toFixed(1)}s`,
          action: "Deploying",
          outcome: "success",
          duration: 800,
        });

        await delay(800);
        await delay(2000);
        setActiveMessagePath(closestRelay.id, medicalDrone.id, false);
        setCameraFocus(null);

        // NOW relay moves towards medical drone for next communication
        const medRelayPos: [number, number, number] = [
          (medicalDrone.position[0] + closestRelay.position[0]) / 2,
          15,
          (medicalDrone.position[2] + closestRelay.position[2]) / 2,
        ];
        updateDrone(closestRelay.id, { targetPosition: medRelayPos });

        // Wait for medical to arrive
        await delay((calculateDistance(medicalDrone.position, [medTargetX, 12, medTargetZ]) / 12) * 1000);
      }

      // Relay battery decreases after first dispatch
      updateDrone(closestRelay.id, { battery: Math.max(0, closestRelay.battery - 25) });

      // ═══════════════════════════════════════════════════════════════
      // RELAY → RESCUE DRONE
      // ═══════════════════════════════════════════════════════════════
      await delay(1000);

      addDroneLocalReasoning({
        droneId: closestRelay.id,
        thought: `[MCP RELAY] Battery check: ${closestRelay.battery.toFixed(0)}% - WARNING: LOW`,
        action: "Battery critical",
        outcome: "partial",
        duration: 1000,
      });

      await delay(1000);

      addDroneLocalReasoning({
        droneId: closestRelay.id,
        thought: `│  └─ DECISION: INITIATE HANDOFF → Returning to base for charging`,
        action: "Returning to base",
        outcome: "success",
        duration: 1000,
      });

      await delay(1000);

      // Find second relay
      if (relayDrones.length > 1) {
        const relay2 = relayDrones[1];

        addDroneLocalReasoning({
          droneId: closestRelay.id,
          thought: `[MCP RELAY] Tool: handoff.execute(to="${relay2.id}", pending=["rescue", "supply"])`,
          action: "Handing off mission",
          outcome: "success",
          duration: 800,
        });

        setActiveMessagePath(closestRelay.id, relay2.id, true);
        zoomToDrones(closestRelay.id, relay2.id);

        await delay(800);

        addDroneLocalReasoning({
          droneId: relay2.id,
          thought: `[MCP RELAY 2] Tool: handoff.receive(from="${closestRelay.id}")`,
          action: "Accepting handoff",
          outcome: "success",
          duration: 800,
        });

        await delay(800);

        addDroneLocalReasoning({
          droneId: relay2.id,
          thought: `┌── PENDING MISSIONS: rescue, supply`,
          action: "Mission queue received",
          outcome: "success",
          duration: 800,
        });

        await delay(800);

        setActiveMessagePath(closestRelay.id, relay2.id, false);
        setCameraFocus(null);

        // First relay returns to base
        updateDrone(closestRelay.id, {
          targetPosition: [0, 15, 0],
        });

        addDroneLocalReasoning({
          droneId: closestRelay.id,
          thought: `→ STATUS: Returning to base for charging | Battery: ${closestRelay.battery.toFixed(0)}%`,
          action: "RTB initiated",
          outcome: "success",
          duration: 800,
        });

        await delay(800);

        // ═══════════════════════════════════════════════════════════════
        // RELAY 2 → RESCUE DRONE
        // ═══════════════════════════════════════════════════════════════
        await delay(1000);

        addDroneLocalReasoning({
          droneId: relay2.id,
          thought: `[MCP RELAY 2] Tool: dispatch.send(to="rescue", request="extraction")`,
          action: "Dispatching rescue unit",
          outcome: "success",
          duration: 800,
        });

        const rescueDrones = drones.filter(d => d.role === 'rescue' && d.status === 'online');
        if (rescueDrones.length > 0) {
          const rescueDrone = rescueDrones[0];

          setActiveMessagePath(relay2.id, rescueDrone.id, true);
          zoomToDrones(relay2.id, rescueDrone.id);

          await delay(800);

          addDroneLocalReasoning({
            droneId: rescueDrone.id,
            thought: `[MCP SERVER] Tool: mission.receive()`,
            action: "Incoming mission",
            outcome: "success",
            duration: 1000,
          });

          await delay(1000);

          addDroneLocalReasoning({
            droneId: rescueDrone.id,
            thought: `┌── ANALYZING MISSION PARAMETERS...`,
            action: "Evaluating request",
            outcome: "partial",
            duration: 1500,
          });

          await delay(1500);

          addDroneLocalReasoning({
            droneId: rescueDrone.id,
            thought: `│  ├─ Mission: Standard extraction | Winch capacity: OK`,
            action: "Mission understood",
            outcome: "success",
            duration: 800,
          });

          await delay(800);

          addDroneLocalReasoning({
            droneId: rescueDrone.id,
            thought: `│  └─ Equipment: Winch ready | Moving to target`,
            action: "Accepting mission",
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
            thought: `→ STATUS: En route to extraction zone | ETA: ${(calculateDistance(rescueDrone.position, [rescueTargetX, 12, rescueTargetZ]) / 14).toFixed(1)}s`,
            action: "Deploying",
            outcome: "success",
            duration: 800,
          });

          await delay(800);
          await delay(2000);
          setActiveMessagePath(relay2.id, rescueDrone.id, false);
          setCameraFocus(null);

          // NOW relay2 moves towards rescue drone for next communication
          const rescueRelayPos: [number, number, number] = [
            (rescueDrone.position[0] + relay2.position[0]) / 2,
            15,
            (rescueDrone.position[2] + relay2.position[2]) / 2,
          ];
          updateDrone(relay2.id, { targetPosition: rescueRelayPos });

          await delay((calculateDistance(rescueDrone.position, [rescueTargetX, 12, rescueTargetZ]) / 14) * 1000);
        }

        // ═══════════════════════════════════════════════════════════════
        // RELAY 2 → SUPPLY DRONE
        // ═══════════════════════════════════════════════════════════════
        await delay(1000);

        addDroneLocalReasoning({
          droneId: relay2.id,
          thought: `[MCP RELAY 2] Tool: dispatch.send(to="supply", request="logistics")`,
          action: "Dispatching supply unit",
          outcome: "success",
          duration: 800,
        });

        const supplyDrones = drones.filter(d => d.role === 'supply' && d.status === 'online');
        if (supplyDrones.length > 0) {
          const supplyDrone = supplyDrones[0];

          setActiveMessagePath(relay2.id, supplyDrone.id, true);
          zoomToDrones(relay2.id, supplyDrone.id);

          await delay(800);

          addDroneLocalReasoning({
            droneId: supplyDrone.id,
            thought: `[MCP SERVER] Tool: mission.receive()`,
            action: "Incoming mission",
            outcome: "success",
            duration: 1000,
          });

          await delay(1000);

          addDroneLocalReasoning({
            droneId: supplyDrone.id,
            thought: `┌── ANALYZING MISSION PARAMETERS...`,
            action: "Evaluating request",
            outcome: "partial",
            duration: 1500,
          });

          await delay(1500);

          addDroneLocalReasoning({
            droneId: supplyDrone.id,
            thought: `│  ├─ Mission: Supply delivery | Payload: Medical + Rations`,
            action: "Mission understood",
            outcome: "success",
            duration: 800,
          });

          await delay(800);

          addDroneLocalReasoning({
            droneId: supplyDrone.id,
            thought: `│  └─ Cargo: Ready | Moving to target`,
            action: "Accepting mission",
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
            thought: `→ STATUS: En route to drop zone | ETA: ${(calculateDistance(supplyDrone.position, [supplyTargetX, 12, supplyTargetZ]) / 13).toFixed(1)}s`,
            action: "Deploying",
            outcome: "success",
            duration: 800,
          });

          await delay(800);
          await delay(2000);
          setActiveMessagePath(relay2.id, supplyDrone.id, false);
          setCameraFocus(null);

          // NOW relay2 moves towards supply drone for next communication
          const supplyRelayPos: [number, number, number] = [
            (supplyDrone.position[0] + relay2.position[0]) / 2,
            15,
            (supplyDrone.position[2] + relay2.position[2]) / 2,
          ];
          updateDrone(relay2.id, { targetPosition: supplyRelayPos });

          await delay((calculateDistance(supplyDrone.position, [supplyTargetX, 12, supplyTargetZ]) / 13) * 1000);
        }

        addDroneLocalReasoning({
          droneId: relay2.id,
          thought: `[MCP RELAY 2] All dispatches complete - Standing by`,
          action: "Mission coordination done",
          outcome: "success",
          duration: 1000,
        });
      }

      // ═══════════════════════════════════════════════════════════════
      // MISSION COMPLETE
      // ═══════════════════════════════════════════════════════════════
      await delay(3000);

      updateClickMarker(markerId, { isHuman: true, discovered: true });

      clearDroneLocalReasoning(scoutDrone.id);
      relayDrones.forEach(r => clearDroneLocalReasoning(r.id));
      medicalDrones?.forEach(m => clearDroneLocalReasoning(m.id));
      const rescueDrones = drones.filter(d => d.role === 'rescue' && d.status === 'online');
      rescueDrones?.forEach(r => clearDroneLocalReasoning(r.id));
      const supplyDrones = drones.filter(d => d.role === 'supply' && d.status === 'online');
      supplyDrones?.forEach(s => clearDroneLocalReasoning(s.id));
    } finally {
      isProcessing.current = false;
      processedMarkers.current.add(markerId);
    }
  };

  // Continuous detection loop
  useFrame(() => {
    if (isProcessing.current) return;

    const scouts = drones.filter(d => d.role === 'scout' && d.status === 'online');
    if (scouts.length === 0) return;

    // Check each marker
    for (const marker of clickMarkers) {
      // Skip if already processed or discovered
      if (processedMarkers.current.has(marker.id) || marker.discovered) {
        continue;
      }

      const clickPosition: [number, number, number] = marker.position;

      // Check if any scout's scan range covers this marker
      for (const scout of scouts) {
        const dist = calculateDistance(scout.position, clickPosition);
        if (dist <= 35) { // Scout scan radius
          // Trigger SOS response
          triggerSOSResponse(marker.id, clickPosition, scout);
          break;
        }
      }
    }
  });

  return null;
}
