import type { AgentMessage } from "./drone-agent";
import type { DroneAgentInfo, RelayInfo } from "./drone-registry";
import { SignalStrengthCalculator } from "./drone-registry";

// ─────────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────────

export type CommunicationMode = "mesh" | "multi-star";

export interface Route {
  type: CommunicationMode;
  path: string[];
  hops: number;
  reason: string;
}

export interface MessageResult {
  success: boolean;
  error?: string;
  route?: Route;
}

// ─────────────────────────────────────────────────────────────────────────────────
// Peer-to-Peer Communication
// ─────────────────────────────────────────────────────────────────────────────────

export class P2PCommunication {
  private localDroneId: string;
  private localPosition: [number, number, number];
  private connectedRelay: string | null;

  constructor(localDroneId: string, initialPosition: [number, number, number]) {
    this.localDroneId = localDroneId;
    this.localPosition = initialPosition;
    this.connectedRelay = null;
  }

  // Send message to another drone
  async sendMessage(
    targetId: string,
    message: AgentMessage,
    registry: Map<string, DroneAgentInfo>
  ): Promise<MessageResult> {
    const target = registry.get(targetId);
    if (!target) {
      return {
        success: false,
        error: `Target drone ${targetId} not found in registry`,
      };
    }

    // Determine communication mode
    const route = this.calculateRoute(target, registry);

    console.log(
      `[${this.localDroneId}] Sending to ${targetId} via ${route.type} mode: ${route.reason}`
    );

    try {
      if (route.type === "mesh") {
        return await this.sendDirectMesh(targetId, message, route);
      } else {
        return await this.sendViaRelay(targetId, message, route, registry);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        route,
      };
    }
  }

  // Calculate best route to target
  private calculateRoute(
    target: DroneAgentInfo,
    registry: Map<string, DroneAgentInfo>
  ): Route {
    // Check if direct mesh is viable
    const distance = this.calculateDistanceToTarget(target);
    const signalStrength = SignalStrengthCalculator.calculate(distance);

    if (SignalStrengthCalculator.isMeshViable(signalStrength)) {
      // Direct mesh connection (faster)
      return {
        type: "mesh",
        path: [this.localDroneId, target.id],
        hops: 1,
        reason: "direct_mesh_available",
      };
    }

    // Need to use relay
    const relay = this.findBestRelay(registry);
    if (!relay) {
      // Fallback to direct even if weak
      return {
        type: "mesh",
        path: [this.localDroneId, target.id],
        hops: 1,
        reason: "no_relay_available_fallback_to_direct",
      };
    }

    // Check if target is connected to same relay
    if (this.connectedRelay === relay.id && this.isTargetInRelayStar(target, relay.id)) {
      // Same star - route via relay
      return {
        type: "multi-star",
        path: [this.localDroneId, relay.id, target.id],
        hops: 2,
        reason: "out_of_range_same_star",
      };
    } else {
      // Different stars - route via relay backbone
      return {
        type: "multi-star",
        path: [
          this.localDroneId,
          relay.id,
          target.id, // Simplified - actual would find relay path
        ],
        hops: 3,
        reason: "out_of_range_different_star",
      };
    }
  }

  // Send direct mesh message
  private async sendDirectMesh(
    targetId: string,
    message: AgentMessage,
    route: Route
  ): Promise<MessageResult> {
    console.log(`[${this.localDroneId}] Sending direct mesh to ${targetId}`);

    // TODO: Implement actual P2P send via MCP
    message.route = route.path;
    message.hops = route.hops;

    // Simulate successful send
    return {
      success: true,
      route,
    };
  }

  // Send via relay
  private async sendViaRelay(
    targetId: string,
    message: AgentMessage,
    route: Route,
    registry: Map<string, DroneAgentInfo>
  ): Promise<MessageResult> {
    const relayId = route.path[1]; // Second hop is relay
    const relay = registry.get(relayId);

    if (!relay) {
      return {
        success: false,
        error: `Relay ${relayId} not found`,
        route,
      };
    }

    console.log(`[${this.localDroneId}] Sending via relay ${relayId} to ${targetId}`);

    // TODO: Implement actual relay send via MCP
    message.route = route.path;
    message.hops = route.hops;

    // Simulate successful send
    return {
      success: true,
      route,
    };
  }

  // Find best relay
  private findBestRelay(registry: Map<string, DroneAgentInfo>): RelayInfo | null {
    const relays = Array.from(registry.values()).filter((agent) => agent.isRelay);

    if (relays.length === 0) {
      return null;
    }

    // Select relay with lowest load
    // TODO: Include signal strength in calculation
    return relays.reduce((best, current) => {
      const bestScore = this.calculateRelayScore(best as RelayInfo);
      const currentScore = this.calculateRelayScore(current as RelayInfo);
      return currentScore > bestScore ? (current as RelayInfo) : (best as RelayInfo);
    }) as RelayInfo;
  }

  private calculateRelayScore(relay: RelayInfo): number {
    // Score based on load (lower is better)
    // TODO: Include signal strength
    const loadScore = 1 - (relay as any).load;
    return loadScore;
  }

  // Check if target is in same relay star
  private isTargetInRelayStar(target: DroneAgentInfo, relayId: string): boolean {
    // TODO: Implement proper star membership check
    return false;
  }

  // Calculate distance to target
  private calculateDistanceToTarget(target: DroneAgentInfo): number {
    // TODO: Get target position from registry
    // For now, return random distance
    return Math.random() * 150; // 0-150 meters
  }

  // Update local position
  updatePosition(position: [number, number, number]): void {
    this.localPosition = position;
  }

