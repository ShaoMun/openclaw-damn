/**
 * Multi-Agent Store Extension
 *
 * Extends the existing OpenClaw store with multi-agent capabilities
 * for adaptive mesh + multi-star topology.
 */

import { create } from "zustand";
import type { DroneRole } from "./store";

// ─────────────────────────────────────────────────────────────────────────────────
// Multi-Agent Types
// ─────────────────────────────────────────────────────────────────────────────────

export type CommunicationMode = "mesh" | "multi-star";

export interface AgentPeerInfo {
  id: string;
  role: DroneRole;
  mcpPort: number;
  slmPort: number;
  mcpUrl: string;
  signalStrength: number;
  distance: number;
  isInRange: boolean;
  lastSeen: number;
  status: "online" | "offline" | "syncing";
}

export interface AgentConnection {
  fromId: string;
  toId: string;
  mode: CommunicationMode;
  signalStrength: number;
  messageCount: number;
  lastActivity: number;
}

export interface AgentMetrics {
  droneId: string;
  slmResponseTime: number;
  slmQueryCount: number;
  messageCount: number;
  mode: CommunicationMode;
  connectedPeers: number;
  relayLoad: number;
  batteryLevel: number;
  position: [number, number, number];
}

export interface DroneAgentLog {
  id: string;
  timestamp: number;
  droneId: string;
  droneRole: DroneRole;

  // SLM queries
  slmQuery?: string;
  slmResponse?: string;
  slmResponseTime?: number;

  // Inter-agent communication
  messageType?: "command" | "request" | "response" | "event";
  fromDrone?: string;
  toDrone?: string;

  // Tool execution
  toolName?: string;
  toolParams?: unknown;
  toolResult?: unknown;

  // Autonomous actions
  autonomousAction?: string;
  reasoning?: string;

  // Routing
  communicationMode?: CommunicationMode;
  route?: string[];
  hops?: number;

  // Errors
  error?: string;

  correlationId?: string;
}

export interface NetworkTopology {
  drones: AgentMetrics[];
  connections: AgentConnection[];
  relayLoad: Record<string, number>; // relayId -> load 0-1
  meshQuality: number; // 0-1 overall mesh health
  communicationModes: Record<string, CommunicationMode>; // droneId -> mode
}

export interface SwarmState {
  totalDrones: number;
  activeRelays: number;
  meshConnections: number;
  relayConnections: number;
  averageSLMResponseTime: number;
  totalMessages: number;
  emergencyActive: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────────
// Multi-Agent Store Interface
// ─────────────────────────────────────────────────────────────────────────────────

interface MultiAgentStore {
  // Agent registry
  agentPeers: Map<string, AgentPeerInfo>;
  connectedAgents: Set<string>;

  // Communication state
  agentConnections: AgentConnection[];
  agentMetrics: Map<string, AgentMetrics>;
  agentLogs: DroneAgentLog[];

  // Network topology
  networkTopology: NetworkTopology;
  swarmState: SwarmState;

  // Emergency state
  emergencyActive: boolean;
  emergencyStartTime: number | null;

  // Actions: Peer management
  registerAgentPeer: (peer: AgentPeerInfo) => void;
  unregisterAgentPeer: (peerId: string) => void;
  updateAgentPeer: (peerId: string, updates: Partial<AgentPeerInfo>) => void;
  getAgentPeers: () => AgentPeerInfo[];

  // Actions: Connections
  addAgentConnection: (connection: AgentConnection) => void;
  removeAgentConnection: (fromId: string, toId: string) => void;
  updateAgentConnection: (fromId: string, toId: string, updates: Partial<AgentConnection>) => void;
  getAgentConnections: (droneId?: string) => AgentConnection[];

  // Actions: Metrics
  updateAgentMetrics: (droneId: string, metrics: Partial<AgentMetrics>) => void;
  getAgentMetrics: (droneId: string) => AgentMetrics | undefined;
  getAllAgentMetrics: () => AgentMetrics[];

  // Actions: Logging
  logAgentAction: (log: DroneAgentLog) => void;
  getAgentLogs: (droneId?: string, filter?: Partial<DroneAgentLog>) => DroneAgentLog[];
  exportAgentLogs: (format: "json" | "csv") => string;

  // Actions: Topology
  updateNetworkTopology: () => void;
  getNetworkTopology: () => NetworkTopology;
  getSwarmState: () => SwarmState;

  // Actions: Emergency
  setEmergencyMode: (active: boolean) => void;
  isEmergencyActive: () => boolean;

  // Actions: Communication mode
  setAgentCommunicationMode: (droneId: string, mode: CommunicationMode) => void;
  getAgentCommunicationMode: (droneId: string) => CommunicationMode;

  // Actions: Relay management
  updateRelayLoad: (relayId: string, load: number) => void;
  getRelayLoad: (relayId: string) => number;

