'use client';

import { useStore, selectLog, type LogEntry, type EventType } from '@/lib/store';
import { AlertTriangle, Radio, Wifi, Package, Info } from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<EventType, { icon: React.ReactNode; color: string }> = {
  sos:      { icon: <AlertTriangle className="w-3 h-3" />, color: '#ffffff' },
  relay:    { icon: <Radio className="w-3 h-3" />,         color: '#ffffff' },
  coverage: { icon: <Wifi className="w-3 h-3" />,          color: '#ffffff' },
  supply:   { icon: <Package className="w-3 h-3" />,       color: '#ffffff' },
  status:   { icon: <Info className="w-3 h-3" />,          color: '#ffffff' },
};

// ─── Time formatter ──────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

// ─── Single log row ──────────────────────────────────────────────────────────

function LogRow({ entry }: { entry: LogEntry }) {
  const config = TYPE_CONFIG[entry.type];

  return (
    <div className="flex items-start gap-2.5 px-3 py-1.5 border-b border-white/[0.02] last:border-0 hover:bg-white/[0.02] transition-colors">
      <div className="mt-0.5 shrink-0 opacity-80" style={{ color: config.color }}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-mono text-white/70 leading-normal block tracking-tight">
          <span className="opacity-30 uppercase mr-1.5">[{entry.type}]</span>
          {entry.message}
        </span>
      </div>
      <span className="text-[8px] font-mono text-white/10 shrink-0 mt-0.5 font-bold uppercase">{timeAgo(entry.timestamp)}</span>
    </div>
  );
}

// ─── Event log ───────────────────────────────────────────────────────────────

export function EventLog() {
  const log = useStore(selectLog);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Scrollable entries */}
      <div className="overflow-y-auto flex-1 scrollbar-thin">
        {log.map((entry) => (
          <LogRow key={entry.id} entry={entry} />
        ))}
        {log.length === 0 && (
          <div className="px-3 py-10 text-[10px] font-mono text-white/10 text-center uppercase tracking-widest">
            Log Stream Empty
          </div>
        )}
      </div>
    </div>
  );
}
