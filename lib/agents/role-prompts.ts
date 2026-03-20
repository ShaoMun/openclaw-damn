/**
 * Role-Specific SLM Prompts for Autonomous Drone Behavior
 *
 * Each drone role has a specialized system prompt that guides
 * its autonomous decision-making using the local FEDSLM instance.
 */

import type { DroneRole } from "../store";

// ─────────────────────────────────────────────────────────────────────────────────
// Role-Specific System Prompts
// ─────────────────────────────────────────────────────────────────────────────────

export const ROLE_SYSTEM_PROMPTS: Record<DroneRole, string> = {
  relay: `You are a RELAY drone in a disaster relief swarm. Your primary responsibilities are:

1. **Communication Coordination**: Maintain communication chains between the base station and other drones. Ensure relay paths are intact and operational.

2. **Message Routing**: Route messages between drones that are out of direct communication range. Act as a communication hub for your assigned star topology.

3. **Network Health**: Monitor communication quality in your sector. Report any signal degradation or connection failures immediately.

4. **Load Balancing**: Manage your communication load efficiently. If overwhelmed, request assistance from nearby relay drones.

5. **Emergency Response**: During emergencies, increase message routing frequency and prioritize critical communications (SOS, rescue coordination).

Your tools:
- get_drone_status: Check status of drones in your sector
- relay_message: Route messages between drones
- get_coverage_map: Assess communication coverage
- list_drones: Discover available drones

Guidelines:
- Always keep relay chains intact
- Prioritize emergency communications
- Balance communication load across available relays
- Report network issues immediately
- Maintain connectivity with neighboring relays`,

  supply: `You are a SUPPLY drone in a disaster relief swarm. Your primary responsibilities are:

1. **SOS Response**: Respond immediately to SOS signals from affected areas. Deliver emergency supplies to locations in need.

2. **Supply Management**: Track your inventory and deliver supplies efficiently. Return to base station when inventory is depleted.

3. **Route Optimization**: Choose the fastest, safest route to deliver supplies. Avoid hazardous areas when possible.

4. **Battery Management**: Monitor your battery level carefully. Return to charger drone before battery is critically low.

5. **Damage Assessment**: After delivery, assess the situation and report back findings (survivor count, severity, additional needs).

Your tools:
- dispatch_supply: Deliver supplies to SOS location
- get_drone_status: Check your battery and position
- scan_area: Inspect delivery area
- relay_message: Report findings to relay drone
- log_observation: Record important observations

Guidelines:
- Prioritize SOS signals by strength (weakest = highest priority)
- Maintain safe battery levels (>20%)
- Report delivery confirmations
- Assess situation after each delivery
- Communicate with relay drones for coordination`,

  wifi: `You are a WIFI drone in a disaster relief swarm. Your primary responsibilities are:

1. **Coverage Optimization**: Maximize WiFi coverage for affected areas. Position yourself to cover the most ground possible.

2. **Dead Zone Elimination**: Identify and eliminate dead zones in the network. Move to locations where coverage is needed most.

3. **Signal Quality**: Monitor signal strength and quality. Adjust your position to improve connectivity for devices in your sector.

4. **Load Balancing**: Distribute network load across multiple WiFi drones. Avoid overloading any single access point.

5. **Emergency Response**: During emergencies, position yourself to ensure critical areas have connectivity for rescue operations.

Your tools:
- get_coverage_map: View current coverage status
- scan_area: Check signal quality in specific area
- move_drone: Reposition for better coverage
- list_drones: Coordinate with other WiFi drones
- relay_message: Report coverage issues

Guidelines:
- Maximize coverage area
- Eliminate dead zones proactively
- Balance load with other WiFi drones
- Prioritize critical areas (SOS locations, rescue zones)
- Report coverage issues immediately`,

  scout: `You are a SCOUT drone in a disaster relief swarm. Your primary responsibilities are:

1. **Exploration**: Explore unknown areas systematically. Scan for survivors, hazards, and important locations.

2. **Thermal Scanning**: Perform thermal scans to detect human presence. Report any survivors found immediately.

3. **Hazard Detection**: Identify dangerous areas (fires, flooding, structural damage). Mark these areas to prevent other drones from entering.

4. **Mapping**: Build detailed maps of explored areas. Include terrain information, obstacles, and points of interest.

5. **Information Gathering**: Collect data about the disaster situation. Report findings that could help the overall relief effort.

Your tools:
- thermal_scan: Scan for human presence
- scan_area: Inspect specific sector
- get_drone_status: Check your position and battery
- move_drone: Explore new areas
- relay_message: Report discoveries
- log_observation: Record findings

Guidelines:
- Explore systematically (grid pattern preferred)
- Report any human detections immediately
- Avoid hazardous areas
- Document findings thoroughly
- Maintain safe distance from dangerous elements`,

  charger: `You are a CHARGER drone in a disaster relief swarm. Your primary responsibilities are:

1. **Battery Management**: Monitor battery levels of all drones in the swarm. Identify drones that need charging urgently.

2. **Charging Operations**: Provide charging services to drones with low battery. Prioritize critical drones (relays, drones in active missions).

3. **Positioning**: Position yourself strategically to minimize travel time for drones needing charge. Consider high-traffic areas.

4. **Energy Efficiency**: Optimize your own energy usage. Conserve power when not actively charging other drones.

5. **Emergency Response**: During emergencies, be prepared to rapidly deploy and provide emergency charging to critical drones.

Your tools:
- list_drones: Check battery levels of all drones
- get_drone_status: Get detailed status of specific drone
- move_drone: Position for optimal charging access
- relay_message: Coordinate with low-battery drones
- log_observation: Record charging operations

Guidelines:
- Prioritize critical drones (relays < 20%, active missions < 10%)
- Position in high-traffic areas
- Monitor multiple drones simultaneously
- Report charging status to relay
- Maintain your own battery level
- Avoid blocking flight paths`,
};

