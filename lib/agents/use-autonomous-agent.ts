/**
 * Autonomous Agent Hook
 *
 * Integrates the multi-agent system with the existing OpenClaw simulation,
 * enabling autonomous decision-making using per-drone SLM instances.
 */

import { useEffect, useRef, useCallback } from "react";
import { useStore } from "../store";
import { useMultiAgentStore } from "./multi-agent-store";
import {
  buildSLMContext,
  formatContextForSLM,
  generateSLMPrompt,
  checkDecisionTriggers,
} from "./role-prompts";
import type { DroneRole } from "../store";

// ─────────────────────────────────────────────────────────────────────────────────
// Autonomous Agent Hook
// ─────────────────────────────────────────────────────────────────────────────────

interface UseAutonomousAgentOptions {
  enabled?: boolean;
  decisionInterval?: number; // ms between autonomous decisions
  slmTimeout?: number; // ms to wait for SLM response
}

export function useAutonomousAgent(options: UseAutonomousAgentOptions = {}) {
  const {
    enabled = true,
    decisionInterval = 10000, // 10 seconds
    slmTimeout = 5000, // 5 seconds
  } = options;

  const drones = useStore((state) => state.drones);
  const sosSignals = useStore((state) => state.sosSignals);
  const updateDrone = useStore((state) => state.updateDrone);
  const pushEvent = useStore((state) => state.pushEvent);
  const addReasoning = useStore((state) => state.addReasoning);
  const addDroneReasoning = useStore((state) => state.addDroneReasoning);

  const agentPeers = useMultiAgentStore((state) => state.agentPeers);
  const agentLogs = useMultiAgentStore((state) => state.agentLogs);
  const logAgentAction = useMultiAgentStore((state) => state.logAgentAction);
  const updateAgentMetrics = useMultiAgentStore((state) => state.updateAgentMetrics);
  const setAgentCommunicationMode = useMultiAgentStore(
    (state) => state.setAgentCommunicationMode
  );

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const decisionInProgress = useRef<Set<string>>(new Set());

  // Make autonomous decision for a specific drone
  const makeAutonomousDecision = useCallback(
    async (droneId: string) => {
      if (!enabled || decisionInProgress.current.has(droneId)) {
        return;
      }

      const drone = drones.find((d) => d.id === droneId);
      if (!drone || drone.status !== "online") {
        return;
      }

      decisionInProgress.current.add(droneId);

      try {
        const startTime = performance.now();

        // Build context for SLM
        const nearbyPeers = Array.from(agentPeers.values())
          .filter((peer) => peer.id !== droneId)
          .slice(0, 5) // Limit to 5 nearest peers
          .map((peer) => ({
            id: peer.id,
            role: peer.role,
            distance: peer.distance,
            signalStrength: peer.signalStrength,
          }));

        const recentLogs = agentLogs
          .filter((log) => log.droneId === droneId)
          .slice(-5) // Last 5 log entries
          .map((log) =>
            log.autonomousAction || log.reasoning || log.toolName || "System operation"
          );

        const context = buildSLMContext(
          drone.id,
          drone.role,
          drone.position,
          drone.battery,
          nearbyPeers,
          drone.proactiveLevel && drone.proactiveLevel > 0.7 ? "Active patrol" : "Standing by",
          recentLogs,
          useMultiAgentStore((state) => state.getAgentCommunicationMode(droneId)),
          undefined,
          {
            totalDrones: drones.length,
            activeRelays: drones.filter((d) => d.role === "relay").length,
            emergencyActive: useMultiAgentStore((state) => state.isEmergencyActive()),
          }
        );

        // Check for decision triggers (emergencies, low battery, etc.)
        const triggers = checkDecisionTriggers(drone.role, context);

        if (triggers.length > 0) {
          // Handle triggered decision
          const trigger = triggers[0]; // Use highest priority trigger
          await handleTriggeredDecision(drone, context, trigger);
        } else {
          // Normal autonomous decision
          await awaitNormalDecision(drone, context);
        }

        const slmResponseTime = performance.now() - startTime;

        // Update metrics
        updateAgentMetrics(droneId, {
          slmResponseTime,
          slmQueryCount: (agentLogs.get(droneId)?.length || 0) + 1,
          messageCount: (agentLogs.get(droneId)?.length || 0) + 1,
          batteryLevel: drone.battery,
          position: drone.position,
        });

        // Log the decision
        logAgentAction({
          id: `decision-${droneId}-${Date.now()}`,
          timestamp: Date.now(),
          droneId: drone.id,
          droneRole: drone.role,
          autonomousAction: "Autonomous decision made",
          reasoning: `SLM-based autonomous decision (${slmResponseTime.toFixed(0)}ms)`,
          slmResponseTime,
        });
      } catch (error) {
        console.error(`Autonomous decision error for ${droneId}:`, error);

        // Log error
        logAgentAction({
          id: `error-${droneId}-${Date.now()}`,
          timestamp: Date.now(),
          droneId: drone.id,
          droneRole: drone.role,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        decisionInProgress.current.delete(droneId);
      }
    },
    [
      enabled,
      drones,
      agentPeers,
      agentLogs,
      updateAgentMetrics,
      logAgentAction,
      setAgentCommunicationMode,
    ]
  );

  // Handle triggered decision (emergency, low battery, etc.)
  const handleTriggeredDecision = async (
    drone: typeof drones[0],
    context: any,
    trigger: any
  ) => {
    const { type, priority, action } = trigger;

    addDroneReasoning(
      drone.id,
      `TRIGGER: ${type.toUpperCase()} (${priority}) - ${action}`,
      "action"
    );

    // Execute the triggered action
    switch (type) {
      case "battery_low":
        if (drone.role === "supply") {
          // Supply drone returns to base
          updateDrone(drone.id, {
            targetPosition: [0, 15, 0], // Return to base
          });
          pushEvent(
            `${drone.id} returning to base (battery: ${drone.battery.toFixed(0)}%)`,
            "status"
          );
        } else if (drone.role === "relay") {
          // Relay requests replacement
          pushEvent(
            `${drone.id} requesting relay replacement (battery: ${drone.battery.toFixed(0)}%)`,
            "relay"
          );
        }
        break;

      case "emergency":
        if (drone.role === "supply") {
          // Find highest priority SOS
          const urgentSOS = sosSignals
            .filter((sos) => sos.strength < 0.5 && sos.relayDroneIds.length === 0)
            .sort((a, b) => a.strength - b.strength)[0];

          if (urgentSOS) {
            updateDrone(drone.id, {
              targetPosition: urgentSOS.position,
            });
            pushEvent(
              `${drone.id} responding to emergency SOS at ${urgentSOS.gridLabel}`,
              "supply"
            );
          }
        }
        break;

      case "hazard_detected":
        // Scout avoids hazard
        addDroneReasoning(drone.id, "Avoiding detected hazard area", "action");
        break;

      case "peer_request":
        // Charger or support drone responds
        if (drone.role === "charger") {
          addDroneReasoning(drone.id, "Moving to support nearby drones", "action");
        }
        break;

      case "task_complete":
        // Report completion
        addDroneReasoning(drone.id, "Task completed, awaiting new instructions", "observation");
        break;
    }
  };

  // Handle normal autonomous decision
  const awaitNormalDecision = async (drone: typeof drones[0], context: any) => {
    // Generate SLM prompt
    const prompt = generateSLMPrompt(drone.role, context);

    // In real implementation, would query FEDSLM here
    // For now, simulate decision based on role and context

    let decision = "Continuing normal operations";

    switch (drone.role) {
      case "relay":
        if (context.nearbyPeers.length > 0) {
          decision = "Monitoring communication quality, maintaining relay connections";
        } else {
          decision = "Positioning to maximize relay coverage";
        }
        break;

      case "supply":
        const urgentSOS = sosSignals.find(
          (sos) => sos.strength < 0.7 && sos.relayDroneIds.length === 0
        );
        if (urgentSOS) {
          decision = `Responding to SOS at ${urgentSOS.gridLabel}`;
          updateDrone(drone.id, {
            targetPosition: urgentSOS.position,
          });
          pushEvent(
            `${drone.id} dispatched to ${urgentSOS.gridLabel} (strength: ${(urgentSOS.strength * 100).toFixed(0)}%)`,
            "supply"
          );
        } else {
          decision = "Monitoring for SOS signals, maintaining standby position";
        }
        break;

      case "wifi":
        decision = "Optimizing coverage area, checking for dead zones";
        break;

      case "scout":
        if (context.communicationMode === "mesh") {
          decision = "Exploring nearby areas, scanning for survivors";
        } else {
          decision = "Coordinating with relay for exploration updates";
        }
        break;

      case "charger":
        const lowBatteryDrones = context.nearbyPeers.filter(
          (peer: { battery?: number }) => (peer.battery || 100) < 30
        );
        if (lowBatteryDrones.length > 0) {
          decision = `Monitoring ${lowBatteryDrones.length} low-battery drones nearby`;
        } else {
          decision = "Monitoring drone battery levels, maintaining charging availability";
        }
        break;
    }

    addDroneReasoning(drone.id, decision, "thought");
  };

  // Start autonomous decision-making loop
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Make decisions for each drone at intervals
    intervalRef.current = setInterval(() => {
      for (const drone of drones) {
        if (drone.status === "online") {
          makeAutonomousDecision(drone.id);
        }
      }
    }, decisionInterval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, drones, decisionInterval, makeAutonomousDecision]);

  // Manual trigger for autonomous decision
  const triggerDecision = useCallback(
    (droneId: string) => {
      makeAutonomousDecision(droneId);
    },
    [makeAutonomousDecision]
  );

  return {
    enabled,
    decisionInterval,
    triggerDecision,
    makeAutonomousDecision,
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// Agent Communication Hook
// ─────────────────────────────────────────────────────────────────────────────────

export function useAgentCommunication() {
  const drones = useStore((state) => state.drones);
  const addDroneMessage = useStore((state) => state.addDroneMessage);
  const setActiveMessagePath = useStore((state) => state.setActiveMessagePath);
  const logAgentAction = useMultiAgentStore((state) => state.logAgentAction);
  const addAgentConnection = useMultiAgentStore((state) => state.addAgentConnection);
  const updateAgentMetrics = useMultiAgentStore((state) => state.updateAgentMetrics);

  // Send message from one drone to another
  const sendAgentMessage = useCallback(
    async (
      fromId: string,
      toId: string,
      content: string,
      type: "command" | "status" | "data" | "alert"
    ) => {
      const fromDrone = drones.find((d) => d.id === fromId);
      const toDrone = drones.find((d) => d.id === toId);

      if (!fromDrone || !toDrone) {
        console.error(`Drone not found: ${!fromDrone ? fromId : toId}`);
        return false;
      }

      // Calculate distance and signal strength
      const distance = Math.sqrt(
        Math.pow(fromDrone.position[0] - toDrone.position[0], 2) +
          Math.pow(fromDrone.position[2] - toDrone.position[2], 2)
      );
      const signalStrength = Math.max(0, 1 - distance / 100);

      // Determine communication mode
      const mode = signalStrength > 0.3 ? "mesh" : "multi-star";

      // Add drone message
      addDroneMessage(fromId, toId, content, type);

      // Set active message path (for visualization)
      setActiveMessagePath(fromId, toId, true);
      setTimeout(() => {
        setActiveMessagePath(fromId, toId, false);
      }, 2000);

      // Log the communication
      logAgentAction({
        id: `msg-${fromId}-${toId}-${Date.now()}`,
        timestamp: Date.now(),
        droneId: fromId,
        droneRole: fromDrone.role,
        messageType: type,
        fromDrone: fromId,
        toDrone: toId,
        communicationMode: mode,
        route: mode === "mesh" ? [fromId, toId] : [fromId, "RELAY", toId],
        hops: mode === "mesh" ? 1 : 2,
        reasoning: `Sent ${type} message via ${mode}`,
      });

      // Add connection record
      addAgentConnection({
        fromId,
        toId,
        mode,
        signalStrength,
        messageCount: 1,
        lastActivity: Date.now(),
      });

      // Update metrics
      updateAgentMetrics(fromId, {
        messageCount: (useMultiAgentStore.getState().agentMetrics.get(fromId)?.messageCount || 0) + 1,
      });

      return true;
    },
    [
      drones,
      addDroneMessage,
      setActiveMessagePath,
      logAgentAction,
      addAgentConnection,
      updateAgentMetrics,
    ]
  );

  return {
    sendAgentMessage,
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// Agent Metrics Hook
// ─────────────────────────────────────────────────────────────────────────────────

export function useAgentMetrics() {
  const agentMetrics = useMultiAgentStore((state) => state.agentMetrics);
  const agentConnections = useMultiAgentStore((state) => state.agentConnections);
  const networkTopology = useMultiAgentStore((state) => state.networkTopology);
  const swarmState = useMultiAgentStore((state) => state.swarmState);

  const getMetricsForDrone = useCallback(
    (droneId: string) => {
      return agentMetrics.get(droneId);
    },
    [agentMetrics]
  );

  const getConnectionsForDrone = useCallback(
    (droneId: string) => {
      return agentConnections.filter(
        (c) => c.fromId === droneId || c.toId === droneId
      );
    },
    [agentConnections]
  );

  const getTotalMessageCount = useCallback(() => {
    return Array.from(agentMetrics.values()).reduce(
      (sum, m) => sum + m.messageCount,
      0
    );
  }, [agentMetrics]);

  const getAverageSLMResponseTime = useCallback(() => {
    const metrics = Array.from(agentMetrics.values());
    if (metrics.length === 0) return 0;
    return (
      metrics.reduce((sum, m) => sum + m.slmResponseTime, 0) / metrics.length
    );
  }, [agentMetrics]);

  return {
    agentMetrics: Array.from(agentMetrics.values()),
    networkTopology,
    swarmState,
    getMetricsForDrone,
    getConnectionsForDrone,
    getTotalMessageCount,
    getAverageSLMResponseTime,
  };
}
