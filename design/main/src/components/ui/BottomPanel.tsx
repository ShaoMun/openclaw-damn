import { Activity, ShieldAlert, ShieldCheck } from 'lucide-react';

export function BottomPanel() {
  return (
    <div className="w-full flex justify-between items-end pb-4 pointer-events-auto border-t border-[#1a1a1a] pt-6">
      {/* Left: Status */}
      <div className="flex flex-col gap-2 w-1/3">
        <div className="flex items-center gap-2 text-[10px] font-mono text-red-500 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-md w-fit">
          <ShieldAlert className="w-3 h-3 animate-pulse" />
          <span className="uppercase tracking-widest">Critical Anomaly Detected</span>
        </div>
        <div className="text-[10px] font-mono text-[#4a4a4a] uppercase tracking-[0.1em] mt-2">
          System Status: Unstable
        </div>
      </div>

      {/* Center: Radar */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center justify-center w-12 h-12 rounded-full border border-red-500/30 bg-red-500/5 relative">
          <Activity className="w-5 h-5 text-red-500 animate-pulse" />
          <div className="absolute inset-0 rounded-full border border-red-500/50 animate-ping opacity-20" />
        </div>
      </div>

      {/* Right: Zones Stats */}
      <div className="flex gap-12 w-1/3 justify-end">
        <div className="flex flex-col gap-2">
          <ShieldCheck className="w-4 h-4 text-white" />
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-mono text-white">3</span>
            <span className="text-[10px] font-mono text-[#4a4a4a]">ZONES</span>
          </div>
          <div className="text-[10px] font-mono text-[#8a8a8a] uppercase tracking-[0.1em]">
            Stable
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <ShieldAlert className="w-4 h-4 text-red-500" />
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-mono text-red-500">1</span>
            <span className="text-[10px] font-mono text-[#4a4a4a]">ZONE</span>
          </div>
          <div className="text-[10px] font-mono text-[#8a8a8a] uppercase tracking-[0.1em]">
            Critical
          </div>
        </div>
      </div>
    </div>
  );
}
