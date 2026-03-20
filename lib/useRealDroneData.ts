/**
 * Real Drone Data Hook
 *
 * Connects to the MCP drone swarm backend and polls for real-time updates.
 * Falls back to mock data if the backend is unavailable.
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { useStore } from './store';
import { useMultiAgentStore } from './multi-agent-store';
import { MCPClient } from './mcp-client';
import {
  mapMCPDroneToFrontend,
  safeMapMCPDrone,
  mapMCPTopologyToConnections,
  mapMCPTopologyToMetrics,
} from './mcp-mappers';

// ─────────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────────

const POLL_INTERVAL = 2000; // 2 seconds
const TOPOLOGY_UPDATE_INTERVAL = 5000; // 5 seconds
const CONNECTION_TIMEOUT = 10000; // 10 seconds before considering offline
const MAX_RETRY_ATTEMPTS = 3;

const DRONE_IDS = ['DRONE-01', 'DRONE-02', 'DRONE-03', 'DRONE-04', 'DRONE-05'];

// ─────────────────────────────────────────────────────────────────────────────────
// Hook Return Type
// ─────────────────────────────────────────────────────────────────────────────────

export interface RealDroneDataState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastUpdate: number | null;
  connectedDrones: string[];
}

// ─────────────────────────────────────────────────────────────────────────────────
// Main Hook
// ─────────────────────────────────────────────────────────────────────────────────

export function useRealDroneData(enabled: boolean = true) {
  const [state, setState] = useState<RealDroneDataState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastUpdate: null,
    connectedDrones: [],
  });

  const updateDrone = useStore((s) => s.updateDrone);
  const hydrate = useStore((s) => s.hydrate);
  const setMCPConnected = useStore((s) => s.setMCPConnected);

  // Multi-agent store updates
  const registerAgentPeer = useMultiAgentStore((s) => s.registerAgentPeer);
  const updateAgentMetrics = useMultiAgentStore((s) => s.updateAgentMetrics);
  const addAgentConnection = useMultiAgentStore((s) => s.addAgentConnection);
  const updateNetworkTopology = useMultiAgentStore((s) => s.updateNetworkTopology);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const topologyIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const initialFetchRef = useRef(false);

  // Clear all intervals
  const clearIntervals = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (topologyIntervalRef.current) {
      clearInterval(topologyIntervalRef.current);
      topologyIntervalRef.current = null;
    }
  };

  // Fetch drone statuses from all drones
  const fetchDroneStatuses = async () => {
    try {
      const statuses = await MCPClient.getAllStatuses();

      if (Object.keys(statuses).length === 0) {
        throw new Error('No drones responded');
      }

      // Update each drone in the store
      for (const [droneId, mcpStatus] of Object.entries(statuses)) {
        const drone = safeMapMCPDrone(mcpStatus, droneId);
        updateDrone(droneId, drone);

        // Update multi-agent store
        updateAgentMetrics(droneId, {
          droneId,
          batteryLevel: drone.battery,
          position: drone.position,
          mode: mcpStatus.communicationMode === 'multi-star' ? 'multi-star' : 'mesh',
          connectedPeers: mcpStatus.meshPeers || 0,
          relayLoad: mcpStatus.meshQuality ? 1 - mcpStatus.meshQuality : 0,
        });

        // Register peer
        registerAgentPeer({
          id: droneId,
          role: drone.role,
          mcpPort: MCPClient['ports'][droneId],
          slmPort: 11434, // Ollama port
          mcpUrl: `http://localhost:${MCPClient['ports'][droneId]}`,
          signalStrength: mcpStatus.meshQuality || 0.5,
          distance: 0, // Will be calculated
          isInRange: true,
          lastSeen: Date.now(),
          status: drone.status,
        });
      }

      // Update connection state
      const connectedDrones = Object.keys(statuses).filter(
        id => statuses[id].status === 'online'
      );

      setState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        error: null,
        lastUpdate: Date.now(),
        connectedDrones,
      }));

      setMCPConnected(true);
      retryCountRef.current = 0; // Reset retry count on success

      return statuses;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: errorMessage,
      }));

      setMCPConnected(false, errorMessage);

      throw error;
    }
  };

  // Fetch network topology
  const fetchNetworkTopology = async () => {
    try {
      const topology = await MCPClient.getNetworkTopology('DRONE-01');

      if (topology) {
        // Map connections
        const connections = mapMCPTopologyToConnections(topology);

        // Clear existing connections and add new ones
        for (const conn of connections) {
          addAgentConnection(conn);
        }

        // Update topology
        updateNetworkTopology();
      }
    } catch (error) {
      console.warn('Failed to fetch network topology:', error);
      // Don't update connection state for topology failures
    }
  };

  // Initial setup
  useEffect(() => {
    if (!enabled || !MCPClient.isEnabled()) {
      setState(prev => ({
        ...prev,
        isConnected: false,
        error: 'MCP client is disabled',
      }));
      setMCPConnected(false, 'MCP client is disabled');
      return;
    }

    if (initialFetchRef.current) {
      return; // Already initialized
    }

    initialFetchRef.current = true;

    // Start connection
    setState(prev => ({ ...prev, isConnecting: true }));

    // Initial fetch
    fetchDroneStatuses()
      .then(async () => {
        // After successful initial fetch, start polling
        intervalRef.current = setInterval(fetchDroneStatuses, POLL_INTERVAL);

        // Also fetch topology periodically
        await fetchNetworkTopology();
        topologyIntervalRef.current = setInterval(
          fetchNetworkTopology,
          TOPOLOGY_UPDATE_INTERVAL
        );
      })
      .catch(error => {
        console.error('Initial MCP connection failed:', error);

        // Retry logic
        retryCountRef.current++;

        if (retryCountRef.current < MAX_RETRY_ATTEMPTS) {
          console.log(`Retrying connection (${retryCountRef.current}/${MAX_RETRY_ATTEMPTS})...`);

          setTimeout(() => {
            fetchDroneStatuses()
              .then(() => {
                intervalRef.current = setInterval(fetchDroneStatuses, POLL_INTERVAL);
                fetchNetworkTopology();
                topologyIntervalRef.current = setInterval(
                  fetchNetworkTopology,
                  TOPOLOGY_UPDATE_INTERVAL
                );
              })
              .catch(err => {
                console.error('Retry failed:', err);
                setState(prev => ({
                  ...prev,
                  isConnecting: false,
                  error: `Failed after ${MAX_RETRY_ATTEMPTS} attempts: ${err.message}`,
                }));
              });
          }, CONNECTION_TIMEOUT);
        } else {
          setState(prev => ({
            ...prev,
            isConnecting: false,
            error: `Connection failed after ${MAX_RETRY_ATTEMPTS} attempts`,
          }));
        }
      });

    // Cleanup on unmount
    return () => {
      clearIntervals();
    };
  }, [enabled]);

  // Return state and utility functions
  return {
    ...state,
    reconnect: () => {
      clearIntervals();
      initialFetchRef.current = false;
      setState(prev => ({ ...prev, isConnecting: true, error: null }));
    },
    refresh: fetchDroneStatuses,
  };
}

// ─────────────────────────────────────────────────────────────────────────────────
// Utility Hook: Check if MCP is available
// ─────────────────────────────────────────────────────────────────────────────────

export function useMCPAvailability(): {
  isAvailable: boolean;
  isLoading: boolean;
} {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAvailability = async () => {
      setIsLoading(true);
      try {
        const available = await MCPClient.isHealthy();
        setIsAvailable(available);
      } catch {
        setIsAvailable(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAvailability();
  }, []);

  return { isAvailable, isLoading };
}

// ─────────────────────────────────────────────────────────────────────────────────
// Utility Hook: Get initial data from MCP
// ─────────────────────────────────────────────────────────────────────────────────

export async function fetchInitialMCPData() {
  try {
    const statuses = await MCPClient.getAllStatuses();

    return {
      drones: Object.values(statuses).map(mapMCPDroneToFrontend),
      gridCells: [],
      sosSignals: [],
      relayPaths: [],
      eventLog: [],
    };
  } catch (error) {
    console.error('Failed to fetch initial MCP data:', error);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// Utility Hook: Execute tool on drone
// ─────────────────────────────────────────────────────────────────────────────────

export function useDroneTool() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeTool = async (
    droneId: string,
    toolName: string,
    params: Record<string, unknown> = {}
  ) => {
    setIsExecuting(true);
    setError(null);

    try {
      const result = await MCPClient.callTool(droneId, toolName, params);

      if (!result.success) {
        throw new Error(result.error || 'Tool execution failed');
      }

      return result.result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsExecuting(false);
    }
  };

  return { executeTool, isExecuting, error };
}

// ─────────────────────────────────────────────────────────────────────────────────
// Utility Hook: Query AI on drone
// ─────────────────────────────────────────────────────────────────────────────────

export function useDroneAI() {
  const [isQuerying, setIsQuerying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryAI = async (droneId: string, prompt: string) => {
    setIsQuerying(true);
    setError(null);

    try {
      const result = await MCPClient.queryAI(droneId, prompt);

      if (!result.success) {
        throw new Error(result.error || 'AI query failed');
      }

      return result.response || '';
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsQuerying(false);
    }
  };

  return { queryAI, isQuerying, error };
}
