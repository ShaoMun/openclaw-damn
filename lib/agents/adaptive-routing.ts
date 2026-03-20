import type { AgentMessage } from "./drone-agent";
import type { DroneAgentInfo, RelayInfo } from "./drone-registry";
import type {
  CommunicationMode,
  NetworkCondition,
  RouteCalculation,
} from "./adaptive-network";
import { SignalStrengthCalculator } from "./drone-registry";

// ─────────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────────

export interface Route {
  type: CommunicationMode;
  path: string[];
  hops: number;
  estimatedLatency: number; // ms
  reliability: number; // 0-1
  reason: string;
  alternativeRoutes?: Route[]; // Fallback routes
}

export interface RoutingResult {
  success: boolean;
  route: Route;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// Adaptive Router
// ─────────────────────────────────────────────────────────────────────────────────

export class AdaptiveRouter {
  private localDroneId: string;
  localPosition: [number, number, number];
  localRelay: string | null;

  constructor(localDroneId: string, initialPosition: [number, number, number]) {
    this.localDroneId = localDroneId;
    this.localPosition = initialPosition;
    this.localRelay = null;
  }

  // Find best route to target drone
  findRoute(
    source: DroneAgentInfo,
    target: DroneAgentInfo,
    allAgents: Map<string, DroneAgentInfo>,
    relays: Map<string, RelayInfo>
  ): Route {
    // Assess network conditions
    const conditions = this.assessConditions(target);

    // Decide routing strategy
    if (this.isMeshViable(conditions)) {
      // Direct mesh connection (fastest)
      return this.calculateMeshRoute(source, target, conditions);
    } else if (source.isRelay || target.isRelay) {
      // One or both are relays
      return this.calculateRelayRoute(source, target, allAgents, relays, conditions);
    } else {
      // Both workers - need relay
      return this.calculateMultiStarRoute(source, target, allAgents, relays, conditions);
    }
  }

  // Calculate mesh route (direct P2P)
  private calculateMeshRoute(
    source: DroneAgentInfo,
    target: DroneAgentInfo,
    conditions: NetworkCondition
  ): Route {
    return {
      type: "mesh",
      path: [source.id, target.id],
      hops: 1,
      estimatedLatency: this.estimateMeshLatency(conditions),
      reliability: conditions.signalStrength,
      reason: "direct_mesh_available",
    };
  }

  // Calculate relay route (source or target is relay)
  private calculateRelayRoute(
    source: DroneAgentInfo,
    target: DroneAgentInfo,
    allAgents: Map<string, DroneAgentInfo>,
    relays: Map<string, RelayInfo>,
    conditions: NetworkCondition
  ): Route {
    if (source.isRelay && target.isRelay) {
      // Relay to relay - direct backbone connection
      return {
        type: "multi-star",
        path: [source.id, target.id],
        hops: 1,
        estimatedLatency: 20, // Relay-relay is fast
        reliability: 0.95,
        reason: "relay_to_relay_backbone",
      };
    } else if (source.isRelay) {
      // Source is relay, target is worker
      return {
        type: "multi-star",
        path: [source.id, target.id],
        hops: 1,
        estimatedLatency: 15,
        reliability: 0.9,
        reason: "relay_to_worker_direct",
      };
    } else {
      // Source is worker, target is relay
      return {
        type: "multi-star",
        path: [source.id, target.id],
        hops: 1,
        estimatedLatency: 15,
        reliability: 0.9,
        reason: "worker_to_relay_direct",
      };
    }
  }

  // Calculate multi-star route (worker to worker via relay)
  private calculateMultiStarRoute(
    source: DroneAgentInfo,
    target: DroneAgentInfo,
    allAgents: Map<string, DroneAgentInfo>,
    relays: Map<string, RelayInfo>,
    conditions: NetworkCondition
  ): Route {
    // Find best relay for source
    const sourceRelay = this.findBestRelayForAgent(source, relays);
    // Find best relay for target
    const targetRelay = this.findBestRelayForAgent(target, relays);

    if (!sourceRelay || !targetRelay) {
      // No relay available, fallback to mesh even if weak
      return {
        type: "mesh",
        path: [source.id, target.id],
        hops: 1,
        estimatedLatency: 100, // High latency due to weak signal
        reliability: 0.3,
        reason: "no_relay_available_fallback_to_mesh",
      };
    }

    if (sourceRelay.id === targetRelay.id) {
      // Same star - route via their shared relay
      return {
        type: "multi-star",
        path: [source.id, sourceRelay.id, target.id],
        hops: 2,
        estimatedLatency: 30,
        reliability: 0.85,
        reason: "out_of_range_same_star",
      };
    } else {
      // Different stars - route via relay backbone
      const relayPath = this.findRelayPath(sourceRelay.id, targetRelay.id, relays);
      return {
        type: "multi-star",
        path: [source.id, sourceRelay.id, ...relayPath, targetRelay.id, target.id],
        hops: 3 + relayPath.length,
        estimatedLatency: 40 + relayPath.length * 10,
        reliability: 0.8,
        reason: "out_of_range_different_star",
      };
    }
  }

