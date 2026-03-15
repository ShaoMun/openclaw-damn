import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────────────

export type DroneRole = 'relay' | 'wifi' | 'supply';
export type DroneStatus = 'online' | 'offline' | 'syncing';
export type CellState = 'connected' | 'dead' | 'covered' | 'sos';
export type EventType = 'sos' | 'relay' | 'coverage' | 'supply' | 'status';

export interface Drone {
  id: string;
  role: DroneRole;
  battery: number;
  position: [number, number, number];
  status: DroneStatus;
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
  hops: [number, number, number][];
  droneIds: string[];
}

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: EventType;
}

// ─── UI State ────────────────────────────────────────────────────────────────

export interface UIState {
  selectedDroneId: string | null;
  cameraFocusPoint: [number, number, number] | null;
  showRelayPaths: boolean;
  showGridOverlay: boolean;
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

  // UI actions
  selectDrone: (id: string | null) => void;
  setCameraFocus: (point: [number, number, number] | null) => void;
  toggleRelayPaths: () => void;
  toggleGridOverlay: () => void;
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
  cameraFocusPoint: null,
  showRelayPaths: true,
  showGridOverlay: true,

  // Data actions
  hydrate: (data) => set(data),

  pushEvent: (message, type) =>
    set((s) => ({
      eventLog: [
        { id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, timestamp: Date.now(), message, type },
        ...s.eventLog,
      ].slice(0, 50),
    })),

  updateDrone: (id, patch) =>
    set((s) => ({
      drones: s.drones.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    })),

  // UI actions
  selectDrone: (id) => set({ selectedDroneId: id, cameraFocusPoint: null }),
  setCameraFocus: (point) => set({ cameraFocusPoint: point, selectedDroneId: null }),
  toggleRelayPaths: () => set((s) => ({ showRelayPaths: !s.showRelayPaths })),
  toggleGridOverlay: () => set((s) => ({ showGridOverlay: !s.showGridOverlay })),
}));

// ─── Selector helpers (prevent re-renders) ───────────────────────────────────

export const selectDrones = (s: AppStore) => s.drones;
export const selectGrid = (s: AppStore) => s.gridCells;
export const selectSOS = (s: AppStore) => s.sosSignals;
export const selectRelays = (s: AppStore) => s.relayPaths;
export const selectLog = (s: AppStore) => s.eventLog;
export const selectUI = (s: AppStore): UIState => ({
  selectedDroneId: s.selectedDroneId,
  cameraFocusPoint: s.cameraFocusPoint,
  showRelayPaths: s.showRelayPaths,
  showGridOverlay: s.showGridOverlay,
});
