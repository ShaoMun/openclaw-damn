import { type DroneRole } from "../store";

// ─────────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────────

export interface DroneAgent {
  // Agent identity
  id: string;
  role: DroneRole;

  // MCP Server (this drone exposes to others)
  mcpServer: MCPServer | null;
  mcpPort: number;

  // MCP Client (this drone connects to others)
  mcpClient: MCPClient | null;

  // Local SLM instance
  slmPort: number;
  slmInstance: FEDSLMInstance | null;

  // Peer discovery
  knownPeers: Map<string, PeerInfo>;
  connectedRelay: string | null;

  // Message handling
  messageQueue: AgentMessage[];

  // Communication mode
  communicationMode: "mesh" | "multi-star";

  // Status
  status: "online" | "offline" | "syncing";
}

export interface PeerInfo {
  id: string;
  role: DroneRole;
  mcpUrl: string;
  lastSeen: number;
  signalStrength: number;
  distance: number;
  isInRange: boolean;
}

export interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: "command" | "request" | "response" | "event";
  content: unknown;
  timestamp: number;
  ttl: number;
  hops: number;
  route: string[];
  correlationId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// MCP Server (Per-Drone)
// ─────────────────────────────────────────────────────────────────────────────────

export class MCPServer {
  private port: number;
  private droneId: string;
  private tools: Map<string, MCPTool>;

  constructor(droneId: string, port: number) {
    this.droneId = droneId;
    this.port = port;
    this.tools = new Map();
  }

  // Start MCP server (Express + WebSocket)
  async start(): Promise<void> {
    console.log(`[${this.droneId}] Starting MCP server on port ${this.port}`);
    // TODO: Implement Express server + WebSocket
    // TODO: Register tool execution endpoints
  }

  async stop(): Promise<void> {
    console.log(`[${this.droneId}] Stopping MCP server`);
    // TODO: Clean up connections
  }

  // Register tool that other drones can call
  registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
    console.log(`[${this.droneId}] Registered tool: ${tool.name}`);
  }

  // Handle incoming MCP request from another drone
  async handleRequest(fromDrone: string, toolName: string, params: unknown): Promise<unknown> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    console.log(`[${this.droneId}] Executing ${toolName} from ${fromDrone}`);
    return await tool.execute(params);
  }

  getPort(): number {
    return this.port;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MCP Client (Per-Drone)
// ─────────────────────────────────────────────────────────────────────────────────

export class MCPClient {
  private droneId: string;
  private connections: Map<string, PeerConnection>;

  constructor(droneId: string) {
    this.droneId = droneId;
    this.connections = new Map();
  }

  // Connect to another drone's MCP server
  async connectToPeer(peerId: string, peerUrl: string): Promise<void> {
    console.log(`[${this.droneId}] Connecting to ${peerId} at ${peerUrl}`);
    // TODO: Implement HTTP/WebSocket connection
    this.connections.set(peerId, {
      id: peerId,
      url: peerUrl,
      connected: true,
      connectedAt: Date.now(),
    });
  }

  disconnectFromPeer(peerId: string): void {
    console.log(`[${this.droneId}] Disconnecting from ${peerId}`);
    this.connections.delete(peerId);
  }

  // Call tool on another drone
  async callPeerTool(peerId: string, toolName: string, params: unknown): Promise<unknown> {
    const connection = this.connections.get(peerId);
    if (!connection || !connection.connected) {
      throw new Error(`Not connected to ${peerId}`);
    }

    console.log(`[${this.droneId}] Calling ${toolName} on ${peerId}`);
    // TODO: Implement HTTP/WebSocket call
    return { success: true };
  }

  // Broadcast to all connected peers
  async broadcast(toolName: string, params: unknown): Promise<unknown[]> {
    const results: unknown[] = [];

    for (const [peerId, connection] of this.connections) {
      if (connection.connected) {
        try {
          const result = await this.callPeerTool(peerId, toolName, params);
          results.push(result);
        } catch (error) {
          console.error(`[${this.droneId}] Broadcast to ${peerId} failed:`, error);
        }
      }
    }

    return results;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// FEDSLM Instance (Per-Drone)
// ─────────────────────────────────────────────────────────────────────────────────

export class FEDSLMInstance {
  private droneId: string;
  private port: number;
  private model: string;
  private contextSize: number;
  private temperature: number;

  constructor(droneId: string, port: number, model = "fedslm-model") {
    this.droneId = droneId;
    this.port = port;
    this.model = model;
    this.contextSize = 4096;
    this.temperature = 0.7;
  }

  // Start local FEDSLM instance
  async start(): Promise<void> {
    console.log(`[${this.droneId}] Starting FEDSLM instance on port ${this.port}`);
    // TODO: Spawn FEDSLM process (e.g., Ollama)
    // TODO: Wait for model to load
  }

  async stop(): Promise<void> {
    console.log(`[${this.droneId}] Stopping FEDSLM instance`);
    // TODO: Clean up FEDSLM process
  }

  // Query local SLM
  async query(prompt: string, context: DroneContext): Promise<string> {
    console.log(`[${this.droneId}] Querying SLM`);
    // TODO: Implement FEDSLM API call
    return "Response from SLM";
  }

  // Streaming query
  async *queryStream(prompt: string, context: DroneContext): AsyncGenerator<string> {
    console.log(`[${this.droneId}] Querying SLM (stream)`);
    // TODO: Implement streaming FEDSLM API call
    yield "Streamed response from SLM";
  }

  getPort(): number {
    return this.port;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// Supporting Types
// ─────────────────────────────────────────────────────────────────────────────────

export interface MCPTool {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description?: string }>;
    required: string[];
  };
  execute: (params: unknown) => Promise<unknown>;
}

export interface PeerConnection {
  id: string;
  url: string;
  connected: boolean;
  connectedAt: number;
}

export interface DroneContext {
  droneId: string;
  role: DroneRole;
  position: [number, number, number];
  battery: number;
  nearbyPeers: PeerInfo[];
  currentTask?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────
// Drone Agent Factory
// ─────────────────────────────────────────────────────────────────────────────────

export function createDroneAgent(
  id: string,
  role: DroneRole,
  mcpPort: number,
  slmPort: number
): DroneAgent {
  return {
    id,
    role,
    mcpServer: new MCPServer(id, mcpPort),
    mcpPort,
    mcpClient: new MCPClient(id),
    slmInstance: new FEDSLMInstance(id, slmPort),
    slmPort,
    knownPeers: new Map(),
    connectedRelay: null,
    messageQueue: [],
    communicationMode: "mesh",
    status: "offline",
  };
}
