// ─── BLE Protocol — Types, UUIDs, Constants ──────────────────────────────────
//
// Defines the full Bluetooth Low Energy protocol used by the drone swarm.
// All agents (Master, Relay, Drone) communicate via these message shapes.
// In-browser we run a software simulator; on real hardware these map 1-to-1
// to GATT characteristics over a custom 128-bit service UUID.

// ─── GATT Service / Characteristic UUIDs ─────────────────────────────────────

export const BLE_UUIDS = {
  /** Primary GATT service that every drone advertises */
  SERVICE:   'openclaw-swarm-0000-0000-000000000000',

  /** Write-only  — Master / Relay Agent → Drone: execute an instruction */
  COMMAND:   'openclaw-swarm-0000-0000-000000000001',

  /** Notify-only — Drone → Relay Agent: telemetry & status heartbeat */
  STATUS:    'openclaw-swarm-0000-0000-000000000002',

  /** Write + Notify — Relay ↔ Relay: hop-forwarded mesh messages */
  RELAY:     'openclaw-swarm-0000-0000-000000000003',

  /** Write-only  — Relay Agent → Drone: bulk instruction-cache sync */
  SYNC:      'openclaw-swarm-0000-0000-000000000004',

  /** Notify-only — Any node: periodic peer-discovery beacon */
  DISCOVERY: 'openclaw-swarm-0000-0000-000000000005',
} as const;

// ─── BLE Network Constants ────────────────────────────────────────────────────

/** Simulated BLE range in