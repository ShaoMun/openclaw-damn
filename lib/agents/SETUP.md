# 🚀 Real Multi-Agent Drone Swarm - Setup & Testing

This guide shows you how to run the **actual working multi-agent system** with real MCP servers and FEDSLM instances.

## 📋 Prerequisites

### 1. Install Ollama (for FEDSLM)

**macOS/Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
- Download from https://ollama.com/download
- Run the installer

**Verify Installation:**
```bash
ollama --version
```

### 2. Install Node.js Dependencies

```bash
npm install express ws uuid
```

Or add to `package.json`:
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.14.2",
    "uuid": "^9.0.0"
  }
}
```

### 3. Start Ollama

```bash
ollama serve
```

Keep this running in a separate terminal.

## 🔧 Setup & Installation

```bash
# Install dependencies
npm install

# Pull the FEDSLM model (or use default)
ollama pull fedslm-model
# OR use a real model:
ollama pull llama2
ollama pull mistral
```

## 🧪 Testing the Real System

### Option 1: Run the Test Script

```bash
# In a new terminal (keep ollama serve running)
npm run test:real

# OR using ts-node directly
npx ts-node lib/agents/test-real-servers.ts
```

This will:
1. ✅ Check prerequisites
2. ✅ Start 3 real MCP servers (ports 8081-8083)
3. ✅ Start 3 real FEDSLM instances (ports 11434-11436)
4. ✅ Register tools on each server
5. ✅ Run integration tests
6. ✅ Test inter-drone communication
7. ✅ Query FEDSLM instances

### Option 2: Manual Testing

```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Start the test
npx ts-node lib/agents/test-real-servers.ts

# Terminal 3: Manual testing
# Test MCP server health
curl http://localhost:8081/health
curl http://localhost:8082/health
curl http://localhost:8083/health

# Test tool execution
curl -X POST http://localhost:8081/api/tools/get_status/execute \
  -H "Content-Type: application/json" \
  -d '{}'

# Test inter-drone communication
curl -X POST http://localhost:8082/api/tools/receive_message/execute \
  -H "Content-Type: application/json" \
  -d '{"from": "DRONE-01", "message": "Hello!"}'
```

## 📊 What You'll See

### Console Output

```
======================================================================
🔍 Checking Prerequisites
======================================================================

✅ Ollama is installed
✅ Required Node.js dependencies are installed

======================================================================
🚀 Starting Real Multi-Agent Drone Swarm
======================================================================

🔧 Starting DRONE-01...
   📦 Starting FEDSLM instance on port 11434...
   🌐 Starting MCP server on port 8081...
📤 [DRONE-01] Ollama: pull ...
✅ [DRONE-01] FEDSLM instance ready at http://localhost:11434
✅ [DRONE-01] MCP Server started on port 8081
   🔧 [DRONE-01] Registered tool: get_status
   🔧 [DRONE-01] Registered tool: receive_message
   🔧 [DRONE-01] Registered tool: ping
   ✅ DRONE-01 ready

🔧 Starting DRONE-02...
   ...

======================================================================
✅ All drones started successfully!
======================================================================

📡 DRONE-01:
   HTTP: http://localhost:8081
   WebSocket: ws://localhost:8081/ws
   Tools: 3
   Clients: 0

📡 DRONE-02:
   HTTP: http://localhost:8082
   ...

======================================================================
🧪 Running Integration Tests
======================================================================

Test 1: Health Check
----------------------------------------------------------------------
✅ DRONE-01: ok
✅ DRONE-02: ok
✅ DRONE-03: ok

Test 2: Tool Execution
----------------------------------------------------------------------
✅ DRONE-01 get_status: {
  droneId: 'DRONE-01',
  role: 'relay',
  status: 'online',
  ...
}

Test 3: Inter-Drone Communication
----------------------------------------------------------------------
🔧 [DRONE-01] Executing receive_message
📨 [DRONE-02] Received message from DRONE-01: Hello from DRONE-01!
✅ DRONE-01 → DRONE-02: { received: true, from: 'DRONE-01', ... }

Test 4: Ping Test
----------------------------------------------------------------------
✅ DRONE-02 → DRONE-01: { pong: true, message: 'Are you there?', ... }

Test 5: FEDSLM Query
----------------------------------------------------------------------
🧠 [DRONE-01] Querying FEDSLM...
✅ DRONE-01 FEDSLM Response: My primary responsibility is to maintain communication chains.

======================================================================
✅ Tests Complete!
======================================================================
```

## 🎯 Test Results

### ✅ Working Components

1. **Real MCP Servers** - Express + WebSocket servers
   - Each drone has its own HTTP endpoint
   - WebSocket connections for real-time communication
   - Tool execution with proper responses

2. **Real FEDSLM Instances** - Ollama integration
   - Each drone has its own Ollama instance
   - Unique port per drone (11434-11436)
   - SLM queries working with responses

3. **Inter-Drone Communication** - HTTP-based MCP
   - Drones can call each other's tools
   - Request/response working
   - Tool parameters passing correctly

4. **Tool Execution** - Custom tools per drone
   - `get_status` - Get drone status
   - `receive_message` - Receive messages from peers
   - `ping` - Connectivity check

### 🔌 API Endpoints Available

Each drone exposes:

```
GET  /health                           # Health check
GET  /api/tools                         # List available tools
POST /api/tools/:name/execute           # Execute a tool
GET  /api/status                        # Get drone status
POST /api/message                       # Send message to drone
WS   /ws                                # WebSocket connection
```

## 🐛 Troubleshooting

### "Ollama not installed"
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama
ollama serve
```

### "Port already in use"
```bash
# Find process using port
lsof -i :8081

# Kill the process
kill -9 <PID>

# OR use different ports in DRONE_CONFIGS
```

### "Cannot find module 'express'"
```bash
npm install express ws uuid
```

### "FEDSLM query failed"
```bash
# Make sure Ollama is running
ollama serve

# Pull a model
ollama pull llama2
```

## 📝 Next Steps After Testing

### 1. Add More Tools

```typescript
// In test-real-servers.ts, add more tools:

function createTestTools(droneId: string, role: DroneRole): MCPTool[] {
  const baseTools = [...]; // existing tools

  if (role === "supply") {
    baseTools.push({
      name: "deliver_supplies",
      description: "Deliver supplies to a location",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "Delivery location" },
          supplies: { type: "string", description: "Supplies to deliver" }
        },
        required: ["location", "supplies"]
      },
      execute: async (params) => {
        return {
          droneId,
          delivered: true,
          location: params.location,
          supplies: params.supplies,
          timestamp: Date.now()
        };
      }
    });
  }

  return baseTools;
}
```

### 2. Connect to Existing Simulation

Replace the stub `drone-agent.ts` with real implementations using the real servers.

### 3. Build the UI

Create components to visualize:
- Active MCP servers
- FEDSLM instance status
- Tool execution logs
- Inter-drone communication graph

## ✅ Success Criteria

- [ ] Ollama runs without errors
- [ ] Each drone starts on unique port
- [ ] Health checks return 200 OK
- [ ] Tools execute successfully
- [ ] Inter-drone communication works
- [ ] FEDSLM responds to queries
- [ ] WebSocket connections established

---

**🎉 You now have REAL working servers and SLMs!**
