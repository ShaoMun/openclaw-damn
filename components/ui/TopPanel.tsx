'use client';

import { useStore, selectDrones, selectSOS, selectGrid } from '@/lib/store';
import { Shield, Route, Grid3X3, Activity } from 'lucide-react';

export function TopPanel() {
  const drones = useStore(selectDrones);
  const sos = useStore(selectSOS);
  const grid = useStore(selectGrid);

  const showRelays = useStore((s) => s.showRelayPaths);
  const showGrid = useStore((s) => s.showGridOverlay);
  const toggleRelays = useStore((s) => s.toggleRelayPaths);
  const toggleGrid = useStore((s) => s.toggleGridOverlay);

  const online = drones.filter((d) => d.status === 'online').length;
  const coverage = grid.length > 0
    ? Math.round((grid.filter((c) => c.state !== 'dead').length / grid.length) * 100)
    : 0;

  return (
    <div className="flex items-center gap-6 pointer-events-auto bg-black/40 backdrop-blur-md border border-white/10 px-6 py-2.5 rounded-sm">
      {/* Mission Stats */}
      <div className="flex items-center gap-6">
        <div className="flex flex-col gap-0.5">
          <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">Drones</span>
          <span className="text-xs font-mono text-white/70 tabular-nums">{online}<span className="opacity-30">/</span>{drones.length}</span>
        </div>
        
        <div className="w-[1px] h-6 bg-white/10" />
        
        <div className="flex flex-col gap-0.5">
          <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">SOS Signals</span>
          <span className="text-xs font-mono text-red-400 tabular-nums animate-pulse">{sos.length}</span>
        </div>

        <div className="w-[1px] h-6 bg-white/10" />

        <div className="flex flex-col gap-0.5">
          <span className="text-[8px] font-mono text-white/30 uppercase tracking-widest">Coverage</span>
          <span className="text-xs font-mono text-green-400 tabular-nums">{coverage}%</span>
        </div>
      </div>

      <div className="w-[1px] h-8 bg-white/20 mx-2" />

      {/* Layer controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleGrid}
          title="Toggle Grid Overlay"
          className={`p-2 rounded transition-all hover:bg-white/5 ${showGrid ? 'text-white bg-white/10' : 'text-white/20'}`}
        >
          <Grid3X3 className="w-4 h-4" />
        </button>
        <button
          onClick={toggleRelays}
          title="Toggle Relay Paths"
          className={`p-2 rounded transition-all hover:bg-white/5 ${showRelays ? 'text-white bg-white/10' : 'text-white/20'}`}
        >
          <Route className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
