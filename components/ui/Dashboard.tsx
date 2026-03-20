"use client";

import { TopPanel } from "./TopPanel";
import { ReasoningPanel } from "./ReasoningPanel";
import { RightPanel } from "./RightPanel";
import { DroneReasoningModal } from "./DroneReasoningModal";
import { DroneSwitchDialog } from "./DroneSwitchDialog";
import { MessagePassingPanel } from "./MessagePassingPanel";
import { GridMap2D } from "./GridMap2D";
import { ZKMLVerificationPanel } from "./ZKMLVerificationPanel";
import { useStore } from "@/lib/store";

export function Dashboard() {
  const selectedDroneId = useStore((s) => s.selectedDroneId);
  const secondSelectedDroneId = useStore((s) => s.secondSelectedDroneId);
  const switchDialogDroneId = useStore((s) => s.switchDialogDroneId);
  const messagePassingMode = useStore((s) => s.messagePassingMode);

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

      {/* Left AI Commander panel */}
      <div className="absolute top-24 left-6 bottom-6 w-72 z-20">
        <ReasoningPanel />
      </div>

      {/* Right Mission Control panel */}
      <div className="absolute top-24 right-6 bottom-6 z-20">
        <RightPanel />
      </div>

      {/* Modal Layer */}
      {selectedDroneId && !messagePassingMode && (
        <DroneReasoningModal droneId={selectedDroneId} />
      )}

      {switchDialogDroneId && selectedDroneId && (
        <DroneSwitchDialog
          currentDroneId={selectedDroneId}
          newDroneId={switchDialogDroneId}
        />
      )}

      {messagePassingMode && secondSelectedDroneId && selectedDroneId && (
        <MessagePassingPanel
          drone1Id={selectedDroneId}
          drone2Id={secondSelectedDroneId}
        />
      )}

      {/* 2D Grid Map Overlay */}
      <GridMap2D />

      {/* ZKML Verification Panel */}
      <ZKMLVerificationPanel />
    </div>
  );
}
