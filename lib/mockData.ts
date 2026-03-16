import type { Drone, GridCell, SOSSignal, RelayPath, LogEntry } from './store';

// ─── Deterministic seed helper ───────────────────────────────────────────────

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rand = seededRandom(42);

// ─── Grid ────────────────────────────────────────────────────────────────────

const GRID_SIZE = 16;
const CELL_SIZE = 11;

function buildGrid(): GridCell[] {
  const cells: GridCell[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const v = rand();
      let state: GridCell['state'] = 'dead';
      if (v > 0.72) state = 'connected';
      else if (v > 0.50) state = 'covered';
      else if (v > 0.44) state = 'sos';

      cells.push({
        row: r,
        col: c,
        x: (c - GRID_SIZE / 2 + 0.5) * CELL_SIZE,
        y: (r - GRID_SIZE / 2 + 0.5) * CELL_SIZE,
        state,
      });
    }
  }
  return cells;
}

// ─── Drones ──────────────────────────────────────────────────────────────────

function gridLabel(r: number, c: number) {
  return `${String.fromCharCode(65 + c)}${r + 1}`;
}

function buildDrones(): Drone[] {
  const roles: Drone['role'][] = ['relay', 'wifi', 'supply', 'scout', 'charger'];
  const statuses: Drone['status'][] = ['online', 'online', 'online', 'online', 'online'];

  return roles.map((role, i) => {
    const id = `DRONE-${String(i + 1).padStart(2, '0')}`;
    const x = (rand() - 0.5) * 100;
    const z = (rand() - 0.5) * 100;
    const y = 12 + rand() * 12;
    return {
      id,
      role,
      battery: Math.round(30 + rand() * 65),
      position: [x, y, z] as [number, number, number],
      status: statuses[i],
      proactiveLevel: 0.3 + rand() * 0.7, // 0.3-1.0: proactivity level
      lastMessageTime: Date.now() - rand() * 60000, // Random last comm time
    };
  });
}

// ─── SOS Signals ─────────────────────────────────────────────────────────────

function buildSOS(drones: Drone[]): SOSSignal[] {
  return [
    {
      id: 'SOS-001',
      gridLabel: 'D7',
      position: [30, 1, -20],
      timestamp: Date.now() - 120_000,
      strength: 0.85,
      relayDroneIds: [drones[0].id, drones[1].id],
    },
    {
      id: 'SOS-002',
      gridLabel: 'K12',
      position: [-45, 1, 35],
      timestamp: Date.now() - 45_000,
      strength: 0.62,
      relayDroneIds: [drones[2].id, drones[3].id],
    },
    {
      id: 'SOS-003',
      gridLabel: 'F3',
      position: [10, 1, 50],
      timestamp: Date.now() - 180_000,
      strength: 0.91,
      relayDroneIds: [drones[0].id, drones[3].id],
    },
  ];
}

// ─── Relay Paths ─────────────────────────────────────────────────────────────

function buildRelayPaths(drones: Drone[], sos: SOSSignal[]): RelayPath[] {
  return sos.map((s, i) => {
    return {
      id: `PATH-${String(i + 1).padStart(3, '0')}`,
      droneIds: s.relayDroneIds,
      sosId: s.id,
    };
  });
}

// ─── Event Log ───────────────────────────────────────────────────────────────

function buildEventLog(): LogEntry[] {
  const now = Date.now();
  return [
    { id: 'evt-1', timestamp: now - 5_000, message: 'SOS detected at Grid D7', type: 'sos' },
    { id: 'evt-2', timestamp: now - 12_000, message: 'Relay established via DRONE-01', type: 'relay' },
    { id: 'evt-3', timestamp: now - 28_000, message: 'WiFi coverage deployed at Grid F3', type: 'coverage' },
    { id: 'evt-4', timestamp: now - 55_000, message: 'Supply drone DRONE-03 dispatched', type: 'supply' },
    { id: 'evt-5', timestamp: now - 90_000, message: 'DRONE-04 went offline - low battery', type: 'status' },
    { id: 'evt-6', timestamp: now - 140_000, message: 'SOS detected at Grid K12', type: 'sos' },
    { id: 'evt-7', timestamp: now - 200_000, message: 'DRONE-02 syncing stored messages', type: 'status' },
    { id: 'evt-8', timestamp: now - 280_000, message: 'Scout DRONE-04 completed area reconnaissance', type: 'coverage' },
  ];
}

// ─── Build all mock data ─────────────────────────────────────────────────────

export function createMockData() {
  const gridCells = buildGrid();
  const drones = buildDrones();
  const sosSignals = buildSOS(drones);
  const relayPaths = buildRelayPaths(drones, sosSignals);
  const eventLog = buildEventLog();

  return { drones, gridCells, sosSignals, relayPaths, eventLog };
}
