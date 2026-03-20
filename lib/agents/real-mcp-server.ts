/**
 * REAL MCP Server Implementation
 *
 * Actual Express + WebSocket server that each drone runs
 * to expose tools for other drones to call via MCP protocol.
 */

import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { v4 as uuidv4 } from "uuid";

// ─────────────────────────────────────────────────────────────────────────────────
// Real MCP Server
// ─────────────────────────────────────────────────────────────────────────────────

export class RealMCPServer {
  private droneId: string;
  private port: number;
  private app: express.Express;
  private server: any;
  private wss: WebSocketServer | null;
  private tools: Map<string, MCPTool>;
  private connectedClients: Set<WebSocket>;

  constructor(droneId: string, port: number) {
    this.droneId = droneId;
    this.port = port;
    this.app = express();
    this.server = null;
    this.wss = null;
    this.tools = new Map();
    this.connectedClients = new Set();

    // Setup Express
    this.app.use(express.json());

    // Enable CORS for browser requests
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    this.setupRoutes();
  }

  // Setup HTTP routes
  private setupRoutes() {
    // Health check
    this.app.get("/health", (req, res) => {
      res.json({
        status: "ok",
        droneId: this.droneId,
        port: this.port,
        timestamp: Date.now(),
      });
    });

    // List available tools
    this.app.get("/api/tools", (req, res) => {
      const tools = Array.from(this.tools.values()).map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      }));
      res.json({ tools });
    });

    // Execute tool
    this.app.post("/api/tools/:name/execute", async (req, res) => {
      const toolName = req.params.name;
      const params = req.body;

      const tool = this.tools.get(toolName);
      if (!tool) {
        return res.status(404).json({ error: `Tool not found: ${toolName}` });
      }

      try {
        const result = await tool.execute(params);
        res.json({
          success: true,
          result,
          droneId: this.droneId,
          timestamp: Date.now(),
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          droneId: this.droneId,
        });
      }
    });

    // Get drone status
    this.app.get("/api/status", (req, res) => {
      res.json({
        droneId: this.droneId,
        status: "online",
        connectedClients: this.connectedClients.size,
        availableTools: this.tools.size,
        timestamp: Date.now(),
      });
    });

    // Send message to this drone
    this.app.post("/api/message", (req, res) => {
      const { from, message, type } = req.body;

      // Broadcast to all connected clients
      this.broadcastToClients({
        type: "message",
        from,
        to: this.droneId,
        content: message,
        messageType: type,
        timestamp: Date.now(),
      });

      res.json({ success: true });
    });
  }

  // Start the server
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = createServer(this.app);

        // Setup WebSocket
        this.wss = new WebSocketServer({ server: this.server, path: "/ws" });
        this.setupWebSocket();

        this.server.listen(this.port, () => {
          console.log(`✅ [${this.droneId}] MCP Server started on port ${this.port}`);
          console.log(`   HTTP: http://localhost:${this.port}`);
          console.log(`   WebSocket: ws://localhost:${this.port}/ws`);
          resolve();
        });

        this.server.on("error", (error) => {
          console.error(`❌ [${this.droneId}] Server error:`, error);
          reject(error);
        });
      } catch (error) {
        console.error(`❌ [${this.droneId}] Failed to start server:`, error);
        reject(error);
      }
    });
  }

  // Stop the server
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.close(() => {
          console.log(`✅ [${this.droneId}] WebSocket server closed`);
        });
      }

      if (this.server) {
        this.server.close(() => {
          console.log(`✅ [${this.droneId}] HTTP server closed`);
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  // Setup WebSocket
  private setupWebSocket() {
    if (!this.wss) return;

    this.wss.on("connection", (ws: WebSocket) => {
      console.log(`📡 [${this.droneId}] Client connected (${this.connectedClients.size + 1} total)`);
      this.connectedClients.add(ws);

      // Send welcome message
      ws.send(JSON.stringify({
        type: "connected",
        droneId: this.droneId,
        timestamp: Date.now(),
      }));

      ws.on("message", async (data: string) => {
        try {
          const message = JSON.parse(data);
          await this.handleWebSocketMessage(ws, message);
        } catch (error) {
          console.error(`❌ [${this.droneId}] WebSocket error:`, error);
          ws.send(JSON.stringify({
            type: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          }));
        }
      });

      ws.on("close", () => {
        console.log(`📡 [${this.droneId}] Client disconnected (${this.connectedClients.size - 1} total)`);
        this.connectedClients.delete(ws);
      });

      ws.on("error", (error) => {
        console.error(`❌ [${this.droneId}] WebSocket error:`, error);
        this.connectedClients.delete(ws);
      });
    });
  }

  // Handle WebSocket message
  private async handleWebSocketMessage(ws: WebSocket, message: any) {
    switch (message.type) {
      case "call_tool":
        const { toolName, params } = message;
        const result = await this.executeTool(toolName, params);
        ws.send(JSON.stringify({
          type: "tool_result",
          toolName,
          result,
          timestamp: Date.now(),
        }));
        break;

      case "subscribe":
        // Subscribe to events
        ws.send(JSON.stringify({
          type: "subscribed",
          droneId: this.droneId,
          timestamp: Date.now(),
        }));
        break;

      default:
        ws.send(JSON.stringify({
          type: "error",
          error: `Unknown message type: ${message.type}`,
        }));
    }
  }

  // Register a tool
  registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
    console.log(`🔧 [${this.droneId}] Registered tool: ${tool.name}`);
  }

  // Execute a tool
  async executeTool(toolName: string, params: unknown): Promise<unknown> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    console.log(`🔧 [${this.droneId}] Executing ${toolName}`, params);
    return await tool.execute(params);
  }

  // Broadcast to all WebSocket clients
  broadcastToClients(data: unknown): void {
    const message = JSON.stringify(data);
    this.connectedClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Get server info
  getServerInfo() {
    return {
      droneId: this.droneId,
      port: this.port,
      httpUrl: `http://localhost:${this.port}`,
      wsUrl: `ws://localhost:${this.port}/ws`,
      toolCount: this.tools.size,
      connectedClients: this.connectedClients.size,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// MCP Tool Types
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

// ─────────────────────────────────────────────────────────────────────────────────
// MCP Client (for calling other drones' MCP servers)
// ─────────────────────────────────────────────────────────────────────────────────

export class RealMCPClient {
  private localDroneId: string;

  constructor(localDroneId: string) {
    this.localDroneId = localDroneId;
  }

  // Call tool on another drone's MCP server
  async callPeerTool(
    peerId: string,
    peerUrl: string,
    toolName: string,
    params: unknown
  ): Promise<unknown> {
    console.log(`📤 [${this.localDroneId}] Calling ${toolName} on ${peerId} at ${peerUrl}`);

    try {
      const response = await fetch(`${peerUrl}/api/tools/${toolName}/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error(`❌ [${this.localDroneId}] Tool call failed:`, error);
      throw error;
    }
  }

  // Connect to peer's WebSocket
  async connectWebSocket(peerUrl: string): Promise<WebSocket> {
    const ws = new WebSocket(`${peerUrl.replace("http", "ws")}/ws`);

    return new Promise((resolve, reject) => {
      ws.on("open", () => {
        console.log(`📡 [${this.localDroneId}] WebSocket connected to ${peerUrl}`);
        resolve(ws);
      });

      ws.on("error", (error) => {
        console.error(`❌ [${this.localDroneId}] WebSocket error:`, error);
        reject(error);
      });

      setTimeout(() => {
        reject(new Error("WebSocket connection timeout"));
      }, 5000);
    });
  }

  // Get peer status
  async getPeerStatus(peerUrl: string): Promise<any> {
    const response = await fetch(`${peerUrl}/api/status`);
    return await response.json();
  }

  // List peer's tools
  async listPeerTools(peerUrl: string): Promise<any[]> {
    const response = await fetch(`${peerUrl}/api/tools`);
    const data = await response.json();
    return data.tools;
  }
}