  // Find best relay for an agent
  private findBestRelayForAgent(
    agent: DroneAgentInfo,
    relays: Map<string, RelayInfo>
  ): RelayInfo | null {
    if (relays.size === 0) {
      return null;
    }

    // Score relays based on: signal strength (0.6) + load (0.4)
    return Array.from(relays.values()).reduce((best, current) => {
      const bestScore = this.scoreRelay(agent, best);
      const currentScore = this.scoreRelay(agent, current);
      return currentScore > bestScore ? current : best;
    });
  }

  // Score a relay for an agent
  private scoreRelay(agent: DroneAgentInfo, relay: RelayInfo): number {
    const signalScore = relay.signalStrength * 0.6;
    const loadScore = (1 - relay.load) * 0.4;
    return signalScore + loadScore;
  }

  // Find path between relays
  private findRelayPath(
    fromRelayId: string,
    toRelayId: string,
    relays: Map<string, RelayInfo>
  ): string[] {
    // Simplified: direct connection between relays
    // In real implementation, could use multi-hop if relays not directly connected
    return [];
  }

  // Assess network conditions to target
  private assessConditions(target: DroneAgentInfo): NetworkCondition {
    const distance = this.calculateDistance(target);
    const signalStrength = SignalStrengthCalculator.calculate(distance);
    const interference = this.calculateInterference();
    const congestion = this.calculateCongestion();

    return {
      signalStrength,
      interference,
      distance,
      batteryLevel: 100, // TODO: Get actual battery
      congestion,
    };
  }

  // Check if mesh is viable
  private isMeshViable(conditions: NetworkCondition): boolean {
    const signalThreshold = 0.3;
    const interferenceThreshold = 0.7;
    const congestionThreshold = 0.8;

    return (
      conditions.signalStrength >= signalThreshold &&
      conditions.interference < interferenceThreshold &&
      conditions.congestion < congestionThreshold
    );
  }

  // Estimate mesh latency
  private estimateMeshLatency(conditions: NetworkCondition): number {
    // Latency based on signal strength (worse signal = higher latency)
    const baseLatency = 10; // ms
    const signalFactor = 1 - conditions.signalStrength;
    const interferenceFactor = conditions.interference;

    return baseLatency + (signalFactor + interferenceFactor) * 50;
  }

  // Calculate distance to target
  private calculateDistance(target: DroneAgentInfo): number {
    // TODO: Get actual position
    return target.distance || Math.random() * 150;
  }

  // Calculate interference
  private calculateInterference(): number {
    return Math.random() * 0.3;
  }

  // Calculate congestion
  private calculateCongestion(): number {
    return Math.random() * 0.3;
  }

