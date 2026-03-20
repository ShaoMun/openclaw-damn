import { create } from "zustand";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DroneRole = "relay" | "supply" | "scout" | "medical" | "rescue" | "comms" | "fire" | "charger" | "heavy" | "recon" | "evac" | "transport" | "repair";
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
  localAI?: DroneLocalAI; // Feature 3: Local AI system
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
  intensity?: number; // 0.0 to 1.0 - opacity of scan (default 1.0)
}

export interface ClickMarker {
  id: string;
  position: [number, number, number];
  timestamp: number;
  isHuman: boolean;
  discovered: boolean;
}

// ─── Feature 1: Grid Coverage Stats ────────────────────────────────────

export interface GridCoverageStats {
  searchCoverage: number;      // % of cells scanned
  wifiCoverage: number;         // % of area with WiFi
  totalCells: number;
  coveredCells: number;
  deadZones: number;
  sosZones: number;
}

// ─── Feature 3: Local AI ───────────────────────────────────────────────

export type DronePersonality = "aggressive" | "cautious" | "balanced" | "efficiency";

export interface DroneLocalAI {
  droneId: string;
  enabled: boolean;
  personality: DronePersonality;
  stats: {
    peopleFound: number;
    peopleFoundPerMinute: number;
    scansCompleted: number;
    distanceTraveled: number;
    efficiency: number;        // actions completed / energy used
    uptime: number;            // milliseconds online
  };
  currentGoal: string;
  lastScanTime: number;
}

export interface DroneLocalReasoningEntry {
  id: string;
  droneId: string;
  timestamp: number;
  thought: string;
  action: string;
  outcome: "success" | "partial" | "failed";
  duration: number;  // milliseconds to execute
}

// ─── Feature 2: Tree of Thought ───────────────────────────────────────

export type ThoughtNodeType = "root" | "branch" | "leaf" | "observation";

export interface ThoughtNode {
  id: string;
  parentId: string | null;
  timestamp: number;
  text: string;
  type: ThoughtNodeType;
  confidence: number;        // 0-100
  status: "pending" | "active" | "completed" | "discarded";
  children: string[];        // IDs of child nodes
  dependencies: string[];    // IDs of prerequisite nodes
  metadata: {
    toolCalls?: string[];
    droneIds?: string[];
    gridArea?: string;
  };
}

// ─── Feature 4: ZKML Proof ────────────────────────────────────────────

export interface ZKMLProof {
  id: string;
  timestamp: number;
  reasoningHash: string;      // SHA-256 of reasoning text
  modelHash: string;          // Mock model identifier
  arbitrumTxHash: string;     // Hardcoded transaction hash
  verificationUrl: string;    // Arbitrum explorer URL
  verified: boolean;
  proofData: {
    inputCommitment: string;
    outputCommitment: string;
    proof: string;            // Mock zk-SNARK proof
    publicInputs: string[];
  };
}

// ─── Feature 5: Story Mission ───────────────────────────────────────

export type MissionPhase = "briefing" | "deployment" | "search" | "rescue" | "complete" | "failed";

export interface StoryMilestone {
  id: string;
  name: string;
  achieved: boolean;
  timestamp?: number;
}

export interface StoryNarrative {
  title: string;
  description: string;
  objectives: string[];
  progress: number;  // 0-100
}

export interface StoryMission {
  id: string;
  name: string;
  phase: MissionPhase;
  startTime: number;
  endTime?: number;
  narrative: StoryNarrative;
  milestones: StoryMilestone[];
  mission: Mission;  // Link to existing Mission
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
  clickMarkers: ClickMarker[]; // Click investigation markers
  activeMessagePaths: Set<string>; // Set of drone ID pairs currently communicating
  activePowerPaths: Set<string>; // Set of drone ID pairs currently charging
  establishedConnections: Set<string>; // Persistent connections (P2P or group)
  droneGroups: Record<string, string[]>; // groupId -> array of droneIds
  activeGroupId: string | null;

  // Feature 1: 2D Grid Map
  gridCoverageStats: GridCoverageStats;
  show2DGridMap: boolean;

  // Feature 2: Tree of Thought
  thoughtTree: ThoughtNode[];
  activeThoughtId: string | null;
  treeViewMode: "tree" | "timeline";

