'use client';

import { useEffect, useRef } from 'react';
import { useStore, selectDrones, selectSOS } from './store';

const TICK_INTERVAL = 4000;
const BATTERY_DRAIN_MIN = 0.1;
const BATTERY_DRAIN_MAX = 0.5;
const STATUS_CHANGE_CHANCE = 0.05;
const RELAY_EVENT_CHANCE = 0.08;
const HOVER_DRIFT = 0.08;
const SUPPLY_MOVE_SPEED = 0.3;
const REASONING_CHANCE = 0.35;
const MESSAGE_CHANCE = 0.1;
const MISSION_CHANCE = 0.02;

const IDLE_REASONING: Record<string, string[]> = {
  relay: [
    "checkRelayChainIntegrity() - Success ✓",
    "monitorSignalStrength() - Success ✓",
    "verifyDataPacketTransmission() - Success ✓",
    "awaitCommand() - Success ✓",
    "validateRelayPath() - Success ✓",
    "measureDataThroughput() - Success ✓",
    "executeMeshNetworkHandshake() - Success ✓",
    "coordinateFleetCommunication() - Success ✓",
  ],
  supply: [
    "checkInventoryStatus() - Success ✓",
    "awaitDispatchOrders() - Success ✓",
    "verifyDeliveryCoordinates() - Success ✓",
    "checkBatteryOperationalRange() - Success ✓",
    "activateStandbyMode() - Success ✓",
    "initNavigationSystem() - Success ✓",
    "validateCargoCapacity() - Success ✓",
  ],
  scout: [
    "conductAerialReconnaissance() - Success ✓",
    "scanTerrainObstacles() - Success ✓",
    "monitorAtmosphericConditions() - Success ✓",
    "analyzeThermalSignatures() - Success ✓",
    "verifyAreaClear() - Success ✓",
    "updateNavigationWaypoints() - Success ✓",
    "collectReconnaissanceData() - Success ✓",
  ],
  medical: [
    "monitorMedicalSupplyLevels() - Success ✓",
    "checkEmergencyTriageProtocols() - Success ✓",
    "awaitEmergencyCalls() - Success ✓",
    "verifyLifeSupportSystems() - Success ✓",
    "scanForVitalSigns() - Success ✓",
    "maintainMedicalKitInventory() - Success ✓",
    "updatePatientRecords() - Success ✓",
  ],
  rescue: [
    "maintainExtractionReadiness() - Success ✓",
    "checkWinchAndLiftingGear() - Success ✓",
    "awaitRescueMissions() - Success ✓",
    "verifyAerialLiftCapacity() - Success ✓",
    "monitorPayloadLimits() - Success ✓",
    "testHoistMechanism() - Success ✓",
    "scanForLandingZones() - Success ✓",
  ],
  comms: [
    "monitorUplinkStatus() - Success ✓",
    "verifySatelliteConnectivity() - Success ✓",
    "awaitRelayRequests() - Success ✓",
    "testEmergencyBroadcast() - Success ✓",
    "maintainNetworkBridges() - Success ✓",
    "checkSignalBooster() - Success ✓",
    "scanForDeadZones() - Success ✓",
  ],
  fire: [
    "monitorFireSuppressionSystems() - Success ✓",
    "checkExtinguisherLevels() - Success ✓",
    "awaitFireAlerts() - Success ✓",
    "testThermalImaging() - Success ✓",
    "verifyWaterTankCapacity() - Success ✓",
    "maintainFireBreakProtocol() - Success ✓",
    "scanForHeatSignatures() - Success ✓",
  ],
  charger: [
    "monitorFleetBatteryLevels() - Success ✓",
    "maintainPowerReserves() - Success ✓",
    "deployChargingTether() - Success ✓",
    "calculateOptimalRefuelingRoutes() - Success ✓",
    "awaitLowBatterySignals() - Success ✓",
    "chargePowerBanks() - Success ✓",
    "scanForActiveDrones() - Success ✓",
  ],
};

