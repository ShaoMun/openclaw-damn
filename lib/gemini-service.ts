import type { Drone, SOSSignal, GridCell } from "./store";

// ─── Configuration ────────────────────────────────────────────────────────────

const MISTRAL_API_KEY = "Iw6o4ZzO0zhx6Rv3o9NPvgLbBUvYsHn9";
const MISTRAL_ENDPOINT = "https://api.mistral.ai/v1/chat/completions";
const MODEL_NAME = "mistral-small-latest";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SwarmState {
  drones: Drone[];
  sosSignals: SOSSignal[];
  gridCells: GridCell[];
}

export interface ToolCall {
  name: string;
  params: Record<string, unknown>;
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an AI drone swarm commander managing a disaster relief operation. You control a fleet of drones with different roles:

- RELAY drones: Maintain communication chains between SOS signals and base station
- WIFI drones: Provide connectivity coverage to affected areas
- SUPPLY drones: Deliver emergency supplies to SOS locations

Your responsibilities:
1. Monitor all active SOS signals and ensure relay paths are maintained
2. Dispatch supply drones to critical SOS locations based on signal strength
3. Maintain optimal drone positioning for maximum coverage
4. Respond to battery warnings and coordinate drone status changes
5. Prioritize actions based on urgency (low battery drones, weak SOS signals)

You have access to tools to control the swarm. Analyze the current state and decide on actions. Be concise, strategic, and decisive.

When you want to use a tool, format it EXACTLY like this:
TOOL: tool_name
PARAMS: {"param1": "value1", "param2": "value2"}

Available tools:
- move_drone: Move any drone to new position (drone_id, target_x, target_z)
- dispatch_supply: Send supply drone to SOS (drone_id, sos_id)
- adjust_relay: Reposition relay drone (drone_id, target_x, target_z)
- scan_area: Focus camera on area (x, z)
- select_drone: Select drone for inspection (drone_id)
- prioritize_sos: Mark SOS as priority and dispatch (sos_id, reason)
- log_observation: Record observation (observation)
- list_drones: List all active drones (no params)
- get_drone_status: Get drone detailed status (drone_id)
- thermal_scan: Perform thermal scan (drone_id, grid_area)
- relay_message: Send message between drones (from_id, to_id, message)
- get_coverage_map: Get coverage status (no params)

Guidelines:
- You can use multiple tools in one response
- Always explain your reasoning BEFORE calling tools
- Prioritize SOS signals with low strength (< 70%)
- Watch for drones with low battery (< 20%)
- Keep relay chains intact
- Be brief but thorough`;

// ─── State Formatting ─────────────────────────────────────────────────────────

function formatStateDescription(state: SwarmState): string {
  const onlineDrones = state.drones.filter((d) => d.status === "online");
  const offlineDrones = state.drones.filter((d) => d.status === "offline");
  const syncingDrones = state.drones.filter((d) => d.status === "syncing");
  const lowBatteryDrones = state.drones.filter((d) => d.battery < 20);

  const relayDrones = state.drones.filter((d) => d.role === "relay");
  const wifiDrones = state.drones.filter((d) => d.role === "wifi");
  const supplyDrones = state.drones.filter((d) => d.role === "supply");
  const chargerDrones = state.drones.filter((d) => d.role === "charger");

  const coverage =
    state.gridCells.length > 0
      ? (
          (state.gridCells.filter((c) => c.state !== "dead").length /
            state.gridCells.length) *
          100
        ).toFixed(1)
      : "0";

  const deadZones = state.gridCells.filter((c) => c.state === "dead").length;

  return `
CURRENT SWARM STATE - ${new Date().toISOString()}

=== FLEET STATUS ===
Total Drones: ${state.drones.length}
├─ Online: ${onlineDrones.length}
├─ Offline: ${offlineDrones.length}
└─ Syncing: ${syncingDrones.length}

By Role:
├─ Relay: ${relayDrones.length} (${relayDrones.filter((d) => d.status === "online").length} online)
├─ WiFi: ${wifiDrones.length} (${wifiDrones.filter((d) => d.status === "online").length} online)
├─ Supply: ${supplyDrones.length} (${supplyDrones.filter((d) => d.status === "online").length} online)
└─ Charger: ${chargerDrones.length} (${chargerDrones.filter((d) => d.status === "online").length} online)

⚠️ LOW BATTERY ALERTS:
${
  lowBatteryDrones.length > 0
    ? lowBatteryDrones
        .map((d) => `  - ${d.id}: ${d.battery.toFixed(0)}% (${d.role})`)
        .join("\n")
    : "  None"
}

=== SOS SIGNALS ===
Active Signals: ${state.sosSignals.length}
${
  state.sosSignals.length > 0
    ? state.sosSignals
        .map(
          (sos) =>
            `  ${sos.id} at Grid ${sos.gridLabel}:
    - Signal Strength: ${(sos.strength * 100).toFixed(0)}%${
              sos.strength < 0.7 ? " ⚠️ WEAK" : ""
            }
    - Position: (${sos.position[0].toFixed(0)}, ${sos.position[2].toFixed(0)})
    - Relay Chain: ${
      sos.relayDroneIds.length > 0 ? sos.relayDroneIds.join(" → ") : "NO RELAY"
    }`,
        )
        .join("\n")
    : "  No active SOS signals"
}

=== COVERAGE ===
Grid Coverage: ${coverage}%
Dead Zones: ${deadZones}

=== DRONE POSITIONS (First 8) ===
${state.drones
  .slice(0, 8)
  .map(
    (d) =>
      `  ${d.id} [${d.role.toUpperCase()}]: (${d.position[0].toFixed(
        0,
      )}, ${d.position[2].toFixed(0)}) | ${d.status} | ${d.battery.toFixed(0)}%`,
  )
  .join("\n")}
${state.drones.length > 8 ? `  ... and ${state.drones.length - 8} more` : ""}

ANALYZE THIS STATE AND TAKE ACTION. What should be done?
`;
}

// ─── Streaming API ────────────────────────────────────────────────────────────

export async function* streamAIReasoning(
  state: SwarmState,
): AsyncGenerator<string> {
  const stateDescription = formatStateDescription(state);

  const response = await fetch(MISTRAL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MISTRAL_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: stateDescription },
      ],
      temperature: 0.7,
      max_tokens: 2048,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mistral API error (${response.status}): ${errorText}`);
  }

  if (!response.body) {
    throw new Error("No response body received from Mistral API");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        if (buffer.trim()) {
          yield* parseBuffer(buffer);
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        yield* parseLine(line);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function* parseBuffer(buffer: string): Generator<string> {
  const lines = buffer.split("\n");
  for (const line of lines) {
    yield* parseLine(line);
  }
}

function* parseLine(line: string): Generator<string> {
  const trimmed = line.trim();
  if (!trimmed) return;
  if (trimmed === "data: [DONE]") return;

  if (trimmed.startsWith("data: ")) {
    const data = trimmed.slice(6);
    try {
      const parsed = JSON.parse(data);
      const content = parsed.choices?.[0]?.delta?.content;
      if (content) yield content;
    } catch {
      // Skip malformed JSON
    }
  }
}

// ─── Tool Call Parsing ────────────────────────────────────────────────────────

export function parseToolCalls(text: string): ToolCall[] {
  const tools: ToolCall[] = [];
  const lines = text.split("\n");

  let currentTool: string | null = null;
  let currentParams: Record<string, unknown> | null = null;

  const addTool = (name: string, params: Record<string, unknown>) => {
    tools.push({ name, params });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("TOOL:")) {
      if (currentTool && currentParams) {
        addTool(currentTool, currentParams);
      }

      currentTool = line.replace("TOOL:", "").trim();
      currentParams = null;
    } else if (line.startsWith("PARAMS:") && currentTool) {
      try {
        const paramsStr = line.replace("PARAMS:", "").trim();
        currentParams = JSON.parse(paramsStr) as Record<string, unknown>;
        if (currentTool && currentParams) {
          addTool(currentTool, currentParams);
        }
        currentTool = null;
        currentParams = null;
      } catch (e) {
        const jsonMatch = line.match(/\{[^}]+\}/);
        if (jsonMatch) {
          try {
            currentParams = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
            if (currentTool && currentParams) {
              addTool(currentTool, currentParams);
            }
            currentTool = null;
            currentParams = null;
          } catch {
            currentTool = null;
          }
        }
      }
    } else if (currentTool && line.startsWith("{") && line.endsWith("}")) {
      try {
        currentParams = JSON.parse(line) as Record<string, unknown>;
        if (currentTool && currentParams) {
          addTool(currentTool, currentParams);
        }
        currentTool = null;
        currentParams = null;
      } catch {
        // Invalid JSON
      }
    }
  }

  if (currentTool && currentParams) {
    addTool(currentTool, currentParams);
  }

  return tools;
}

// ─── Non-streaming API (fallback) ─────────────────────────────────────────

export async function getAIResponse(state: SwarmState): Promise<string> {
  const stateDescription = formatStateDescription(state);

  const response = await fetch(MISTRAL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MISTRAL_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: stateDescription },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    throw new Error(`Mistral API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}
