/**
 * MCP Server Test (No Ollama Required)
 *
 * This script tests the multi-agent architecture and MCP servers
 * without requiring Ollama to be installed. It uses mock FEDSLM responses.
 */

import { RealMCPServer, RealMCPClient, type MCPTool } from "./real-mcp-server";
import type { DroneRole } from "../store";

// ─────────────────────────────────────────────────────────────────────────────────
// Test Configuration
// ─────────────────────────────────────────────────────────────────────────────────

const DRONE_CONFIGS = [
  { id: "DRONE-01", role: "relay" as DroneRole, port: 8081 },
  { id: "DRONE-02", role: "supply" as DroneRole, port: 8082 },
  { id: "DRONE-03", role: "relay" as DroneRole, port: 8083 },
];

// ─────────────────────────────────────────────────────────────────────────────────
// Mock FEDSLM Response
// ─────────────────────────────────────────────────────────────────────────────────

const MOCK_SLM_RESPONSES: Record<DroneRole, string[]> = {
  relay: [
    "I'm coordinating communication channels between drones.",
    "Routing messages through the mesh network efficiently.",
    "Maintaining network stability and optimal relay paths.",
  ],
  supply: [
    "Delivering emergency supplies to the designated location.",
    "Optimizing supply distribution for maximum efficiency.",
    "Responding to SOS calls with medical supplies and aid.",
  ],
  wifi: [
    "Extending WiFi coverage to the affected area.",
    "Optimizing antenna placement for best signal strength.",
    "Establishing communication backbone for the region.",
  ],
  scout: [
    "Scouting the area for survivors and hazards.",
    "Mapping terrain and identifying safe routes.",
    "Reporting environmental conditions and obstacles.",
  ],
  charger: [
    "Monitoring battery levels across the swarm.",
    "Deploying to assist drones with low battery.",
    "Optimizing charging station availability.",
  ],
};

function getMockSLMResponse(role: DroneRole): string {
  const responses = MOCK_SLM_RESPONSES[role];
  return responses[Math.floor(Math.random() * responses.length)];
}

// ─────────────────────────────────────────────────────────────────────────────────
// Test Tools
// ─────────────────────────────────────────────────────────────────────────────────

