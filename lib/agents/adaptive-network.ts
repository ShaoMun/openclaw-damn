import type { DroneRole } from "../store";
import type { PeerInfo } from "./drone-registry";
import { SignalStrengthCalculator } from "./drone-registry";

// ─────────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────────

export type CommunicationMode = "mesh" | "multi-star";

export interface NetworkCondition {
  signalStrength: number; // 0-1
  interference: number; // 0-1
  distance: number; // meters
  batteryLevel: number; // 0-100
  congestion: number; // 0-1
}

export interface RelayInfo {
  id: string;
  role: DroneRole;
  mcpUrl: string;
  load: number; // 0-1
  signalStrength: number;
  connectedWorkers: string[];
}

export interface RouteCalculation {
  mode: CommunicationMode;
  path: string[];
  hops: number;
  estimatedLatency: number; // ms
  reliability: number; // 0-1
  reason: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// Adaptive Network Manager
// ─────────────────────────────────────────────────────────────────────────────────

export class AdaptiveNetwork {
  private localDroneId: string;
  private localPosition: [number, number, number];
  private localBattery: number;
  private currentMode: CommunicationMode;
  private connectedRelay: string | null;
  private modeHistory: ModeChange[];

  constructor(localDroneId: string, initialPosition: [number, number, number]) {
    this.localDroneId = localDroneId;
    this.localPosition = initialPosition;
    this.localBattery = 100;
    this.currentMode = "mesh";
    this.connectedRelay = null;
    this.modeHistory = [];
  }

  // Determine best communication mode based on conditions
  determineCommunicationMode(targetId: string, peers: Map<string, PeerInfo>): CommunicationMode {
    const target = peers.get(targetId);
    if (!target) {
      return "multi-star"; // Fallback to relay if target unknown
    }

    const conditions = this.assessNetworkConditions(target);
    const shouldUseMultiStar = this.shouldUseMultiStar(conditions);

    if (shouldUseMultiStar && this.currentMode !== "multi-star") {
      this.switchMode("multi-star", conditions);
    } else if (!shouldUseMultiStar && this.currentMode !== "mesh") {
      this.switchMode("mesh", conditions);
    }

    return this.currentMode;
  }

  // Assess current network conditions
  assessNetworkConditions(target: PeerInfo): NetworkCondition {
    const distance = this.calculateDistance(target);
    const signalStrength = SignalStrengthCalculator.calculate(distance);
    const interference = this.calculateInterference();
    const congestion = this.calculateCongestion();

    return {
      signalStrength,
      interference,
      distance,
      batteryLevel: this.localBattery,
      congestion,
    };
  }

  // Decide if multi-star mode should be used
  private shouldUseMultiStar(conditions: NetworkCondition): boolean {
    // Switch to multi-star if:
    // 1. Signal strength too low (out of range)
    // 2. High interference
    // 3. High congestion (mesh overloaded)
    // 4. Low battery (relay more efficient)
    // 5. Recent communication failures

    const signalThreshold = 0.3; // 30% signal threshold
    const interferenceThreshold = 0.7; // 70% interference threshold
    const congestionThreshold = 0.8; // 80% congestion threshold
    const batteryThreshold = 20; // 20% battery threshold

    if (conditions.signalStrength < signalThreshold) {
      console.log(`[AdaptiveNetwork] Signal too low (${conditions.signalStrength.toFixed(2)}), using relay`);
      return true;
    }

    if (conditions.interference > interferenceThreshold) {
      console.log(`[AdaptiveNetwork] Interference too high (${conditions.interference.toFixed(2)}), using relay`);
      return true;
    }

    if (conditions.congestion > congestionThreshold) {
      console.log(`[AdaptiveNetwork] Congestion too high (${conditions.congestion.toFixed(2)}), using relay`);
      return true;
    }

    if (conditions.batteryLevel < batteryThreshold) {
      console.log(`[AdaptiveNetwork] Battery low (${conditions.batteryLevel}%), using relay for efficiency`);
      return true;
    }

    return false; // Use mesh
  }

  // Switch communication mode
  private switchMode(newMode: CommunicationMode, conditions: NetworkCondition): void {
    const oldMode = this.currentMode;
    this.currentMode = newMode;

    const change: ModeChange = {
      from: oldMode,
      to: newMode,
      timestamp: Date.now(),
      reason: this.getSwitchReason(conditions),
      conditions: { ...conditions },
    };

    this.modeHistory.push(change);
    console.log(`[AdaptiveNetwork] Switching from ${oldMode} to ${newMode}: ${change.reason}`);
  }

