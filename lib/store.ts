import { create } from "zustand";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DroneRole = "relay" | "wifi" | "supply" | "scout" | "charger";
export type DroneStatus = "online" | "offline" | "syncing";
export type CellState = "connected" | "dead" | "covered" | "sos";
export type EventType = "sos" | "relay" | "coverage" | "supply" | "status";
export type AIStatus = "idle" | "thinking" | "acting" | "error";

export interface Drone {
  id: string;
  role: DroneRole;
  battery: number;
  position: [number, number, number];
  targetPosition?: [number, number, number];
  status: DroneStatus;
  lastMessageTime?: number; // Track when drone last sent/received message
  proactiveLevel?: number; // 0-1: How proactive this drone is (0 = passive, 1 = very proactive)
}

export interface GridCell {
  row: number;
  col: number;
  x: number;
  y: number;
  state: CellState;
}

export interface SOSSignal {
  id: string;
  gridLabel: string;
  position: [number, number, number];
  timestamp: number;
  strength: number;
  relayDroneIds: string[];
}

export interface RelayPath {
  id: string;
  droneIds: string[];
  sosId?: string;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: EventType;
}

export interface ReasoningEntry {
  id: string;
  timestamp: number;
  text: string;
  type: "thought" | "action" | "observation";
}

export interface DroneReasoningEntry {
  id: string;
  droneId: string;
  timestamp: number;
  text: string;
  type: "thought" | "action" | "observation";
}

export interface DroneMessage {
  id: string;
  fromDroneId: string;
  toDroneId: string;
  timestamp: number;
  content: string;
  type: "command" | "status" | "data" | "alert";
}

export type MissionStatus = "pending" | "in_progress" | "completed" | "failed";

export interface MissionTask {
  id: string;
  description: string;
  targetDroneId?: string;
  targetPosition?: [number, number, number];
  status: "pending" | "in_progress" | "completed" | "failed";
  completedAt?: number;
}

export interface Mission {
  id: string;
  name: string;
  description: string;
  tasks: MissionTask[];
  status: MissionStatus;
  createdAt: number;
  completedAt?: number;
  assignedDroneId?: string;
}

export interface ActiveScan {
  id: string;
  droneId: string;
  position: [number, number, number]; // center of scan
  radius: number;
  duration: number; // in ms
  startTime: number;
  targets: {x: number, z: number, isHuman: boolean}[]; // Local offsets or global positions for red spots
}

// ─── UI State ────────────────────────────────────────────────────────────────

export interface UIState {
  selectedDroneId: string | null;
  secondSelectedDroneId: string | null;
  switchDialogDroneId: string | null;
  messagePassingMode: boolean;
  selectedSOSId: string | null;
  cameraFocusPoint: [number, number, number] | null;
  showRelayPaths: boolean;
  showGridOverlay: boolean;
  hiddenRoles: DroneRole[];
  aiEnabled: boolean;
  aiStatus: AIStatus;
  reasoningLog: ReasoningEntry[];
  perDroneReasoning: Record<string, DroneReasoningEntry[]>;
  droneMessages: DroneMessage[];
  activeMission: Mission | null;
  missionHistory: Mission[];
  activeScans: ActiveScan[];
  activeMessagePaths: Set<string>; // Set of drone ID pairs currently communicating
  activePowerPaths: Set<string>; // Set of drone ID pairs currently charging
  establishedConnections: Set<string>; // Persistent connections (P2P or group)
  droneGroups: Record<string, string[]>; // groupId -> array of droneIds
  activeGroupId: string | null;
}

// ─── Store ───────────────────────────────────────────────────────────────────

interface AppStore extends UIState {
  // Data
  drones: Drone[];
  gridCells: GridCell[];
  sosSignals: SOSSignal[];
  relayPaths: RelayPath[];
  eventLog: LogEntry[];