  // Feature 3: Local AI
  showLocalAIStats: boolean;
  selectedDroneForLocalAI: string | null;
  localAIReasoning: Record<string, DroneLocalReasoningEntry[]>;

  // Feature 4: ZKML
  zkmlProofs: ZKMLProof[];
  showZKMLVerification: boolean;
  selectedProofId: string | null;

  // Feature 5: Story Mission
  activeStoryMission: StoryMission | null;
  storyMissionHistory: StoryMission[];
  showStoryPanel: boolean;
  autoProgressStory: boolean;
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

  // Feature 1: 2D Grid Map actions
  calculateGridCoverage: () => GridCoverageStats;
  toggle2DGridMap: () => void;
  updateGridCoverageStats: (stats: Partial<GridCoverageStats>) => void;

  // Feature 2: Tree of Thought actions
  addThoughtNode: (node: Omit<ThoughtNode, "id" | "timestamp">) => void;
  updateThoughtNode: (id: string, patch: Partial<ThoughtNode>) => void;
  setActiveThought: (id: string | null) => void;
  pruneThoughtBranch: (nodeId: string) => void;
  clearThoughtTree: () => void;
  setTreeViewMode: (mode: "tree" | "timeline") => void;

  // Feature 3: Local AI actions
  initializeDroneLocalAI: (droneId: string, personality?: DronePersonality) => void;
  updateDroneLocalAI: (droneId: string, patch: Partial<DroneLocalAI>) => void;
  toggleDroneLocalAI: (droneId: string) => void;
  addDroneLocalReasoning: (entry: Omit<DroneLocalReasoningEntry, "id" | "timestamp">) => void;
  clearDroneLocalReasoning: (droneId: string) => void;

  // Feature 4: ZKML actions
  addZKMLProof: (proof: Omit<ZKMLProof, "id">) => void;
  removeZKMLProof: (proofId: string) => void;
  toggleZKMLVerification: () => void;
  setSelectedProof: (proofId: string | null) => void;

  // Feature 5: Story Mission actions
  startStoryMission: (mission: StoryMission) => void;
  advanceStoryPhase: (newPhase: MissionPhase) => void;
  updateStoryNarrative: (narrative: Partial<StoryNarrative>) => void;
  achieveStoryMilestone: (milestoneId: string) => void;
  toggleStoryPanel: () => void;
  completeStoryMission: () => void;

  // Click marker actions
  addClickMarker: (marker: Omit<ClickMarker, "id">) => void;
  removeClickMarker: (markerId: string) => void;
  updateClickMarker: (markerId: string, patch: Partial<ClickMarker>) => void;
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
  clickMarkers: [],
  activeMessagePaths: new Set(),
  activePowerPaths: new Set(),
  establishedConnections: new Set(),
  droneGroups: {},
  activeGroupId: null,

  // Feature 1: 2D Grid Map defaults
  gridCoverageStats: {
    searchCoverage: 0,
    wifiCoverage: 0,
    totalCells: 256,
    coveredCells: 0,
    deadZones: 0,
    sosZones: 0,
  },
  show2DGridMap: false,

  // Feature 2: Tree of Thought defaults
  thoughtTree: [],
  activeThoughtId: null,
  treeViewMode: "timeline",

  // Feature 3: Local AI defaults
  showLocalAIStats: false,
  selectedDroneForLocalAI: null,
  localAIReasoning: {},

  // Feature 4: ZKML defaults
  zkmlProofs: [],
  showZKMLVerification: false,
  selectedProofId: null,