  // Connect to relay
  connectToRelay(relayId: string): void {
    this.connectedRelay = relayId;
    console.log(`[${this.localDroneId}] Connected to relay ${relayId}`);
  }

  // Get current communication mode
  getCommunicationMode(): CommunicationMode {
    // TODO: Implement adaptive mode switching
    return this.connectedRelay ? "multi-star" : "mesh";
  }

  // Broadcast to all nearby peers
  async broadcastToPeers(
    message: AgentMessage,
    registry: Map<string, DroneAgentInfo>
  ): Promise<MessageResult[]> {
    const results: MessageResult[] = [];

    for (const [peerId, peer] of registry) {
      if (peerId === this.localDroneId) continue;

      // Only broadcast to nearby peers (mesh range)
      const distance = this.calculateDistanceToTarget(peer);
      const signalStrength = SignalStrengthCalculator.calculate(distance);

      if (SignalStrengthCalculator.isMeshViable(signalStrength)) {
        const result = await this.sendMessage(peerId, message, registry);
        results.push(result);
      }
    }

    return results;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// Message Queue for offline buffering
// ─────────────────────────────────────────────────────────────────────────────────

export class MessageQueue {
  private queue: AgentMessage[];
  private maxSize: number;
  private processing: boolean;

  constructor(maxSize: number = 100) {
    this.queue = [];
    this.maxSize = maxSize;
    this.processing = false;
  }

  // Add message to queue
  enqueue(message: AgentMessage): boolean {
    if (this.queue.length >= this.maxSize) {
      console.warn("Message queue full, dropping oldest message");
      this.queue.shift(); // Remove oldest
    }

    this.queue.push(message);
    console.log(`Message queued: ${message.id} (queue size: ${this.queue.length})`);
    return true;
  }

  // Get next message from queue
  dequeue(): AgentMessage | null {
    return this.queue.shift() || null;
  }

  // Process all messages in queue
  async process(handler: (message: AgentMessage) => Promise<void>): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const message = this.dequeue();
      if (message) {
        try {
          await handler(message);
        } catch (error) {
          console.error(`Failed to process message ${message.id}:`, error);
          // Re-queue on failure
          this.enqueue(message);
          break;
        }
      }
    }

    this.processing = false;
  }

  // Get queue size
  size(): number {
    return this.queue.length;
  }

  // Clear queue
  clear(): void {
    this.queue = [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// Message acknowledgment and retry
// ─────────────────────────────────────────────────────────────────────────────────

export class MessageAckManager {
  private pendingAcks: Map<string, PendingAck>;
  private retryTimeout: number;
  private maxRetries: number;

  constructor(retryTimeout: number = 5000, maxRetries: number = 3) {
    this.pendingAcks = new Map();
    this.retryTimeout = retryTimeout;
    this.maxRetries = maxRetries;
  }

  // Send message with acknowledgment
  async sendWithAck(
    message: AgentMessage,
    sendFn: () => Promise<MessageResult>
  ): Promise<MessageResult> {
    const pendingAck: PendingAck = {
      message,
      attempts: 0,
      sentAt: Date.now(),
      timeout: null,
    };

    this.pendingAcks.set(message.id, pendingAck);

    try {
      const result = await this.trySend(message, sendFn, pendingAck);

      if (result.success) {
        // Start waiting for acknowledgment
        pendingAck.timeout = setTimeout(() => {
          this.handleAckTimeout(message.id, sendFn);
        }, this.retryTimeout);
      }

      return result;
    } catch (error) {
      this.pendingAcks.delete(message.id);
      throw error;
    }
  }

  // Handle acknowledgment received
  handleAck(messageId: string): void {
    const pendingAck = this.pendingAcks.get(messageId);
    if (pendingAck) {
      if (pendingAck.timeout) {
        clearTimeout(pendingAck.timeout);
      }
      this.pendingAcks.delete(messageId);
      console.log(`Acknowledgment received for message ${messageId}`);
    }
  }

  // Try to send message
  private async trySend(
    message: AgentMessage,
    sendFn: () => Promise<MessageResult>,
    pendingAck: PendingAck
  ): Promise<MessageResult> {
    if (pendingAck.attempts >= this.maxRetries) {
      this.pendingAcks.delete(message.id);
      throw new Error(`Max retries exceeded for message ${message.id}`);
    }

    pendingAck.attempts++;
    console.log(`Sending message ${message.id} (attempt ${pendingAck.attempts})`);

    return await sendFn();
  }

  // Handle acknowledgment timeout
  private async handleAckTimeout(
    messageId: string,
    sendFn: () => Promise<MessageResult>
  ): Promise<void> {
    const pendingAck = this.pendingAcks.get(messageId);
    if (!pendingAck) {
      return;
    }

    console.warn(`Acknowledgment timeout for message ${messageId}, retrying...`);

    try {
      await this.trySend(pendingAck.message, sendFn, pendingAck);

      if (pendingAck.attempts < this.maxRetries) {
        pendingAck.timeout = setTimeout(() => {
          this.handleAckTimeout(messageId, sendFn);
        }, this.retryTimeout);
      } else {
        this.pendingAcks.delete(messageId);
        console.error(`Max retries exceeded for message ${messageId}`);
      }
    } catch (error) {
      this.pendingAcks.delete(messageId);
      console.error(`Failed to retry message ${messageId}:`, error);
    }
  }

  // Get pending ack count
  getPendingCount(): number {
    return this.pendingAcks.size;
  }
}

interface PendingAck {
  message: AgentMessage;
  attempts: number;
  sentAt: number;
  timeout: NodeJS.Timeout | null;
}
