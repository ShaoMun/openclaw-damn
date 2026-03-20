"use client";

import {
  useStore,
  selectDrones,
  selectGrid,
  type DroneRole,
} from "@/lib/store";
import {
  Shield,
  Route,
  Grid3X3,
  Activity,
  Radio,
  Package,
  Search,
  BatteryCharging,
  FileCheck,
  AlertTriangle,
  ActivityIcon,
  X,
  Wrench,
} from "lucide-react";

const ROLE_ICON: Record<DroneRole, React.ReactNode> = {
  relay: <Radio className="w-3 h-3" />,
  supply: <Package className="w-3 h-3" />,
  scout: <Search className="w-3 h-3" />,
  medical: <Activity className="w-3 h-3" />,
  rescue: <AlertTriangle className="w-3 h-3" />,
  comms: <ActivityIcon className="w-3 h-3" />,
  fire: <X className="w-3 h-3" />,
  charger: <BatteryCharging className="w-3 h-3" />,
  heavy: <Package className="w-3 h-3" />,
  recon: <Search className="w-3 h-3" />,
  evac: <Activity className="w-3 h-3" />,
  transport: <Package className="w-3 h-3" />,
  repair: <Wrench className="w-3 h-3" />,
};

const ROLE_LABEL: Record<DroneRole, string> = {
  relay: "Relay",
  supply: "Cargo",
  scout: "Scout",
  medical: "Medic",
  rescue: "Rescue",
  comms: "Comms",
  fire: "Fire",
  charger: "Power",
  heavy: "Heavy",
  recon: "Recon",
  evac: "Evac",
  transport: "Hauler",
  repair: "Fixer",
};

export function TopPanel() {
  const drones = useStore(selectDrones);
  const grid = useStore(selectGrid);

  const showRelays = useStore((s) => s.showRelayPaths);
  const showGrid = useStore((s) => s.showGridOverlay);
  const show2DGridMap = useStore((s) => s.show2DGridMap);
  const showZKMLVerification = useStore((s) => s.showZKMLVerification);
  const hiddenRoles = useStore((s) => s.hiddenRoles);
  const toggleRelays = useStore((s) => s.toggleRelayPaths);
  const toggleGrid = useStore((s) => s.toggleGridOverlay);
  const toggle2DGridMap = useStore((s) => s.toggle2DGridMap);
  const toggleZKMLVerification = useStore((s) => s.toggleZKMLVerification);
  const toggleRoleFilter = useStore((s) => s.toggleRoleFilter);

  const online = drones.filter((d) => d.status === "online").length;
  const coverage =
    grid.length > 0
      ? Math.round(
          (grid.filter((c) => c.state !== "dead").length / grid.length) * 100,
        )
      : 0;

  const isRoleVisible = (role: DroneRole) => !hiddenRoles.includes(role);

  return (
    <div className="flex items-center gap-6 pointer-events-auto bg-black/40 backdrop-blur-md border border-white/10 px-6 py-2.5 rounded-sm">
      {/* Mission Stats */}
      <div className="flex items-center gap-6">
        <div className="flex flex-col gap-0.5">
          <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">
            Drones
          </span>
          <span className="text-xs font-mono text-white/70 tabular-nums">
            {online}
            <span className="opacity-30">/</span>
            {drones.length}
          </span>
        </div>

        <div className="w-[1px] h-6 bg-white/10" />

        <div className="flex flex-col gap-0.5">
          <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">
            Coverage
          </span>
          <span className="text-xs font-mono text-green-400 tabular-nums">
            {coverage}%
          </span>
        </div>
      </div>

      <div className="w-[1px] h-8 bg-white/20 mx-2" />

      {/* Live Indicator */}
      <div className="flex items-center gap-2 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-sm">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[9px] font-mono text-green-500 font-bold uppercase tracking-widest">
          Live
        </span>
      </div>

      <div className="w-[1px] h-8 bg-white/20 mx-2" />

      {/* Role Filter Toggles */}
      <div className="flex items-center gap-1">
        {(Object.keys(ROLE_ICON) as DroneRole[]).map((role) => (
          <button
            key={role}
            onClick={() => toggleRoleFilter(role)}
            title={`Toggle ${ROLE_LABEL[role]} drones`}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded transition-all ${
              isRoleVisible(role)
                ? "bg-white/10 text-white border border-white/20"
                : "bg-transparent text-white/20 border border-white/5 hover:bg-white/5"
            }`}
          >
            {ROLE_ICON[role]}
            <span className="text-[8px] font-mono uppercase tracking-wider">
              {ROLE_LABEL[role]}
            </span>
          </button>
        ))}
      </div>

      <div className="w-[1px] h-8 bg-white/20 mx-2" />

      {/* Layer controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleGrid}
          title="Toggle Grid Overlay"
          className={`p-2 rounded transition-all hover:bg-white/5 ${
            showGrid ? "text-white bg-white/10" : "text-white/20"
          }`}
        >
          <Grid3X3 className="w-4 h-4" />
        </button>
        <button
          onClick={toggleRelays}
          title="Toggle Relay Paths"
          className={`p-2 rounded transition-all hover:bg-white/5 ${
            showRelays ? "text-white bg-white/10" : "text-white/20"
          }`}
        >
          <Route className="w-4 h-4" />
        </button>
        <button
          onClick={toggle2DGridMap}
          title="Toggle 2D Coverage Map"
          className={`p-2 rounded transition-all hover:bg-white/5 ${
            show2DGridMap ? "text-cyan-400 bg-cyan-400/10" : "text-white/20"
          }`}
        >
          <Activity className="w-4 h-4" />
        </button>
        <button
          onClick={toggleZKMLVerification}
          title="Toggle ZKML Verification"
          className={`p-2 rounded transition-all hover:bg-white/5 ${
            showZKMLVerification ? "text-purple-400 bg-purple-400/10" : "text-white/20"
          }`}
        >
          <FileCheck className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