const CONTEXT_REASONING: Record<string, { condition: (d: any) => boolean; text: (d: any) => string }[]> = {
  relay: [
    { condition: (d) => d.battery < 20, text: (d) => `triggerLowBatteryWarning() - Warning ⚠ | Level: ${d.battery.toFixed(0)}%` },
    { condition: (d) => d.battery < 10, text: (d) => `executeImmediateRecall() - Critical ⚠ | Level: ${d.battery.toFixed(0)}%` },
    { condition: (d) => d.status === 'syncing', text: (d) => `syncDataPackets() - In Progress ⟳` },
    { condition: (d) => d.status === 'offline', text: (d) => `diagnoseConnectionLoss() - Failed ❌` },
  ],
  supply: [
    { condition: (d) => d.battery < 20, text: (d) => `triggerLowBatteryWarning() - Warning ⚠ | Level: ${d.battery.toFixed(0)}%` },
    { condition: (d) => d.battery < 10, text: (d) => `abortMission() - Critical ⚠ | Level: ${d.battery.toFixed(0)}%` },
    { condition: (d) => d.status === 'syncing', text: (d) => `calculateOptimalDeliveryRoute() - In Progress ⟳` },
  ],
  scout: [
    { condition: (d) => d.battery < 20, text: (d) => `triggerLowBatteryWarning() - Warning ⚠ | Level: ${d.battery.toFixed(0)}%` },
    { condition: (d) => d.battery < 10, text: (d) => `abortReconnaissance() - Critical ⚠ | Level: ${d.battery.toFixed(0)}%` },
    { condition: (d) => d.status === 'syncing', text: (d) => `uploadReconnaissanceData() - In Progress ⟳` },
    { condition: (d) => d.status === 'offline', text: (d) => `diagnoseVisualContactLoss() - Failed ❌` },
  ],
  medical: [
    { condition: (d) => d.battery < 20, text: (d) => `triggerLowBatteryWarning() - Warning ⚠ | Level: ${d.battery.toFixed(0)}%` },
    { condition: (d) => d.battery < 10, text: (d) => `abortMedicalMission() - Critical ⚠ | Level: ${d.battery.toFixed(0)}%` },
    { condition: (d) => d.status === 'syncing', text: (d) => `updatePatientDatabase() - In Progress ⟳` },
    { condition: (d) => d.status === 'offline', text: (d) => `diagnoseSystemFailure() - Failed ❌` },
  ],
  rescue: [
    { condition: (d) => d.battery < 20, text: (d) => `triggerLowBatteryWarning() - Warning ⚠ | Level: ${d.battery.toFixed(0)}%` },
    { condition: (d) => d.battery < 10, text: (d) => `abortExtraction() - Critical ⚠ | Level: ${d.battery.toFixed(0)}%` },
    { condition: (d) => d.status === 'syncing', text: (d) => `coordinateExtractionPlan() - In Progress ⟳` },
    { condition: (d) => d.status === 'offline', text: (d) => `diagnoseLiftFailure() - Failed ❌` },
  ],
  comms: [
    { condition: (d) => d.battery < 20, text: (d) => `triggerLowBatteryWarning() - Warning ⚠ | Level: ${d.battery.toFixed(0)}%` },
    { condition: (d) => d.battery < 10, text: (d) => `abortBroadcast() - Critical ⚠ | Level: ${d.battery.toFixed(0)}%` },
    { condition: (d) => d.status === 'syncing', text: (d) => `establishUplink() - In Progress ⟳` },
    { condition: (d) => d.status === 'offline', text: (d) => `diagnoseSignalLoss() - Failed ❌` },
  ],
  fire: [
    { condition: (d) => d.battery < 20, text: (d) => `triggerLowBatteryWarning() - Warning ⚠ | Level: ${d.battery.toFixed(0)}%` },
    { condition: (d) => d.battery < 10, text: (d) => `abortFireSuppression() - Critical ⚠ | Level: ${d.battery.toFixed(0)}%` },
    { condition: (d) => d.status === 'syncing', text: (d) => `primeExtinguisherSystem() - In Progress ⟳` },
    { condition: (d) => d.status === 'offline', text: (d) => `diagnoseSuppressionFailure() - Failed ❌` },
  ],
  charger: [
    { condition: (d) => d.battery < 20, text: (d) => `triggerLowBatteryWarning() - Warning ⚠ | Level: ${d.battery.toFixed(0)}%` },
    { condition: (d) => d.status === 'syncing', text: (d) => `transferPowerPayload() - In Progress ⟳` },
    { condition: (d) => d.status === 'offline', text: (d) => `diagnosePowerDeliveryFailure() - Failed ❌` },
  ],
};

