import { useStore } from "./store";

// ─── MCP Tool Types ──────────────────────────────────────────────────────────

export interface MCPTool {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description?: string }>;
    required: string[];
  };
  execute: (params: Record<string, unknown>) => Promise<void>;
}

// ─── Tool Implementations ────────────────────────────────────────────────────

export const mcpTools: MCPTool[] = [
  {
    name: "move_drone",
    description:
      "Move a drone to a new X/Z position. Use this to reposition drones for better coverage or relay chains.",
    parameters: {
      type: "object",
      properties: {
        drone_id: {
          type: "string",
          description: "The ID of the drone to move (e.g., 'DRONE-01')",
        },
        target_x: {
          type: "number",
          description: "Target X coordinate (-80 to 80)",
        },
        target_z: {
          type: "number",
          description: "Target Z coordinate (-80 to 80)",
        },
      },
      required: ["drone_id", "target_x", "target_z"],
    },
    execute: async (params) => {
      const store = useStore.getState();
      const drone = store.drones.find((d) => d.id === params.drone_id);
      if (drone) {
      const newX = Math.max(-80, Math.min(80, params.target_x as number));
      const newZ = Math.max(-80, Math.min(80, params.target_z as number));
        store.updateDrone(params.drone_id as string, {
          targetPosition: [newX, drone.position[1], newZ],
        });
        store.pushEvent(
          `Drone ${params.drone_id} moved to (${newX.toFixed(1)}, ${newZ.toFixed(1)})`,
          "status"
        );
        store.addReasoning(
          `Moved ${params.drone_id} to position (${newX.toFixed(0)}, ${newZ.toFixed(0)})`,
          "action"
        );
      } else {
        store.addReasoning(
          `Error: Drone ${params.drone_id} not found`,
          "observation"
        );
      }
    },
  },
  {
    name: "dispatch_supply",
    description:
      "Dispatch a supply drone to an SOS signal location. The drone will fly to the SOS position.",
    parameters: {
      type: "object",
      properties: {
        drone_id: {
          type: "string",
          description: "The ID of the supply drone to dispatch",
        },
        sos_id: {
          type: "string",
          description: "The ID of the SOS signal to respond to",
        },
      },
      required: ["drone_id", "sos_id"],
    },
    execute: async (params) => {
      const store = useStore.getState();
      const sos = store.sosSignals.find((s) => s.id === params.sos_id);
      const drone = store.drones.find((d) => d.id === params.drone_id);

      if (!sos) {
        store.addReasoning(
          `Error: SOS ${params.sos_id} not found`,
          "observation"
        );
        return;
      }
      if (!drone) {
        store.addReasoning(
          `Error: Drone ${params.drone_id} not found`,
          "observation"
        );
        return;
      }
      if (drone.role !== "supply") {
        store.addReasoning(
          `Error: ${params.drone_id} is not a supply drone`,
          "observation"
        );
        return;
      }

      store.updateDrone(params.drone_id as string, {
        targetPosition: [sos.position[0], 15, sos.position[2]],
        status: "online",
      });
      store.pushEvent(
        `Supply drone ${params.drone_id} dispatched to ${params.sos_id} at ${sos.gridLabel}`,
        "supply"
      );
      store.addReasoning(
        `Dispatched ${params.drone_id} to SOS at ${sos.gridLabel}`,
        "action"
      );
    },
  },
  {
    name: "adjust_relay",
    description:
      "Reposition a relay drone to improve signal chain. Moves the drone to strengthen relay path.",
    parameters: {
      type: "object",
      properties: {
        drone_id: {
          type: "string",
          description: "The ID of the relay drone to adjust",
        },
        target_x: {
          type: "number",
          description: "Target X coordinate for better relay position",
        },
        target_z: {
          type: "number",
          description: "Target Z coordinate for better relay position",
        },
      },
      required: ["drone_id", "target_x", "target_z"],
    },
    execute: async (params) => {
      const store = useStore.getState();
      const drone = store.drones.find((d) => d.id === params.drone_id);

      if (!drone) {
        store.addReasoning(
          `Error: Drone ${params.drone_id} not found`,
          "observation"
        );
        return;
      }
      if (drone.role !== "relay") {
        store.addReasoning(
          `Error: ${params.drone_id} is not a relay drone`,
          "observation"
        );
        return;
      }

      const newX = Math.max(-80, Math.min(80, params.target_x as number));
      const newZ = Math.max(-80, Math.min(80, params.target_z as number));

      store.updateDrone(params.drone_id as string, {
        targetPosition: [newX, drone.position[1], newZ],
      });
      store.pushEvent(
        `Relay drone ${params.drone_id} repositioned to strengthen signal chain`,
        "relay"
      );
      store.addReasoning(
        `Adjusted relay ${params.drone_id} to (${newX.toFixed(0)}, ${newZ.toFixed(0)})`,
        "action"
      );
    },
  },
  {
    name: "scan_area",
    description:
      "Focus the camera view on a specific area of the map. Use this to inspect a region.",
    parameters: {
      type: "object",
      properties: {
        x: {
          type: "number",
          description: "X coordinate to focus on",
        },
        z: {
          type: "number",
          description: "Z coordinate to focus on",
        },
      },
      required: ["x", "z"],
    },
    execute: async (params) => {
      const store = useStore.getState();
      store.setCameraFocus([params.x as number, 0, params.z as number]);
      store.addReasoning(
        `Scanning area at (${(params.x as number).toFixed(0)}, ${(params.z as number).toFixed(0)})`,
        "action"
      );
    },
  },
  {
    name: "select_drone",
    description:
      "Select a drone for inspection. This will focus the camera on the drone.",
    parameters: {
      type: "object",
      properties: {
        drone_id: {
          type: "string",
          description: "The ID of the drone to select",
        },
      },
      required: ["drone_id"],
    },
    execute: async (params) => {
      const store = useStore.getState();
      const drone = store.drones.find((d) => d.id === params.drone_id);
      if (drone) {
        store.selectDrone(params.drone_id as string);
        store.addReasoning(
          `Selected ${params.drone_id} for inspection`,
          "action"
        );
      } else {
        store.addReasoning(
          `Error: Drone ${params.drone_id} not found`,
          "observation"
        );
      }
    },
  },
  {
    name: "log_observation",
    description:
      "Log an observation about the swarm state or situation. Use this to record important findings.",
    parameters: {
      type: "object",
      properties: {
        observation: {
          type: "string",
          description: "The observation to log",
        },
      },
      required: ["observation"],
    },
    execute: async (params) => {
      const store = useStore.getState();
      store.addReasoning(params.observation as string, "observation");
    },
  },
  {
    name: "prioritize_sos",
    description:
      "Mark an SOS signal as high priority for response. This will trigger supply drone dispatch.",
    parameters: {
      type: "object",
      properties: {
        sos_id: {
          type: "string",
          description: "The ID of the SOS signal to prioritize",
        },
        reason: {
          type: "string",
          description: "Reason for prioritization",
        },
      },
      required: ["sos_id", "reason"],
    },
    execute: async (params) => {
      const store = useStore.getState();
      const sos = store.sosSignals.find((s) => s.id === params.sos_id);
      if (sos) {
        store.selectSOS(params.sos_id as string);
        store.pushEvent(
          `SOS ${params.sos_id} at ${sos.gridLabel} marked as priority: ${params.reason}`,
          "sos"
        );
        store.addReasoning(
          `Prioritized SOS at ${sos.gridLabel}: ${params.reason}`,
          "action"
        );

        // Find available supply drone
        const supplyDrone = store.drones.find(
          (d) => d.role === "supply" && d.status === "online"
        );
        if (supplyDrone) {
          store.updateDrone(supplyDrone.id, {
            targetPosition: [sos.position[0], 15, sos.position[2]],
          });
          store.pushEvent(
            `Supply drone ${supplyDrone.id} auto-dispatched to priority SOS`,
            "supply"
          );
          store.addReasoning(
            `Auto-dispatched ${supplyDrone.id} to priority SOS`,
            "action"
          );
        }
      } else {
        store.addReasoning(
          `Error: SOS ${params.sos_id} not found`,
          "observation"
        );
      }
    },
  },
  {
    name: "list_drones",
    description:
      "List all active drones in the swarm with their current status, battery, role, and position. Use this for dynamic drone discovery.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    execute: async () => {
      const store = useStore.getState();
      const activeDrones = store.drones.map((d) => ({
        id: d.id,
        role: d.role,
        status: d.status,
        battery: d.battery,
        position: d.position,
      }));
      store.addReasoning(
        `Discovered ${activeDrones.length} drones in swarm: ${activeDrones.map((d) => d.id).join(", ")}`,
        "observation"
      );
    },
  },
  {
    name: "get_drone_status",
    description:
      "Get detailed status of a specific drone including battery level, position, role, and connection status.",
    parameters: {
      type: "object",
      properties: {
        drone_id: {
          type: "string",
          description: "The ID of the drone to query",
        },
      },
      required: ["drone_id"],
    },
    execute: async (params) => {
      const store = useStore.getState();
      const drone = store.drones.find((d) => d.id === params.drone_id);
      if (drone) {
        const statusText = `${drone.id} [${drone.role.toUpperCase()}]: Battery ${drone.battery.toFixed(0)}% | Position (${drone.position[0].toFixed(0)}, ${drone.position[2].toFixed(0)}) | Status: ${drone.status}`;
        store.addReasoning(statusText, "observation");
        
        if (drone.battery < 20) {
          store.addDroneReasoning(
            drone.id,
            `triggerLowBatteryWarning() - Warning ⚠ | Level: ${drone.battery.toFixed(0)}%`,
            "action"
          );
        }
      } else {
        store.addReasoning(
          `Error: Drone ${params.drone_id} not found`,
          "observation"
        );
      }
    },
  },
  {
    name: "thermal_scan",
    description:
      "Command a drone to perform a thermal scan of a specific grid area. Returns detected thermal signatures.",
    parameters: {
      type: "object",
      properties: {
        drone_id: {
          type: "string",
          description: "The ID of the drone to perform the scan",
        },
        grid_area: {
          type: "string",
          description: "The grid area to scan (e.g., 'D7', 'D7-D9', 'F3')",
        },
      },
      required: ["drone_id", "grid_area"],
    },
    execute: async (params) => {
      const store = useStore.getState();
      const drone = store.drones.find((d) => d.id === params.drone_id);
      
      if (!drone) {
        store.addReasoning(
          `Error: Drone ${params.drone_id} not found`,
          "observation"
        );
        return;
      }

      store.addReasoning(
        `Initiating thermal scan for area ${params.grid_area} using ${params.drone_id}`,
        "action"
      );

      store.addDroneReasoning(
        drone.id,
        `initiateThermalScan({ sector: '${params.grid_area}' }) - Success ✓`,
        "action"
      );

      // Simulate scan results
      const targetsDetected = Math.floor(Math.random() * 4);
      const targets = [];
      for (let i = 0; i < targetsDetected; i++) {
        // Random offset from drone
        const dx = (Math.random() - 0.5) * 30;
        const dz = (Math.random() - 0.5) * 30;
        targets.push({
          x: drone.position[0] + dx,
          z: drone.position[2] + dz,
          isHuman: Math.random() > 0.5,
        });
      }

      // Visual scan disabled - only SOS flow triggers scans now
      // store.addActiveScan({
      //   droneId: drone.id,
      //   position: [drone.position[0], 0, drone.position[2]],
      //   radius: 25,
      //   duration: 8000, // 8 seconds scan
      //   targets,
      // });

      if (targetsDetected > 0) {
        const targetTemp = (35 + Math.random() * 10).toFixed(1);
        store.addDroneReasoning(
          drone.id,
          `detectThermalSignatures() - Success ✓ | Count: ${targetsDetected} | Temp: ${targetTemp}°C`,
          "observation"
        );
        store.pushEvent(
          `Thermal scan ${params.grid_area}: ${targetsDetected} targets detected`,
          "sos"
        );
      } else {
        store.addDroneReasoning(
          drone.id,
          `detectThermalSignatures() - Failed ❌ | Sector: ${params.grid_area}`,
          "observation"
        );
      }
    },
  },
  {
    name: "relay_message",
    description:
      "Send a message from one drone to another. Used for inter-drone communication and command relay.",
    parameters: {
      type: "object",
      properties: {
        from_id: {
          type: "string",
          description: "Source drone ID",
        },
        to_id: {
          type: "string",
          description: "Destination drone ID",
        },
        message: {
          type: "string",
          description: "Message content to relay",
        },
      },
      required: ["from_id", "to_id", "message"],
    },
    execute: async (params) => {
      const store = useStore.getState();
      const fromDrone = store.drones.find((d) => d.id === params.from_id);
      const toDrone = store.drones.find((d) => d.id === params.to_id);

      if (!fromDrone) {
        store.addReasoning(
          `Error: Source drone ${params.from_id} not found`,
          "observation"
        );
        return;
      }
      if (!toDrone) {
        store.addReasoning(
          `Error: Destination drone ${params.to_id} not found`,
          "observation"
        );
        return;
      }

      store.addDroneMessage(
        params.from_id as string,
        params.to_id as string,
        params.message as string,
        "command"
      );

      store.addDroneReasoning(
        fromDrone.id,
        `transmitMessage({ to: '${toDrone.id}', message: '${params.message}' }) - Success ✓`,
        "action"
      );

      store.addDroneReasoning(
        toDrone.id,
        `receiveMessage({ from: '${fromDrone.id}', message: '${params.message}' }) - Success ✓`,
        "observation"
      );
      
      store.setActiveMessagePath(params.from_id as string, params.to_id as string, true);
      setTimeout(() => {
        store.setActiveMessagePath(params.from_id as string, params.to_id as string, false);
      }, 2500);
    },
  },
  {
    name: "get_coverage_map",
    description:
      "Get the current WiFi coverage status of the disaster zone. Returns coverage percentage and dead zones.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    execute: async () => {
      const store = useStore.getState();
      const gridCells = store.gridCells;
      const totalCells = gridCells.length;
      const coveredCells = gridCells.filter(
        (c) => c.state === "connected" || c.state === "covered"
      ).length;
      const deadZones = gridCells.filter((c) => c.state === "dead").length;
      const coveragePercent = totalCells > 0 ? ((coveredCells / totalCells) * 100).toFixed(1) : "0";

      store.addReasoning(
        `Coverage Map: ${coveragePercent}% covered | ${deadZones} dead zones | ${coveredCells} active cells`,
        "observation"
      );

      const wifiDrones = store.drones.filter((d) => d.role === "wifi" && d.status === "online");
      if (wifiDrones.length > 0) {
        store.addReasoning(
          `Active WiFi drones: ${wifiDrones.map((d) => d.id).join(", ")}`,
          "observation"
        );
      }
    },
  },
];

// ─── Tool Schema for AI ──────────────────────────────────────────────────────

export function getToolSchema(): {
  tools: Array<{
    name: string;
    description: string;
    parameters: MCPTool["parameters"];
  }>;
} {
  return {
    tools: mcpTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    })),
  };
}

// ─── Tool Execution ──────────────────────────────────────────────────────────

export async function executeToolCall(
  name: string,
  params: Record<string, unknown>
): Promise<boolean> {
  const tool = mcpTools.find((t) => t.name === name);
  if (tool) {
    try {
      await tool.execute(params);
      return true;
    } catch (error) {
      const store = useStore.getState();
      store.addReasoning(
        `Tool execution error: ${error instanceof Error ? error.message : "Unknown error"}`,
        "observation"
      );
      return false;
    }
  }
  return false;
}

// ─── Tool Names Export ───────────────────────────────────────────────────────

export const TOOL_NAMES = mcpTools.map((t) => t.name);