  // Feature 5: Story Mission defaults
  activeStoryMission: null,
  storyMissionHistory: [],
  showStoryPanel: false,
  autoProgressStory: true,

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
          intensity: scan.intensity ?? 1.0, // Default to full opacity
        },
      ],
    })),
    
  removeActiveScan: (id) =>
    set((s) => ({
      activeScans: s.activeScans.filter((scan) => scan.id !== id),
    })),

  // Click markers
  addClickMarker: (marker) =>
    set((s) => ({
      clickMarkers: [
        ...s.clickMarkers,
        {
          ...marker,
          id: `marker-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
        },
      ],
    })),

  removeClickMarker: (id) =>
    set((s) => ({
      clickMarkers: s.clickMarkers.filter((m) => m.id !== id),
    })),

  updateClickMarker: (id, patch) =>
    set((s) => ({
      clickMarkers: s.clickMarkers.map((m) =>
        m.id === id ? { ...m, ...patch } : m
      ),
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

  // ─── Feature 1: 2D Grid Map Actions ─────────────────────────────────────

  calculateGridCoverage: () => {
    const state = useStore.getState();
    const { gridCells, drones } = state;

    // Calculate search coverage (cells not in 'dead' state)
    const coveredCells = gridCells.filter(c => c.state !== 'dead').length;
    const deadZones = gridCells.filter(c => c.state === 'dead').length;
    const sosZones = gridCells.filter(c => c.state === 'sos').length;
    const totalCells = gridCells.length;
    const searchCoverage = totalCells > 0 ? (coveredCells / totalCells) * 100 : 0;

    // Calculate WiFi coverage (cells within 45 units of WiFi drones)
    const wifiDrones = drones.filter(d => d.role === 'wifi' && d.status === 'online');
    let wifiCoveredCells = 0;

    gridCells.forEach(cell => {
      const isCovered = wifiDrones.some(drone => {
        const distance = Math.sqrt(
          Math.pow(cell.x - drone.position[0], 2) +
          Math.pow(cell.y - drone.position[2], 2)
        );
        return distance <= 45; // WiFi coverage radius
      });
      if (isCovered) wifiCoveredCells++;
    });

    const wifiCoverage = totalCells > 0 ? (wifiCoveredCells / totalCells) * 100 : 0;

    const stats: GridCoverageStats = {
      searchCoverage,
      wifiCoverage,
      totalCells,
      coveredCells,
      deadZones,
      sosZones,
    };

    set({ gridCoverageStats: stats });
    return stats;
  },

  toggle2DGridMap: () => set((s) => ({ show2DGridMap: !s.show2DGridMap })),

  updateGridCoverageStats: (patch) =>
    set((s) => ({
      gridCoverageStats: { ...s.gridCoverageStats, ...patch },
    })),

  // ─── Feature 2: Tree of Thought Actions ─────────────────────────────────

  addThoughtNode: (node) =>
    set((s) => {
      const newNode: ThoughtNode = {
        ...node,
        id: `thought-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
      };

      // If this node has a parent, add it to the parent's children
      const updatedTree = node.parentId
        ? s.thoughtTree.map((n) =>
            n.id === node.parentId
              ? { ...n, children: [...n.children, newNode.id] }
              : n
          )
        : s.thoughtTree;

      return {
        thoughtTree: [...updatedTree, newNode],
        activeThoughtId: newNode.id,
      };
    }),

  updateThoughtNode: (id, patch) =>
    set((s) => ({
      thoughtTree: s.thoughtTree.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    })),

  setActiveThought: (id) => set({ activeThoughtId: id }),

  pruneThoughtBranch: (nodeId) =>
    set((s) => {
      const toRemove = new Set([nodeId]);

      // Recursively find all descendants
      const findDescendants = (parentId: string) => {
        const node = s.thoughtTree.find((n) => n.id === parentId);
        if (node) {
          node.children.forEach((childId) => {
            toRemove.add(childId);
            findDescendants(childId);
          });
        }
      };
      findDescendants(nodeId);

      // Remove nodes and update parent's children
      return {
        thoughtTree: s.thoughtTree.filter((n) => !toRemove.has(n.id)),
      };
    }),

  clearThoughtTree: () => set({ thoughtTree: [], activeThoughtId: null }),

  setTreeViewMode: (mode) => set({ treeViewMode: mode }),

  // ─── Feature 3: Local AI Actions ───────────────────────────────────────

  initializeDroneLocalAI: (droneId, personality = "balanced") =>
    set((s) => {
      const localAI: DroneLocalAI = {
        droneId,
        enabled: true,
        personality,
        stats: {
          peopleFound: 0,
          peopleFoundPerMinute: 0,
          scansCompleted: 0,
          distanceTraveled: 0,
          efficiency: 100,
          uptime: 0,
        },
        currentGoal: "Initializing...",
        lastScanTime: Date.now(),
      };

      return {
        drones: s.drones.map((d) =>
          d.id === droneId ? { ...d, localAI } : d
        ),
      };
    }),

  updateDroneLocalAI: (droneId, patch) =>
    set((s) => ({
      drones: s.drones.map((d) =>
        d.id === droneId && d.localAI
          ? { ...d, localAI: { ...d.localAI, ...patch } }
          : d
      ),
    })),

  toggleDroneLocalAI: (droneId) =>
    set((s) => ({
      drones: s.drones.map((d) =>
        d.id === droneId && d.localAI
          ? { ...d, localAI: { ...d.localAI, enabled: !d.localAI.enabled } }
          : d
      ),
    })),

  addDroneLocalReasoning: (entry) =>
    set((s) => ({
      localAIReasoning: {
        ...s.localAIReasoning,
        [entry.droneId]: [
          {
            ...entry,
            id: `local-reason-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: Date.now(),
          },
          ...(s.localAIReasoning[entry.droneId] || []),
        ].slice(0, 50),
      },
    })),

  clearDroneLocalReasoning: (droneId) =>
    set((s) => ({
      localAIReasoning: {
        ...s.localAIReasoning,
        [droneId]: [],
      },
    })),

  // ─── Feature 4: ZKML Actions ──────────────────────────────────────────

  addZKMLProof: (proof) =>
    set((s) => ({
      zkmlProofs: [
        {
          ...proof,
          id: `proof-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        },
        ...s.zkmlProofs,
      ].slice(0, 10),
    })),

  removeZKMLProof: (proofId) =>
    set((s) => ({
      zkmlProofs: s.zkmlProofs.filter((p) => p.id !== proofId),
    })),

  toggleZKMLVerification: () =>
    set((s) => ({ showZKMLVerification: !s.showZKMLVerification })),

  setSelectedProof: (proofId) => set({ selectedProofId: proofId }),

  // ─── Feature 5: Story Mission Actions ──────────────────────────────────

  startStoryMission: (mission) =>
    set((s) => ({
      activeStoryMission: mission,
      showStoryPanel: true,
    })),

  advanceStoryPhase: (newPhase) =>
    set((s) => {
      if (!s.activeStoryMission) return s;

      return {
        activeStoryMission: {
          ...s.activeStoryMission,
          phase: newPhase,
          endTime: newPhase === 'complete' || newPhase === 'failed' ? Date.now() : undefined,
        },
      };
    }),

  updateStoryNarrative: (narrative) =>
    set((s) => {
      if (!s.activeStoryMission) return s;

      return {
        activeStoryMission: {
          ...s.activeStoryMission,
          narrative: {
            ...s.activeStoryMission.narrative,
            ...narrative,
          },
        },
      };
    }),

  achieveStoryMilestone: (milestoneId) =>
    set((s) => {
      if (!s.activeStoryMission) return s;

      return {
        activeStoryMission: {
          ...s.activeStoryMission,
          milestones: s.activeStoryMission.milestones.map((m) =>
            m.id === milestoneId
              ? { ...m, achieved: true, timestamp: Date.now() }
              : m
          ),
        },
      };
    }),

  toggleStoryPanel: () =>
    set((s) => ({ showStoryPanel: !s.showStoryPanel })),

  completeStoryMission: () =>
    set((s) => {
      if (!s.activeStoryMission) return s;

      const completed = {
        ...s.activeStoryMission,
        phase: 'complete' as MissionPhase,
        endTime: Date.now(),
      };

      return {
        activeStoryMission: completed,
        storyMissionHistory: [completed, ...s.storyMissionHistory].slice(0, 10),
      };
    }),
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
  gridCoverageStats: s.gridCoverageStats,
  show2DGridMap: s.show2DGridMap,
  thoughtTree: s.thoughtTree,
  activeThoughtId: s.activeThoughtId,
  treeViewMode: s.treeViewMode,
  showLocalAIStats: s.showLocalAIStats,
  selectedDroneForLocalAI: s.selectedDroneForLocalAI,
  localAIReasoning: s.localAIReasoning,
  zkmlProofs: s.zkmlProofs,
  showZKMLVerification: s.showZKMLVerification,
  selectedProofId: s.selectedProofId,
  activeStoryMission: s.activeStoryMission,
  storyMissionHistory: s.storyMissionHistory,
  showStoryPanel: s.showStoryPanel,
  autoProgressStory: s.autoProgressStory,
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
