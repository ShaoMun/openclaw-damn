"use client";

import { useStore } from "@/lib/store";
import { DronePersonality } from "@/lib/store";
import { Activity, Zap, Target, Search, TrendingUp } from "lucide-react";

const PERSONALITY_COLORS: Record<DronePersonality, string> = {
  aggressive: "bg-red-500/20 text-red-400 border-red-500/30",
  cautious: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  balanced: "bg-green-500/20 text-green-400 border-green-500/30",
  efficiency: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

export function LocalAIStats({ droneId }: { droneId: string }) {
  const drone = useStore((s) => s.drones.find((d) => d.id === droneId));
  const localAIReasoning = useStore((s) => s.localAIReasoning[droneId] || []);
  const toggleDroneLocalAI = useStore((s) => s.toggleDroneLocalAI);

  if (!drone?.localAI) return null;

  const { localAI } = drone;
  const recentReasoning = localAIReasoning.slice(0, 5);

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono text-white/60 uppercase tracking-wider">
            Local AI
          </span>
        </div>
        <button
          onClick={() => toggleDroneLocalAI(droneId)}
          className={`text-[10px] font-mono px-2 py-1 rounded border transition-all ${
            localAI.enabled
              ? "bg-green-500/20 text-green-400 border-green-500/30"
              : "bg-red-500/20 text-red-400 border-red-500/30"
          }`}
        >
          {localAI.enabled ? "ENABLED" : "DISABLED"}
        </button>
      </div>

      {localAI.enabled && (
        <>
          {/* Personality Badge */}
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-white/40 uppercase">
                Personality
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border ${PERSONALITY_COLORS[localAI.personality]}`}
              >
                {localAI.personality.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {/* People Found Per Minute */}
            <div className="bg-white/5 rounded px-2 py-2">
              <div className="flex items-center gap-1 mb-1">
                <Target className="w-3 h-3 text-green-400" />
                <span className="text-[9px] font-mono text-white/40 uppercase">
                  People/Min
                </span>
              </div>
              <div className="text-sm font-bold text-white tabular-nums">
                {localAI.stats.peopleFoundPerMinute.toFixed(2)}
              </div>
            </div>

            {/* Efficiency */}
            <div className="bg-white/5 rounded px-2 py-2">
              <div className="flex items-center gap-1 mb-1">
                <Zap className="w-3 h-3 text-yellow-400" />
                <span className="text-[9px] font-mono text-white/40 uppercase">
                  Efficiency
                </span>
              </div>
              <div className="text-sm font-bold text-white tabular-nums">
                {localAI.stats.efficiency.toFixed(0)}%
              </div>
            </div>

            {/* Scans Completed */}
            <div className="bg-white/5 rounded px-2 py-2">
              <div className="flex items-center gap-1 mb-1">
                <Search className="w-3 h-3 text-blue-400" />
                <span className="text-[9px] font-mono text-white/40 uppercase">
                  Scans
                </span>
              </div>
              <div className="text-sm font-bold text-white tabular-nums">
                {localAI.stats.scansCompleted}
              </div>
            </div>

            {/* Distance Traveled */}
            <div className="bg-white/5 rounded px-2 py-2">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="w-3 h-3 text-purple-400" />
                <span className="text-[9px] font-mono text-white/40 uppercase">
                  Distance
                </span>
              </div>
              <div className="text-sm font-bold text-white tabular-nums">
                {localAI.stats.distanceTraveled.toFixed(0)}m
              </div>
            </div>
          </div>

          {/* Current Goal */}
          <div className="mb-3 p-2 bg-white/5 rounded">
            <div className="text-[9px] font-mono text-white/40 uppercase mb-1">
              Current Goal
            </div>
            <div className="text-xs text-white/80 truncate">
              {localAI.currentGoal}
            </div>
          </div>

          {/* Recent Reasoning */}
          {recentReasoning.length > 0 && (
            <div>
              <div className="text-[9px] font-mono text-white/40 uppercase mb-2">
                Recent Activity
              </div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {recentReasoning.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-2 bg-white/5 rounded border border-white/5"
                  >
                    <div className="text-[10px] text-white/60 truncate mb-1">
                      {entry.thought}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-[9px] text-cyan-400/80 truncate flex-1 mr-2">
                        {entry.action}
                      </div>
                      <div
                        className={`text-[8px] font-mono px-1 py-0.5 rounded ${
                          entry.outcome === "success"
                            ? "bg-green-500/20 text-green-400"
                            : entry.outcome === "partial"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {entry.outcome.toUpperCase()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