  // Data actions
  hydrate: (data: {
    drones: Drone[];
    gridCells: GridCell[];
    sosSignals: SOSSignal[];
    relayPaths: RelayPath[];
    eventLog: LogEntry[];
  }) => void;
  pushEvent: (message: string, type: EventType) => void;
  updateDrone: (id: string, patch: Partial<Drone>) => void;
  updateSOS: (id: string, patch: Partial<SOSSignal>) => void;

  // UI actions
  selectDrone: (id: string | null) => void;
  setSecondDrone: (id: string | null) => void;
  setSwitchDialogDroneId: (id: string | null) => void;
  toggleMessagePassingMode: () => void;
  selectSOS: (id: string | null) => void;
  setCameraFocus: (point: [number, number, number] | null) => void;
  toggleRelayPaths: () => void;
  toggleGridOverlay: () => void;
  toggleRoleFilter: (role: DroneRole) => void;

  // AI actions
  toggleAI: () => void;
  addReasoning: (text: string, type: ReasoningEntry["type"]) => void;
  clearReasoning: () => void;
  setAIStatus: (status: AIStatus) => void;

  // Per-drone reasoning actions
  addDroneReasoning: (droneId: string, text: string, type: DroneReasoningEntry["type"]) => void;
  clearDroneReasoning: (droneId: string) => void;

  // Drone message actions
  addDroneMessage: (fromId: string, toId: string, content: string, type: DroneMessage["type"]) => void;
  clearDroneMessages: () => void;

  // Mission actions
  generateMission: (type: "scan" | "relay" | "supply" | "coverage") => Mission;
  startMission: (missionId: string) => void;
  updateTaskStatus: (missionId: string, taskId: string, status: MissionTask["status"]) => void;
  completeMission: (missionId: string) => void;
  failMission: (missionId: string, reason: string) => void;
  
  // Scan actions
  addActiveScan: (scan: Omit<ActiveScan, "id" | "startTime">) => void;
  removeActiveScan: (id: string) => void;

  // Active communication
  setActiveMessagePath: (fromDroneId: string, toDroneId: string, active: boolean) => void;
  clearActiveMessagePaths: () => void;

  // Active power
  setActivePowerPath: (fromDroneId: string, toDroneId: string, active: boolean) => void;
  clearActivePowerPaths: () => void;

  // Persistent connections and groups
  setConnection: (drone1: string, drone2: string, connected: boolean) => void;
  joinGroup: (groupId: string, droneId: string) => void;
  leaveGroup: (groupId: string, droneId: string) => void;
  openGroupChat: (groupId: string | null) => void;
}

