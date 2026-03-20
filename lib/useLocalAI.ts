'use client';

import { useEffect, useRef } from 'react';
import { useStore } from './store';
import {
  makeLocalAIDecision,
  calculatePeopleFoundPerMinute,
  calculateEfficiency,
  type LocalAIContext,
} from './local-ai-rules';

const LOCAL_AI_UPDATE_INTERVAL = 2000; // Update every 2 seconds
const STATISTICS_UPDATE_INTERVAL = 10000; // Update stats every 10 seconds

export function useLocalAI() {
  const drones = useStore((s) => s.drones);
  const updateDrone = useStore((s) => s.updateDrone);
  const initializeDroneLocalAI = useStore((s) => s.initializeDroneLocalAI);
  const updateDroneLocalAI = useStore((s) => s.updateDroneLocalAI);
  const addDroneLocalReasoning = useStore((s) => s.addDroneLocalReasoning);

  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPositions = useRef<Map<string, [number, number, number]>>(new Map());

  // Initialize Local AI for all drones on mount
  useEffect(() => {
    drones.forEach((drone) => {
      if (!drone.localAI) {
        initializeDroneLocalAI(drone.id, 'balanced');
      }
    });
  }, [drones.length, initializeDroneLocalAI]);

  // Main Local AI update loop
  useEffect(() => {
    const updateLocalAI = () => {
      const store = useStore.getState();
      const currentDrones = store.drones;
      const hasActiveSOS = store.sosSignals.length > 0;
      const hasActiveMission = store.activeMission !== null;

      currentDrones.forEach((drone) => {
        if (!drone.localAI || !drone.localAI.enabled) return;

        // IMPORTANT: Skip local AI reasoning for scout drones during idle state
        // Scouts should only show logs during SOS response (handled by Scene.tsx)
        if (drone.role === 'scout' && !hasActiveSOS) {
          // Still track distance for stats, but no reasoning
          const lastPos = lastPositions.current.get(drone.id);
          if (lastPos) {
            const dx = drone.position[0] - lastPos[0];
            const dz = drone.position[2] - lastPos[2];
            const distanceDelta = Math.sqrt(dx * dx + dz * dz);
            const { localAI } = drone;
            updateDroneLocalAI(drone.id, {
              stats: {
                ...localAI.stats,
                distanceTraveled: localAI.stats.distanceTraveled + distanceDelta,
              },
            });
          }
          lastPositions.current.set(drone.id, drone.position);
          return;
        }

        const { localAI } = drone;

        // Build context for decision making
        const context: LocalAIContext = {
          droneId: drone.id,
          battery: drone.battery,
          status: drone.status,
          personality: localAI.personality,
          currentGoal: localAI.currentGoal,
          peopleFound: localAI.stats.peopleFound,
          scansCompleted: localAI.stats.scansCompleted,
        };

        // Make decision
        const decision = makeLocalAIDecision(context);

        // Track distance traveled
        const lastPos = lastPositions.current.get(drone.id);
        if (lastPos) {
          const dx = drone.position[0] - lastPos[0];
          const dz = drone.position[2] - lastPos[2];
          const distanceDelta = Math.sqrt(dx * dx + dz * dz);
          // Update distance traveled in stats
          updateDroneLocalAI(drone.id, {
            stats: {
              ...localAI.stats,
              distanceTraveled: localAI.stats.distanceTraveled + distanceDelta,
            },
          });
        }
        lastPositions.current.set(drone.id, drone.position);

        // Execute decision
        let outcome: "success" | "partial" | "failed" = "success";
        let duration = Math.random() * 500 + 200; // Mock execution time

        // Automatic scanning disabled - only SOS flow triggers scans now
        /*
        if (decision.shouldScan) {
          // Trigger scan
          addActiveScan({
            droneId: drone.id,
            position: drone.position,
            radius: 40,
            duration: 5000,
            targets: [],
          });

          // Update stats
          updateDroneLocalAI(drone.id, {
            stats: {
              ...localAI.stats,
              scansCompleted: localAI.stats.scansCompleted + 1,
            },
            lastScanTime: Date.now(),
          });
        }
        */

        if (decision.shouldReturn) {
          // Move towards base (0, 0, 0)
          updateDrone(drone.id, {
            targetPosition: [0, 15, 0],
          });
          outcome = "partial";
        }

        // Only add reasoning entry during active operations (SOS, missions, or critical states)
        // This prevents cluttering the log with idle "thinking" messages
        const hasCriticalBattery = drone.battery < 20;
        const hasActiveOperation = hasActiveSOS || hasActiveMission;

        if (hasActiveOperation || hasCriticalBattery || drone.status !== 'online') {
          addDroneLocalReasoning({
            droneId: drone.id,
            thought: decision.reasoning,
            action: decision.action,
            outcome,
            duration,
          });
        }

        // Update current goal
        updateDroneLocalAI(drone.id, {
          currentGoal: decision.action,
        });
      });
    };

    // Start update interval
    updateIntervalRef.current = setInterval(updateLocalAI, LOCAL_AI_UPDATE_INTERVAL);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [updateDrone, updateDroneLocalAI, addDroneLocalReasoning]);

  // Statistics update loop
  useEffect(() => {
    const updateStatistics = () => {
      const store = useStore.getState();
      const currentDrones = store.drones;
      const currentScans = store.activeScans;

      currentDrones.forEach((drone) => {
        if (!drone.localAI) return;

        const { localAI } = drone;

        // Calculate people found per minute
        const peopleFoundPerMinute = calculatePeopleFoundPerMinute(
          localAI.stats.peopleFound,
          localAI.stats.uptime
        );

        // Count people found in scans for this drone
        const peopleInScans = currentScans
          .filter((scan) => scan.droneId === drone.id)
          .reduce((sum, scan) => sum + scan.targets.filter((t) => t.isHuman).length, 0);

        // Calculate efficiency
        const totalActions = localAI.stats.scansCompleted + localAI.stats.distanceTraveled / 10;
        const efficiency = calculateEfficiency(totalActions, 100 - drone.battery);

        // Update stats
        updateDroneLocalAI(drone.id, {
          stats: {
            ...localAI.stats,
            peopleFound: peopleInScans,
            peopleFoundPerMinute,
            distanceTraveled: localAI.stats.distanceTraveled,
            efficiency,
            uptime: localAI.stats.uptime + STATISTICS_UPDATE_INTERVAL,
          },
        });
      });
    };

    // Start statistics interval
    statsIntervalRef.current = setInterval(updateStatistics, STATISTICS_UPDATE_INTERVAL);

    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, [updateDroneLocalAI]);

  return {
    initialized: true,
    activeDrones: drones.filter((d) => d.localAI?.enabled).length,
  };
}
