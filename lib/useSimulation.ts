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
    "Checking relay chain integrity...",
    "Monitoring signal strength between nodes...",
    "Verifying data packet transmission...",
    "Awaiting command from commander...",
    "Relay path stable",
    "Data throughput: optimal",
    "Mesh network handshake complete",
  ],
  wifi: [
    "Scanning coverage area...",
    "Monitoring connectivity nodes...",
    "Signal strength optimal",
    "Checking for new devices...",
    "Coverage area secure",
    "Bandwidth allocation: stable",
    "Client connections: active",
  ],
  supply: [
    "Checking inventory status...",
    "Awaiting dispatch orders...",
    "Verifying delivery coordinates...",
    "Battery within operational range",
    "Standby mode active",
    "Navigation system: ready",
    "Cargo capacity: available",
  ],
  scout: [
    "Conducting aerial reconnaissance...",
    "Scanning terrain for obstacles...",
    "Monitoring atmospheric conditions...",
    "Analyzing thermal signatures...",
    "Area clear of threats",
    "Navigation waypoints updated",
    "Reconnaissance data collected",
  ],
  charger: [
    "Monitoring fleet battery levels...",
    "Maintaining power reserves...",
    "Ready to deploy charging tether...",
    "Calculating optimal refueling routes...",
    "Awaiting low battery signals...",
    "Power banks at maximum capacity",
    "Scanning for active drones needing recharge",
  ],
};

const CONTEXT_REASONING: Record<string, { condition: (d: any) => boolean; text: (d: any) => string }[]> = {
  relay: [
    { condition: (d) => d.battery < 20, text: (d) => `LOW BATTERY WARNING: ${d.id} at ${d.battery.toFixed(0)}% - initiating return to base` },
    { condition: (d) => d.battery < 10, text: (d) => `CRITICAL: ${d.id} battery critical - immediate recall required` },
    { condition: (d) => d.status === 'syncing', text: (d) => `${d.id} syncing data packets...` },
    { condition: (d) => d.status === 'offline', text: (d) => `${d.id} offline - connection lost` },
  ],
  wifi: [
    { condition: (d) => d.battery < 20, text: (d) => `LOW BATTERY WARNING: ${d.id} at ${d.battery.toFixed(0)}}% - initiating return to base` },
    { condition: (d) => d.battery < 10, text: (d) => `CRITICAL: ${d.id} battery critical - immediate recall required` },
    { condition: (d) => d.status === 'offline', text: (d) => `${d.id} offline - coverage gap detected` },
  ],
  supply: [
    { condition: (d) => d.battery < 20, text: (d) => `LOW BATTERY WARNING: ${d.id} at ${d.battery.toFixed(0)}% - initiating return to base` },
    { condition: (d) => d.battery < 10, text: (d) => `CRITICAL: ${d.id} battery critical - aborting mission` },
    { condition: (d) => d.status === 'syncing', text: (d) => `${d.id} calculating optimal delivery route...` },
  ],
  scout: [
    { condition: (d) => d.battery < 20, text: (d) => `LOW BATTERY WARNING: ${d.id} at ${d.battery.toFixed(0)}% - returning to base` },
    { condition: (d) => d.battery < 10, text: (d) => `CRITICAL: ${d.id} battery critical - aborting reconnaissance` },
    { condition: (d) => d.status === 'syncing', text: (d) => `${d.id} uploading reconnaissance data...` },
    { condition: (d) => d.status === 'offline', text: (d) => `${d.id} offline - lost visual contact` },
  ],
  charger: [
    { condition: (d) => d.battery < 20, text: (d) => `WARNING: ${d.id} reserves at ${d.battery.toFixed(0)}% - heading to base` },
    { condition: (d) => d.status === 'syncing', text: (d) => `${d.id} transferring power payload...` },
    { condition: (d) => d.status === 'offline', text: (d) => `${d.id} offline - power delivery system failed` },
  ],
};