const MESSAGE_TEMPLATES: Record<string, string[]> = {
  command: [
    "cmd_proceedToGrid({grid}) - Success ✓",
    "cmd_initiateThermalScan({sector}) - Success ✓",
    "cmd_returnToBase() - Success ✓",
    "cmd_establishRelay({drone}) - Success ✓",
    "cmd_activateCoverageBoost() - Success ✓",
  ],
  status: [
    "status_confirmRelayPath() - Success ✓",
    "status_transmitData() - Success ✓",
    "status_updatePosition() - Success ✓",
    "status_awaitCommand() - Success ✓",
    "status_verifyConnection() - Success ✓",
  ],
  data: [
    "data_readThermal({temp}) - Success ✓",
    "data_countDevices({count}) - Success ✓",
    "data_updateCoverageMap() - Success ✓",
    "data_measureSignalStrength({signal}) - Success ✓",
  ],
  alert: [
    "alert_lowBattery({battery}) - Warning ⚠",
    "alert_detectObstacle() - Warning ⚠",
    "alert_retryConnection() - In Progress ⟳",
    "alert_temperatureWarning() - Warning ⚠",
  ],
};

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function replaceTemplate(template: string, replacements: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(`{${key}}`, value);
  }
  return result;
}

export function useSimulation() {
  const drones = useStore(selectDrones);
  const sosSignals = useStore(selectSOS);
  const updateDrone = useStore((s) => s.updateDrone);
  const updateSOS = useStore((s) => s.updateSOS);
  const pushEvent = useStore((s) => s.pushEvent);
  const addActiveScan = useStore((s) => s.addActiveScan);

  const tickCount = useRef(0);
  const scoutsInitialized = useRef(false);

  // Initialize scout scans immediately after drones are loaded
  useEffect(() => {
    if (scoutsInitialized.current) return; // Only run once

    const store = useStore.getState();
    const scoutDrones = store.drones.filter(d => d.role === 'scout' && d.status === 'online');

    if (scoutDrones.length === 0) return; // Wait for scouts to be loaded

    scoutDrones.forEach(scout => {
      addActiveScan({
        droneId: scout.id,
        position: [scout.position[0], 0, scout.position[2]],
        radius: 35,
        duration: 25000, // 25 seconds
        targets: [],
        intensity: 0.3, // 30% opacity - faint but visible
      });
    });

    scoutsInitialized.current = true;
  }, [drones.length, addActiveScan]); // Re-check when drones are loaded

  useEffect(() => {
    const interval = setInterval(() => {
      tickCount.current++;
      const store = useStore.getState();
      const currentDrones = store.drones;

      // NOTE: Old SOS signal processing removed - using click-based SOS only
      // Relays stay in center (multi-star topology)
      // Only supply drones respond to SOS (handled in Scene.tsx)

      // 1. Update each drone
      currentDrones.forEach((drone) => {
        // Battery drain
        const batteryDrop = Math.random() * (BATTERY_DRAIN_MAX - BATTERY_DRAIN_MIN) + BATTERY_DRAIN_MIN;
        const newBattery = Math.max(0, drone.battery - batteryDrop);

        // Status changes
        let newStatus = drone.status;
        let statusChanged = false;

        if (Math.random() < STATUS_CHANGE_CHANCE) {
          if (drone.status === 'online' && newBattery < 20) {
            // Low battery - go offline or syncing
            newStatus = Math.random() > 0.5 ? 'offline' : 'syncing';
            statusChanged = true;
          } else if (drone.status === 'offline' && newBattery > 30) {
            // Recovered - back online
            newStatus = 'online';
            statusChanged = true;
          } else if (drone.status === 'syncing') {
            // Syncing can go either way
            newStatus = Math.random() > 0.3 ? 'online' : 'offline';
            statusChanged = true;
          }
        }

        // Position drift (hovering effect)
        let [x, y, z] = drone.position;

        if (drone.status === 'online') {
          // Small random drift for hovering
          x += (Math.random() - 0.5) * HOVER_DRIFT;
          z += (Math.random() - 0.5) * HOVER_DRIFT;

          // Keep within bounds
          x = Math.max(-80, Math.min(80, x));
          z = Math.max(-80, Math.min(80, z));

          // Multi-star topology: Keep relays near center
          if (drone.role === 'relay') {
            // Gently drift back toward center if too far
            const distFromCenter = Math.sqrt(x * x + z * z);
            if (distFromCenter > 20) {
              // Move toward center
              x = x * 0.95;
              z = z * 0.95;
            }
          }
        }

        // Supply drone SOS response - DISABLED
        // Now only triggered by user clicks (handled in Scene.tsx)
        // Relays stay in center for communication hub (multi-star topology)

        // Scout patrol logic
        if (drone.role === 'scout' && drone.status === 'online') {
          // If a scout doesn't have a target position (or is close to it), give it a new random waypoint
          if (!drone.targetPosition || 
              (Math.abs(drone.targetPosition[0] - drone.position[0]) < 2 && 
               Math.abs(drone.targetPosition[2] - drone.position[2]) < 2)) {
            
            // Generate random waypoint within the map bounds (-80 to 80)
            const randomX = (Math.random() - 0.5) * 160;
            const randomZ = (Math.random() - 0.5) * 160;

            store.updateDrone(drone.id, {
              targetPosition: [randomX, drone.position[1], randomZ]
            });

            // DISABLED: Scout patrol logs for clean initial state
            // if (Math.random() < 0.2) {
            //   store.addDroneReasoning(drone.id, `Plotting new patrol vector to [${randomX.toFixed(0)}, ${randomZ.toFixed(0)}]`, 'action');
            // }
          }
        }

        // Universal routine scan logic for all drones (Swarm lidar) - DISABLED
        // Only scans triggered by user clicks (SOS flow) are now active
        /*
        // Different roles scan with different frequencies
        let scanChance = 0;
        if (drone.status === 'online') {
          if (drone.role === 'scout') scanChance = 0.8; // Scouts scan almost constantly
          else scanChance = 0.08; // Other drones scan occasionally

          if (Math.random() < scanChance) {
            const targetsDetected = Math.floor(Math.random() * 3);
            const targets = [];
            for (let i = 0; i < targetsDetected; i++) {
              const dx = (Math.random() - 0.5) * 40;
              const dz = (Math.random() - 0.5) * 40;
              targets.push({
                x: drone.position[0] + dx,
                z: drone.position[2] + dz,
                isHuman: Math.random() > 0.4,
              });
            }

            store.addActiveScan({
              droneId: drone.id,
              position: [drone.position[0], 0, drone.position[2]],
              radius: 40,
              duration: 5000,
              targets,
            });

            // Only add observation reasoning if targets were found, or if it's a scout
            if (targetsDetected > 0 || drone.role === 'scout') {
              store.addDroneReasoning(drone.id, `executeThermalSweep() - Success ✓ | Signatures: ${targetsDetected}`, 'observation');
            }
          }
        }
        */

        // IDLE SCOUT SCANS - Continuous faint scanning for scout drones
        if (drone.role === 'scout' && drone.status === 'online' && tickCount.current % 5 === 0) {
          // Every 5 ticks (20 seconds), refresh the idle scan to follow drone movement
          store.addActiveScan({
            droneId: drone.id,
            position: [drone.position[0], 0, drone.position[2]],
            radius: 35,
            duration: 25000, // 25 seconds - refreshes before expiration
            targets: [],
            intensity: 0.3, // 30% opacity - faint but visible
          });
        }

        // Charger drone logic
        if (drone.role === 'charger' && drone.status === 'online') {
          // Find drones with battery < 30%
          const lowBatteryDrones = currentDrones.filter(d => d.id !== drone.id && d.battery < 30);
          
          if (lowBatteryDrones.length > 0) {
            // Pick lowest battery drone
            lowBatteryDrones.sort((a, b) => a.battery - b.battery);
            const targetDrone = lowBatteryDrones[0];
            
            const dx = targetDrone.position[0] - x;
            const dz = targetDrone.position[2] - z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            if (dist > 10) {
              // Move towards it
              store.updateDrone(drone.id, {
                targetPosition: [targetDrone.position[0], drone.position[1], targetDrone.position[2]],
              });
            } else {
              // We are close enough to charge
              store.setActivePowerPath(drone.id, targetDrone.id, true);
              const chargerId = drone.id;
              const targetId = targetDrone.id;
              
              // Add battery to target
              store.updateDrone(targetDrone.id, {
                battery: Math.min(100, targetDrone.battery + 5) // Charge by 5% per tick
              });

              // DISABLED: Charger status logs for clean initial state
              // if (Math.random() < 0.3) {
              //   store.addDroneReasoning(drone.id, `Charging ${targetDrone.id}... (${targetDrone.battery.toFixed(0)}%)`, 'action');
              // }

              setTimeout(() => {
                useStore.getState().setActivePowerPath(chargerId, targetId, false);
              }, TICK_INTERVAL - 500);
            }
          }
        }

        // Apply update
        store.updateDrone(drone.id, {
          battery: newBattery,
          status: newStatus,
          position: drone.targetPosition ? drone.position : [x, y, z],
        });

        // DISABLED: All event logs removed for clean initial state
        // Only show logs during active rescue missions
        // if (statusChanged) {
        //   pushEvent(`updateDroneStatus({ id: '${drone.id}', to: '${newStatus}' }) - Success ✓`, 'status');
        // }
        //
        // if (drone.battery > 15 && newBattery <= 15) {
        //   pushEvent(`triggerBatteryCritical({ id: '${drone.id}', level: '${newBattery.toFixed(1)}%' }) - Warning ⚠`, 'status');
        // }
        //
        // if (newBattery <= 0 && drone.status !== 'offline') {
        //   pushEvent(`executeEmergencyShutdown({ id: '${drone.id}', reason: 'battery_depleted' }) - Success ✓`, 'status');
        // }

        // DISABLED: Background reasoning removed for clean initial state
        // Only show logs during active rescue missions
        // if (Math.random() < REASONING_CHANCE) {
        //   const contextReasons = CONTEXT_REASONING[drone.role] || [];
        //   const contextMatch = contextReasons.find(c => c.condition(drone));
        //
        //   if (contextMatch) {
        //     store.addDroneReasoning(drone.id, contextMatch.text(drone), 'action');
        //   } else {
        //     const idleReasons = IDLE_REASONING[drone.role] || IDLE_REASONING.relay;
        //     const reasoning = getRandomElement(idleReasons);
        //     store.addDroneReasoning(drone.id, reasoning, 'thought');
        //   }
        // }

        // DISABLED: Inter-drone messages removed for clean initial state
        // Only show communication during active rescue missions
        // const proactiveMultiplier = drone.proactiveLevel || 0.5;
        // const effectiveMessageChance = MESSAGE_CHANCE * (1 + proactiveMultiplier);
        //
        // if (Math.random() < effectiveMessageChance && drone.status === 'online') {
        //   const otherDrones = currentDrones.filter(d => d.id !== drone.id && d.status === 'online');
        //
        //   if (otherDrones.length > 0) {
        //     // Proactive behavior: prioritize nearby drones
        //     const SWARM_PROXIMITY_THRESHOLD = 50;
        //     const nearbyDrones = otherDrones
        //       .map(d => ({
        //         drone: d,
        //         distance: Math.sqrt(
        //           Math.pow(d.position[0] - drone.position[0], 2) +
        //           Math.pow(d.position[2] - drone.position[2], 2)
        //         )
        //       }))
        //       .filter(item => item.distance < SWARM_PROXIMITY_THRESHOLD);
        //
        //     // If proactive and has nearby drones, favor them heavily
        //     const targetDrone = (nearbyDrones.length > 0 && Math.random() < proactiveMultiplier)
        //       ? nearbyDrones[Math.floor(Math.random() * nearbyDrones.length)].drone
        //       : getRandomElement(otherDrones);
        //
        //     const messageType = getRandomElement(Object.keys(MESSAGE_TEMPLATES)) as keyof typeof MESSAGE_TEMPLATES;
        //     const template = getRandomElement(MESSAGE_TEMPLATES[messageType]);
        //
        //     const replacements: Record<string, string> = {
        //       grid: `D${Math.floor(Math.random() * 16)}`,
        //       sector: `${String.fromCharCode(65 + Math.floor(Math.random() * 16))}${Math.floor(Math.random() * 16)}`,
        //       drone: targetDrone.id,
        //       temp: (35 + Math.random() * 10).toFixed(1),
        //       count: String(Math.floor(Math.random() * 10)),
        //       signal: String(60 + Math.floor(Math.random() * 40)),
        //       battery: String(Math.floor(drone.battery)),
        //     };
        //
        //     const message = replaceTemplate(template, replacements);
        //     store.addDroneMessage(drone.id, targetDrone.id, message, messageType as any);
        //
        //     // Visually show active communication by making path shimmer
        //     store.setActiveMessagePath(drone.id, targetDrone.id, true);
        //
        //     // Deactivate shimmer after a short delay (simulating packet transmission)
        //     // Need to save IDs because store closures might lose context
        //     const fromId = drone.id;
        //     const toId = targetDrone.id;
        //     setTimeout(() => {
        //       useStore.getState().setActiveMessagePath(fromId, toId, false);
        //     }, 1500 + Math.random() * 1000);
        //
        //     // Update last message time
        //     store.updateDrone(drone.id, {
        //       lastMessageTime: Date.now()
        //     });
        //   }
        // }
        //
        // // Proactive idle seeking behavior
        // const COMMUNICATION_IDLE_THRESHOLD = 20000; // 20 seconds
        // if (drone.status === 'online' && drone.proactiveLevel && drone.proactiveLevel > 0.6) {
        //   const lastCommTime = drone.lastMessageTime || 0;
        //   const timeSinceLastComm = Date.now() - lastCommTime;
        //
        //   if (timeSinceLastComm > COMMUNICATION_IDLE_THRESHOLD && Math.random() < 0.2) {
        //     const otherDrones = currentDrones.filter(d => d.id !== drone.id && d.status === 'online');
        //     const nearbyDrones = otherDrones.filter(d => {
        //       const dist = Math.sqrt(
        //         Math.pow(d.position[0] - drone.position[0], 2) +
        //         Math.pow(d.position[2] - drone.position[2], 2)
        //       );
        //       return dist < 60;
        //     });
        //
        //     if (nearbyDrones.length > 0) {
        //       const targetDrone = getRandomElement(nearbyDrones);
        //       store.addDroneReasoning(drone.id,
        //         `initSwarmProtocol(${targetDrone.id}) - Success ✓ | Status: nearby`,
        //         'action'
        //       );
        //       store.addDroneMessage(drone.id, targetDrone.id,
        //         `status_establishSwarmSync() - In Progress ⟳`,
        //         'status'
        //       );
        //
        //       store.setActiveMessagePath(drone.id, targetDrone.id, true);
        //       const fId = drone.id;
        //       const tId = targetDrone.id;
        //       setTimeout(() => {
        //         useStore.getState().setActiveMessagePath(fId, tId, false);
        //       }, 2000);
        //
        //       store.updateDrone(drone.id, { lastMessageTime: Date.now() });
        //     }
        //   }
        // }
      });

      // 2. Update SOS signals (strength fluctuation)
      currentSOS.forEach((sos) => {
        const strengthChange = (Math.random() - 0.5) * 0.05;
        const newStrength = Math.max(0.3, Math.min(1, sos.strength + strengthChange));

        if (Math.abs(newStrength - sos.strength) > 0.02) {
          store.updateSOS(sos.id, { strength: newStrength });
        }
      });

      // DISABLED: Relay event logs removed for clean initial state
      // // 3. Occasional relay events
      // if (Math.random() < RELAY_EVENT_CHANCE) {
      //   const relayDrones = currentDrones.filter(d => d.role === 'relay' && d.status === 'online');
      //   if (relayDrones.length > 0) {
      //     const randomDrone = relayDrones[Math.floor(Math.random() * relayDrones.length)];
      //     const messages = [
      //       `relayDataPacket() - Success ✓ | Node: ${randomDrone.id}`,
      //       `executeMeshHandshake({ node: '${randomDrone.id}', target: 'Base' }) - Success ✓`,
      //       `boostSignal() - Success ✓ | Node: ${randomDrone.id}`,
      //       `transmitEncryptedData() - Success ✓ | Node: ${randomDrone.id}`,
      //     ];
      //     pushEvent(messages[Math.floor(Math.random() * messages.length)], 'relay');
      //   }
      // }

      // DISABLED: Coverage event logs removed for clean initial state
      // // 4. Occasional coverage events
      // if (tickCount.current % 3 === 0 && Math.random() < 0.1) {
      //   const wifiDrones = currentDrones.filter(d => d.role === 'wifi' && d.status === 'online');
      //   if (wifiDrones.length > 0) {
      //     const randomDrone = wifiDrones[Math.floor(Math.random() * wifiDrones.length)];
      //     pushEvent(`extendWiFiCoverage() - Success ✓ | Node: ${randomDrone.id}`, 'coverage');
      //   }
      // }

      // DISABLED: Auto-generated mission logs removed for clean initial state
      // // 5. Auto-generate missions
      // if (!store.activeMission && Math.random() < MISSION_CHANCE) {
      //   const missionTypes: Array<'scan' | 'relay' | 'supply' | 'coverage'> = ['scan', 'relay', 'supply', 'coverage'];
      //
      //   const hasSOS = currentSOS.length > 0;
      //   const hasSupplyDrone = currentDrones.some(d => d.role === 'supply' && d.status === 'online');
      //   const hasRelayDrone = currentDrones.some(d => d.role === 'relay' && d.status === 'online');
      //   const hasWifiDrone = currentDrones.some(d => d.role === 'wifi' && d.status === 'online');
      //
      //   const validTypes = missionTypes.filter(type => {
      //     if (type === 'supply' && (!hasSOS || !hasSupplyDrone)) return false;
      //     if (type === 'relay' && (!hasSOS || !hasRelayDrone)) return false;
      //     if (type === 'coverage' && !hasWifiDrone) return false;
      //     return true;
      //   });
      //
      //   if (validTypes.length > 0) {
      //     const missionType = getRandomElement(validTypes);
      //     const mission = store.generateMission(missionType);
      //     store.startMission(mission.id);
      //     // DISABLED: Mission logs removed for clean initial state
      //     // store.addReasoning(
      //     //   `generateMission({ name: '${mission.name}', tasks: ${mission.tasks.length} }) - Success ✓`,
      //     //   'action'
      //     // );
      //     // store.addDroneReasoning(
      //     //   currentDrones.find(d => d.role === missionType || d.role === 'relay')?.id || currentDrones[0]?.id,
      //     //   `assignMission({ name: '${mission.name}' }) - Success ✓`,
      //     //   'action'
      //     // );
      //   }
      // }

      // DISABLED: Mission progress logs removed for clean initial state
      // // 6. Progress active mission tasks
      // if (store.activeMission && store.activeMission.status === 'in_progress') {
      //   const pendingTask = store.activeMission.tasks.find(t => t.status === 'in_progress');
      //   if (pendingTask) {
      //     store.updateTaskStatus(store.activeMission.id, pendingTask.id, 'completed');
      //
      //     const nextPendingTask = store.activeMission.tasks.find(t => t.status === 'pending');
      //     if (nextPendingTask) {
      //       store.updateTaskStatus(store.activeMission.id, nextPendingTask.id, 'in_progress');
      //     } else {
      //       store.completeMission(store.activeMission.id);
      //       store.addReasoning(
      //         `completeMission({ name: '${store.activeMission.name}' }) - Success ✓`,
      //         'observation'
      //       );
      //     }
      //   }
      // }

    }, TICK_INTERVAL);

    return () => clearInterval(interval);
  }, []); // Intentionally empty - we use getState() inside

  return null;
}
