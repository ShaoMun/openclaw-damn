'use client';

import { useStore, type DroneMessage } from '@/lib/store';
import { X, Radio, Wifi, Package, Zap, AlertTriangle, FileText, Send, Search, BatteryCharging } from 'lucide-react';
import { useEffect, useRef } from 'react';

const ROLE_ICONS: Record<string, React.ReactNode> = {
  relay: <Radio className="w-3 h-3" />,
  wifi: <Wifi className="w-3 h-3" />,
  supply: <Package className="w-3 h-3" />,
  scout: <Search className="w-3 h-3" />,
  charger: <BatteryCharging className="w-3 h-3" />,
};

const MESSAGE_TYPE_CONFIG = {
  command: {
    icon: Send,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
  },
  status: {
    icon: Zap,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  data: {
    icon: FileText,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
  },
  alert: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
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

interface MessageBubbleProps {
  message: DroneMessage;
  isFromDrone: boolean;
  droneId: string;
}

function MessageBubble({ message, isFromDrone, droneId }: MessageBubbleProps) {
  const typeConfig = MESSAGE_TYPE_CONFIG[message.type];
  const TypeIcon = typeConfig.icon;

  return (
    <div className={`flex ${isFromDrone ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[85%] px-3 py-2 rounded-lg ${typeConfig.bgColor} border ${typeConfig.borderColor}`}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <TypeIcon className={`w-3 h-3 ${typeConfig.color}`} />
          <span className={`text-[8px] font-mono uppercase ${typeConfig.color}`}>
            {message.type}
          </span>
        </div>
        <p className="text-[10px] font-mono text-white/80 leading-relaxed">
          {message.content}
        </p>
        <span className="text-[7px] font-mono text-white/20 mt-1 block">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}

interface DroneHeaderProps {
  droneId: string;
  role: string;
  battery: number;
  status: string;
}

function DroneHeader({ droneId, role, battery, status }: DroneHeaderProps) {
  const batteryColor = getBatteryColor(battery);

  return (
    <div className="flex flex-col items-center gap-1 p-3 bg-white/5 border-b border-white/10">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${status === 'online' ? 'bg-green-500' : status === 'syncing' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
        <span className="text-sm font-mono text-white font-bold">{droneId}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 px-2 py-0.5 bg-white/5 rounded text-white/60">
          {ROLE_ICONS[role]}
          <span className="text-[8px] font-mono uppercase">{role}</span>
        </div>
        <div className="flex items-center gap-1">
          <div 
            className="w-8 h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${battery}%`, backgroundColor: batteryColor }}
            />
          </div>
          <span className="text-[8px] font-mono" style={{ color: batteryColor }}>
            {battery.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}

interface MessagePassingPanelProps {
  drone1Id: string;
  drone2Id: string;
}

export function MessagePassingPanel({ drone1Id, drone2Id }: MessagePassingPanelProps) {
  const drones = useStore((s) => s.drones);
  const droneMessages = useStore((s) => s.droneMessages);
  const selectDrone = useStore((s) => s.selectDrone);
  const setSecondDrone = useStore((s) => s.setSecondDrone);
  const toggleMessagePassingMode = useStore((s) => s.toggleMessagePassingMode);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const drone1 = drones.find((d) => d.id === drone1Id);
  const drone2 = drones.find((d) => d.id === drone2Id);

  const relevantMessages = droneMessages.filter(
    (m) =>
      (m.fromDroneId === drone1Id && m.toDroneId === drone2Id) ||
      (m.fromDroneId === drone2Id && m.toDroneId === drone1Id)
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [relevantMessages.length]);

  const handleClose = () => {
    selectDrone(null);
    setSecondDrone(null);
    toggleMessagePassingMode();
  };

  if (!drone1 || !drone2) return null;

  return (
    <div className="absolute bottom-24 left-6 right-6 z-40 pointer-events-none">
      <div className="flex flex-col h-[320px] pointer-events-auto bg-black/90 backdrop-blur-xl border border-white/20 rounded-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-white font-bold tracking-wide">
              MESSAGE PASSING
            </span>
            <span className="text-[10px] font-mono text-white/40">
              {drone1.id} ↔ {drone2.id}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>

        {/* Drone Headers */}
        <div className="grid grid-cols-2 border-b border-white/10">
          <DroneHeader
            droneId={drone1.id}
            role={drone1.role}
            battery={drone1.battery}
            status={drone1.status}
          />
          <DroneHeader
            droneId={drone2.id}
            role={drone2.role}
            battery={drone2.battery}
            status={drone2.status}
          />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
          {relevantMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/20">
              <Send className="w-8 h-8 mb-2 opacity-30" />
              <span className="text-[10px] font-mono uppercase">
                No messages yet
              </span>
              <span className="text-[8px] font-mono text-white/10 mt-1">
                Communication will appear here
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {relevantMessages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isFromDrone={message.fromDroneId === drone1Id}
                  droneId={drone1Id}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] border-t border-white/5">
          <span className="text-[8px] font-mono text-white/20">
            {relevantMessages.length} messages
          </span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-purple-500/5 border border-purple-500/10 rounded-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-[7px] font-mono text-purple-400/70">LIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
