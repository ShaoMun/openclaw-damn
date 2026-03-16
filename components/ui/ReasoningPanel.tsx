'use client';

import { useStore } from '@/lib/store';
import { Brain, Zap, Eye, AlertCircle, Play, Square, Trash2 } from 'lucide-react';

// ─── Status Configuration ─────────────────────────────────────────────────────

const STATUS_CONFIG = {
  idle: {
    icon: Brain,
    color: 'text-white/40',
    bgColor: 'bg-white/5',
    borderColor: 'border-white/10',
    label: 'Standby',
    description: 'Waiting for next analysis cycle...'
  },
  thinking: {
    icon: Eye,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    label: 'Analyzing',
    description: 'Processing swarm data...'
  },
  acting: {
    icon: Zap,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    label: 'Executing',
    description: 'Running tool commands...'
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    label: 'Error',
    description: 'Connection issue detected'
  },
};

const TYPE_CONFIG = {
  thought: {
    icon: Brain,
    color: 'text-blue-400/70',
    prefix: ''
  },
  action: {
    icon: Zap,
    color: 'text-yellow-400/70',
    prefix: '⚡ '
  },
  observation: {
    icon: Eye,
    color: 'text-green-400/70',
    prefix: '👁 '
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ReasoningPanel() {
  const aiEnabled = useStore((s) => s.aiEnabled);
  const aiStatus = useStore((s) => s.aiStatus);
  const reasoningLog = useStore((s) => s.reasoningLog);
  const toggleAI = useStore((s) => s.toggleAI);
  const clearReasoning = useStore((s) => s.clearReasoning);

  const statusConfig = STATUS_CONFIG[aiStatus];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="h-full flex flex-col pointer-events-auto bg-black/40 backdrop-blur-md border border-white/10 rounded-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Brain className={`w-3.5 h-3.5 ${aiEnabled ? 'text-green-400' : 'text-white/40'}`} />
          <span className="text-[10px] font-mono text-white/50 uppercase tracking-[0.2em] font-bold">
            AI Commander
          </span>
          {aiEnabled && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/10 border border-green-500/20 rounded-sm">
              <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[7px] font-mono text-green-400 uppercase">Active</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearReasoning}
            className="p-1.5 rounded transition-all text-white/20 hover:text-white/40 hover:bg-white/5"
            title="Clear log"
          >
            <Trash2 className="w-3 h-3" />
          </button>
          <button
            onClick={toggleAI}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all ${
              aiEnabled
                ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
            }`}
            title={aiEnabled ? 'Stop AI' : 'Start AI'}
          >
            {aiEnabled ? (
              <>
                <Square className="w-3 h-3" />
                <span className="text-[8px] font-mono uppercase">Stop</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                <span className="text-[8px] font-mono uppercase">Start</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Bar */}
      {aiEnabled && (
        <div className={`flex items-center gap-2 px-4 py-2 ${statusConfig.bgColor} border-b ${statusConfig.borderColor}`}>
          <StatusIcon className={`w-3.5 h-3.5 ${statusConfig.color} ${aiStatus === 'thinking' || aiStatus === 'acting' ? 'animate-pulse' : ''}`} />
          <div className="flex flex-col">
            <span className={`text-[9px] font-mono ${statusConfig.color} font-bold uppercase tracking-wider`}>
              {statusConfig.label}
            </span>
            <span className="text-[7px] font-mono text-white/30">
              {statusConfig.description}
            </span>
          </div>
          {(aiStatus === 'thinking' || aiStatus === 'acting') && (
            <div className="ml-auto flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-1 h-3 ${statusConfig.color.replace('text-', 'bg-')} rounded-full animate-pulse`}
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reasoning Log */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {reasoningLog.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/20 px-4">
            <Brain className={`w-10 h-10 mb-3 ${aiEnabled ? 'text-blue-400/30 animate-pulse' : 'opacity-30'}`} />
            <span className="text-[10px] font-mono uppercase tracking-wider text-center">
              {aiEnabled ? 'Initializing AI Commander...' : 'AI Commander Offline'}
            </span>
            <span className="text-[8px] font-mono text-white/10 mt-1 text-center">
              {aiEnabled
                ? 'Streaming analysis will appear here'
                : 'Click Start to enable AI control'
              }
            </span>
          </div>
        ) : (
          <div className="p-3 space-y-1.5">
            {reasoningLog.map((entry) => {
              const typeConfig = TYPE_CONFIG[entry.type];
              const TypeIcon = typeConfig.icon;

              return (
                <div
                  key={entry.id}
                  className="flex gap-2 group hover:bg-white/[0.02] rounded px-1 py-0.5 -mx-1 transition-colors"
                >
                  <TypeIcon className={`w-3 h-3 mt-0.5 shrink-0 ${typeConfig.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-mono text-white/70 leading-relaxed break-words whitespace-pre-wrap">
                      {typeConfig.prefix}{entry.text}
                    </p>
                  </div>
                  <span className="text-[6px] font-mono text-white/10 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-white/5 bg-white/[0.01]">
        <div className="flex items-center gap-3">
          <span className="text-[7px] font-mono text-white/20">
            {reasoningLog.length} entries
          </span>
          {aiEnabled && (
            <>
              <span className="w-1 h-1 rounded-full bg-white/10" />
              <span className="text-[7px] font-mono text-white/20">
                Cycle: ~15s
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {aiEnabled && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/5 border border-green-500/10 rounded-sm">
              <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[7px] font-mono text-green-400/70">GEMINI 2.0</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