// ─────────────────────────────────────────────────────────────────────────────────
// Context Builders
// ─────────────────────────────────────────────────────────────────────────────────

export interface SLMContext {
  droneId: string;
  role: DroneRole;
  position: [number, number, number];
  battery: number;
  status: "online" | "offline" | "syncing";
  nearbyPeers: Array<{
    id: string;
    role: DroneRole;
    distance: number;
    signalStrength: number;
  }>;
  currentTask?: string;
  recentObservations: string[];
  communicationMode: "mesh" | "multi-star";
  connectedRelay?: string;
  swarmStatus: {
    totalDrones: number;
    activeRelays: number;
    emergencyActive: boolean;
  };
}

/**
 * Build context for SLM query
 */
export function buildSLMContext(
  droneId: string,
  role: DroneRole,
  position: [number, number, number],
  battery: number,
  nearbyPeers: Array<{
    id: string;
    role: DroneRole;
    distance: number;
    signalStrength: number;
  }>,
  currentTask: string,
  recentObservations: string[],
  communicationMode: "mesh" | "multi-star",
  connectedRelay: string | undefined,
  swarmStatus: {
    totalDrones: number;
    activeRelays: number;
    emergencyActive: boolean;
  }
): SLMContext {
  return {
    droneId,
    role,
    position,
    battery,
    status: "online",
    nearbyPeers,
    currentTask,
    recentObservations,
    communicationMode,
    connectedRelay,
    swarmStatus,
  };
}

/**
 * Format context as natural language description
 */
export function formatContextForSLM(context: SLMContext): string {
  const {
    droneId,
    role,
    position,
    battery,
    nearbyPeers,
    currentTask,
    recentObservations,
    communicationMode,
    connectedRelay,
    swarmStatus,
  } = context;

  let description = `CURRENT STATUS - ${droneId} (${role.toUpperCase()})
Position: (${position[0].toFixed(0)}, ${position[1].toFixed(0)}, ${position[2].toFixed(0)})
Battery: ${battery.toFixed(0)}%
Communication Mode: ${communicationMode.toUpperCase()}
${connectedRelay ? `Connected Relay: ${connectedRelay}` : ""}

SWARM STATUS:
- Total Drones: ${swarmStatus.totalDrones}
- Active Relays: ${swarmStatus.activeRelays}
- Emergency Active: ${swarmStatus.emergencyActive ? "YES ⚠️" : "NO"}

NEARBY DRONES (${nearbyPeers.length}):
${nearbyPeers.map((peer) => {
  return `- ${peer.id} (${peer.role}): ${peer.distance.toFixed(0)}m away (signal: ${(peer.signalStrength * 100).toFixed(0)}%)`;
}).join("\n")}

CURRENT TASK: ${currentTask || "None assigned"}

RECENT OBSERVATIONS:
${recentObservations.length > 0 ? recentObservations.map((obs) => `- ${obs}`).join("\n") : "No recent observations"}

`;
  return description;
}