const MESSAGE_TEMPLATES: Record<string, string[]> = {
  command: [
    "CMD: Proceed to grid {grid}",
    "CMD: Initiate thermal scan sector {sector}",
    "CMD: Return to base - low battery",
    "CMD: Establish relay to {drone}",
    "CMD: Activate coverage boost",
  ],
  status: [
    "Status: Relay path confirmed",
    "Status: Data transmission complete",
    "Status: Position updated",
    "Status: Ready for next command",
    "Status: Connection stable",
  ],
  data: [
    "DATA: Thermal reading {temp}°C",
    "DATA: {count} devices in range",
    "DATA: Coverage map updated",
    "DATA: Signal strength {signal}%",
  ],
  alert: [
    "ALERT: Low battery {battery}%",
    "ALERT: Obstacle detected",
    "ALERT: Connection lost - retrying",
    "ALERT: Temperature warning",
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

  const tickCount = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      tickCount.current++;
      const store = useStore.getState();
      const currentDrones = store.drones;
      const currentSOS = store.sosSignals;

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
        }

        // Supply drones move towards nearest SOS
        if (drone.role === 'supply' && drone.status === 'online' && currentSOS.length > 0) {
          // Find nearest SOS
          let nearestSOS = currentSOS[0];
          let nearestDist = Infinity;

          currentSOS.forEach((sos) => {
            const dx = sos.position[0] - x;
            const dz = sos.position[2] - z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearestSOS = sos;
            }
          });

          // Set target position
          if (nearestDist > 5) {
            store.updateDrone(drone.id, {
              targetPosition: [nearestSOS.position[0], 15, nearestSOS.position[2]],
            });
          }
        }

        // Universal routine scan logic for all drones (Swarm lidar)
        // Different roles scan with different frequencies
        let scanChance = 0;
        if (drone.status === 'online') {
          if (drone.role === 'scout') scanChance = 0.25; // Scouts scan very frequently
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
              store.addDroneReasoning(drone.id, `Routine thermal sweep completed. ${targetsDetected} signatures found.`, 'observation');
            }
          }
        }
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
              
              // Add battery to target
              store.updateDrone(targetDrone.id, {
                battery: Math.min(100, targetDrone.battery + 5) // Charge by 5% per tick
              });
              
              if (Math.random() < 0.3) {
                store.addDroneReasoning(drone.id, `Charging ${targetDrone.id}... (${targetDrone.battery.toFixed(0)}%)`, 'action');
              }
              
              setTimeout(() => {
                store.setActivePowerPath(drone.id, targetDrone.id, false);
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

        // Push events for significant changes
        if (statusChanged) {
          pushEvent(`Drone ${drone.id} status: ${drone.status} → ${newStatus}`, 'status');
        }

        if (drone.battery > 15 && newBattery <= 15) {
          pushEvent(`Drone ${drone.id} battery critical: ${newBattery.toFixed(1)}%`, 'status');
        }

        if (newBattery <= 0 && drone.status !== 'offline') {
          pushEvent(`Drone ${drone.id} shutdown - battery depleted`, 'status');
        }

        // Generate per-drone reasoning (context-aware)
        if (Math.random() < REASONING_CHANCE) {
          const contextReasons = CONTEXT_REASONING[drone.role] || [];
          const contextMatch = contextReasons.find(c => c.condition(drone));
          
          if (contextMatch) {
            store.addDroneReasoning(drone.id, contextMatch.text(drone), 'action');
          } else {
            const idleReasons = IDLE_REASONING[drone.role] || IDLE_REASONING.relay;
            const reasoning = getRandomElement(idleReasons);
            store.addDroneReasoning(drone.id, reasoning, 'thought');
          }
        }

        // Generate inter-drone messages (proactive swarm communication)
        const proactiveMultiplier = drone.proactiveLevel || 0.5;
        const effectiveMessageChance = MESSAGE_CHANCE * (1 + proactiveMultiplier);
        
        if (Math.random() < effectiveMessageChance && drone.status === 'online') {
          const otherDrones = currentDrones.filter(d => d.id !== drone.id && d.status === 'online');
          
          if (otherDrones.length > 0) {
            // Proactive behavior: prioritize nearby drones
            const SWARM_PROXIMITY_THRESHOLD = 50;
            const nearbyDrones = otherDrones
              .map(d => ({
                drone: d,
                distance: Math.sqrt(
                  Math.pow(d.position[0] - drone.position[0], 2) +
                  Math.pow(d.position[2] - drone.position[2], 2)
                )
              }))
              .filter(item => item.distance < SWARM_PROXIMITY_THRESHOLD);
            
            // If proactive and has nearby drones, favor them heavily
            const targetDrone = (nearbyDrones.length > 0 && Math.random() < proactiveMultiplier)
              ? nearbyDrones[Math.floor(Math.random() * nearbyDrones.length)].drone
              : getRandomElement(otherDrones);
              
            const messageType = getRandomElement(Object.keys(MESSAGE_TEMPLATES)) as keyof typeof MESSAGE_TEMPLATES;
            const template = getRandomElement(MESSAGE_TEMPLATES[messageType]);
            
            const replacements: Record<string, string> = {
              grid: `D${Math.floor(Math.random() * 16)}`,
              sector: `${String.fromCharCode(65 + Math.floor(Math.random() * 16))}${Math.floor(Math.random() * 16)}`,
              drone: targetDrone.id,
              temp: (35 + Math.random() * 10).toFixed(1),
              count: String(Math.floor(Math.random() * 10)),
              signal: String(60 + Math.floor(Math.random() * 40)),
              battery: String(Math.floor(drone.battery)),
            };
            
            const message = replaceTemplate(template, replacements);
            store.addDroneMessage(drone.id, targetDrone.id, message, messageType as any);
            
            // Visually show active communication by making path shimmer
            store.setActiveMessagePath(drone.id, targetDrone.id, true);
            
            // Deactivate shimmer after a short delay (simulating packet transmission)
            setTimeout(() => {
              store.setActiveMessagePath(drone.id, targetDrone.id, false);
            }, 1500 + Math.random() * 1000);
            
            // Update last message time
            store.updateDrone(drone.id, {
              lastMessageTime: Date.now()
            });
          }
        }
        
        // Proactive idle seeking behavior
        const COMMUNICATION_IDLE_THRESHOLD = 20000; // 20 seconds
        if (drone.status === 'online' && drone.proactiveLevel && drone.proactiveLevel > 0.6) {
          const lastCommTime = drone.lastMessageTime || 0;
          const timeSinceLastComm = Date.now() - lastCommTime;
          
          if (timeSinceLastComm > COMMUNICATION_IDLE_THRESHOLD && Math.random() < 0.2) {
            const otherDrones = currentDrones.filter(d => d.id !== drone.id && d.status === 'online');
            const nearbyDrones = otherDrones.filter(d => {
              const dist = Math.sqrt(
                Math.pow(d.position[0] - drone.position[0], 2) +
                Math.pow(d.position[2] - drone.position[2], 2)
              );
              return dist < 60;
            });
            
            if (nearbyDrones.length > 0) {
              const targetDrone = getRandomElement(nearbyDrones);
              store.addDroneReasoning(drone.id, 
                `Initiating swarm protocol with ${targetDrone.id} (nearby)`, 
                'action'
              );
              store.addDroneMessage(drone.id, targetDrone.id, 
                `PROACTIVE: Establishing swarm sync connection...`, 
                'status'
              );
              
              store.setActiveMessagePath(drone.id, targetDrone.id, true);
              setTimeout(() => {
                store.setActiveMessagePath(drone.id, targetDrone.id, false);
              }, 2000);
              
              store.updateDrone(drone.id, { lastMessageTime: Date.now() });
            }
          }
        }
      });

      // 2. Update SOS signals (strength fluctuation)
      currentSOS.forEach((sos) => {
        const strengthChange = (Math.random() - 0.5) * 0.05;
        const newStrength = Math.max(0.3, Math.min(1, sos.strength + strengthChange));

        if (Math.abs(newStrength - sos.strength) > 0.02) {
          store.updateSOS(sos.id, { strength: newStrength });
        }
      });

      // 3. Occasional relay events
      if (Math.random() < RELAY_EVENT_CHANCE) {
        const relayDrones = currentDrones.filter(d => d.role === 'relay' && d.status === 'online');
        if (relayDrones.length > 0) {
          const randomDrone = relayDrones[Math.floor(Math.random() * relayDrones.length)];
          const messages = [
            `Data packet relayed via ${randomDrone.id}`,
            `Mesh network handshake: ${randomDrone.id} ↔ Base`,
            `Signal boosted through ${randomDrone.id}`,
            `Encrypted transmission via ${randomDrone.id} complete`,
          ];
          pushEvent(messages[Math.floor(Math.random() * messages.length)], 'relay');
        }
      }

      // 4. Occasional coverage events
      if (tickCount.current % 3 === 0 && Math.random() < 0.1) {
        const wifiDrones = currentDrones.filter(d => d.role === 'wifi' && d.status === 'online');
        if (wifiDrones.length > 0) {
          const randomDrone = wifiDrones[Math.floor(Math.random() * wifiDrones.length)];
          pushEvent(`WiFi coverage extended by ${randomDrone.id}`, 'coverage');
        }
      }

      // 5. Auto-generate missions
      if (!store.activeMission && Math.random() < MISSION_CHANCE) {
        const missionTypes: Array<'scan' | 'relay' | 'supply' | 'coverage'> = ['scan', 'relay', 'supply', 'coverage'];
        
        const hasSOS = currentSOS.length > 0;
        const hasSupplyDrone = currentDrones.some(d => d.role === 'supply' && d.status === 'online');
        const hasRelayDrone = currentDrones.some(d => d.role === 'relay' && d.status === 'online');
        const hasWifiDrone = currentDrones.some(d => d.role === 'wifi' && d.status === 'online');

        const validTypes = missionTypes.filter(type => {
          if (type === 'supply' && (!hasSOS || !hasSupplyDrone)) return false;
          if (type === 'relay' && (!hasSOS || !hasRelayDrone)) return false;
          if (type === 'coverage' && !hasWifiDrone) return false;
          return true;
        });

        if (validTypes.length > 0) {
          const missionType = getRandomElement(validTypes);
          const mission = store.generateMission(missionType);
          store.startMission(mission.id);
          store.addReasoning(
            `Auto-generated mission: ${mission.name} with ${mission.tasks.length} tasks`,
            'action'
          );
          store.addDroneReasoning(
            currentDrones.find(d => d.role === missionType || d.role === 'relay')?.id || currentDrones[0]?.id,
            `Mission assigned: ${mission.name}`,
            'action'
          );
        }
      }

      // 6. Progress active mission tasks
      if (store.activeMission && store.activeMission.status === 'in_progress') {
        const pendingTask = store.activeMission.tasks.find(t => t.status === 'in_progress');
        if (pendingTask) {
          store.updateTaskStatus(store.activeMission.id, pendingTask.id, 'completed');
          
          const nextPendingTask = store.activeMission.tasks.find(t => t.status === 'pending');
          if (nextPendingTask) {
            store.updateTaskStatus(store.activeMission.id, nextPendingTask.id, 'in_progress');
          } else {
            store.completeMission(store.activeMission.id);
            store.addReasoning(
              `Mission completed: ${store.activeMission.name}`,
              'observation'
            );
          }
        }
      }

    }, TICK_INTERVAL);

    return () => clearInterval(interval);
  }, []); // Intentionally empty - we use getState() inside

  return null;
}