  // Actions: Cleanup
  cleanupStalePeers: (timeoutMs: number) => string[];
  clearOldLogs: (beforeMs: number) => number;
}

// ─────────────────────────────────────────────────────────────────────────────────
// Multi-Agent Store Implementation
// ─────────────────────────────────────────────────────────────────────────────────

export const useMultiAgentStore = create<MultiAgentStore>((set, get) => ({
  // Initial state
  agentPeers: new Map(),
  connectedAgents: new Set(),
  agentConnections: [],
  agentMetrics: new Map(),
  agentLogs: [],

  networkTopology: {
    drones: [],
    connections: [],
    relayLoad: {},
    meshQuality: 0,
    communicationModes: {},
  },

  swarmState: {
    totalDrones: 0,
    activeRelays: 0,
    meshConnections: 0,
    relayConnections: 0,
    averageSLMResponseTime: 0,
    totalMessages: 0,
    emergencyActive: false,
  },

  emergencyActive: false,
  emergencyStartTime: null,

  // Peer management
  registerAgentPeer: (peer) => {
    set((state) => {
      const newPeers = new Map(state.agentPeers);
      newPeers.set(peer.id, peer);
      return { agentPeers: newPeers };
    });
  },

  unregisterAgentPeer: (peerId) => {
    set((state) => {
      const newPeers = new Map(state.agentPeers);
      newPeers.delete(peerId);
      const newConnected = new Set(state.connectedAgents);
      newConnected.delete(peerId);
      return {
        agentPeers: newPeers,
        connectedAgents: newConnected,
      };
    });
  },

  updateAgentPeer: (peerId, updates) => {
    set((state) => {
      const newPeers = new Map(state.agentPeers);
      const peer = newPeers.get(peerId);
      if (peer) {
        newPeers.set(peerId, { ...peer, ...updates });
      }
      return { agentPeers: newPeers };
    });
  },

  getAgentPeers: () => {
    return Array.from(get().agentPeers.values());
  },

  // Connection management
  addAgentConnection: (connection) => {
    set((state) => {
      const connections = [...state.agentConnections];
      // Remove existing connection if any
      const filtered = connections.filter(
        (c) => !(c.fromId === connection.fromId && c.toId === connection.toId)
      );
      filtered.push(connection);
      return { agentConnections: filtered };
    });
  },

  removeAgentConnection: (fromId, toId) => {
    set((state) => ({
      agentConnections: state.agentConnections.filter(
        (c) => !(c.fromId === fromId && c.toId === toId)
      ),
    }));
  },

  updateAgentConnection: (fromId, toId, updates) => {
    set((state) => ({
      agentConnections: state.agentConnections.map((c) =>
        c.fromId === fromId && c.toId === toId ? { ...c, ...updates } : c
      ),
    }));
  },

  getAgentConnections: (droneId) => {
    const connections = get().agentConnections;
    if (droneId) {
      return connections.filter(
        (c) => c.fromId === droneId || c.toId === droneId
      );
    }
    return connections;
  },

  // Metrics management
  updateAgentMetrics: (droneId, metrics) => {
    set((state) => {
      const newMetrics = new Map(state.agentMetrics);
      const existing = newMetrics.get(droneId) || {
        droneId,
        slmResponseTime: 0,
        slmQueryCount: 0,
        messageCount: 0,
        mode: "mesh",
        connectedPeers: 0,
        relayLoad: 0,
        batteryLevel: 100,
        position: [0, 15, 0],
      };
      newMetrics.set(droneId, { ...existing, ...metrics });
      return { agentMetrics: newMetrics };
    });
  },

  getAgentMetrics: (droneId) => {
    return get().agentMetrics.get(droneId);
  },

  getAllAgentMetrics: () => {
    return Array.from(get().agentMetrics.values());
  },

  // Logging
  logAgentAction: (log) => {
    set((state) => {
      const logs = [...state.agentLogs, log];
      // Keep last 1000 logs
      const trimmed = logs.slice(-1000);
      return { agentLogs: trimmed };
    });
  },

  getAgentLogs: (droneId, filter) => {
    let logs = get().agentLogs;

    if (droneId) {
      logs = logs.filter((l) => l.droneId === droneId);
    }

    if (filter) {
      logs = logs.filter((l) => {
        for (const [key, value] of Object.entries(filter)) {
          if (l[key as keyof DroneAgentLog] !== value) {
            return false;
          }
        }
        return true;
      });
    }

    return logs;
  },

  exportAgentLogs: (format) => {
    const logs = get().agentLogs;

    if (format === "json") {
      return JSON.stringify(logs, null, 2);
    } else if (format === "csv") {
      if (logs.length === 0) return "";

      const headers = Object.keys(logs[0]);
      const csvRows = [
        headers.join(","),
        ...logs.map((log) =>
          headers.map((h) => JSON.stringify(log[h as keyof DroneAgentLog] ?? "")).join(",")
        ),
      ];
      return csvRows.join("\n");
    }

    return "";
  },

  // Topology
  updateNetworkTopology: () => {
    const state = get();
    const metrics = Array.from(state.agentMetrics.values());

    const connections = state.agentConnections;
    const relayLoad: Record<string, number> = {};
    const communicationModes: Record<string, CommunicationMode> = {};

    // Calculate relay loads
    for (const metric of metrics) {
      communicationModes[metric.droneId] = metric.mode;
      if (metric.relayLoad > 0) {
        relayLoad[metric.droneId] = metric.relayLoad;
      }
    }

    // Calculate mesh quality
    const meshConnections = connections.filter((c) => c.mode === "mesh");
    const meshQuality =
      meshConnections.length > 0
        ? meshConnections.reduce((sum, c) => sum + c.signalStrength, 0) /
          meshConnections.length
        : 0;

    const topology: NetworkTopology = {
      drones: metrics,
      connections,
      relayLoad,
      meshQuality,
      communicationModes,
    };

    // Update swarm state
    const relayDrones = metrics.filter((m) => {
      const peer = state.agentPeers.get(m.droneId);
      return peer?.role === "relay";
    });

    const swarmState: SwarmState = {
      totalDrones: metrics.length,
      activeRelays: relayDrones.length,
      meshConnections: meshConnections.length,
      relayConnections: connections.length - meshConnections.length,
      averageSLMResponseTime:
        metrics.reduce((sum, m) => sum + m.slmResponseTime, 0) / metrics.length,
      totalMessages: metrics.reduce((sum, m) => sum + m.messageCount, 0),
      emergencyActive: state.emergencyActive,
    };

    set({ networkTopology: topology, swarmState });
  },

  getNetworkTopology: () => {
    return get().networkTopology;
  },

  getSwarmState: () => {
    return get().swarmState;
  },

  // Emergency
  setEmergencyMode: (active) => {
    set((state) => ({
      emergencyActive: active,
      emergencyStartTime: active ? Date.now() : null,
    }));
  },

  isEmergencyActive: () => {
    return get().emergencyActive;
  },

  // Communication mode
  setAgentCommunicationMode: (droneId, mode) => {
    get().updateAgentMetrics(droneId, { mode });
  },

  getAgentCommunicationMode: (droneId) => {
    const metrics = get().agentMetrics.get(droneId);
    return metrics?.mode || "mesh";
  },

  // Relay management
  updateRelayLoad: (relayId, load) => {
    get().updateAgentMetrics(relayId, { relayLoad: load });
  },

  getRelayLoad: (relayId) => {
    const metrics = get().agentMetrics.get(relayId);
    return metrics?.relayLoad || 0;
  },

  // Cleanup
  cleanupStalePeers: (timeoutMs) => {
    const now = Date.now();
    const stalePeers: string[] = [];

    for (const [peerId, peer] of get().agentPeers) {
      if (now - peer.lastSeen > timeoutMs) {
        stalePeers.push(peerId);
        get().unregisterAgentPeer(peerId);
      }
    }

    return stalePeers;
  },

  clearOldLogs: (beforeMs) => {
    const now = Date.now();
    set((state) => ({
      agentLogs: state.agentLogs.filter((log) => now - log.timestamp < beforeMs),
    }));

    return get().agentLogs.length;
  },
}));

// ─────────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Calculate network health score (0-1)
 */
export function calculateNetworkHealth(topology: NetworkTopology): number {
  const meshScore = topology.meshQuality * 0.4;
  const droneScore = Math.min(topology.drones.length / 5, 1) * 0.3;
  const connectionScore =
    Math.min(topology.connections.length / 10, 1) * 0.3;

  return meshScore + droneScore + connectionScore;
}

/**
 * Get mesh connectivity matrix
 */
export function getConnectivityMatrix(topology: NetworkTopology): Map<
  string,
  Map<string, number>
> {
  const matrix = new Map<string, Map<string, number>>();

  for (const connection of topology.connections) {
    if (!matrix.has(connection.fromId)) {
      matrix.set(connection.fromId, new Map());
    }
    matrix.get(connection.fromId)!.set(connection.toId, connection.signalStrength);
  }

  return matrix;
}

/**
 * Find communication path between two drones
 */
export function findCommunicationPath(
  fromId: string,
  toId: string,
  topology: NetworkTopology
): string[] | null {
  const connections = topology.connections;

  // Direct connection
  const direct = connections.find(
    (c) => c.fromId === fromId && c.toId === toId
  );
  if (direct) {
    return [fromId, toId];
  }

  // Find via relay
  const fromRelay = connections.find((c) => c.fromId === fromId && c.mode === "multi-star");
  if (fromRelay) {
    const toRelay = connections.find((c) => c.toId === toId && c.mode === "multi-star");
    if (toRelay) {
      return [fromId, fromRelay.toId, toId];
    }
  }

  return null;
}
