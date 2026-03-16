# OpenClaw — Drone Swarm Multi-Agent System

A real-time 3D disaster-relief drone swarm simulator built on Next.js, Three.js, and Mistral AI. The system demonstrates a hierarchical multi-agent architecture where a cloud-hosted Master Agent orchestrates an autonomous drone swarm via MCP tool calls. When internet connectivity is lost, a Relay Agent assumes command and distributes cached instructions to individual drone agents over Bluetooth Low Energy (BLE).

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Layers](#2-architecture-layers)
3. [Agent Hierarchy](#3-agent-hierarchy)
4. [MCP Tool System](#4-mcp-tool-system)
5. [Reasoning Pipelines](#5-reasoning-pipelines)
6. [Bluetooth Communication](#6-bluetooth-communication)
7. [Connectivity & Offline Handoff](#7-connectivity--offline-handoff)
8. [Drone Agent Types](#8-drone-agent-types)
9. [Data Flows](#9-data-flows)
10. [File Structure](#10-file-structure)

---

## 1. System Overview

OpenClaw simulates a swarm of five specialised drones responding to disaster SOS signals across a 16×16 grid terrain. Three architectural layers work together:

- **Cloud Layer** — A Mistral-powered Master Agent reasons about the full swarm state and issues MCP tool calls to control drones. It is only active while the browser is online.
- **Edge Layer** — A Relay Agent runs continuously regardless of connectivity. Online, it bridges the Master Agent to the swarm. Offline, it becomes the acting commander using cached instructions.
- **Swarm Layer** — Each drone runs its own lightweight agent that executes instructions received via Bluetooth and applies autonomous role-specific heuristics when no instructions are queued.

```
┌──────────────────────────────────────────────────────────────────┐
│  CLOUD LAYER  (requires internet)                                │
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐   │
│   │  Master Agent                                            │   │
│   │  Model : Mistral Small (streaming)                       │   │
│   │  Cycle : 15 s tick                                       │   │
│   │  Tools : Full MCP catalogue (12 tools)                   │   │
│   │  Output: AgentInstruction objects → relay cache          │   │
│   └───────────────────────────┬──────────────────────────────┘   │
└───────────────────────────────┼──────────────────────────────────┘
                                │  REST / SSE  (online only)
┌───────────────────────────────┼──────────────────────────────────┐
│  EDGE LAYER  (always active)  │                                  │
│                               ▼                                  │
│   ┌──────────────────────────────────────────────────────────┐   │
│   │  Relay Agent                                             │   │
│   │  Online  → forward master instructions, aggregate status │   │
│   │  Offline → offline commander, heuristic instruction gen  │   │
│   │  Memory  → circular buffer, last 50 master instructions  │   │
│   └────────────┬────────────────────────┬─────────────────────┘  │
└────────────────┼────────────────────────┼────────────────────────┘
                 │  Bluetooth LE           │  Bluetooth LE
┌────────────────┼────────────────────────┼────────────────────────┐
│  SWARM LAYER   │                        │                        │
│                ▼                        ▼                        │
│   ┌─────────────────┐      ┌─────────────────┐                  │
│   │  Drone Agent    │      │  Drone Agent    │   · · ·          │
│   │  (Relay Drone)  │      │  (Supply Drone) │                  │
│   │  · BT mesh node │      │  · BT slave     │                  │
│   │  · Local reason │      │  · Local reason │                  │
│   │  · MCP subset   │      │  · MCP subset   │                  │
│   └─────────────────┘      └─────────────────┘                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Architecture Layers

### 2.1 Cloud Layer — Master Agent

| Property | Value |
|---|---|
| Runtime | Browser (Next.js client component) |
| LLM | Mistral Small Latest (streaming SSE) |
| Hook | `lib/useAIController.ts` |
| Tick interval | 15 000 ms |
| Connectivity | Online only (`navigator.onLine`) |
| State access | Full Zustand store snapshot |

The Master Agent is the only component that calls the Mistral API. Each 15-second cycle it:

1. Snapshots the full swarm state (drones, SOS signals, grid coverage).
2. Formats it into a structured prompt via `formatStateDescription()`.
3. Streams the LLM response token-by-token, surfacing reasoning in the UI.
4. Parses `TOOL: <name>` / `PARAMS: {...}` blocks from the response.
5. Executes each parsed tool call sequentially via `executeToolCall()`.
6. Packages each instruction into an `AgentInstruction` record and pushes it into the Relay Agent's circular buffer.

If `navigator.onLine` is `false` at tick time the Master Agent skips the API call entirely and emits a `"master_offline"` event, signalling the Relay Agent to enter offline commander mode.

### 2.2 Edge Layer — Relay Agent

The Relay Agent runs inside the browser on its own tick (3 s). It has two operating modes that switch automatically based on connectivity:

**Online mode**
- Listens for `AgentInstruction` objects produced by the Master Agent.
- Forwards instructions to the correct target drone via the BLE simulator.
- Collects `DroneStatusReport` packets from all drones via BLE notifications.
- Aggregates those reports into a status digest and passes it back to the Master Agent so it can make informed decisions on the next cycle.

**Offline mode** (triggered when `navigator.onLine === false` for > 2 s)
- Promotes itself to acting commander.
- Loads the last 50 cached instructions from its circular buffer.
- Applies offline heuristics to fill gaps:
  - Any drone below 20 % battery → dispatch charger drone.
  - SOS signal strength below 0.7 → reposition nearest supply drone.
  - Dead zone detected in grid → move nearest WiFi drone into it.
  - Relay chain broken → reposition relay drone to bridge gap.
- Issues new `AgentInstruction` objects and broadcasts them via BLE.
- Stores all decisions in an offline log for sync when connectivity is restored.

### 2.3 Swarm Layer — Drone Agents

Each physical drone hosts a lightweight agent that runs on a 3-second tick inside `lib/useSimulation.ts`. It has no LLM dependency:

1. **Self-assess** — reads own battery, position, and status from the store.
2. **Instruction queue** — checks for pending `AgentInstruction` packets received via BLE from the Relay Agent.
3. **Execute or reason locally** — if an instruction is queued, execute it using the drone's allowed MCP tool subset; otherwise apply role-specific autonomous heuristics from `CONTEXT_REASONING` and `IDLE_REASONING` tables.
4. **Report** — pushes a `DroneStatusReport` via BLE back to the Relay Agent.
5. **Log** — writes reasoning text to `perDroneReasoning[droneId]` in the Zustand store for display in the UI.

---

## 3. Agent Hierarchy

```
Master Agent  ──────────────────────────────────────────── CLOUD
    │
    │  AgentInstruction (online: direct API call)
    │  AgentInstruction (offline: cached in relay buffer)
    ▼
Relay Agent  ────────────────────────────────────────────── EDGE
    │
    │  BluetoothMessage { type: "cmd" | "sync" | "offline_cmd" }
    │  Range-limited: 30 sim-units (~10 m real)
    ├──────────┬──────────┬──────────┬──────────┐
    ▼          ▼          ▼          ▼          ▼
 Relay      WiFi      Supply     Scout    Charger
 Drone      Drone      Drone      Drone     Drone
 Agent      Agent      Agent      Agent     Agent
                                                ─── SWARM
```

### Instruction authority chain

```
Online  :  Master Agent  →  Relay Agent  →  Drone Agents
Offline :  [Master silent]
           Relay Agent (acting commander)  →  Drone Agents
```

The Relay Agent never overrides a live Master Agent instruction. It only generates its own instructions when the Master has been unreachable for more than 2 seconds.

---

## 4. MCP Tool System

MCP (Model Context Protocol) is the interface through which any agent — master, relay, or drone — controls the simulation state. Every tool is defined in `lib/mcp-tools.ts` as an `MCPTool` object with a name, description, JSON Schema parameters block, and an async `execute()` function that writes to the Zustand store.

### 4.1 Tool Catalogue

| # | Tool Name | Caller | Offline? | Description |
|---|---|---|---|---|
| 1 | `move_drone(x, y)` | Master / Relay | Yes | Reposition any drone to (x, z) |
| 2 | `dispatch_supply` | Master / Relay | Yes | Send supply drone to an SOS signal |
| 3 | `adjust_relay` | Master / Relay | Yes | Reposition relay drone to fix chain |
| 4 | `scan_area` | Master | No | Move camera focus to grid coordinate |
| 5 | `select_drone` | Master | No | Select drone for UI inspection |
| 6 | `prioritize_sos` | Master | No | Mark SOS critical, auto-dispatch supply |
| 7 | `log_observation` | All agents | Yes | Append observation to reasoning log |
| 8 | `list_drones` | All agents | Yes | Return id/role/status/battery for all drones |
| 9 | `get_drone_status` | All agents | Yes | Detailed status for a single drone |
| 10 | `thermal_scan` | Master / Scout | No | Run thermal scan, detect human signatures |
| 11 | `relay_message` | All agents | Yes | Pass typed message between two drones |
| 12 | `get_coverage_map` | Master / Relay | Yes | Return grid coverage percentage + dead zones |

**Offline** = can execute against local Zustand state without any API call.

### 4.2 Tool Execution Pipeline

```
Agent.reason()
  └─► generateToolCalls()          ← LLM (master) or heuristic (relay/drone)
        └─► for each call:
              ├─ checkConnectivity()
              │     online  → executeToolCall(name, params)
              │     offline → check tool.offline flag
              │                  allowed → executeToolCall(name, params)
              │                  blocked → queue for later sync
              ├─ validateResult()
              ├─ updateZustandStore()
              ├─ packAsAgentInstruction()
              └─ relayAgent.cache(instruction)
```

### 4.3 Tool Call Format (LLM output parsing)

The Master Agent's LLM response is parsed line-by-line in `lib/gemini-service.ts → parseToolCalls()`. The LLM must output tool calls in this exact format:

```
TOOL: move_drone
PARAMS: {"drone_id": "DRONE-02", "target_x": 40, "target_z": -15}
```

Multiple tool blocks can appear in a single response. They are executed sequentially with a 500 ms gap between each call to prevent store thrashing.

### 4.4 AgentInstruction Record

Every executed tool call is packaged into an `AgentInstruction` before being cached in the Relay Agent's buffer:

```
AgentInstruction {
  id              : "instr-<uuid>"
  issuedBy        : "MASTER" | "RELAY" | "DRONE-XX"
  targetAgentId   : "DRONE-02" | "BROADCAST" | "relay"
  priority        : "critical" | "high" | "normal" | "low"
  toolName        : "move_drone"
  params          : { drone_id, target_x, target_z }
  timestamp       : 1718000000000
  expiresAt       : 1718000030000   // 30 s TTL
  requiresOnline  : false
  status          : "pending" | "executing" | "done" | "failed" | "expired"
}
```

The Relay Agent holds the last 50 instructions in a circular buffer. On an offline sync event it broadcasts all non-expired instructions to matching drones via BLE.

---

## 5. Reasoning Pipelines

### 5.1 Master Agent — LLM Chain-of-Thought

```
Step 1  OBSERVE
        formatStateDescription(state)
        → structured text block:
            fleet counts, roles, statuses
            low-battery alerts
            SOS signals + relay chains
            grid coverage %
            dead zone count
            first 8 drone positions

Step 2  THINK
        streamAIReasoning(state)           ← Mistral streaming API
        → tokens arrive chunk-by-chunk
        → accumulated in fullResponse string
        → surfaced live in ReasoningPanel UI

Step 3  PLAN
        parseToolCalls(fullResponse)
        → scans for TOOL: / PARAMS: blocks
        → returns ToolCall[]

Step 4  ACT
        for each ToolCall:
          executeToolCall(name, params)    ← writes to Zustand
          packInstruction(call)
          relayBuffer.push(instruction)

Step 5  REFLECT
        addReasoning(fullResponse, "thought")
        addReasoning("Executed N tool calls", "action")
        setAIStatus("idle")
        pushEvent("AI Commander completed analysis cycle")
```

The entire reasoning trace is stored in `reasoningLog[]` in the Zustand store and rendered in `components/ui/ReasoningPanel.tsx`.

### 5.2 Relay Agent — Rule-Based Reasoning

The Relay Agent does not use an LLM. Its reasoning is deterministic and runs every 3 seconds:

```
ONLINE MODE
  1. Poll relay buffer for new master instructions
  2. For each instruction:
       a. Resolve target drone(s)
       b. Send BLE "cmd" message to drone
       c. Start ACK timeout (5 s)
  3. Collect incoming BLE "status" messages
  4. Build StatusDigest { avgBattery, dronesOffline, sosCount }
  5. Write digest to store for Master Agent next cycle

OFFLINE MODE
  1. Load non-expired instructions from circular buffer
  2. Evaluate offline heuristics (priority order):
       CRITICAL  battery < 20%  → dispatch_charger_to_drone
       HIGH      sos.strength < 0.7 → move_supply_to_sos
       HIGH      relay chain broken → adjust_relay
       NORMAL    dead_zone_count > 5 → move_wifi_to_deadzone
       LOW       scout idle > 30 s  → thermal_scan(scout, nearest_grid)
  3. Generate new AgentInstructions for each triggered heuristic
  4. Broadcast via BLE to target drones
  5. Log decisions to offlineDecisionLog[] for post-reconnect sync
```

### 5.3 Drone Agent — Context + Template Reasoning

Each drone agent selects reasoning text from two lookup tables defined in `lib/useSimulation.ts`:

**CONTEXT_REASONING** — condition-triggered, role-specific:

| Role | Condition | Reasoning Text |
|---|---|---|
| relay | battery < 20 % | "Low battery critical — requesting emergency handoff of relay chain" |
| relay | sos.relayDroneIds includes self | "Anchor node for active SOS relay chain — maintaining position" |
| wifi | dead zone count > 0 | "Dead zone detected — repositioning to maximise coverage footprint" |
| supply | sos.strength < 0.7 | "Weak SOS signal detected — navigating to deliver emergency supplies" |
| scout | no active scan | "No active scan — initiating thermal sweep of uncharted sector" |
| charger | drone.battery < 20 % nearby | "Low-battery drone detected in proximity — intercepting to recharge" |

**IDLE_REASONING** — role flavour text when no condition is active, cycled randomly:

Each role has 5 idle reasoning strings covering patrol updates, system checks, positioning, and readiness reports. These are displayed in `components/ui/DroneReasoningModal.tsx`.

A drone's `proactiveLevel` (0.0–1.0) scales the probability of generating autonomous messages via `effectiveMessageChance = MESSAGE_CHANCE * proactiveLevel`. More proactive drones communicate more frequently and initiate more peer messages.

---

## 6. Bluetooth Communication

### 6.1 Why Bluetooth

When the internet connection drops, drones lose the ability to receive LLM-generated instructions. Bluetooth Low Energy (BLE) fills this gap, providing a short-range, low-power mesh that allows the Relay Agent to distribute cached instructions to nearby drones and collect their status reports — all without a cloud dependency.

### 6.2 BLE Topology

```
                    ┌─────────────────────────────┐
                    │  Relay Drone (BT Central)   │
                    │  Piconet master              │
                    │  Up to 7 active connections  │
                    └───┬───────┬───────┬──────────┘
                        │       │       │
                   BLE  │  BLE  │  BLE  │  BLE
                        ▼       ▼       ▼
                    ┌──────┐ ┌──────┐ ┌──────┐
                    │WiFi  │ │Supply│ │Scout │  · · ·
                    │Drone │ │Drone │ │Drone │
                    │(BT   │ │(BT   │ │(BT   │
                    │Periph│ │Periph│ │Periph│
                    └──────┘ └──────┘ └──────┘
```

Relay drones also form a **BLE mesh** with each other. If Drone A is out of range of the Relay Agent but within range of another relay drone, messages are hop-forwarded (max 3 hops) until they reach the target.

### 6.3 GATT Profile

```
Service: openclaw-drone-swarm
UUID:    [custom 128-bit per deployment]

Characteristics:
┌──────────────┬────────────────┬────────────────────────────────────────┐
│ Name         │ Properties     │ Purpose                                │
├──────────────┼────────────────┼────────────────────────────────────────┤
│ COMMAND      │ Write          │ Relay Agent → Drone: execute tool call │
│ STATUS       │ Notify         │ Drone → Relay Agent: telemetry report  │
│ RELAY        │ Write + Notify │ Relay ↔ Relay: hop-forwarded messages  │
│ SYNC         │ Write          │ Relay → Drone: instruction cache dump  │
│ DISCOVERY    │ Notify         │ Any → Any: peer beacon (2 s interval)  │
└──────────────┴────────────────┴────────────────────────────────────────┘
```

### 6.4 Message Protocol

Every BLE transmission uses a compact JSON envelope:

```
BluetoothMessage {
  type     : "cmd" | "status" | "relay" | "sync" | "ack" | "discover"
  src      : "DRONE-01"           // originating agent ID
  dst      : "DRONE-03"           // target ID, or "BROADCAST"
  seq      : 42                   // monotonic sequence number
  ts       : 1718000000000        // unix ms — used for expiry checks
  hops     : 0                    // incremented at each relay hop
  maxHops  : 3                    // TTL in hops — discard if hops > maxHops
  rssi     : -72                  // simulated signal strength (dBm)
  payload  : { ... }              // type-specific — see below
}

Payload shapes by type:
  cmd        → { instructionId, toolName, params, priority, expiresAt }
  status     → { battery, position, status, role, executedInstructions[], pendingCount }
  relay      → { wrappedMessage: BluetoothMessage }
  sync       → { instructions: CommandPayload[], syncId, masterTimestamp }
  ack        → { seq, success, errorMessage? }
  discover   → { role, battery, position, capabilities[] }
```

### 6.5 Range and Connectivity

| Parameter | Value |
|---|---|
| BLE range (simulation units) | 30 units |
| BLE range (real-world equivalent) | ~10 m |
| Max piconet slaves (Relay as central) | 7 active |
| Mesh hop limit | 3 hops |
| Discovery beacon interval | 2 000 ms |
| Message TTL | 30 000 ms |
| ACK timeout | 5 000 ms |

Range is checked every simulation tick. If a drone moves outside 30 units from the Relay Agent, its BLE connection is suspended and incoming messages are queued. Queued messages are delivered when the drone re-enters range. If the queue is still undelivered when `expiresAt` passes, the instruction is marked `"expired"`.

### 6.6 Deduplication

Each BLE node maintains a seen-set of `"src:seq"` strings. Any message whose `src:seq` pair is already in the set is silently dropped. The seen-set is cleared every 60 seconds to prevent unbounded growth.

---

## 7. Connectivity & Offline Handoff

### 7.1 Connectivity State Machine

```
                      navigator.onLine = false
          ┌──────────┐ ─────────────────────────► ┌───────────────┐
          │  ONLINE  │                             │ TRANSITIONING │
          └──────────┘ ◄──────────────────────── └───────────────┘
               ▲         navigator.onLine = true         │
               │                                         │ > 2 s offline
               │                                         ▼
               │                                   ┌───────────┐
               └──────────────────────────────────│  OFFLINE  │
                       navigator.onLine = true     └───────────┘
```

### 7.2 Handoff Sequence — Online → Offline

```
T+0 s    browser detects navigator.onLine = false
T+0 s    Master Agent: skips API call, emits "master_offline" event
T+0 s    Relay Agent: enters TRANSITIONING state
T+2 s    Relay Agent: transitions to OFFLINE_COMMANDER mode
T+2 s    Relay Agent: loads last 50 cached instructions from circular buffer
T+2 s    Relay Agent: broadcasts BLE SYNC message to all connected drones
T+3 s    Each Drone Agent: receives SYNC payload, loads relevant instructions
T+3 s    Each Drone Agent: begins executing cached instructions autonomously
T+3 s+   Drone Agents: send BLE STATUS reports to Relay Agent every 3 s
T+3 s+   Relay Agent: evaluates offline heuristics each 3 s tick
```

### 7.3 Handoff Sequence — Offline → Online (Reconnect)

```
T+0 s    browser detects navigator.onLine = true
T+0 s    Relay Agent: transitions OFFLINE → ONLINE mode
T+0 s    Relay Agent: assembles reconnect packet:
             { offlineDecisions[], droneStatusReports[], duration }
T+0 s    Relay Agent: sends reconnect packet to Master Agent
T+1 s    Master Agent: wakes, receives reconnect packet
T+1 s    Master Agent: appends offline decisions to reasoning log
T+1 s    Master Agent: re-evaluates full swarm state
T+1 s    Master Agent: issues fresh instructions to correct any drift
T+16 s   Normal 15 s AI cycle resumes
```

---

## 8. Drone Agent Types

Five drone roles are defined in `lib/store.ts` as `DroneRole`. Each role maps to distinct autonomous behaviours, a BLE role, and an allowed MCP tool subset.

---

### 8.1 Relay Drone Agent

**Primary mission:** Maintain communication chain integrity between SOS signals and the base station.

**BT role:** Mesh node — can act as both BLE Central (piconet master) and re-broadcast node, extending network reach for drones out of direct Relay Agent range.

**Autonomous behaviour:**
- Continuously repositions to sit equidistant between the two nearest SOS signals and the base, minimising relay chain length.
- If a relay chain is broken (SOS `relayDroneIds` loses a member), immediately moves to bridge the gap before any Master Agent instruction arrives.
- Re-broadcasts BLE messages with incremented `hops` counter to extend mesh coverage.

**Allowed MCP tools:** `adjust_relay`, `relay_message`, `log_observation`, `get_coverage_map`

**Reasoning examples:**
- *"Anchor node for active SOS relay chain — maintaining position"*
- *"Relay chain fragmented — bridging gap between DRONE-01 and SOS-002"*
- *"Signal propagation nominal — forwarding 3 packets to base"*

---

### 8.2 WiFi Drone Agent

**Primary mission:** Maximise grid cell coverage, eliminate dead zones.

**BT role:** BLE Peripheral — connects to Relay Drone as slave; does not re-broadcast.

**Autonomous behaviour:**
- Scans the `gridCells` state for cells where `state === "dead"` and moves toward the largest cluster of dead cells within its movement budget.
- Stays stationary once coverage of its sector reaches above 85 % to conserve battery.
- When battery drops below 30 %, moves toward the Charger Drone's last known position.

**Allowed MCP tools:** `move_drone`, `get_coverage_map`, `log_observation`, `get_drone_status`

**Reasoning examples:**
- *"Dead zone cluster detected at sector F3 — repositioning for maximum coverage"*
- *"Coverage at 91 % — holding position to conserve battery"*
- *"Battery at 28 % — transitioning to low-power patrol mode"*

---

### 8.3 Supply Drone Agent

**Primary mission:** Respond to SOS signals with emergency supply deliveries.

**BT role:** BLE Peripheral.

**Autonomous behaviour:**
- Continuously monitors `sosSignals` sorted by ascending `strength`. Navigates to the weakest signal first (most urgent).
- After delivering to one SOS location, waits 10 seconds then re-evaluates remaining SOS signals.
- If no active SOS signal exists, patrols in a slow figure-eight pattern over the grid centre to remain available.

**Allowed MCP tools:** `dispatch_supply`, `prioritize_sos`, `relay_message`, `log_observation`, `get_drone_status`

**Reasoning examples:**
- *"SOS-002 signal at 62 % — weakest signal, dispatching supplies"*
- *"Delivery complete at Grid K12 — reassessing SOS priority queue"*
- *"No active SOS — entering standby patrol pattern"*

---

### 8.4 Scout Drone Agent

**Primary mission:** Systematic area reconnaissance, thermal scanning, human detection.

**BT role:** BLE Peripheral.

**Autonomous behaviour:**
- Executes a raster scan pattern across the 16×16 grid, one row per tick, using `thermal_scan`.
- When a human thermal signature is detected (`isHuman === true`), immediately triggers `log_observation` and sends a BLE `alert` message to the Relay Agent, which escalates to the Supply Drone.
- `proactiveLevel` directly scales scan frequency — a highly proactive scout (1.0) scans every 3 seconds; a passive scout (0.3) scans every ~10 seconds.

**Allowed MCP tools:** `thermal_scan`, `scan_area`, `log_observation`, `relay_message`, `get_drone_status`

**Reasoning examples:**
- *"Initiating thermal sweep of Grid Row 7 — 3 sectors remaining"*
- *"Human signature detected at (32, -18) — alerting Relay Agent"*
- *"Scan complete for quadrant NE — no anomalies detected"*

---

### 8.5 Charger Drone Agent

**Primary mission:** Locate and recharge low-battery drones to keep the swarm operational.

**BT role:** BLE Peripheral — also receives battery telemetry from all nearby drones via BLE STATUS notifications.

**Autonomous behaviour:**
- Polls the drone list every tick for drones where `battery < 20 %`.
- Intercepts the lowest-battery drone by flying to its current position.
- Simulates charging by incrementing the target drone's `battery` field until it reaches 85 %, then detaches and seeks the next low-battery drone.
- Prioritises drones that are currently anchoring an active SOS relay chain.

**Allowed MCP tools:** `move_drone`, `list_drones`, `get_drone_status`, `log_observation`, `relay_message`

**Reasoning examples:**
- *"DRONE-04 at 15 % battery — intercepting to prevent relay chain failure"*
- *"Charging DRONE-04: 38 % → target 85 %"*
- *"Charge complete — scanning for next low-battery target"*

---

## 9. Data Flows

### 9.1 Online — Full Stack Flow

```
Mistral API
    │
    │  SSE token stream
    ▼
streamAIReasoning()                       [lib/gemini-service.ts]
    │
    │  accumulated fullResponse string
    ▼
parseToolCalls(fullResponse)              [lib/gemini-service.ts]
    │
    │  ToolCall[] = [ { name, params }, ... ]
    ▼
executeToolCall(name, params)             [lib/mcp-tools.ts]
    │
    │  writes to Zustand store
    ├──► updateDrone() / updateSOS() / pushEvent()
    │
    │  packaged as AgentInstruction
    ▼
RelayAgent.cache(instruction)             [circular buffer, max 50]
    │
    │  BLE "cmd" message
    ▼
BleSimulator.send(relayId, droneId, msg) [lib/bluetooth/ble-simulator]
    │
    │  range check: distance(relay, drone) <= 30 units
    ▼
DroneAgent.receive(msg)                   [lib/useSimulation.ts per drone]
    │
    │  execute allowed MCP tool
    ▼
Zustand store updated
    │
    │  BLE "status" message
    ▼
RelayAgent.receive(statusReport)
    │
    │  aggregate into StatusDigest
    ▼
Master Agent (next cycle)
```

### 9.2 Offline — Relay-Commanded Flow

```
navigator.onLine = false
    │
    ▼
Master Agent skips cycle
    │
    ▼
RelayAgent enters OFFLINE_COMMANDER mode
    │
    │  loads circular buffer (last 50 AgentInstructions)
    │  + evaluates offline heuristics
    ▼
RelayAgent generates new AgentInstructions
    │
    │  BLE "offline_cmd" message
    ▼
BleSimulator.broadcast(relayId, msg)      [range-checked per drone]
    │
    ├──► DRONE-01 in range  → deliver immediately
    ├──► DRONE-03 out of range → queue, retry on re-entry
    └──► DRONE-05 in range via hop → relay drone re-broadcasts
    │
    ▼
DroneAgent.receive(msg)
    │
    │  execute from allowed tool subset only
    ▼
Zustand store updated locally
    │
    │  BLE "status" message (every 3 s)
    ▼
RelayAgent.offlineDecisionLog.push(decision)
    │
    │  (held until reconnect)
    ▼
[ navigator.onLine = true ]
    │
    ▼
RelayAgent sends reconnect packet to Master Agent
    │
    ▼
Master Agent re-evaluates + resumes normal cycle
```

### 9.3 Drone-to-Drone Message Flow

Drones communicate peer-to-peer via the `relay_message` MCP tool, which writes a `DroneMessage` to the Zustand store and also fires a BLE "cmd" message through the Relay Agent as intermediary. All peer messages are visible in `components/ui/MessagePassingPanel.tsx`.

```
DroneAgent A
    │
    │  relay_message { from_id, to_id, message, type }
    ▼
mcpTools["relay_message"].execute()
    │
    ├──► store.addDroneMessage(from, to, content, type)   [persisted in UI]
    ├──► store.setActiveMessagePath(from, to, true)        [animates path line]
    │
    │  BLE "cmd" → RelayAgent → BLE "cmd" → DroneAgent B
    ▼
DroneAgent B receives message
    │
    │  updates lastMessageTime
    │  may trigger response message (proactiveLevel check)
    ▼
store.setActiveMessagePath(from, to, false)               [path line fades]
```

Message types and their meanings:

| Type | Colour | Triggered by |
|---|---|---|
| `command` | Yellow | Master / Relay Agent directing a drone |
| `status` | Blue | Drone reporting position, battery, or state |
| `data` | Green | Scout thermal scan results, coverage readings |
| `alert` | Red | Low battery, broken relay chain, human detected |

---

## 10. File Structure

```
openclaw-damn/
│
├── app/
│   ├── layout.tsx                  # Root layout, mounts simulation
│   └── page.tsx                    # Entry — renders Dashboard + Scene
│
├── components/
│   ├── 3d/
│   │   ├── Scene.tsx               # Three.js canvas root
│   │   ├── Drones.tsx              # DroneUnit mesh + label + movement
│   │   ├── Terrain.tsx             # Ground mesh + texturing
│   │   ├── GridOverlay.tsx         # 16×16 coverage grid visualisation
│   │   ├── RelayPath.tsx           # Animated lines between relay drones
│   │   ├── Markers.tsx             # SOS signal pins
│   │   ├── SOSMarker.tsx           # Individual SOS beacon geometry
│   │   ├── ActiveScans.tsx         # Thermal scan radius visualisation
│   │   ├── DroneChatBubbles.tsx    # In-world message bubble overlays
│   │   └── CameraController.tsx    # Orbit + focus controls
│   │
│   └── ui/
│       ├── Dashboard.tsx           # Master layout: top + right + bottom panels
│       ├── TopPanel.tsx            # Fleet summary, AI toggle, mission status
│       ├── RightPanel.tsx          # Selected drone detail + reasoning modal
│       ├── BottomPanel.tsx         # Event log + active mission tasks
│       ├── ReasoningPanel.tsx      # Master Agent streaming reasoning log
│       ├── DroneReasoningModal.tsx # Per-drone reasoning + message history
│       ├── MessagePassingPanel.tsx # Drone ↔ Drone message chat view
│       ├── EventLog.tsx            # Timestamped swarm event feed
│       ├── DroneSwitchDialog.tsx   # Role-switch confirmation dialog
│       ├── WifiIcon.tsx            # Online indicator icon
│       └── WifiOffIcon.tsx         # Offline indicator icon
│
├── lib/
│   ├── store.ts                    # Zustand store — all swarm state + actions
│   ├── gemini-service.ts           # Mistral streaming API + tool call parser
│   ├── mcp-tools.ts                # MCP tool registry (12 tools)
│   ├── useAIController.ts          # Master Agent hook — LLM cycle management
│   ├── useSimulation.ts            # Drone Agent tick loop — autonomous behaviour
│   ├── mockData.ts                 # Deterministic seed data (grid, drones, SOS)
│   ├── terrain.ts                  # Terrain geometry helpers
│   └── utils.ts                    # Shared utility functions
│
│   ── agents/                      # [architecture layer — to be implemented]
│   │   ├── types.ts                # AgentInstruction, AgentMemory, DroneStatusReport
│   │   ├── master-agent.ts         # Master Agent hook (online-only LLM cycle)
│   │   ├── relay-agent.ts          # Relay Agent hook (bridge + offline commander)
│   │   └── drone-agents.ts         # Per-role autonomous behaviour configs
│   │
│   ── bluetooth/                   # [architecture layer — to be implemented]
│   │   ├── ble-protocol.ts         # GATT UUIDs, BluetoothMessage types, constants
│   │   └── ble-simulator.ts        # Browser BLE simulator (range-based, queued)
│   │
│   └── mcp/                        # [architecture layer — to be implemented]
│       ├── offline-tools.ts        # Offline-safe MCP tool wrappers
│       └── tool-registry.ts        # Unified tool registry with offline flags
│
├── public/
│   ├── Drone.obj                   # 3D drone mesh
│   └── Drone.mtl                   # 3D drone material
│
├── design/
│   └── ARCHITECTURE.md             # This document (standalone copy)
│
└── README.md                       # This document
```

---

## Getting Started

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

- Toggle **AI Commander** in the top panel to activate the Master Agent.
- Click any drone to inspect its reasoning, battery, and message history.
- Click two drones in sequence to open the Message Passing panel.
- Use the role filter buttons to isolate drone types in the 3D view.
- Disable your network connection to simulate offline mode and watch the Relay Agent take command.