  // Send message using adaptive routing
  async sendAdaptive(
    source: DroneAgentInfo,
    target: DroneAgentInfo,
    message: AgentMessage,
    allAgents: Map<string, DroneAgentInfo>,
    relays: Map<string, RelayInfo>
  ): Promise<RoutingResult> {
    const route = this.findRoute(source, target, allAgents, relays);

    console.log(
      `[AdaptiveRouter] ${source.id} → ${target.id}: ${route.type} mode, ${route.hops} hops, ${route.reason}`
    );

    try {
      // Update message with route info
      message.route = route.path;
      message.hops = route.hops;

      // TODO: Implement actual send based on route type
      if (route.type === "mesh") {
        await this.sendMeshRoute(message, route);
      } else {
        await this.sendRelayRoute(message, route);
      }

      return {
        success: true,
        route,
      };
    } catch (error) {
      // Try alternative routes if available
      if (route.alternativeRoutes && route.alternativeRoutes.length > 0) {
        console.log(`[AdaptiveRouter] Primary route failed, trying alternative...`);
        return await this.tryAlternativeRoute(message, route.alternativeRoutes[0]);
      }

      return {
        success: false,
        route,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Fallback to relay if mesh fails
  async fallbackToRelay(
    message: AgentMessage,
    allAgents: Map<string, DroneAgentInfo>,
    relays: Map<string, RelayInfo>
  ): Promise<RoutingResult> {
    console.log(`[AdaptiveRouter] Mesh failed, falling back to relay...`);

    const source = allAgents.get(message.from);
    const target = allAgents.get(message.to);

    if (!source || !target) {
      return {
        success: false,
        route: {
          type: "multi-star",
          path: [],
          hops: 0,
          estimatedLatency: 0,
          reliability: 0,
          reason: "agents_not_found",
        },
        error: "Source or target agent not found",
      };
    }

    // Force multi-star route
    const route = this.calculateMultiStarRoute(source, target, allAgents, relays, {
      signalStrength: 0.1, // Force relay
      interference: 0.8,
      distance: 150,
      batteryLevel: 100,
      congestion: 0.9,
    });

    try {
      await this.sendRelayRoute(message, route);
      return {
        success: true,
        route,
      };
    } catch (error) {
      return {
        success: false,
        route,
        error: error instanceof Error ? error.message : "Relay fallback failed",
      };
    }
  }

  // Send via mesh route
  private async sendMeshRoute(message: AgentMessage, route: Route): Promise<void> {
    console.log(`[AdaptiveRouter] Sending via mesh: ${route.path.join(" → ")}`);
    // TODO: Implement actual mesh send
  }

  // Send via relay route
  private async sendRelayRoute(message: AgentMessage, route: Route): Promise<void> {
    console.log(`[AdaptiveRouter] Sending via relay: ${route.path.join(" → ")}`);
    // TODO: Implement actual relay send
  }

  // Try alternative route
  private async tryAlternativeRoute(message: AgentMessage, route: Route): Promise<RoutingResult> {
    console.log(`[AdaptiveRouter] Trying alternative route: ${route.path.join(" → ")}`);

    try {
      if (route.type === "mesh") {
        await this.sendMeshRoute(message, route);
      } else {
        await this.sendRelayRoute(message, route);
      }

      return {
        success: true,
        route,
      };
    } catch (error) {
      return {
        success: false,
        route,
        error: error instanceof Error ? error.message : "Alternative route failed",
      };
    }
  }

  // Update local position
  updatePosition(position: [number, number, number]): void {
    this.localPosition = position;
  }

  // Set local relay
  setLocalRelay(relayId: string): void {
    this.localRelay = relayId;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// Route Optimizer
// ─────────────────────────────────────────────────────────────────────────────────

export class RouteOptimizer {
  // Optimize route based on real-time conditions
  static optimize(route: Route, conditions: NetworkCondition): Route {
    // Adjust estimated latency based on conditions
    const latencyAdjustment = 1 + conditions.interference + conditions.congestion;
    const optimizedRoute = { ...route };
    optimizedRoute.estimatedLatency = Math.floor(
      route.estimatedLatency * latencyAdjustment
    );

    // Adjust reliability based on conditions
    optimizedRoute.reliability = route.reliability * (1 - conditions.interference * 0.3);

    return optimizedRoute;
  }

  // Compare two routes
  static compare(route1: Route, route2: Route): Route {
    // Prefer route with:
    // 1. Higher reliability
    // 2. Lower latency
    // 3. Fewer hops

    const score1 = this.calculateRouteScore(route1);
    const score2 = this.calculateRouteScore(route2);

    return score1 > score2 ? route1 : route2;
  }

  // Calculate route score
  private static calculateRouteScore(route: Route): number {
    const reliabilityWeight = 0.5;
    const latencyWeight = 0.3;
    const hopsWeight = 0.2;

    const reliabilityScore = route.reliability * reliabilityWeight;
    const latencyScore = (1 - Math.min(route.estimatedLatency / 100, 1)) * latencyWeight;
    const hopsScore = (1 - Math.min(route.hops / 5, 1)) * hopsWeight;

    return reliabilityScore + latencyScore + hopsScore;
  }

  // Generate alternative routes
  static generateAlternatives(
    primaryRoute: Route,
    source: DroneAgentInfo,
    target: DroneAgentInfo,
    relays: Map<string, RelayInfo>
  ): Route[] {
    const alternatives: Route[] = [];

    // Alternative 1: Different relay
    if (primaryRoute.type === "multi-star" && relays.size > 1) {
      const otherRelays = Array.from(relays.values()).filter(
        (r) => !primaryRoute.path.includes(r.id)
      );

      for (const relay of otherRelays.slice(0, 2)) {
        // Limit to 2 alternatives
        alternatives.push({
          type: "multi-star",
          path: [source.id, relay.id, target.id],
          hops: 2,
          estimatedLatency: 35,
          reliability: relay.signalStrength * 0.85,
          reason: "alternative_relay",
        });
      }
    }

    // Alternative 2: Direct mesh (if primary is multi-star)
    if (primaryRoute.type === "multi-star") {
      alternatives.push({
        type: "mesh",
        path: [source.id, target.id],
        hops: 1,
        estimatedLatency: 80,
        reliability: 0.4,
        reason: "alternative_mesh_fallback",
      });
    }

    return alternatives;
  }
}
