/**
 * MCP Data Mappers
 *
 * Transform MCP backend API responses into frontend data structures.
 * Ensures compatibility between the backend drone swarm and the frontend UI.
 */

import type {
  Drone,
  DroneRole,
  DroneStatus,
  GridCell,
  SOSSignal,
  RelayPath,
  LogEntry,
} from './store';
import type {
  MCPDroneStatus,
  MCPNetworkTopology,
} from './mcp-client';
import type { AgentConnection, AgentMetrics } from './multi-agent-store';

// ─────────────────────────────────────────────────────────────────────────────────
// Drone Mapping
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Map MCP drone status to frontend Drone format
 */
export function mapMCPDroneToFrontend(mcpStatus: MCPDroneStatus): Drone {
  // Validate required fields
  if (!mcpStatus || !mcpStatus.droneId) {
    console.warn('Invalid MCP status:', mcpStatus);
    return createFallbackDrone('UNKNOWN', 'relay');
  }

  // Normalize role
  const role = normalizeRole(mcpStatus.role);

  // Normalize status
  const status = normalizeStatus(mcpStatus.status);

  // Safely extract position with fallback
  const position = mcpStatus.position || { x: 0, y: 15, z: 0 };

  // Clamp battery to 0-100
  const battery = Math.max(0, Math.min(100, mcpStatus.batteryLevel || 100));

  return {
    id: mcpStatus.droneId,
    role,
    battery,
    position: [position.x, position.y, position.z],
    targetPosition: mcpStatus.targetPosition
      ? [
          mcpStatus.targetPosition.x,
          mcpStatus.targetPosition.y,
          mcpStatus.targetPosition.z,
        ]
      : undefined,
    status,
    lastMessageTime: mcpStatus.lastActivity || Date.now(),
    proactiveLevel: calculateProactiveLevel(mcpStatus),
  };
}

/**
 * Normalize drone role from backend
 */
function normalizeRole(role: string | undefined | null): DroneRole {
  // Handle undefined/null
  if (!role) {
    return 'relay'; // Default fallback
  }

  const validRoles: DroneRole[] = ['relay', 'wifi', 'supply', 'scout', 'charger'];
  const normalized = role.toLowerCase() as DroneRole;

  if (validRoles.includes(normalized)) {
    return normalized;
  }

  // Fallback mapping
  const roleMap: Record<string, DroneRole> = {
    'wi-fi': 'wifi',
    'recon': 'scout',
    'charging': 'charger',
    'logistics': 'supply',
  };

  return roleMap[role.toLowerCase()] || 'relay';
}

/**
 * Normalize drone status from backend
 */
function normalizeStatus(status: string | undefined | null): DroneStatus {
  // Handle undefined/null
  if (!status) {
    return 'offline'; // Default fallback
  }

  const validStatuses: DroneStatus[] = ['online', 'offline', 'syncing'];
  const normalized = status.toLowerCase() as DroneStatus;

  if (validStatuses.includes(normalized)) {
    return normalized;
  }

  // Default to offline for unknown status
  return 'offline';
}

/**
 * Calculate proactive level based on drone state
 */
function calculateProactiveLevel(mcpStatus: MCPDroneStatus): number {
  // Base proactive level
  let level = 0.5;

  // Adjust based on communication mode
  if (mcpStatus.communicationMode === 'mesh') {
    level += 0.2; // More proactive in mesh mode
  }

  // Adjust based on battery (with safe default)
  const batteryLevel = mcpStatus.batteryLevel ?? 100;
  if (batteryLevel > 70) {
    level += 0.1;
  } else if (batteryLevel < 30) {
    level -= 0.2;
  }

  // Adjust based on role (with safe default)
  const role = (mcpStatus.role || 'relay').toLowerCase();
  const roleProactivity: Record<string, number> = {
    scout: 0.8,
    relay: 0.6,
    wifi: 0.5,
    supply: 0.4,
    charger: 0.7,
  };

  const roleBonus = roleProactivity[role] || 0.5;
  level = (level + roleBonus) / 2;

  return Math.max(0, Math.min(1, level)); // Clamp to 0-1
}

// ─────────────────────────────────────────────────────────────────────────────────
// Network Topology Mapping
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Map MCP network topology to AgentConnection array
 */
export function mapMCPTopologyToConnections(
  topology: MCPNetworkTopology
): AgentConnection[] {
  return topology.edges.map(edge => ({
    fromId: edge.from,
    toId: edge.to,
    mode: edge.mode,
    signalStrength: edge.signalStrength,
    messageCount: 0,
    lastActivity: Date.now(),
  }));
}

/**
 * Map MCP network topology to AgentMetrics array
 */
export function mapMCPTopologyToMetrics(
  topology: MCPNetworkTopology
): Map<string, AgentMetrics> {
  const metricsMap = new Map<string, AgentMetrics>();

  for (const node of topology.nodes) {
    metricsMap.set(node.id, {
      droneId: node.id,
      slmResponseTime: 0,
      slmQueryCount: 0,
      messageCount: 0,
      mode: 'mesh',
      connectedPeers: node.connections,
      relayLoad: topology.relayLoad[node.id] || 0,
      batteryLevel: node.battery,
      position: node.position,
    });
  }

  return metricsMap;
}