  private getSwitchReason(conditions: NetworkCondition): string {
    if (conditions.signalStrength < 0.3) {
      return "out_of_range";
    }
    if (conditions.interference > 0.7) {
      return "high_interference";
    }
    if (conditions.congestion > 0.8) {
      return "high_congestion";
    }
    if (conditions.batteryLevel < 20) {
      return "low_battery";
    }
    return "conditions_improved";
  }

  // Calculate effective communication range
  calculateEffectiveRange(): number {
    const baseRange = 100; // meters
    const batteryFactor = this.localBattery / 100;
    const interferenceFactor = 1 - this.calculateInterference() * 0.3;

    return baseRange * batteryFactor * interferenceFactor;
  }

  // Check if direct mesh is viable
  isMeshViable(target: PeerInfo): boolean {
    const distance = this.calculateDistance(target);
    const effectiveRange = this.calculateEffectiveRange();
    const signalStrength = SignalStrengthCalculator.calculate(distance, effectiveRange);

    return SignalStrengthCalculator.isMeshViable(signalStrength);
  }

  // Calculate distance to target
  private calculateDistance(target: PeerInfo): number {
    // TODO: Get actual position from target
    // For now, use random distance for simulation
    return target.distance || Math.random() * 150;
  }

  // Calculate interference level (0-1)
  private calculateInterference(): number {
    // Simulated interference based on various factors
    // In real implementation, would measure actual RF interference
    const baseInterference = 0.1;
    const randomNoise = Math.random() * 0.2;
    return Math.min(1, baseInterference + randomNoise);
  }

  // Calculate network congestion (0-1)
  private calculateCongestion(): number {
    // Simulated congestion based on message queue size
    // In real implementation, would track actual network load
    return Math.random() * 0.3;
  }

  // Connect to relay
  connectToRelay(relayId: string): void {
    this.connectedRelay = relayId;
    console.log(`[AdaptiveNetwork] Connected to relay ${relayId}`);
  }

  // Disconnect from relay
  disconnectFromRelay(): void {
    this.connectedRelay = null;
    console.log(`[AdaptiveNetwork] Disconnected from relay`);
  }

  // Get current mode
  getCurrentMode(): CommunicationMode {
    return this.currentMode;
  }

  // Get mode change history
  getModeHistory(): ModeChange[] {
    return [...this.modeHistory];
  }

  // Update local position
  updatePosition(position: [number, number, number]): void {
    this.localPosition = position;
  }