export const useStore = create<AppStore>((set) => ({
  // Data defaults
  drones: [],
  gridCells: [],
  sosSignals: [],
  relayPaths: [],
  eventLog: [],

  // UI defaults
  selectedDroneId: null,
  secondSelectedDroneId: null,
  switchDialogDroneId: null,
  messagePassingMode: false,
  selectedSOSId: null,
  cameraFocusPoint: null,
  showRelayPaths: true,
  showGridOverlay: true,
  hiddenRoles: [],
  aiEnabled: false,
  aiStatus: "idle",
  reasoningLog: [],
  perDroneReasoning: {},
  droneMessages: [],
  activeMission: null,
  missionHistory: [],
  activeScans: [],
  activeMessagePaths: new Set(),
  activePowerPaths: new Set(),
  establishedConnections: new Set(),
  droneGroups: {},
  activeGroupId: null,

  // Data actions
  hydrate: (data) => set(data),

  pushEvent: (message, type) =>
    set((s) => ({
      eventLog: [
        {
          id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          message,
          type,
        },
        ...s.eventLog,
      ].slice(0, 50),
    })),

  updateDrone: (id, patch) =>
    set((s) => ({
      drones: s.drones.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    })),

  updateSOS: (id, patch) =>
    set((s) => ({
      sosSignals: s.sosSignals.map((sos) =>
        sos.id === id ? { ...sos, ...patch } : sos,
      ),
    })),

  // UI actions
  selectDrone: (id) =>
    set({
      selectedDroneId: id,
      selectedSOSId: null,
      cameraFocusPoint: null,
    }),
  selectSOS: (id) =>
    set({
      selectedSOSId: id,
      selectedDroneId: null,
      cameraFocusPoint: null,
    }),
  setCameraFocus: (point) =>
    set({
      cameraFocusPoint: point,
      selectedDroneId: null,
      selectedSOSId: null,
    }),
  toggleRelayPaths: () => set((s) => ({ showRelayPaths: !s.showRelayPaths })),
  toggleGridOverlay: () =>
    set((s) => ({ showGridOverlay: !s.showGridOverlay })),
  toggleRoleFilter: (role) =>
    set((s) => ({
      hiddenRoles: s.hiddenRoles.includes(role)
        ? s.hiddenRoles.filter((r) => r !== role)
        : [...s.hiddenRoles, role],
    })),

  // AI actions
  toggleAI: () =>
    set((s) => ({
      aiEnabled: !s.aiEnabled,
      aiStatus: s.aiEnabled ? "idle" : s.aiStatus,
    })),
  addReasoning: (text, type) =>
    set((s) => ({
      reasoningLog: [
        {
          id: `reason-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          text,
          type,
        },
        ...s.reasoningLog,
      ].slice(0, 100),
    })),
  clearReasoning: () => set({ reasoningLog: [] }),
  setAIStatus: (status) => set({ aiStatus: status }),

  // Per-drone reasoning actions
  addDroneReasoning: (droneId, text, type) =>
    set((s) => ({
      perDroneReasoning: {
        ...s.perDroneReasoning,
        [droneId]: [
          {
            id: `dreason-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            droneId,
            timestamp: Date.now(),
            text,
            type,
          },
          ...(s.perDroneReasoning[droneId] || []),
        ].slice(0, 50),
      },
    })),
  clearDroneReasoning: (droneId) =>
    set((s) => ({
      perDroneReasoning: {
        ...s.perDroneReasoning,
        [droneId]: [],
      },
    })),

  // Drone message actions
  addDroneMessage: (fromId, toId, content, type) =>
    set((s) => ({
      droneMessages: [
        {
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          fromDroneId: fromId,
          toDroneId: toId,
          timestamp: Date.now(),
          content,
          type,
        },
        ...s.droneMessages,
      ].slice(0, 100),
    })),
  clearDroneMessages: () => set({ droneMessages: [] }),

  // Selection actions
  setSecondDrone: (id) =>
    set({
      secondSelectedDroneId: id,
    }),
  setSwitchDialogDroneId: (id) =>
    set({
      switchDialogDroneId: id,
    }),
  toggleMessagePassingMode: () =>
    set((s) => ({
      messagePassingMode: !s.messagePassingMode,
    })),

  // Mission actions
  generateMission: (type) => {
    const missionId = `MISSION-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const tasks: MissionTask[] = [];
    
    switch (type) {
      case "scan":
        tasks.push(
          { id: `${missionId}-task1`, description: "Navigate to target sector", status: "pending" },
          { id: `${missionId}-task2`, description: "Activate thermal scan", status: "pending" },
          { id: `${missionId}-task3`, description: "Analyze thermal data", status: "pending" },
          { id: `${missionId}-task4`, description: "Report findings", status: "pending" }
        );
        break;
      case "relay":
        tasks.push(
          { id: `${missionId}-task1`, description: "Identify relay drone", status: "pending" },
          { id: `${missionId}-task2`, description: "Calculate optimal path", status: "pending" },
          { id: `${missionId}-task3`, description: "Move drone to position", status: "pending" },
          { id: `${missionId}-task4`, description: "Test connection", status: "pending" },
          { id: `${missionId}-task5`, description: "Confirm relay established", status: "pending" }
        );
        break;
      case "supply":
        tasks.push(
          { id: `${missionId}-task1`, description: "Identify nearest supply drone", status: "pending" },
          { id: `${missionId}-task2`, description: "Calculate delivery route", status: "pending" },
          { id: `${missionId}-task3`, description: "Dispatch drone", status: "pending" },
          { id: `${missionId}-task4`, description: "Monitor approach", status: "pending" },
          { id: `${missionId}-task5`, description: "Confirm delivery", status: "pending" }
        );
        break;
      case "coverage":
        tasks.push(
          { id: `${missionId}-task1`, description: "Identify WiFi drone", status: "pending" },
          { id: `${missionId}-task2`, description: "Calculate optimal position", status: "pending" },
          { id: `${missionId}-task3`, description: "Move drone to position", status: "pending" },
          { id: `${missionId}-task4`, description: "Activate coverage", status: "pending" },
          { id: `${missionId}-task5`, description: "Verify coverage extension", status: "pending" }
        );
        break;
    }

    const mission: Mission = {
      id: missionId,
      name: `${type.toUpperCase()} Mission`,
      description: `Auto-generated ${type} mission for swarm operation`,
      tasks,
      status: "pending",
      createdAt: Date.now(),
    };

    set((s) => ({
      activeMission: mission,
      missionHistory: [mission, ...s.missionHistory].slice(0, 10),
    }));

    return mission;
  },

  startMission: (missionId) =>
    set((s) => {
      if (s.activeMission?.id === missionId) {
        return {
          activeMission: {
            ...s.activeMission,
            status: "in_progress",
            tasks: s.activeMission.tasks.map((t, i) => 
              i === 0 ? { ...t, status: "in_progress" as const } : t
            ),
          },
        };
      }
      return {};
    }),

  updateTaskStatus: (missionId, taskId, status) =>
    set((s): AppStore => {
      if (s.activeMission?.id === missionId) {
        const taskIndex = s.activeMission.tasks.findIndex((t) => t.id === taskId);
        if (taskIndex === -1) return s;

        const newStatus = status as MissionTask["status"];
        const updatedTasks = s.activeMission.tasks.map((t, i) => {
          if (t.id === taskId) {
            return { ...t, status: newStatus, completedAt: newStatus === "completed" ? Date.now() : undefined };
          }
          if (i === taskIndex - 1 && newStatus === "completed") {
            return { ...t, status: "completed" as const, completedAt: Date.now() };
          }
          if (i === taskIndex + 1 && newStatus === "in_progress") {
            return { ...t, status: "in_progress" as const };
          }
          return t;
        });

        const allCompleted = updatedTasks.every((t) => t.status === "completed");
        if (allCompleted) {
          return {
            ...s,
            activeMission: {
              ...s.activeMission,
              tasks: updatedTasks,
              status: "completed" as MissionStatus,
              completedAt: Date.now(),
            },
          };
        }

        return {
          ...s,
          activeMission: {
            ...s.activeMission,
            tasks: updatedTasks,
          },
        };
      }
      return s;
    }),

  completeMission: (missionId) =>
    set((s) => {
      if (s.activeMission?.id === missionId) {
        return {
          activeMission: {
            ...s.activeMission,
            status: "completed",
            completedAt: Date.now(),
          },
        };
      }
      return {};
    }),

  failMission: (missionId, reason) =>
    set((s) => {
      if (s.activeMission?.id === missionId) {
        return {
          activeMission: {
            ...s.activeMission,
            status: "failed",
            completedAt: Date.now(),
          },
        };
      }
      return {};
    }),

  addActiveScan: (scan) =>
    set((s) => ({
      activeScans: [
        ...s.activeScans,
        {
          ...scan,
          id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          startTime: Date.now(),
        },
      ],
    })),
    
  removeActiveScan: (id) =>
    set((s) => ({
      activeScans: s.activeScans.filter((scan) => scan.id !== id),
    })),

  // Active communication
  setActiveMessagePath: (fromDroneId, toDroneId, active) =>
    set((s) => {
      const pathId = [fromDroneId, toDroneId].sort().join('-');
      const activePaths = new Set(s.activeMessagePaths);
      if (active) {
        activePaths.add(pathId);
      } else {
        activePaths.delete(pathId);
      }
      return { activeMessagePaths: activePaths };
    }),

  clearActiveMessagePaths: () => set({ activeMessagePaths: new Set() }),

  setActivePowerPath: (fromDroneId, toDroneId, active) =>
    set((s) => {
      const pathId = [fromDroneId, toDroneId].sort().join('-');
      const activePaths = new Set(s.activePowerPaths);
      if (active) {
        activePaths.add(pathId);
      } else {
        activePaths.delete(pathId);
      }
      return { activePowerPaths: activePaths };
    }),

  clearActivePowerPaths: () => set({ activePowerPaths: new Set() }),

  setConnection: (drone1, drone2, connected) =>
    set((s) => {
      const pathId = [drone1, drone2].sort().join('-');
      const connections = new Set(s.establishedConnections);
      if (connected) {
        connections.add(pathId);
      } else {
        connections.delete(pathId);
      }
      return { establishedConnections: connections };
    }),
    
  joinGroup: (groupId, droneId) =>
    set((s) => {
      const group = s.droneGroups[groupId] || [];
      if (!group.includes(droneId)) {
        return {
          droneGroups: {
            ...s.droneGroups,
            [groupId]: [...group, droneId],
          }
        };
      }
      return s;
    }),
    
  leaveGroup: (groupId, droneId) =>
    set((s) => {
      const group = s.droneGroups[groupId] || [];
      if (group.includes(droneId)) {
        return {
          droneGroups: {
            ...s.droneGroups,
            [groupId]: group.filter(id => id !== droneId),
          }
        };
      }
      return s;
    }),
    
  openGroupChat: (groupId) => set({ activeGroupId: groupId }),
}));

// ─── Selector helpers (prevent re-renders) ───────────────────────────────────

export const selectDrones = (s: AppStore) => s.drones;
export const selectGrid = (s: AppStore) => s.gridCells;
export const selectSOS = (s: AppStore) => s.sosSignals;
export const selectRelays = (s: AppStore) => s.relayPaths;
export const selectLog = (s: AppStore) => s.eventLog;
export const selectUI = (s: AppStore): UIState => ({
  selectedDroneId: s.selectedDroneId,
  secondSelectedDroneId: s.secondSelectedDroneId,
  switchDialogDroneId: s.switchDialogDroneId,
  messagePassingMode: s.messagePassingMode,
  selectedSOSId: s.selectedSOSId,
  cameraFocusPoint: s.cameraFocusPoint,
  showRelayPaths: s.showRelayPaths,
  showGridOverlay: s.showGridOverlay,
  hiddenRoles: s.hiddenRoles,
  aiEnabled: s.aiEnabled,
  aiStatus: s.aiStatus,
  reasoningLog: s.reasoningLog,
  perDroneReasoning: s.perDroneReasoning,
  droneMessages: s.droneMessages,
  activeMission: s.activeMission,
  missionHistory: s.missionHistory,
  activeScans: s.activeScans,
  activeMessagePaths: s.activeMessagePaths,
  activePowerPaths: s.activePowerPaths,
  establishedConnections: s.establishedConnections,
  droneGroups: s.droneGroups,
  activeGroupId: s.activeGroupId,
});

// ─── Derived selectors ───────────────────────────────────────────────────────

export const selectVisibleDrones = (s: AppStore) =>
  s.drones.filter((d) => !s.hiddenRoles.includes(d.role));

export const selectSelectedSOS = (s: AppStore) =>
  s.sosSignals.find((sos) => sos.id === s.selectedSOSId) || null;

export const selectRelayPathForSOS = (s: AppStore) => {
  if (!s.selectedSOSId) return null;
  return s.relayPaths.find((p) => p.sosId === s.selectedSOSId) || null;
};

export const selectAIState = (s: AppStore) => ({
  aiEnabled: s.aiEnabled,
  aiStatus: s.aiStatus,
  reasoningLog: s.reasoningLog,
});
