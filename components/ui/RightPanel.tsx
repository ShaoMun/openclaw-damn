"use client";

import {
  useStore,
  selectDrones,
  selectSOS,
  type Drone,
  type DroneRole,
  type SOSSignal,
} from "@/lib/store";
import { Radio, Wifi, Package, Activity, X, AlertTriangle, Search, BatteryCharging } from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLE_ICON: Record<DroneRole, React.ReactNode> = {
  relay: <Radio className="w-3 h-3" />,
  wifi: <Wifi className="w-3 h-3" />,
  supply: <Package className="w-3 h-3" />,
  scout: <Search className="w-3 h-3" />,
  charger: <BatteryCharging className="w-3 h-3" />,
};

const ROLE_COLOR: Record<DroneRole, string> = {
  relay: "#ffffff",
  wifi: "#ffffff",
  supply: "#ffffff",
  scout: "#ffffff",
  charger: "#ffffff",
};

const STATUS_DOT: Record<string, string> = {
  online: "bg-white",
  offline: "bg-white/10",
  syncing: "bg-white/40 animate-pulse",
};

// ─── Battery Bar Component ───────────────────────────────────────────────────

function BatteryBar({ level }: { level: number }) {
  const color = level > 60 ? "#22c55e" : level > 30 ? "#eab308" : "#ef4444";
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <div className="flex-1 h-0.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${level}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[7px] font-mono opacity-40 w-6 text-right font-bold">
        {level.toFixed(0)}%
      </span>
    </div>
  );
}

// ─── SOS Info Panel Component ────────────────────────────────────────────────

function SOSInfo({
  sos,
  relayDrones,
  onDeselect,
}: {
  sos: SOSSignal;
  relayDrones: Drone[];
  onDeselect: () => void;
}) {
  const elapsed = Math.max(0, Math.floor((Date.now() - sos.timestamp) / 1000));
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const strengthPercent = Math.round(sos.strength * 100);
  const strengthColor =
    sos.strength > 0.7 ? "#22c55e" : sos.strength > 0.4 ? "#eab308" : "#ef4444";

  return (
    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
          <span className="text-[10px] font-mono text-red-400 font-bold uppercase tracking-widest">
            SOS Active
          </span>
        </div>
        <button
          onClick={onDeselect}
          className="p-1 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-3 h-3 text-red-400/60" />
        </button>
      </div>

      {/* SOS Details */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-baseline">
          <span className="text-[8px] font-mono text-white/30 uppercase">
            Signal ID
          </span>
          <span className="text-[10px] font-mono text-white/80 font-bold">
            {sos.id}
          </span>
        </div>

        <div className="flex justify-between items-baseline">
          <span className="text-[8px] font-mono text-white/30 uppercase">
            Sector
          </span>
          <span className="text-[10px] font-mono text-red-400 font-bold">
            {sos.gridLabel}
          </span>
        </div>

        <div className="flex justify-between items-baseline">
          <span className="text-[8px] font-mono text-white/30 uppercase">
            Duration
          </span>
          <span className="text-[10px] font-mono text-white/60">
            {mins}m {secs}s
          </span>
        </div>

        {/* Signal Strength Bar */}
        <div className="space-y-1">
          <div className="flex justify-between items-baseline">
            <span className="text-[8px] font-mono text-white/30 uppercase">
              Signal Strength
            </span>
            <span
              className="text-[9px] font-mono font-bold"
              style={{ color: strengthColor }}
            >
              {strengthPercent}%
            </span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${strengthPercent}%`,
                backgroundColor: strengthColor,
              }}
            />
          </div>
        </div>
      </div>

      {/* Relay Chain */}
      <div className="space-y-1.5">
        <span className="text-[8px] font-mono text-white/30 uppercase tracking-wider">
          Relay Chain ({relayDrones.length} drones)
        </span>
        <div className="flex flex-wrap gap-1">
          {relayDrones.map((drone) => (
            <span
              key={drone.id}
              className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded-sm text-[8px] font-mono text-white/60 flex items-center gap-1"
            >
              <span
                className={`w-1 h-1 rounded-full ${
                  drone.status === "online"
                    ? "bg-green-500"
                    : drone.status === "syncing"
                      ? "bg-yellow-500 animate-pulse"
                      : "bg-red-500"
                }`}
              />
              {drone.id}
            </span>
          ))}
          {relayDrones.length === 0 && (
            <span className="text-[8px] font-mono text-white/20 italic">
              No relay path established
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Drone Row Component ─────────────────────────────────────────────────────

function DroneRow({
  drone,
  isSelected,
  onSelect,
}: {
  drone: Drone;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex flex-col gap-1 px-3 py-2.5 rounded-sm transition-all border ${
        isSelected
          ? "bg-white/10 border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
          : "border-transparent hover:bg-white/[0.04] hover:border-white/5"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-5 h-5 rounded flex items-center justify-center shrink-0 bg-black/40 border border-white/5"
          style={{ color: ROLE_COLOR[drone.role] }}
        >
          {ROLE_ICON[drone.role]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-white/80 font-bold tracking-tight">
              {drone.id}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono text-white/30 uppercase">
                {drone.status}
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[drone.status]}`}
              />
            </div>
          </div>
          <BatteryBar level={drone.battery} />
        </div>
      </div>
    </button>
  );
}