  // Update battery level
  updateBattery(level: number): void {
    this.localBattery = Math.max(0, Math.min(100, level));
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// Mesh Communication (Direct P2P)
// ─────────────────────────────────────────────────────────────────────────────────

export class MeshCommunication {
  private localDroneId: string;
  private nearbyPeers: Map<string, PeerInfo>;
  private activeConnections: Set<string>;

  constructor(localDroneId: string) {
    this.localDroneId = localDroneId;
    this.nearbyPeers = new Map();
    this.activeConnections = new Set();
  }

  // Connect to nearby worker
  async connectToPeer(peerId: string, peerInfo: PeerInfo): Promise<boolean> {
    console.log(`[MeshCommunication] Connecting to ${peerId} (direct mesh)`);

    // Check if peer is in range
    const distance = peerInfo.distance || 100;
    const signalStrength = SignalStrengthCalculator.calculate(distance);

    if (signalStrength < 0.3) {
      console.warn(`[MeshCommunication] ${peerId} out of range (signal: ${signalStrength.toFixed(2)})`);
      return false;
    }

    this.nearbyPeers.set(peerId, peerInfo);
    this.activeConnections.add(peerId);
    return true;
  }

  // Send direct message
  async sendDirect(to: string, message: unknown): Promise<boolean> {
    if (!this.activeConnections.has(to)) {
      console.error(`[MeshCommunication] No active connection to ${to}`);
      return false;
    }

    console.log(`[MeshCommunication] Sending direct message to ${to}`);
    // TODO: Implement actual P2P send
    return true;
  }

  // Broadcast to nearby peers
  async broadcastToPeers(message: unknown): Promise<number> {
    let successCount = 0;

    for (const [peerId, peer] of this.nearbyPeers) {
      const distance = peer.distance || 100;
      const signalStrength = SignalStrengthCalculator.calculate(distance);

      if (SignalStrengthCalculator.isMeshViable(signalStrength)) {
        const success = await this.sendDirect(peerId, message);
        if (success) {
          successCount++;
        }
      }
    }

    console.log(`[MeshCommunication] Broadcast to ${successCount}/${this.nearbyPeers.size} peers`);
    return successCount;
  }

  // Monitor mesh quality
  getMeshQuality(): number {
    if (this.nearbyPeers.size === 0) {
      return 0;
    }

    let totalSignal = 0;
    for (const peer of this.nearbyPeers.values()) {
      totalSignal += peer.signalStrength;
    }

    return totalSignal / this.nearbyPeers.size; // Average signal strength
  }

  // Get connected peers
  getConnectedPeers(): PeerInfo[] {
    return Array.from(this.nearbyPeers.values()).filter((peer) =>
      this.activeConnections.has(peer.id)
    );
  }

  // Disconnect from peer
  disconnectFromPeer(peerId: string): void {
    this.activeConnections.delete(peerId);
    console.log(`[MeshCommunication] Disconnected from ${peerId}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// Relay Communication (Multi-Star)
// ─────────────────────────────────────────────────────────────────────────────────

export class RelayCommunication {
  private localDroneId: string;
  private connectedRelay: string | null;
  private lastSyncTime: number;
  private syncInterval: number;
  private isEmergency: boolean;

  constructor(localDroneId: string) {
    this.localDroneId = localDroneId;
    this.connectedRelay = null;
    this.lastSyncTime = 0;
    this.syncInterval = 30000; // 30s default
    this.isEmergency = false;
  }

  // Connect to nearest relay
  async connectToRelay(relayId: string, relayInfo: RelayInfo): Promise<boolean> {
    console.log(`[RelayCommunication] Connecting to relay ${relayId}`);

    this.connectedRelay = relayId;
    this.lastSyncTime = Date.now();
    return true;
  }

  // Periodic sync with relay (adaptive frequency)
  async syncWithRelay(): Promise<boolean> {
    if (!this.connectedRelay) {
      console.warn(`[RelayCommunication] No relay connected`);
      return false;
    }

    const now = Date.now();
    const timeSinceLastSync = now - this.lastSyncTime;

    if (timeSinceLastSync < this.syncInterval) {
      return false; // Not time to sync yet
    }

    console.log(`[RelayCommunication] Syncing with relay ${this.connectedRelay}`);
    this.lastSyncTime = now;

    // TODO: Implement actual sync via MCP
    return true;
  }

  // Send via relay
  async sendViaRelay(
    targetId: string,
    message: unknown,
    relays: Map<string, RelayInfo>
  ): Promise<boolean> {
    if (!this.connectedRelay) {
      console.error(`[RelayCommunication] No relay connected`);
      return false;
    }

    const relay = relays.get(this.connectedRelay);
    if (!relay) {
      console.error(`[RelayCommunication] Relay ${this.connectedRelay} not found`);
      return false;
    }

    console.log(`[RelayCommunication] Sending via relay ${this.connectedRelay} to ${targetId}`);
    // TODO: Implement actual relay send via MCP
    return true;
  }

  // Calculate adaptive sync interval
  calculateSyncInterval(): number {
    if (this.isEmergency) {
      return 5000; // 5s during emergency
    }

    // TODO: Adjust based on network conditions
    return 30000; // 30s normal
  }

  // Set emergency mode
  setEmergency(isEmergency: boolean): void {
    this.isEmergency = isEmergency;
    this.syncInterval = this.calculateSyncInterval();

    if (isEmergency) {
      console.log(`[RelayCommunication] Emergency mode activated (sync: ${this.syncInterval}ms)`);
    } else {
      console.log(`[RelayCommunication] Normal mode restored (sync: ${this.syncInterval}ms)`);
    }
  }

  // Get connected relay
  getConnectedRelay(): string | null {
    return this.connectedRelay;
  }

  // Disconnect from relay
  disconnectFromRelay(): void {
    const relayId = this.connectedRelay;
    this.connectedRelay = null;
    console.log(`[RelayCommunication] Disconnected from relay ${relayId}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// Supporting Types
// ─────────────────────────────────────────────────────────────────────────────────

interface ModeChange {
  from: CommunicationMode;
  to: CommunicationMode;
  timestamp: number;
  reason: string;
  conditions: NetworkCondition;
}