function createTestTools(droneId: string, role: DroneRole): MCPTool[] {
  return [
    {
      name: "get_status",
      description: "Get the current status of this drone",
      parameters: {
        type: "object" as const,
        properties: {},
        required: [],
      },
      execute: async () => {
        return {
          droneId,
          role,
          status: "online",
          battery: Math.floor(Math.random() * 40) + 60, // 60-100%
          timestamp: Date.now(),
          message: `${droneId} is operational`,
        };
      },
    },
    {
      name: "receive_message",
      description: "Receive a message from another drone",
      parameters: {
        type: "object" as const,
        properties: {
          from: { type: "string", description: "Sender drone ID" },
          message: { type: "string", description: "Message content" },
        },
        required: ["from", "message"],
      },
      execute: async (params) => {
        const p = params as { from: string; message: string };
        console.log(`📨 [${droneId}] Received message from ${p.from}: ${p.message}`);
        return {
          droneId,
          received: true,
          from: p.from,
          message: p.message,
          timestamp: Date.now(),
        };
      },
    },
    {
      name: "ping",
      description: "Ping this drone to check connectivity",
      parameters: {
        type: "object" as const,
        properties: {
          message: { type: "string", description: "Optional ping message" },
        },
        required: [],
      },
      execute: async (params) => {
        const p = params as { message?: string };
        return {
          droneId,
          pong: true,
          message: p.message || "pong",
          timestamp: Date.now(),
        };
      },
    },
    {
      name: "query_slm",
      description: "Query the FEDSLM (mock response)",
      parameters: {
        type: "object" as const,
        properties: {
          prompt: { type: "string", description: "Query prompt" },
        },
        required: ["prompt"],
      },
      execute: async (params) => {
        const p = params as { prompt: string };
        const response = getMockSLMResponse(role);
        console.log(`🧠 [${droneId}] SLM Query: ${p.prompt.substring(0, 50)}...`);
        console.log(`🧠 [${droneId}] SLM Response: ${response}`);
        return {
          droneId,
          role,
          prompt: p.prompt,
          response,
          timestamp: Date.now(),
        };
      },
    },
    {
      name: "discover_peers",
      description: "Discover nearby drones (mock)",
      parameters: {
        type: "object" as const,
        properties: {},
        required: [],
      },
      execute: async () => {
        // Return all other drones as "discovered"
        const peers = DRONE_CONFIGS
          .filter(d => d.id !== droneId)
          .map(d => ({
            droneId: d.id,
            role: d.role,
            port: d.port,
            signalStrength: Math.floor(Math.random() * 30) + 70, // 70-100%
            lastSeen: Date.now(),
          }));

        return {
          droneId,
          discoveredPeers: peers.length,
          peers,
          timestamp: Date.now(),
        };
      },
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────────
// Test Functions
// ─────────────────────────────────────────────────────────────────────────────────

async function startMCPServers() {
  console.log("\n" + "=".repeat(70));
  console.log("🚀 Starting MCP Server Test (No Ollama Required)");
  console.log("=".repeat(70) + "\n");

  const mcpServers: Map<string, RealMCPServer> = new Map();
  const mcpClients: Map<string, RealMCPClient> = new Map();

  // Start each drone's MCP server
  for (const config of DRONE_CONFIGS) {
    console.log(`\n🔧 Starting ${config.id}...`);

    // Start MCP server
    console.log(`   🌐 Starting MCP server on port ${config.port}...`);
    const mcpServer = new RealMCPServer(config.id, config.port);

    // Register tools
    const tools = createTestTools(config.id, config.role);
    for (const tool of tools) {
      mcpServer.registerTool(tool);
    }

    await mcpServer.start();
    mcpServers.set(config.id, mcpServer);

    // Create MCP client
    const mcpClient = new RealMCPClient(config.id);
    mcpClients.set(config.id, mcpClient);

    console.log(`   ✅ ${config.id} ready with ${tools.length} tools`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("✅ All MCP servers started successfully!");
  console.log("=".repeat(70) + "\n");

  // Show server info
  for (const [droneId, server] of mcpServers) {
    const info = server.getServerInfo();
    console.log(`📡 ${droneId}:`);
    console.log(`   HTTP: ${info.httpUrl}`);
    console.log(`   WebSocket: ${info.wsUrl}`);
    console.log(`   Tools: ${info.toolCount}`);
    console.log(`   Role: ${DRONE_CONFIGS.find(d => d.id === droneId)?.role}`);
    console.log("");
  }

  // Run tests
  await runTests(mcpServers, mcpClients);

  // Cleanup on exit
  process.on("SIGINT", async () => {
    console.log("\n\n🛑 Shutting down...");

    // Stop all MCP servers
    for (const [droneId, server] of mcpServers) {
      console.log(`   Stopping ${droneId}...`);
      await server.stop();
    }

    console.log("\n✅ All servers stopped. Goodbye!");
    process.exit(0);
  });
}

async function runTests(
  mcpServers: Map<string, RealMCPServer>,
  mcpClients: Map<string, RealMCPClient>
) {
  console.log("=".repeat(70));
  console.log("🧪 Running Integration Tests");
  console.log("=".repeat(70) + "\n");

  // Test 1: Health check
  console.log("Test 1: Health Check");
  console.log("-".repeat(70));

  for (const [droneId, server] of mcpServers) {
    const info = server.getServerInfo();
    try {
      const response = await fetch(`${info.httpUrl}/health`);
      const data = await response.json();
      console.log(`✅ ${droneId}: ${data.status} (port: ${data.port})`);
    } catch (error) {
      console.error(`❌ ${droneId}: Health check failed`);
    }
  }

  console.log("");

  // Test 2: Tool execution
  console.log("Test 2: Tool Execution");
  console.log("-".repeat(70));

  const drone1 = mcpServers.get("DRONE-01");
  const drone2 = mcpServers.get("DRONE-02");

  if (drone1 && drone2) {
    const info1 = drone1.getServerInfo();

    // Call get_status tool
    try {
      const response = await fetch(`${info1.httpUrl}/api/tools/get_status/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const result = await response.json();
      console.log(`✅ DRONE-01 get_status:`, result.result);
    } catch (error) {
      console.error(`❌ Tool execution failed:`, error);
    }

    console.log("");

    // Test 3: Inter-drone communication
    console.log("Test 3: Inter-Drone Communication");
    console.log("-".repeat(70));

    const client1 = mcpClients.get("DRONE-01");
    const info2 = drone2.getServerInfo();

    if (client1) {
      try {
        // Call receive_message tool on DRONE-02
        const result = await client1.callPeerTool(
          "DRONE-02",
          info2.httpUrl,
          "receive_message",
          {
            from: "DRONE-01",
            message: "Hello from DRONE-01!",
          }
        );
        console.log(`✅ DRONE-01 → DRONE-02:`, result);
      } catch (error) {
        console.error(`❌ Inter-drone communication failed:`, error);
      }
    }

    console.log("");

    // Test 4: Ping test
    console.log("Test 4: Ping Test");
    console.log("-".repeat(70));

    const client2 = mcpClients.get("DRONE-02");

    if (client2 && drone1) {
      try {
        const result = await client2.callPeerTool(
          "DRONE-01",
          info1.httpUrl,
          "ping",
          { message: "Are you there?" }
        );
        console.log(`✅ DRONE-02 → DRONE-01:`, result);
      } catch (error) {
        console.error(`❌ Ping failed:`, error);
      }
    }

    console.log("");

    // Test 5: Mock SLM Query
    console.log("Test 5: Mock SLM Query");
    console.log("-".repeat(70));

    try {
      const response = await fetch(`${info1.httpUrl}/api/tools/query_slm/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "What is your current task?",
        }),
      });

      const result = await response.json();
      console.log(`✅ DRONE-01 SLM Response: ${result.result.response}`);
    } catch (error) {
      console.error(`❌ SLM query failed:`, error);
    }

    console.log("");

    // Test 6: Peer Discovery
    console.log("Test 6: Peer Discovery");
    console.log("-".repeat(70));

    try {
      const response = await fetch(`${info1.httpUrl}/api/tools/discover_peers/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const result = await response.json();
      console.log(`✅ DRONE-01 discovered ${result.result.discoveredPeers} peers:`);
      result.result.peers.forEach((peer: any) => {
        console.log(`   - ${peer.droneId} (${peer.role}) - Signal: ${peer.signalStrength}%`);
      });
    } catch (error) {
      console.error(`❌ Peer discovery failed:`, error);
    }

    console.log("");

    // Test 7: List available tools
    console.log("Test 7: List Available Tools");
    console.log("-".repeat(70));

    try {
      const response = await fetch(`${info1.httpUrl}/api/tools`);
      const data = await response.json();
      console.log(`✅ DRONE-01 has ${data.tools.length} tools:`);
      data.tools.forEach((tool: any) => {
        console.log(`   - ${tool.name}: ${tool.description}`);
      });
    } catch (error) {
      console.error(`❌ Tool listing failed:`, error);
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("✅ Tests Complete!");
  console.log("=".repeat(70));
  console.log("\n💡 Manual testing commands:");
  console.log(`   curl http://localhost:8081/api/tools`);
  console.log(`   curl http://localhost:8081/api/status`);
  console.log(`   curl -X POST http://localhost:8081/api/tools/get_status/execute -H "Content-Type: application/json" -d '{}'`);
  console.log("\n🛑 Press Ctrl+C to shutdown\n");
}

// ─────────────────────────────────────────────────────────────────────────────────
// Main Entry Point
// ─────────────────────────────────────────────────────────────────────────────────

async function main() {
  try {
    await startMCPServers();
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  main().catch(console.error);
}

export { startMCPServers };
