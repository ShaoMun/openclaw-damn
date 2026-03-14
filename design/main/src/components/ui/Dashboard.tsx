import { BottomPanel } from './BottomPanel';

export function Dashboard() {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">
      {/* Screen Vignette */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.9)]" />

      {/* Top Section */}
      <div className="flex justify-between items-start w-full relative z-10">
        <div className="text-white font-mono text-xs tracking-[0.3em] opacity-50">
          SECTOR 7G // SCANNING...
        </div>
      </div>

      {/* Bottom Section */}
      <div className="w-full relative z-10">
        <BottomPanel />
      </div>
    </div>
  );
}
