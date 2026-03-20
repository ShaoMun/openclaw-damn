import type { DroneRole } from "../store";
import type { PeerInfo } from "./drone-agent";

// ─────────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────────

export interface DroneAgentInfo {
  id: string;
  role: DroneRole;
  mcpPort: number;
  slmPort: number;
  mcpUrl: string;
  lastSeen: number;
  status: "online" | "offline" | "syncing";
  isRelay: boolean;
}

export interface RelayInfo extends DroneAgentInfo {
  connectedWorkers: string[];
  load: number; // 0-1, based on message count
}

// ─────────────────────────────────────────────────────────────────────────────────
// Drone Registry
// ─────────────────────────────────────────────────────────────────────────────────

export class DroneRegistry {
  private agents: Map<string, DroneAgentInfo>;
  private relays: Map<string, RelayInfo>;
  private localDroneId: string;

  constructor(localDroneId: string) {
    this.localDroneId = localDroneId;
    this.agents = new Map();
    this.relays = new Map();
  }

  // Register a drone agent
  registerAgent(agent: DroneAgentInfo): void {
    console.log(`[${this.localDroneId}] Registering agent: ${agent.id}`);

    this.agents.set(agent.id, {
      ...agent,
      lastSeen: Date.now(),
      status: "online",
    });

    if (agent.isRelay) {
      this.relays.set(agent.id, {
        ...agent,
        connectedWorkers: [],
        load: 0,
      });
    }

    // Announce to other agents (via MCP)
    this.announceAgent(agent);
  }

  // Unregister a drone agent
  unregisterAgent(agentId: string): void {
    console.log(`[${this.localDroneId}] Unregistering agent: ${agentId}`);

    const agent = this.agents.get(agentId);
    if (agent?.isRelay) {
      this.relays.delete(agentId);
    }

    this.agents.delete(agentId);
  }

  // Discover an agent by ID
  async discoverAgent(agentId: string): Promise<DroneAgentInfo | null> {
    const cached = this.agents.get(agentId);
    if (cached) {
      // Update last seen
      cached.lastSeen = Date.now();
      return cached;
    }

    // TODO: Query via MCP for unknown agent
    console.log(`[${this.localDroneId}] Discovering agent: ${agentId}`);
    return null;
  }

  // Discover all nearby agents
  async discoverNearbyAgents(): Promise<DroneAgentInfo[]> {
    // TODO: Implement Bluetooth/WebRTC discovery
    // For now, return cached agents
    return Array.from(this.agents.values()).filter((agent) => agent.id !== this.localDroneId);
  }

  // Discover relay agents
  async discoverRelays(): Promise<RelayInfo[]> {
    return Array.from(this.relays.values());
  }

  // Get the best relay for this drone
  getRelayForAgent(agentId: string): RelayInfo | null {
    const relays = Array.from(this.relays.values());

    if (relays.length === 0) {
      return null;
    }

    // Select relay with lowest load
    return relays.reduce((best, current) => {
      return current.load < best.load ? current : best;
    });
  }

  // Select best relay based on signal strength and load
  selectBestRelay(relays: RelayInfo[]): RelayInfo {
    // Score based on: signal strength (0.6) + load (0.4)
    return relays.reduce((best, current) => {
      const bestScore = this.calculateRelayScore(best);
      const currentScore = this.calculateRelayScore(current);
      return currentScore > bestScore ? current : best;
    });
  }

  private calculateRelayScore(relay: RelayInfo): number {
    // TODO: Include signal strength when available
    const loadScore = 1 - relay.load; // Lower load = better
    return loadScore;
  }