// ─── Main Right Panel Component ──────────────────────────────────────────────

export function RightPanel() {
  const drones = useStore(selectDrones);
  const sosSignals = useStore(selectSOS);
  const selectedDroneId = useStore((s) => s.selectedDroneId);
  const selectedSOSId = useStore((s) => s.selectedSOSId);
  const selectDrone = useStore((s) => s.selectDrone);
  const selectSOSAction = useStore((s) => s.selectSOS);
  const setSwitchDialogDroneId = useStore((s) => s.setSwitchDialogDroneId);

  // Find selected SOS and its relay drones
  const selectedSOS = sosSignals.find((s) => s.id === selectedSOSId);
  const relayDrones = drones.filter((d) =>
    selectedSOS?.relayDroneIds.includes(d.id),
  );

  // Count by status
  const onlineCount = drones.filter((d) => d.status === "online").length;
  const syncingCount = drones.filter((d) => d.status === "syncing").length;
  const offlineCount = drones.filter((d) => d.status === "offline").length;

  const handleDroneSelect = (droneId: string) => {
    if (selectedDroneId === null) {
      selectDrone(droneId);
    } else if (selectedDroneId === droneId) {
      selectDrone(null);
    } else {
      setSwitchDialogDroneId(droneId);
    }
  };

  if (drones.length === 0) return null;

  return (
    <div className="w-64 h-full flex flex-col pointer-events-auto bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex flex-col">
          <span className="text-[10px] font-mono text-white/80 font-bold uppercase tracking-[0.2em]">
            Fleet Monitor
          </span>
          <span className="text-[8px] font-mono text-white/30 uppercase tracking-[0.1em]">
            {onlineCount} online · {syncingCount} syncing · {offlineCount}{" "}
            offline
          </span>
        </div>
        <Activity className="w-3.5 h-3.5 text-white/20" />
      </div>

      {/* SOS Info Panel (if SOS selected) */}
      {selectedSOS && (
        <SOSInfo
          sos={selectedSOS}
          relayDrones={relayDrones}
          onDeselect={() => selectSOSAction(null)}
        />
      )}

      {/* Drone List */}
      <div className="flex-1 flex flex-col gap-1 overflow-y-auto scrollbar-thin pr-1">
        {drones.map((drone) => (
          <DroneRow
            key={drone.id}
            drone={drone}
            isSelected={selectedDroneId === drone.id}
            onSelect={() => handleDroneSelect(drone.id)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-white/5 flex flex-col gap-2.5">
        <div className="text-[8px] font-mono text-white/20 uppercase tracking-[0.2em] italic">
          Pulse transmission: encrypted
        </div>
      </div>
    </div>
  );
}
