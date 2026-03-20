"use client";

import { useStore } from "@/lib/store";
import { MissionPhase } from "@/lib/store";
import {
  Target,
  CheckCircle2,
  Circle,
  Trophy,
  Zap,
  Clock,
  Flag,
  AlertTriangle,
} from "lucide-react";

const PHASE_ICONS: Record<MissionPhase, React.ReactNode> = {
  briefing: <AlertTriangle className="w-4 h-4" />,
  deployment: <Zap className="w-4 h-4" />,
  search: <Target className="w-4 h-4" />,
  rescue: <Clock className="w-4 h-4" />,
  complete: <Trophy className="w-4 h-4" />,
  failed: <AlertTriangle className="w-4 h-4" />,
};

const PHASE_COLORS: Record<MissionPhase, string> = {
  briefing: "text-yellow-400",
  deployment: "text-blue-400",
  search: "text-cyan-400",
  rescue: "text-orange-400",
  complete: "text-green-400",
  failed: "text-red-400",
};

export function StoryMissionPanel() {
  const activeStoryMission = useStore((s) => s.activeStoryMission);
  const showStoryPanel = useStore((s) => s.showStoryPanel);
  const toggleStoryPanel = useStore((s) => s.toggleStoryPanel);

  if (!showStoryPanel || !activeStoryMission) return null;

  const { narrative, phase, milestones, startTime } = activeStoryMission;

  const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
  const mins = Math.floor(elapsedTime / 60);
  const secs = elapsedTime % 60;

  const phases: MissionPhase[] = ["briefing", "deployment", "search", "rescue", "complete"];
  const currentPhaseIndex = phases.indexOf(phase);

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[500px] bg-black/40 backdrop-blur-md border border-white/20 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 px-4 py-2 border-b border-white/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-sm font-medium text-white">Mission Story</span>
          <div className={`px-1.5 py-0.5 bg-white/10 border border-white/20 rounded text-[9px] font-mono ${PHASE_COLORS[phase]}`}>
            {phase.toUpperCase()}
          </div>
        </div>
        <button
          onClick={toggleStoryPanel}
          className="text-white/60 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Phase Title & Description */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2 mb-2">
          {PHASE_ICONS[phase]}
          <span className={`text-sm font-bold ${PHASE_COLORS[phase]}`}>
            {narrative.title}
          </span>
        </div>
        <p className="text-[10px] text-white/70 leading-relaxed">
          {narrative.description}
        </p>
      </div>

      {/* Phase Timeline */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-mono text-white/40 uppercase">
            Mission Progress
          </span>
          <span className="text-[10px] font-mono text-white/60">
            {mins}m {secs}s
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              phase === 'complete'
                ? 'bg-gradient-to-r from-green-400 to-green-500'
                : phase === 'failed'
                ? 'bg-gradient-to-r from-red-400 to-red-500'
                : 'bg-gradient-to-r from-blue-400 to-purple-500'
            }`}
            style={{ width: `${narrative.progress}%` }}
          />
        </div>

        {/* Phase Indicators */}
        <div className="flex items-center justify-between">
          {phases.map((p, i) => {
            const isCompleted = i < currentPhaseIndex;
            const isCurrent = i === currentPhaseIndex;
            const isPending = i > currentPhaseIndex;

            return (
              <div
                key={p}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                    isCompleted
                      ? "bg-green-500/20 border-green-500 text-green-400"
                      : isCurrent
                      ? "bg-blue-500/20 border-blue-500 text-blue-400 animate-pulse"
                      : "bg-white/5 border-white/10 text-white/20"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : isCurrent ? (
                    <Circle className="w-3 h-3 fill-current" />
                  ) : (
                    <Circle className="w-3 h-3" />
                  )}
                </div>
                <span
                  className={`text-[8px] font-mono uppercase ${
                    isCurrent
                      ? "text-white"
                      : isCompleted
                      ? "text-white/40"
                      : "text-white/20"
                  }`}
                >
                  {p.slice(0, 4)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Objectives */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="text-[9px] font-mono text-white/40 uppercase mb-2">
          Objectives
        </div>
        <div className="space-y-1.5">
          {narrative.objectives.map((objective, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-[10px] text-white/70"
            >
              <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
              <span>{objective}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Milestones */}
      <div className="px-4 py-3">
        <div className="text-[9px] font-mono text-white/40 uppercase mb-2">
          Milestones
        </div>
        <div className="grid grid-cols-5 gap-2">
          {milestones.map((milestone) => (
            <div
              key={milestone.id}
              className={`p-2 rounded border text-center transition-all ${
                milestone.achieved
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-white/5 border-white/10"
              }`}
            >
              <div
                className={`text-[8px] font-mono uppercase ${
                  milestone.achieved ? "text-green-400" : "text-white/30"
                }`}
              >
                {milestone.name}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      {phase === 'complete' && (
        <div className="px-4 py-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-t border-green-500/20">
          <div className="flex items-center gap-2 text-green-400">
            <Trophy className="w-4 h-4" />
            <span className="text-[10px] font-mono font-bold uppercase">
              Mission Accomplished
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