  // Update agent status
  updateAgentStatus(agentId: string, status: "online" | "offline" | "syncing"): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      agent.lastSeen = Date.now();
    }
  }

  // Update relay load
  updateRelayLoad(relayId: string, load: number): void {
    const relay = this.relays.get(relayId);
    if (relay) {
      relay.load = Math.max(0, Math.min(1, load));
    }
  }

  // Get all registered agents
  getAllAgents(): DroneAgentInfo[] {
    return Array.from(this.agents.values());
  }

  // Get agent by ID
  getAgent(agentId: string): DroneAgentInfo | undefined {
    return this.agents.get(agentId);
  }

  // Announce new agent to peers
  private announceAgent(agent: DroneAgentInfo): void {
    // TODO: Broadcast via MCP to all connected peers
    console.log(`[${this.localDroneId}] Announcing agent: ${agent.id}`);
  }

  // Check for stale agents (haven't been seen in a while)
  cleanupStaleAgents(timeoutMs: number = 60000): string[] {
    const now = Date.now();
    const staleAgents: string[] = [];

    for (const [id, agent] of this.agents) {
      if (now - agent.lastSeen > timeoutMs && agent.id !== this.localDroneId) {
        staleAgents.push(id);
        this.unregisterAgent(id);
      }
    }

    return staleAgents;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// Browser-based discovery simulation (localStorage)
// ─────────────────────────────────────────────────────────────────────────────────

export class BrowserDiscoverySimulation {
  private droneId: string;
  private storageKey: string;
  private discoveryInterval: NodeJS.Timeout | null;

  constructor(droneId: string) {
    this.droneId = droneId;
    this.storageKey = "openclaw_discovery";
    this.discoveryInterval = null;
  }

  // Start advertising this drone
  startAdvertising(agentInfo: DroneAgentInfo): void {
    console.log(`[${this.droneId}] Starting discovery advertising`);

    // Write to localStorage
    this.writeToStorage({
      id: this.droneId,
      ...agentInfo,
      timestamp: Date.now(),
    });

    // Refresh every 5 seconds
    this.discoveryInterval = setInterval(() => {
      this.writeToStorage({
        id: this.droneId,
        ...agentInfo,
        timestamp: Date.now(),
      });
    }, 5000);

    // Listen for storage events (other tabs/windows)
    window.addEventListener("storage", this.handleStorageEvent);
  }

  // Stop advertising
  stopAdvertising(): void {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }

    window.removeEventListener("storage", this.handleStorageEvent);

    // Remove from storage
    this.removeFromStorage();
  }

  // Discover nearby drones
  discoverNearby(): DroneAgentInfo[] {
    const data = this.readFromStorage();
    const nearbyAgents: DroneAgentInfo[] = [];

    for (const [id, info] of Object.entries(data)) {
      // Skip stale entries (>10 seconds) and self
      if (id !== this.droneId && Date.now() - info.timestamp < 10000) {
        nearbyAgents.push({
          id: info.id,
          role: info.role,
          mcpPort: info.mcpPort,
          slmPort: info.slmPort,
          mcpUrl: info.mcpUrl,
          lastSeen: info.timestamp,
          status: "online",
          isRelay: info.isRelay,
        });
      }
    }

    return nearbyAgents;
  }

  private writeToStorage(info: any): void {
    try {
      const data = this.readFromStorage();
      data[this.droneId] = info;
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error(`[${this.droneId}] Failed to write to storage:`, error);
    }
  }

  private readFromStorage(): Record<string, any> {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error(`[${this.droneId}] Failed to read from storage:`, error);
      return {};
    }
  }

  private removeFromStorage(): void {
    try {
      const data = this.readFromStorage();
      delete data[this.droneId];
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error(`[${this.droneId}] Failed to remove from storage:`, error);
    }
  }

  private handleStorageEvent = (event: StorageEvent): void => {
    if (event.key === this.storageKey && event.newValue) {
      console.log(`[${this.droneId}] Storage changed - new peers may be available`);
      // TODO: Trigger callback for new peers
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// Signal strength calculation
// ─────────────────────────────────────────────────────────────────────────────────

export class SignalStrengthCalculator {
  // Calculate signal strength based on distance
  static calculate(distance: number, maxRange: number = 100): number {
    if (distance >= maxRange) return 0;
    if (distance === 0) return 1;

    // Simplified path loss model
    const strength = 1 - (distance / maxRange);
    return Math.max(0, Math.min(1, strength));
  }

  // Calculate distance between two points (simplified 2D)
  static calculateDistance(
    pos1: [number, number, number],
    pos2: [number, number, number]
  ): number {
    const dx = pos1[0] - pos2[0];
    const dz = pos1[2] - pos2[2];
    return Math.sqrt(dx * dx + dz * dz);
  }

  // Check if signal is strong enough for direct mesh
  static isMeshViable(signalStrength: number, threshold: number = 0.3): boolean {
    return signalStrength >= threshold;
  }
}
