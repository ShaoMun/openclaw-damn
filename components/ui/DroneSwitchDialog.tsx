'use client';

import { useStore } from '@/lib/store';
import { X, ArrowRightLeft, MessageSquare, Battery, MapPin } from 'lucide-react';
import { useEffect } from 'react';

interface DroneSwitchDialogProps {
  currentDroneId: string;
  newDroneId: string;
}

function getBatteryColor(battery: number): string {
  if (battery > 60) return '#22c55e';
  if (battery > 30) return '#eab308';
  return '#ef4444';
}

export function DroneSwitchDialog({ currentDroneId, newDroneId }: DroneSwitchDialogProps) {
  const drones = useStore((s) => s.drones);
  const selectDrone = useStore((s) => s.selectDrone);
  const setSecondDrone = useStore((s) => s.setSecondDrone);
  const toggleMessagePassingMode = useStore((s) => s.toggleMessagePassingMode);
  const setSwitchDialogDroneId = useStore((s) => s.setSwitchDialogDroneId);

  const currentDrone = drones.find((d) => d.id === currentDroneId);
  const newDrone = drones.find((d) => d.id === newDroneId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSwitchDialogDroneId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSwitchDialogDroneId]);

  if (!currentDrone || !newDrone) return null;

  const handleSwitch = () => {
    selectDrone(newDroneId);
    setSwitchDialogDroneId(null);
  };

  const handleMessagePassing = () => {
    setSecondDrone(newDroneId);
    toggleMessagePassingMode();
    setSwitchDialogDroneId(null);
  };

  const handleCancel = () => {
    setSwitchDialogDroneId(null);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 pointer-events-auto"
        onClick={handleCancel}
      />

      {/* Dialog */}
      <div className="relative w-[380px] pointer-events-auto bg-black/90 backdrop-blur-xl border border-white/20 rounded-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white/5 border-b border-white/10">
          <span className="text-sm font-mono text-white font-bold tracking-wide">
            SELECT ACTION
          </span>
          <button
            onClick={handleCancel}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>

        {/* Drone Comparison */}
        <div className="flex items-center justify-center gap-4 px-6 py-5">
          {/* Current Drone */}
          <div className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-lg border border-white/10">
            <div className={`w-3 h-3 rounded-full ${currentDrone.status === 'online' ? 'bg-green-500' : currentDrone.status === 'syncing' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm font-mono text-white font-bold">{currentDrone.id}</span>
            <div className="flex items-center gap-1.5">
              <Battery className="w-3 h-3" style={{ color: getBatteryColor(currentDrone.battery) }} />
              <span className="text-[10px] font-mono" style={{ color: getBatteryColor(currentDrone.battery) }}>
                {currentDrone.battery.toFixed(0)}%
              </span>
            </div>
            <span className="text-[8px] font-mono text-white/40 uppercase">{currentDrone.role}</span>
          </div>

          {/* Arrow */}
          <div className="flex flex-col items-center gap-1">
            <ArrowRightLeft className="w-5 h-5 text-white/30" />
            <span className="text-[8px] font-mono text-white/20">VS</span>
          </div>

          {/* New Drone */}
          <div className="flex flex-col items-center gap-2 p-4 bg-white/5 rounded-lg border border-white/10">
            <div className={`w-3 h-3 rounded-full ${newDrone.status === 'online' ? 'bg-green-500' : newDrone.status === 'syncing' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm font-mono text-white font-bold">{newDrone.id}</span>
            <div className="flex items-center gap-1.5">
              <Battery className="w-3 h-3" style={{ color: getBatteryColor(newDrone.battery) }} />
              <span className="text-[10px] font-mono" style={{ color: getBatteryColor(newDrone.battery) }}>
                {newDrone.battery.toFixed(0)}%
              </span>
            </div>
            <span className="text-[8px] font-mono text-white/40 uppercase">{newDrone.role}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-5 pb-5 space-y-3">
          <button
            onClick={handleSwitch}
            className="w-full flex items-center gap-3 px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg transition-all group"
          >
            <ArrowRightLeft className="w-4 h-4 text-blue-400" />
            <div className="flex flex-col items-start">
              <span className="text-xs font-mono text-blue-400 font-bold">SWITCH FOCUS</span>
              <span className="text-[9px] font-mono text-blue-400/60">
                View {newDrone.id} reasoning
              </span>
            </div>
          </button>

          <button
            onClick={handleMessagePassing}
            className="w-full flex items-center gap-3 px-4 py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 rounded-lg transition-all group"
          >
            <MessageSquare className="w-4 h-4 text-purple-400" />
            <div className="flex flex-col items-start">
              <span className="text-xs font-mono text-purple-400 font-bold">MESSAGE PASSING</span>
              <span className="text-[9px] font-mono text-purple-400/60">
                See communication between {currentDrone.id} ↔ {newDrone.id}
              </span>
            </div>
          </button>

          <button
            onClick={handleCancel}
            className="w-full px-4 py-2 text-[10px] font-mono text-white/30 hover:text-white/60 uppercase tracking-wider transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
