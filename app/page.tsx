"use client";

import { useEffect } from "react";
import { Scene } from "@/components/3d/Scene";
import { Dashboard } from "@/components/ui/Dashboard";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";
import { useStore } from "@/lib/store";
import { createMockData } from "@/lib/mockData";
import { useSimulation } from "@/lib/useSimulation";
import { useAIController } from "@/lib/useAIController";
import { useRealDroneData, fetchInitialMCPData } from "@/lib/useRealDroneData";

export default function Home() {
  const hydrate = useStore((s) => s.hydrate);
  const mcpConnected = useStore((s) => s.mcpConnected);

  // Connect to real MCP drone swarm backend
  const { isConnected } = useRealDroneData();

  // Start the simulation loop (only if MCP not connected)
  useSimulation(!isConnected);

  // Start the AI controller
  useAIController();

  useEffect(() => {
    async function initialize() {
      if (isConnected) {
        // Fetch real data from MCP backend
        try {
          const realData = await fetchInitialMCPData();
          hydrate(realData);
        } catch (error) {
          console.error('Failed to fetch MCP data, falling back to mock:', error);
          hydrate(createMockData());
        }
      } else {
        // Use mock data
        hydrate(createMockData());
      }
    }

    initialize();
  }, [isConnected, hydrate]);

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

      {/* Connection Status Indicator */}
      <ConnectionStatus />

      <Scene />
      <Dashboard />
    </div>
  );
}
