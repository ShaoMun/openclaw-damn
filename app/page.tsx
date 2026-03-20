"use client";

import { useEffect } from "react";
import { Scene } from "@/components/3d/Scene";
import { Dashboard } from "@/components/ui/Dashboard";
import { useStore } from "@/lib/store";
import { createMockData } from "@/lib/mockData";
import { useSimulation } from "@/lib/useSimulation";
import { useAIController } from "@/lib/useAIController";
import { useLocalAI } from "@/lib/useLocalAI";

export default function Home() {
  const hydrate = useStore((s) => s.hydrate);

  // Start the simulation loop
  useSimulation();

  // Start the AI controller
  useAIController();

  // Start the Local AI system
  useLocalAI();

  useEffect(() => {
    hydrate(createMockData());
  }, [hydrate]);

  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden font-sans selection:bg-white/30">
      {/* Background Grid Pattern */}
      <div
        className="absolute inset-0 z-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #ffffff 1px, transparent 1px),
            linear-gradient(to bottom, #ffffff 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      <Scene />
      <Dashboard />
    </div>
  );
}
