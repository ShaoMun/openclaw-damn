'use client';

import { BottomPanel } from './BottomPanel';
import { RightPanel } from './RightPanel';
import { TopPanel } from './TopPanel';

export function Dashboard() {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none p-6 overflow-hidden">
      {/* Screen Vignette */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.9)]" />

      {/* Top Banner section */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-20">
        <div className="flex flex-col gap-1">
          <div className="text-white font-mono text-[10px] tracking-[0.4em] opacity-40 uppercase">
            System ID: CLAW-01 // AI STUDIO
          </div>
          <div className="text-white font-mono text-xs tracking-[0.3em] opacity-60">
            SECTOR 7G // SCANNING...
          </div>
        </div>
        <TopPanel />
      </div>

      {/* Right Mission Control panel */}
      <div className="absolute top-24 right-6 bottom-32 z-20">
        <RightPanel />
      </div>

      {/* Bottom HUD section */}
      <div className="absolute bottom-6 left-6 right-6 z-20">
        <BottomPanel />
      </div>
    </div>
  );
}
