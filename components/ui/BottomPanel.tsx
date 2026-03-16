"use client";

import { Activity, ShieldAlert, ShieldCheck } from "lucide-react";
import { useStore, selectDrones, selectGrid } from "@/lib/store";

export function BottomPanel() {
  const drones = useStore(selectDrones);
  const grid = useStore(selectGrid);

  const safeZones = grid.filter(
    (c) => c.state === "connected" || c.state === "covered",
  ).length;
  const deadZones = grid.filter((c) => c.state === "dead").length;
  const syncingCount = drones.filter((d) => d.status === "syncing").length;

  return (
    <div className="w-full flex gap-4 pointer-events-auto">
      {/* Left HUD: System Status & Zones */}
      <div className="flex-1 bg-black/40 backdrop-blur-md border border-white/10 p-5 rounded-sm flex justify-between items-center">
        {/* Status indicator */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5 text-[10px] font-mono text-white/40 bg-white/5 border border-white/10 px-4 py-2 rounded-sm w-fit font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span className="uppercase tracking-[0.2em]">
              Swarm Operating
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-white/30 uppercase tracking-[0.1em]">
              Status: <span className="text-white">ACTIVE</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-white/10" />
            <span className="text-[10px] font-mono text-white/30 uppercase tracking-[0.1em]">
              Sync: <span className="text-white/60">{syncingCount} UNITS</span>
            </span>
          </div>
        </div>

        {/* Center Heartbeat */}
        <div className="flex flex-col items-center gap-2">
          <div
            className="flex items-center justify-center w-14 h-14 rounded-full border border-white/10 bg-white/5 transition-colors relative"
          >
            <Activity className="w-6 h-6 text-white/20" />
          </div>
        </div>

        {/* Zone stats */}
        <div className="flex gap-10">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-mono text-white/30 uppercase">
                Secure
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono text-white font-bold leading-none">
                {safeZones}
              </span>
              <span className="text-[9px] font-mono text-white/20 uppercase tracking-widest">
                Zones
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-mono text-white/30 uppercase">
                Isolated
              </span>
              <ShieldAlert className="w-3.5 h-3.5 text-white/20" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold leading-none text-white">
                {deadZones}
              </span>
              <span className="text-[9px] font-mono text-white/20 uppercase tracking-widest">
                Zones
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
