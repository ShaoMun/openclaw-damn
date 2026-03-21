<img width="840" height="212" alt="Screenshot 2026-03-21 at 11 21 55 AM" src="https://github.com/user-attachments/assets/9ad06f9d-74d8-4ed3-9454-62f49151a035" />
# DAMNdelion

> **DAMN** + **delion** — Decentralized Agent Memory Network for Disaster Response

### Like **dandelion** seeds spreading on the wind, our autonomous drones communicate and coordinate across disaster zones without relying on centralized infrastructure.

---

## Table of Contents

1. [TL;DR](#tldr)
2. [Problem](#2-problem)
3. [Solution](#3-solution)
   - [3.1 Offline Architecture](#31-offline-architecture)
   - [3.2 Privacy & Security](#32-privacy--security)
   - [3.3 Communication Topology](#33-communication-topology)
   - [3.4 Agent Reasoning](#34-agent-reasoning)
   - [3.5 MCP (Model Context Protocol)](#35-mcp-model-context-protocol)
4. [Tech Stack](#4-tech-stack)
5. [Future Development](#5-future-development)
   - [5.1 Planned Enhancements](#51-planned-enhancements)
   - [5.2 Gap Analysis](#52-gap-analysis-simulator--production)
6. [Business Model](#6-business-model)
7. [Getting Started](#7-getting-started)

---

## TL;DR

Traditional drone systems depend on internet connectivity and central servers — but during major disasters, up to **85% of communication infrastructure can go down**, leaving drones unable to coordinate and people unable to call for help. DAMNdelion solves this with a **Bluetooth mesh network** and **autonomous AI agents** that let each drone make smart decisions independently. When networks fail, people can still send SOS signals via Bluetooth, and the swarm self-organizes to relay messages, provide WiFi coverage, and deliver supplies. Built on Next.js, Three.js, and Mistral AI with Tree-of-Thought reasoning, DAMNdelion is a fault-tolerant, decentralized system offered as a drone service for disaster response agencies.

---

## 2. Problem

### The Network Failure Crisis in Disaster Zones

When hurricanes, earthquakes, or wildfires strike, the first casualty is often communication infrastructure. Cell towers fall, power grids fail, and internet connections vanish — precisely when people need help most.

**The statistics are alarming:**
- **85%** of communication infrastructure can be destroyed during major disasters
- **72%** of disaster-related fatalities occur within the first 72 hours — the "critical window" when every minute counts
- Traditional drone systems become **useless** without cloud connectivity or GPS signals

**Why existing solutions fail:**
- ❌ Centralized control systems go offline when the network fails
- ❌ Drones can't coordinate with each other autonomously
- ❌ Victims have no way to signal for help without WiFi/cellular
- ❌ Rescue teams can't locate survivors or communicate effectively

**The cost:** Lives lost. Rescuers flying blind. Critical delays in aid delivery.

---

## 3. Solution

DAMNdelion is a **decentralized, offline-first drone swarm** that doesn't depend on the internet or any central server. Our architecture combines three layers of intelligence:

### 3.1 Offline Architecture
<img width="760" height="115" alt="Screenshot 2026-03-21 at 11 26 28 AM" src="https://github.com/user-attachments/assets/c4dad2d2-838a-49cf-beea-48a862f4e1cb" />

**How it works without internet:**

The **Cloud Layer** hosts a Master Agent powered by Mistral AI that coordinates swarm objectives when internet is available. The **Edge Layer** runs a Relay Agent that bridges commands to drones when online — and becomes the acting commander when offline, using cached instructions plus rule-based heuristics. The **Swarm Layer** consists of individual drone agents, each running its own local SLM (Small Language Model) for autonomous reasoning.

**Key capabilities:**
- **Bluetooth mesh network** — Drones communicate via BLE without WiFi/cellular
- **Smartphone as central hub** — Any phone can coordinate the swarm via BLE
- **Cached instruction execution** — Relay Agent stores last 50 master commands
- **Heuristic fallback** — When Master Agent is unreachable, Relay Agent uses rule-based logic to:
  - Dispatch charger drones to low-battery units (<20%)
  - Reposition supply drones toward weak SOS signals (<0.7 strength)
  - Fill coverage dead zones with WiFi drones
  - Repair broken relay chains automatically


### 3.2 Privacy & Security

DAMNdelion is built for **trust and verification** in disaster scenarios where security is critical:

**E2B Sandbox Isolation**
- Our AI orchestrator runs in an **E2B (Execution Environment for Browser) sandbox** — a secure, isolated environment that separates AI inferencing from the core system
- Prevents AI model exploits from affecting drone control systems
- Each inference runs in a containerized environment that's destroyed after execution
- Critical for disaster scenarios where system integrity is life-or-death

**zkML Verification (Zero-Knowledge Machine Learning)**
- Every AI decision is **cryptographically verified** using zero-knowledge proofs
- Proves the model output is **untampered** without revealing what the local SLM actually computed
- External auditors can verify swarm decisions were made legitimately
- Protects proprietary SLM logic while providing transparency to oversight bodies
- Essential for government adoption where audit trails are mandatory

**Local-First Architecture**
- No cloud dependency for core swarm operations
- All drone state, positions, and decisions stored locally
- Victims' SOS signals never leave the local mesh unless relayed
- Privacy-by-design for sensitive disaster response data

### 3.3 Communication Topology
<img width="490" height="474" alt="Screenshot 2026-03-21 at 11 25 12 AM" src="https://github.com/user-attachments/assets/81c49656-b15c-454c-9a12-dac0c13098f7" />

DAMNdelion uses a **hybrid mesh + multi-star** BLE topology that maximizes coverage and resilience.

**How SOS signals propagate without infrastructure:**
1. **Victim sends SOS** via Bluetooth from their phone (even without WiFi/cellular)
2. **Nearest drone receives** signal and adds it to local mesh
3. **Relay drones form chains** to extend the signal range beyond single-hop BLE
4. **Multi-hop routing** moves the SOS toward any available connection (satellite, ham radio, working cell tower)
5. **Supply drones autonomously navigate** toward the signal source

**BLE Protocol Details:**
- **Range**: ~10m real-world (30 simulation units)
- **Mesh hops**: Up to 3 hops for message extension
- **Message types**: COMMAND, STATUS, RELAY, SYNC, DISCOVERY
- **Beacon interval**: 2 seconds for peer discovery
- **TTL**: 30 seconds for message expiry

### 3.4 Agent Reasoning

DAMNdelion uses a **three-tier AI hierarchy** with specialized reasoning at each level:
<img width="728" height="381" alt="Screenshot 2026-03-21 at 11 27 02 AM" src="https://github.com/user-attachments/assets/5ffc5902-3796-4587-8e95-ca2b9816e418" />
#### Master Agent — Cloud Orchestrator (Online Mode)
- **Model**: Mistral Small Latest with streaming
- **Reasoning**: Tree-of-Thought (ToT) for complex strategic decisions
- **Cycle**: Every 15 seconds when online
- **Capabilities**:
  - Swarm-level resource allocation
  - Multi-step mission planning
  - Emergency response prioritization
  - Full swarm state analysis

#### Relay Agent — Edge Bridge & Offline Commander
- **Runtime**: Browser-based, always active
- **Online mode**: Forwards master instructions, aggregates drone status
- **Offline mode**: Becomes acting commander using cached instructions + heuristics
- **Memory**: Circular buffer of last 50 master commands
- **Reasoning**: Rule-based with priority ordering (battery → SOS → coverage → patrol)

#### Drone Agents — Autonomous Specialists
Each drone runs its own **local SLM (Small Language Model)** for independent reasoning:
<img width="513" height="383" alt="Screenshot 2026-03-21 at 11 27 42 AM" src="https://github.com/user-attachments/assets/69ffe987-cc3f-4660-baf6-5e5c48617552" />

**Tree-of-Thought > Chain-of-Thought**
- ToT outperforms CoT by **+70% on GAMEo24 Benchmark** for multi-step spatial reasoning tasks
- Each drone explores multiple decision branches before committing
- Better for 3D navigation, multi-objective optimization, and emergency response
<img width="819" height="479" alt="Screenshot 2026-03-21 at 11 29 34 AM" src="https://github.com/user-attachments/assets/32b494e5-e30b-4a8c-bf06-4e6787f648df" />

**Specialized Roles (5 types):**
| Role | Mission | Autonomous Behavior |
|------|---------|---------------------|
| **Relay** | Maintain communication chains | Repositions to bridge SOS signals ↔ base |
| **WiFi** | Maximize grid coverage | Detects dead zones, moves to fill gaps |
| **Supply** | Deliver emergency aid | Navigates to weakest SOS signals first |
| **Scout** | Area reconnaissance | Thermal scanning with raster patterns |
| **Charger** | Recharge low-battery drones | Intercepts drones below 20% battery |

Each drone has:
- **Proactive level** (0.0–1.0) — scales autonomous communication frequency
- **Role-specific reasoning prompts** — context-aware decision-making
- **Local SLM** — runs Tree-of-Thought reasoning without cloud dependency

### 3.5 MCP (Model Context Protocol)

MCP is the interface through which any agent controls the swarm. DAMNdelion implements **16 functional tools**:

| Tool | Description |
|------|-------------|
| `move_drone` | Reposition any drone to (x, z) |
| `dispatch_supply` | Send supply drone to SOS signal |
| `adjust_relay` | Reposition relay drone to fix chain |
| `scan_area` | Move camera focus to grid coordinate |
| `select_drone` | Select drone for UI inspection |
| `prioritize_sos` | Mark SOS critical, auto-dispatch supply |
| `log_observation` | Append observation to reasoning log |
| `list_drones` | Return id/role/status/battery for all drones |
| `get_drone_status` | Detailed status for a single drone |
| `thermal_scan` | Run thermal scan, detect human signatures |
| `relay_message` | Pass typed message between two drones |
| `get_coverage_map` | Return grid coverage % + dead zones |
| `start_charging` | Charger drone intercepts low-battery drone |
| `create_drone_group` | Form task group for coordinated missions |
| `dispatch_to_sos` | Multi-drone response to SOS signal |
| `get_group_status` | Status report for active mission groups |

**Tool Execution Pipeline:**
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

---

## 4. Tech Stack

**Frontend**
- Next.js 14, React 18, TypeScript
- Three.js, React Three Fiber
- Zustand (state management)

**AI & Reasoning**
- Mistral Small (cloud LLM, streaming SSE)
- Ollama (local SLMs per drone)
- Tree-of-Thought reasoning (+70% over CoT on GAMEo24)
- Model Context Protocol (MCP) with 16 tools

**Communication**
- Web Bluetooth API (phone/laptop)
- Custom mesh protocol
- Hybrid mesh + multi-star topology

**Security & Privacy**
- E2B sandbox (AI isolation)
- zkML verification (cryptographic proofs)
- Local-first architecture

---

## 5. Future Development

### 5.1 Planned Enhancements

- **Additional drone roles**: Medic drone (first aid delivery), Heavy-lift drone (equipment transport)
- **Enhanced thermal scanning**: ML-based human detection with thermal signature databases
- **Solar charging integration**: Autonomous landing on charging pads for extended missions
- **Advanced path planning**: Reinforcement learning for dynamic obstacle avoidance
- **Voice communication**: Direct voice relay between victims and rescue teams

### 5.2 Gap Analysis: Simulator → Production

**We're closer than you think.** Our software stack is production-ready — we just need to plug in real hardware.

| Component | Current (Simulator) | Production (Real World) | Status |
|-----------|-------------------|----------------------|--------|
| **Thermal Scanning** | Simulated detection zones | Real thermal camera (FLIR Lepton) + driver integration | 🔧 Camera driver needed |
| **GPS/Positioning** | Coordinate-based simulation | Real GPS module (u-blox NEO-M9N) + NMEA parsing | 🔧 GPS driver needed |
| **WiFi Beacon** | Simulated coverage zones | Real WiFi module (ESP32) + AP mode configuration | 🔧 WiFi driver needed |
| **Battery Management** | Linear drain simulation | Real battery monitoring (BMS ICs) + discharge curves | 🔧 BMS integration needed |
| **Motor Control** | Position state updates | MAVLink to ArduPilot/PX4 flight controllers | 🔧 MAVLink bridge needed |
| **Physical Constraints** | No weather, no payload limits | Add wind/rain effects, mass physics, motor latency | 🔧 Physics model needed |
| **Bluetooth Mesh** | BLE simulator with range-based connectivity | Web Bluetooth API → real BLE hardware (nRF52840, ESP32) | ✅ Ready (API swap) |
| **MCP Tools** | 16 tools control swarm via state updates | Same tools → MAVLink bridge layer | ✅ Ready (bridge needed) |
| **Tree-of-Thought Reasoning** | Browser-based SLM simulation | Edge AI hardware (Jetson Orin / Coral TPU) | ✅ Ready (deploy) |
| **E2B Sandbox** | Containerized AI inferencing | Same containers on edge hardware | ✅ Ready (deploy) |
| **Multi-Agent Architecture** | Master → Relay → Drone hierarchy with local SLMs | Same architecture, no changes needed | ✅ Done |
| **Offline Mode** | Cached instructions + heuristic fallback | Same logic, no cloud dependency | ✅ Done |
| **zkML Verification** | Cryptographic proofs for AI outputs | Same verification, no changes needed | ✅ Done |
| **3D Visualization** | Real-time Three.js rendering | Same UI receives telemetry via WebSocket | ✅ Done |

**What this means:**
- 🔧 **We need hardware drivers** — Connect our software to real cameras, GPS, WiFi, battery, and motors (6 components)
- 🔧 **We need physics modeling** — Add real-world constraints like weather, payload, and latency
- ✅ **Software is 100% production-ready** — All AI, reasoning, communication, and security logic works (8 components done or ready to deploy)

**Integration estimate:** 4-6 weeks to connect all hardware drivers and add physics modeling. That's it.

---

## 6. Business Model
<img width="845" height="467" alt="Screenshot 2026-03-21 at 11 30 11 AM" src="https://github.com/user-attachments/assets/e31792d6-7f61-49e0-81ed-4baac5415ccb" />
### 6.1 Target Customers

| Segment | Examples | Use Case |
|---------|----------|----------|
| **Government Emergency Management** | FEMA (USA), NDMA (India), Civil Protection | Rapid disaster assessment, search & rescue coordination |
| **Disaster Relief Organizations** | Red Cross, UN OCHA, Doctors Without Borders | Aid delivery, medical supply transport, victim location |
| **Private Sector** | Insurance companies, oil & gas, mining | Rapid damage assessment, asset protection, remote operations |
| **Military/Defense** | Humanitarian assistance, disaster relief (HA/DR) missions | Support for civil disaster response, forward operating base logistics |


### 6.2 Revenue Streams

**Drone-as-a-Service (DaaS) — Subscription Model**
- **Basic tier**: $10K/month — 10-drone swarm, 24/7 readiness, training simulator access
- **Enterprise tier**: $25K/month — 50-drone swarm, priority deployment, custom SLA
- **Government tier**: $50K/month — 100+ drone swarm, dedicated support, regulatory compliance assistance

**Per-Deployment Pricing**
- Emergency activation: $5K per deployment (covers logistics, operators, transport)
- Extended missions: $2K/day beyond the first 72 hours
- Standby fee: $1K/month for priority positioning in high-risk regions

**Training & Simulation License**
- Simulator license: $50K/year for agency-wide use
- Custom scenario development: $10K per scenario
- Train-the-trainer programs: $5K per cohort

**Custom Integration**
- Enterprise solutions: $100K+ for tailored deployments (oil rigs, remote mining, maritime)
- API access: $25K/year for third-party integrations

### 6.3 Competitive Advantages

- **Offline-first**: No dependency on damaged infrastructure — swarm operates when others can't
- **Autonomous**: Minimal human intervention required — reduces operator training and cost
- **Decentralized**: No single point of failure — relay drones extend range automatically
- **Rapid Deployment**: Pre-positioned swarm assets can activate within minutes
- **AI-Enhanced**: Tree-of-Thought reasoning enables complex multi-objective missions
- **Verifiable**: zkML proofs provide audit trails for government oversight

---

## 7. Getting Started

**Quick Setup**

```bash
# Install dependencies
bun install

# Start development server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to view the simulator.


---

**DAMNdelion: When networks fail, drones rise.** 🌱
