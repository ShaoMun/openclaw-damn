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
  // Multi-star topology: More relays in center, diverse utility drones spread wide for realistic disaster response
  const roles: Drone['role'][] = [
    // Relays - positioned near center for communication hub (4)
    'relay', 'relay', 'relay', 'relay',
    // Scouts - for patrolling and scanning (3)
    'scout', 'scout', 'scout',
    // Medical drones - for emergency medical response (2)
    'medical', 'medical',
    // Rescue drones - for extraction operations (2)
    'rescue', 'rescue',
    // Medical evacuation - advanced life support (1)
    'evac',
    // Supply drones - for equipment delivery (2)
    'supply', 'supply',
    // Comms drones - for establishing communication links (2)
    'comms', 'comms',
    // Fire drones - for firefighting (2)
    'fire', 'fire',
    // Heavy lift - for large equipment (1)
    'heavy',
    // Recon - advanced surveillance (1)
    'recon',
    // Transport - heavy transport (1)
    'transport',
    // Repair - field repair (1)
    'repair',
    // Charger drones - for battery management (2)
    'charger', 'charger',
  ];

  return roles.map((role, i) => {
    const id = `DRONE-${String(i + 1).padStart(2, '0')}`;
    let x, z, y;

    if (role === 'relay') {
      // Relays stay near center (multi-star topology)
      x = (rand() - 0.5) * 30; // -15 to 15
      z = (rand() - 0.5) * 30; // -15 to 15
      y = 15 + rand() * 10;
    } else if (role === 'scout') {
      // Scouts patrol widest area
      x = (rand() - 0.5) * 140; // Wider patrol area
      z = (rand() - 0.5) * 140;
      y = 12 + rand() * 15;
    } else if (role === 'medical' || role === 'rescue' || role === 'evac') {
      // Medical, rescue, evac - spread wider for coverage
      x = (rand() - 0.5) * 100; // Increased spread
      z = (rand() - 0.5) * 100;
      y = 10 + rand() * 10;
    } else if (role === 'fire') {
      // Fire drones - spread wide for fire coverage
      x = (rand() - 0.5) * 120;
      z = (rand() - 0.5) * 120;
      y = 12 + rand() * 12;
    } else if (role === 'heavy' || role === 'transport') {
      // Heavy and transport - spread very wide (they need space to operate)
      x = (rand() - 0.5) * 130;
      z = (rand() - 0.5) * 130;
      y = 10 + rand() * 8;
    } else if (role === 'recon') {
      // Recon - patrol very wide for surveillance
      x = (rand() - 0.5) * 150;
      z = (rand() - 0.5) * 150;
      y = 15 + rand() * 12;
    } else {
      // Supply, comms, charger, repair - spread wide
      x = (rand() - 0.5) * 110;
      z = (rand() - 0.5) * 110;
      y = 12 + rand() * 12;
    }

    return {
      id,
      role,
      battery: Math.round(30 + rand() * 65),
      position: [x, y, z] as [number, number, number],
      status: 'online' as DroneStatus,
      proactiveLevel: 0.3 + rand() * 0.7, // 0.3-1.0: proactivity level
      lastMessageTime: Date.now() - rand() * 60000, // Random last comm time
    };
  });
}

// ─── SOS Signals ─────────────────────────────────────────────────────────────

function buildSOS(drones: Drone[]): SOSSignal[] {
  // No initial SOS signals - only created by user clicks
  return [];
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
    { id: 'evt-1', timestamp: now - 12_000, message: 'Relay established via DRONE-01', type: 'relay' },
    { id: 'evt-2', timestamp: now - 28_000, message: 'Coverage deployed at Grid F3', type: 'coverage' },
    { id: 'evt-3', timestamp: now - 55_000, message: 'Supply drone DRONE-03 dispatched', type: 'supply' },
    { id: 'evt-4', timestamp: now - 90_000, message: 'DRONE-04 went offline - low battery', type: 'status' },
    { id: 'evt-5', timestamp: now - 200_000, message: 'DRONE-02 syncing stored messages', type: 'status' },
    { id: 'evt-6', timestamp: now - 280_000, message: 'Scout DRONE-04 completed area reconnaissance', type: 'coverage' },
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
