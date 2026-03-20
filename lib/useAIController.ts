'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useStore, selectDrones, selectSOS, selectGrid } from './store';
import { streamAIReasoning, parseToolCalls } from './gemini-service';
import { executeToolCall } from './mcp-tools';
import { generateZKMLProof } from './zkml-utils';

// ─── Configuration ────────────────────────────────────────────────────────────

const AI_TICK_INTERVAL = 15000; // 15 seconds between AI cycles
const MIN_CHUNK_SIZE = 5; // Minimum characters to add as reasoning

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAIController() {
  const aiEnabled = useStore((s) => s.aiEnabled);
  const aiStatus = useStore((s) => s.aiStatus);
  const drones = useStore(selectDrones);
  const sosSignals = useStore(selectSOS);
  const gridCells = useStore(selectGrid);

  const addReasoning = useStore((s) => s.addReasoning);
  const setAIStatus = useStore((s) => s.setAIStatus);
  const pushEvent = useStore((s) => s.pushEvent);
  const addZKMLProof = useStore((s) => s.addZKMLProof);

  // Refs to prevent stale closures
  const isRunning = useRef(false);
  const abortController = useRef<AbortController | null>(null);
  const accumulatedText = useRef("");

  // ─── Run AI Cycle ────────────────────────────────────────────────────────────

  const runAICycle = useCallback(async () => {
    if (!isRunning.current) return;

    setAIStatus("thinking");
    accumulatedText.current = "";

    try {
      // Get fresh state at the start of each cycle
      const store = useStore.getState();
      const currentState = {
        drones: store.drones,
        sosSignals: store.sosSignals,
        gridCells: store.gridCells,
      };

      // Create abort controller for this cycle
      abortController.current = new AbortController();

      let fullResponse = "";
      let lastYieldedLength = 0;

      // Stream AI reasoning
      for await (const chunk of streamAIReasoning(currentState)) {
        // Check if we should stop
        if (!isRunning.current || abortController.current?.signal.aborted) {
          break;
        }

        fullResponse += chunk;
      }

      // Add complete reasoning as single entry after streaming finishes
      if (fullResponse.trim()) {
        addReasoning(fullResponse, "thought");

        // Generate ZKML proof for this reasoning
        try {
          const proof = await generateZKMLProof(fullResponse);
          addZKMLProof(proof);
        } catch (error) {
          console.error("Failed to generate ZKML proof:", error);
        }
      }

      // Parse and execute tool calls
      if (isRunning.current && fullResponse) {
        const toolCalls = parseToolCalls(fullResponse);

        if (toolCalls.length > 0) {
          setAIStatus("acting");
          addReasoning(
            `Executing ${toolCalls.length} tool call(s)...`,
            "action"
          );

          for (const call of toolCalls) {
            if (!isRunning.current) break;

            const success = await executeToolCall(call.name, call.params);
            if (!success) {
              addReasoning(`Failed to execute: ${call.name}`, "observation");
            }

            // Small delay between tool executions
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      }

      // Log completion
      if (isRunning.current) {
        pushEvent("AI Commander completed analysis cycle", "status");
        setAIStatus("idle");
      }
    } catch (error) {
      console.error("AI Controller error:", error);

      if (isRunning.current) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        addReasoning(`Error: ${errorMessage}`, "observation");
        setAIStatus("error");

        // Reset to idle after error
        setTimeout(() => {
          if (isRunning.current) {
            setAIStatus("idle");
          }
        }, 3000);
      }
    }
  }, [addReasoning, setAIStatus, pushEvent]);

  // ─── Effect: Start/Stop AI Loop ──────────────────────────────────────────────

  useEffect(() => {
    if (aiEnabled) {
      isRunning.current = true;

      // Run first cycle immediately
      addReasoning("AI Commander activated. Initializing swarm analysis...", "action");
      pushEvent("AI Commander engaged", "status");

      // Small delay before first cycle
      const initialTimeout = setTimeout(() => {
        runAICycle();
      }, 1000);

      // Set up interval for subsequent cycles
      const interval = setInterval(() => {
        if (isRunning.current && useStore.getState().aiStatus === "idle") {
          runAICycle();
        }
      }, AI_TICK_INTERVAL);

      return () => {
        clearTimeout(initialTimeout);
        clearInterval(interval);
        isRunning.current = false;
        abortController.current?.abort();
      };
    } else {
      // AI disabled - stop everything
      isRunning.current = false;
      abortController.current?.abort();
      setAIStatus("idle");
      addReasoning("AI Commander disengaged.", "action");
      pushEvent("AI Commander disengaged", "status");
    }
  }, [aiEnabled, runAICycle, addReasoning, setAIStatus, pushEvent]);

  // ─── Return ──────────────────────────────────────────────────────────────────

  return {
    isEnabled: aiEnabled,
    status: aiStatus,
    isRunning: isRunning.current,
  };
}