// ─────────────────────────────────────────────────────────────────────────────────
// Position Mapping
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Extract position from MCP drone status
 */
export function mapMCPPosition(
  mcpStatus: MCPDroneStatus
): [number, number, number] {
  return [mcpStatus.position.x, mcpStatus.position.y, mcpStatus.position.z];
}

/**
 * Extract target position from MCP drone status
 */
export function mapMCPTargetPosition(
  mcpStatus: MCPDroneStatus
): [number, number, number] | undefined {
  if (!mcpStatus.targetPosition) {
    return undefined;
  }

  return [
    mcpStatus.targetPosition.x,
    mcpStatus.targetPosition.y,
    mcpStatus.targetPosition.z,
  ];
}

// ─────────────────────────────────────────────────────────────────────────────────
// Batch Mapping
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Map multiple MCP drone statuses to frontend Drone array
 */
export function mapMCPDronesToFrontend(
  mcpStatuses: Record<string, MCPDroneStatus>
): Drone[] {
  return Object.values(mcpStatuses).map(mapMCPDroneToFrontend);
}

/**
 * Map MCP statuses to a drones object for store hydration
 */
export function mapMCPStatusesToStoreData(
  mcpStatuses: Record<string, MCPDroneStatus>
): {
  drones: Drone[];
  gridCells: GridCell[];
  sosSignals: SOSSignal[];
  relayPaths: RelayPath[];
  eventLog: LogEntry[];
} {
  const drones = mapMCPDronesToFrontend(mcpStatuses);

  // For now, we'll keep grid/SOS/relay data empty
  // These can be populated from other MCP endpoints in the future
  return {
    drones,
    gridCells: [],
    sosSignals: [],
    relayPaths: [],
    eventLog: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// Reverse Mapping (Frontend → MCP)
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Map frontend Drone to MCP-compatible position object
 */
export function mapFrontendPositionToMCP(
  position: [number, number, number]
): { x: number; y: number; z: number } {
  return { x: position[0], y: position[1], z: position[2] };
}

/**
 * Create move_to params from frontend position
 */
export function createMoveToParams(
  position: [number, number, number]
): { x: number; y: number; z: number } {
  return mapFrontendPositionToMCP(position);
}

// ─────────────────────────────────────────────────────────────────────────────────
// Validation Helpers
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Validate MCP drone status response
 */
export function isValidMCPDroneStatus(
  data: unknown
): data is MCPDroneStatus {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const status = data as Record<string, unknown>;

  return (
    typeof status.droneId === 'string' &&
    typeof status.role === 'string' &&
    typeof status.status === 'string' &&
    typeof status.batteryLevel === 'number' &&
    typeof status.position === 'object' &&
    status.position !== null &&
    typeof (status.position as Record<string, unknown>).x === 'number' &&
    typeof (status.position as Record<string, unknown>).y === 'number' &&
    typeof (status.position as Record<string, unknown>).z === 'number'
  );
}

/**
 * Validate MCP network topology response
 */
export function isValidMCPTopology(
  data: unknown
): data is MCPNetworkTopology {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const topology = data as Record<string, unknown>;

  return (
    Array.isArray(topology.nodes) &&
    Array.isArray(topology.edges) &&
    typeof topology.meshStrength === 'number'
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// Error Handling
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Create a fallback drone when MCP data is invalid
 */
export function createFallbackDrone(
  droneId: string,
  role: DroneRole = 'relay'
): Drone {
  return {
    id: droneId,
    role,
    battery: 100,
    position: [0, 15, 0],
    status: 'offline',
    lastMessageTime: Date.now(),
    proactiveLevel: 0.5,
  };
}

/**
 * Safely map MCP status with fallback
 */
export function safeMapMCPDrone(
  mcpStatus: unknown,
  droneId: string
): Drone {
  if (isValidMCPDroneStatus(mcpStatus)) {
    return mapMCPDroneToFrontend(mcpStatus);
  }

  console.warn(`Invalid MCP status for ${droneId}, using fallback`);
  return createFallbackDrone(droneId);
}

// ─────────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Calculate distance between two drones
 */
export function calculateDroneDistance(
  drone1: Drone | MCPDroneStatus,
  drone2: Drone | MCPDroneStatus
): number {
  const pos1 = 'position' in drone1 ? drone1.position : drone1;
  const pos2 = 'position' in drone2 ? drone2.position : drone2;

  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  const dz = pos1.z - pos2.z;

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Check if drone is in range of another drone
 */
export function isDroneInRange(
  drone1: Drone | MCPDroneStatus,
  drone2: Drone | MCPDroneStatus,
  maxRange: number = 100
): boolean {
  return calculateDroneDistance(drone1, drone2) <= maxRange;
}

/**
 * Calculate signal strength based on distance
 */
export function calculateSignalStrength(
  distance: number,
  maxRange: number = 100
): number {
  // Signal strength decreases with distance (0-1)
  return Math.max(0, 1 - distance / maxRange);
}