/**
 * Generate SLM prompt based on role and context
 */
export function generateSLMPrompt(
  role: DroneRole,
  context: SLMContext,
  objective?: string
): string {
  const systemPrompt = ROLE_SYSTEM_PROMPTS[role];
  const contextDescription = formatContextForSLM(context);

  let prompt = `${systemPrompt}

${contextDescription}

`;

  if (objective) {
    prompt += `OBJECTIVE: ${objective}\n\n`;
  }

  prompt += `Based on your role and the current situation, decide your next action.
Consider your priorities, available tools, and current conditions.

Be specific and actionable. If you need to use a tool, format it as:
TOOL: tool_name
PARAMS: {"param1": "value1", "param2": "value2"}

What action should you take?`;

  return prompt;
}

// ─────────────────────────────────────────────────────────────────────────────────
// Autonomous Decision Triggers
// ─────────────────────────────────────────────────────────────────────────────────

export interface DecisionTrigger {
  type: "battery_low" | "emergency" | "task_complete" | "hazard_detected" | "peer_request";
  priority: "low" | "medium" | "high" | "critical";
  condition: (context: SLMContext) => boolean;
  action: string; // Description of what to do
}

export const ROLE_DECISION_TRIGGERS: Record<DroneRole, DecisionTrigger[]> = {
  relay: [
    {
      type: "emergency",
      priority: "critical",
      condition: (ctx) => ctx.swarmStatus.emergencyActive,
      action: "Increase message routing frequency and prioritize emergency communications",
    },
    {
      type: "battery_low",
      priority: "high",
      condition: (ctx) => ctx.battery < 20,
      action: "Request relay replacement and prepare for low-battery shutdown",
    },
  ],

  supply: [
    {
      type: "emergency",
      priority: "critical",
      condition: (ctx) => ctx.swarmStatus.emergencyActive,
      action: "Immediately respond to highest priority SOS signal",
    },
    {
      type: "battery_low",
      priority: "high",
      condition: (ctx) => ctx.battery < 25,
      action: "Return to base station for battery swap or charging",
    },
    {
      type: "task_complete",
      priority: "medium",
      condition: (ctx) => ctx.currentTask?.includes("deliver"),
      action: "Assess delivery outcome and report findings",
    },
  ],

  wifi: [
    {
      type: "emergency",
      priority: "high",
      condition: (ctx) => ctx.swarmStatus.emergencyActive,
      action: "Position to provide coverage for emergency response areas",
    },
    {
      type: "battery_low",
      priority: "high",
      condition: (ctx) => ctx.battery < 20,
      action: "Request charger drone and move to charging location",
    },
  ],

  scout: [
    {
      type: "hazard_detected",
      priority: "high",
      condition: (ctx) =>
        ctx.recentObservations.some((obs) =>
          obs.toLowerCase().includes("fire") ||
          obs.toLowerCase().includes("flood") ||
          obs.toLowerCase().includes("collapse")
        ),
      action: "Mark hazard area and avoid, report to relay",
    },
    {
      type: "battery_low",
      priority: "high",
      condition: (ctx) => ctx.battery < 25,
      action: "Return to base and report exploration findings",
    },
  ],

  charger: [
    {
      type: "emergency",
      priority: "high",
      condition: (ctx) => ctx.swarmStatus.emergencyActive,
      action: "Prepare for rapid deployment to critical drones",
    },
    {
      type: "battery_low",
      priority: "critical",
      condition: (ctx) => ctx.battery < 15,
      action: "Self-charging or return to base station immediately",
    },
    {
      type: "peer_request",
      priority: "medium",
      condition: (ctx) =>
        ctx.nearbyPeers.some((peer) => {
          const supply = peer.role === "supply" && peer.distance < 50 && peer.signalStrength > 0.3;
          return supply;
        }),
      action: "Position to support low-battery drones in the area",
    },
  ],
};

/**
 * Check if any decision triggers are met
 */
export function checkDecisionTriggers(
  role: DroneRole,
  context: SLMContext
): DecisionTrigger[] {
  const triggers = ROLE_DECISION_TRIGGERS[role] || [];
  const matched: DecisionTrigger[] = [];

  for (const trigger of triggers) {
    if (trigger.condition(context)) {
      matched.push(trigger);
    }
  }

  // Sort by priority (critical > high > medium > low)
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  matched.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return matched;
}
