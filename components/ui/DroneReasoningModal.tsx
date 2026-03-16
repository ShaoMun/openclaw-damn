'use client';

import { useEffect, useRef } from 'react';
import { useStore, type DroneReasoningEntry, type Drone } from '@/lib/store';
import { Brain, Zap, Eye, X, Battery, MapPin, Radio, Wifi, Package, Search, BatteryCharging } from 'lucide-react';

const ROLE_ICONS: Record<string, React.ReactNode> = {
  relay: <Radio className="w-3 h-3" />,
  wifi: <Wifi className="w-3 h-3" />,
  supply: <Package className="w-3 h-3" />,
  scout: <Search className="w-3 h-3" />,
  charger: <BatteryCharging className="w-3 h-3" />,
};

const TYPE_CONFIG = {
  thought: {
    icon: Brain,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    prefix: '',
  },
  action: {
    icon: Zap,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    prefix: '→ ',
  },
  observation: {
    icon: Eye,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    prefix: '👁 ',
  },
};

function getBatteryColor(battery: number): string {
  if (battery > 60) return '#22c55e';
  if (battery > 30) return '#eab308';
  return '#ef4444';
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

interface ReasoningEntryItemProps {
  entry: DroneReasoningEntry;
}

function ReasoningEntryItem({ entry }: ReasoningEntryItemProps) {
  const typeConfig = TYPE_CONFIG[entry.type];
  const TypeIcon = typeConfig.icon;

  return (
    <div className="flex gap-2 group hover:bg-white/[0.02] rounded px-2 py-1.5 -mx-2 transition-colors">
      <div className={`mt-0.5 ${typeConfig.bgColor} rounded p-1`}>
        <TypeIcon className={`w-3 h-3 ${typeConfig.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-mono text-white/80 leading-relaxed break-words whitespace-pre-wrap">
          {typeConfig.prefix}{entry.text}
        </p>
      </div>
      <span className="text-[8px] font-mono text-white/20 shrink-0">
        {formatTime(entry.timestamp)}
      </span>
    </div>
  );
}

interface DroneReasoningModalProps {
  droneId: string;
}

export function DroneReasoningModal({ droneId }: DroneReasoningModalProps) {
  const selectDrone = useStore((s) => s.selectDrone);
  const perDroneReasoning = useStore((s) => s.perDroneReasoning);
  const drones = useStore((s) => s.drones);
  const activeMission = useStore((s) => s.activeMission);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const drone = drones.find((d) => d.id === droneId);
  const reasoning = perDroneReasoning[droneId] || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [reasoning.length]);

  if (!drone) return null;

  const batteryColor = getBatteryColor(drone.battery);

  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {/* No backdrop - let clicks pass through */}

      {/* Modal - positioned at bottom left */}
      <div className="absolute bottom-6 left-6 w-[380px] max-h-[400px] flex flex-col pointer-events-auto bg-black/80 backdrop-blur-xl border border-white/20 rounded-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${drone.status === 'online' ? 'bg-green-500' : drone.status === 'syncing' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm font-mono text-white font-bold tracking-wide">
              {drone.id}
            </span>
            <div className="flex items-center gap-1 px-2 py-0.5 bg-white/5 rounded text-white/60">
              {ROLE_ICONS[drone.role]}
              <span className="text-[9px] font-mono uppercase">{drone.role}</span>
            </div>
          </div>
          <button
            onClick={() => selectDrone(null)}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-6 px-4 py-2 bg-white/[0.02] border-b border-white/5">
          <div className="flex items-center gap-2">
            <Battery className="w-3.5 h-3.5" style={{ color: batteryColor }} />
            <span className="text-[10px] font-mono" style={{ color: batteryColor }}>
              {drone.battery.toFixed(0)}%
            </span>
            <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${drone.battery}%`, backgroundColor: batteryColor }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-white/40">
            <MapPin className="w-3.5 h-3.5" />
            <span className="text-[9px] font-mono">
              ({drone.position[0].toFixed(0)}, {drone.position[2].toFixed(0)})
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-white/30">
            <span className="text-[8px] font-mono uppercase">{drone.status}</span>
          </div>
        </div>

        {/* Active Mission (if any) */}
        {activeMission && (
          <div className="px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20">
            <div className="flex items-center gap-2">
              <Zap className="w-3 h-3 text-yellow-400" />
              <span className="text-[9px] font-mono text-yellow-400 font-bold">
                {activeMission.name}
              </span>
            </div>
            <div className="flex gap-1 mt-1.5">
              {activeMission.tasks.map((task, i) => (
                <div
                  key={task.id}
                  className={`flex-1 h-1 rounded-full ${
                    task.status === 'completed'
                      ? 'bg-yellow-400'
                      : task.status === 'in_progress'
                        ? 'bg-yellow-400/50 animate-pulse'
                        : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Reasoning Stream */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
          {reasoning.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/20 py-8">
              <Brain className="w-10 h-10 mb-3 opacity-30" />
              <span className="text-[10px] font-mono uppercase tracking-wider">
                Initializing...
              </span>
              <span className="text-[8px] font-mono text-white/10 mt-1">
                Reasoning stream will appear here
              </span>
            </div>
          ) : (
            <div className="space-y-0.5">
              {reasoning.map((entry) => (
                <ReasoningEntryItem key={entry.id} entry={entry} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] border-t border-white/5">
          <span className="text-[8px] font-mono text-white/20">
            {reasoning.length} reasoning entries
          </span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/5 border border-blue-500/10 rounded-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[7px] font-mono text-blue-400/70">LIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
