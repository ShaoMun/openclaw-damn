'use client';

import { useStore, selectDrones, type Drone, type DroneRole } from '@/lib/store';
import { Radio, Wifi, Package, Activity } from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLE_ICON: Record<DroneRole, React.ReactNode> = {
  relay:  <Radio className="w-3 h-3" />,
  wifi:   <Wifi className="w-3 h-3" />,
  supply: <Package className="w-3 h-3" />,
};

const ROLE_COLOR: Record<DroneRole, string> = {
  relay:  '#ffffff',
  wifi:   '#ffffff',
  supply: '#ffffff',
};

const STATUS_DOT: Record<string, string> = {
  online:  'bg-white',
  offline: 'bg-white/10',
  syncing: 'bg-white/40 animate-pulse',
};

function BatteryBar({ level }: { level: number }) {
  const color = level > 60 ? '#22c55e' : level > 30 ? '#eab308' : '#ef4444';
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <div className="flex-1 h-0.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${level}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[7px] font-mono opacity-40 w-5 text-right font-bold">{level}%</span>
    </div>
  );
}

function DroneRow({ drone, isSelected, onSelect }: { drone: Drone; isSelected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex flex-col gap-1 px-3 py-2.5 rounded-sm transition-all border ${
        isSelected
          ? 'bg-white/10 border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]'
          : 'border-transparent hover:bg-white/[0.04] hover:border-white/5'
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
            <span className="text-[10px] font-mono text-white/80 font-bold tracking-tight">{drone.id}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono text-white/30 uppercase">{drone.status}</span>
              <span className={`w-1 h-1 rounded-full ${STATUS_DOT[drone.status]}`} />
            </div>
          </div>
          <BatteryBar level={drone.battery} />
        </div>
      </div>
    </button>
  );
}

export function RightPanel() {
  const drones = useStore(selectDrones);
  const selectedId = useStore((s) => s.selectedDroneId);
  const selectDrone = useStore((s) => s.selectDrone);

  if (drones.length === 0) return null;

  return (
    <div className="w-60 h-full flex flex-col pointer-events-auto bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-sm">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex flex-col">
          <span className="text-[10px] font-mono text-white/80 font-bold uppercase tracking-[0.2em]">Fleet Monitor</span>
          <span className="text-[8px] font-mono text-white/30 uppercase tracking-[0.1em]">Active Units: {drones.length}</span>
        </div>
        <Activity className="w-3.5 h-3.5 text-white/20" />
      </div>
      
      <div className="flex-1 flex flex-col gap-1 overflow-y-auto scrollbar-thin pr-1">
        {drones.map((drone) => (
          <DroneRow
            key={drone.id}
            drone={drone}
            isSelected={selectedId === drone.id}
            onSelect={() => selectDrone(selectedId === drone.id ? null : drone.id)}
          />
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-white/5 flex flex-col gap-2.5">

        <div className="text-[8px] font-mono text-white/20 uppercase tracking-[0.2em] italic">
          Pulse transmission: encrypted
        </div>
      </div>
    </div>
  );
}
