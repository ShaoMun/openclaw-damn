/**
 * MCP Client Service
 *
 * Centralized API client for communicating with the MCP drone swarm backend.
 * Handles connection pooling, retries, timeouts, and error recovery.
 */

// ─────────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────────

export interface MCPDroneStatus {
  droneId: string;
  role: string;
  status: string;
  batteryLevel: number;
  position: { x: number; y: number; z: number };
  targetPosition?: { x: number; y: number; z: number };
  lastActivity?: number;
  communicationMode?: 'mesh' | 'multi-star';
  connectedRelay?: string;
  meshPeers?: number;
  meshQuality?: number;
}

export interface MCPToolCall {
  tool: string;
  params: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

export interface MCPNetworkTopology {
  nodes: Array<{
    id: string;
    role: string;
    battery: number;
    position: [number, number, number];
    connections: number;
  }>;
  edges: Array<{
    from: string;
    to: string;
    mode: 'mesh' | 'multi-star';
    signalStrength: number;
  }>;
  meshStrength: number;
  relayLoad: Record<string, number>;
}

export interface MCPClientConfig {
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  enabled?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────────
// MCP Client Service
// ─────────────────────────────────────────────────────────────────────────────────

class MCPClientServiceClass {
  private ports: Record<string, number> = {
    'DRONE-01': 8081,
    'DRONE-02': 8082,
    'DRONE-03': 8083,
    'DRONE-04': 8084,
    'DRONE-05': 8085,
  };

  private config: Required<MCPClientConfig> = {
    baseUrl: 'http://localhost',
    timeout: 5000,
    retryAttempts: 3,
    retryDelay: 1000,
    enabled: true,
  };

  private connectionCache = new Map<string, boolean>();
  private lastHealthCheck = 0;
  private healthCheckInterval = 10000; // 10 seconds

  constructor(config?: MCPClientConfig) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Check environment variable
    if (typeof window !== 'undefined') {
      const envEnabled = process.env.NEXT_PUBLIC_MCP_ENABLED === 'true';
      this.config.enabled = envEnabled;
    }
  }

  /**
   * Get the port for a specific drone
   */
  private getPort(droneId: string): number {
    const port = this.ports[droneId];
    if (!port) {
      throw new Error(`Unknown drone ID: ${droneId}`);
    }
    return port;
  }

  /**
   * Get the base URL for a specific drone
   */
  private getUrl(droneId: string): string {
    const port = this.getPort(droneId);
    return `${this.config.baseUrl}:${port}`;
  }

  /**
   * Make an HTTP request with timeout and retry logic
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    attempt = 1
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Cache successful connection
      const droneId = this.extractDroneIdFromUrl(url);
      if (droneId) {
        this.connectionCache.set(droneId, true);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      // Retry logic
      if (attempt < this.config.retryAttempts) {
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, options, attempt + 1);
      }

      // Mark as failed after all retries
      const droneId = this.extractDroneIdFromUrl(url);
      if (droneId) {
        this.connectionCache.set(droneId, false);
      }

      throw error;
    }
  }

  /**
   * Extract drone ID from URL
   */
  private extractDroneIdFromUrl(url: string): string | null {
    for (const [droneId, port] of Object.entries(this.ports)) {
      if (url.includes(`:${port}`)) {
        return droneId;
      }
    }
    return null;
  }

  /**
   * Check if MCP client is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Call a specific tool on a drone
   */
  async callTool(
    droneId: string,
    toolName: string,
    params: Record<string, unknown> = {}
  ): Promise<{ success: boolean; result?: unknown; error?: string }> {
    if (!this.config.enabled) {
      return { success: false, error: 'MCP client is disabled' };
    }

    try {
      const url = `${this.getUrl(droneId)}/api/tools/${toolName}/execute`;
      const response = await this.fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await response.json();
      return { success: true, result: data.result || data };
    } catch (error) {
      console.error(`MCP: Failed to call tool ${toolName} on ${droneId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get the status of a specific drone (uses get_status tool for complete data)
   */
  async getStatus(droneId: string): Promise<MCPDroneStatus | null> {
    if (!this.config.enabled) {
      return null;
    }

    try {
      // Use the get_status tool to get complete drone information
      const result = await this.callTool(droneId, 'get_status', {});

      if (result.success && result.result) {
        // The tool returns the actual drone status
        const status = result.result as Record<string, unknown>;

        // Transform the response to match MCPDroneStatus interface
        // Handle both field naming conventions
        const batteryLevel = (status.batteryLevel || status.battery || 100) as number;
        const lastActivity = (status.lastActivity || status.timestamp || Date.now()) as number;

        return {
          droneId: status.droneId as string,
          role: status.role as string,
          status: status.status as string,
          batteryLevel,
          position: status.position as { x: number; y: number; z: number },
          targetPosition: status.targetPosition as { x: number; y: number; z: number } | undefined,
          lastActivity,
          communicationMode: status.communicationMode as 'mesh' | 'multi-star' | undefined,
          connectedRelay: status.connectedRelay as string | undefined,
          meshPeers: status.connections as number | undefined,
          meshQuality: status.meshQuality as number | undefined,
        };
      }

      return null;
    } catch (error) {
      console.error(`MCP: Failed to get status for ${droneId}:`, error);
      return null;
    }
  }

  /**
   * Get the status of all drones
   */
  async getAllStatuses(): Promise<Record<string, MCPDroneStatus>> {
    const droneIds = Object.keys(this.ports);
    const statuses: Record<string, MCPDroneStatus> = {};

    const promises = droneIds.map(async (droneId) => {
      const status = await this.getStatus(droneId);
      if (status) {
        statuses[droneId] = status;
      }
    });

    await Promise.all(promises);
    return statuses;
  }

  /**
   * Query the AI (SLM) on a specific drone
   */
  async queryAI(
    droneId: string,
    prompt: string
  ): Promise<{ success: boolean; response?: string; error?: string }> {
    if (!this.config.enabled) {
      return { success: false, error: 'MCP client is disabled' };
    }

    try {
      const result = await this.callTool(droneId, 'query_slm', { prompt });
      if (result.success && typeof result.result === 'object') {
        const response = (result.result as { response?: string })?.response;
        if (response) {
          return { success: true, response };
        }
      }
      return { success: false, error: 'Invalid AI response format' };
    } catch (error) {
      console.error(`MCP: Failed to query AI on ${droneId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get network topology from a drone
   */
  async getNetworkTopology(
    droneId: string = 'DRONE-01'
  ): Promise<MCPNetworkTopology | null> {
    if (!this.config.enabled) {
      return null;
    }

    try {
      const result = await this.callTool(droneId, 'get_network_topology', {});
      if (result.success && typeof result.result === 'object') {
        const topology = (result.result as { topology?: MCPNetworkTopology })?.topology;
        if (topology) {
          return topology;
        }
      }
      return null;
    } catch (error) {
      console.error(`MCP: Failed to get network topology from ${droneId}:`, error);
      return null;
    }
  }

  /**
   * Check if a specific drone is healthy
   */
  async isDroneHealthy(droneId: string): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    // Use cached connection status if recent
    const now = Date.now();
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return this.connectionCache.get(droneId) ?? false;
    }

    try {
      const url = `${this.getUrl(droneId)}/api/status`;
      await this.fetchWithRetry(url, { method: 'GET' });
      this.lastHealthCheck = now;
      return true;
    } catch {
      this.lastHealthCheck = now;
      return false;
    }
  }

  /**
   * Check if all drones are healthy
   */
  async isHealthy(): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    const droneIds = Object.keys(this.ports);
    const healthChecks = await Promise.all(
      droneIds.map(id => this.isDroneHealthy(id))
    );

    return healthChecks.every(healthy => healthy);
  }

  /**
   * Get a list of connected/healthy drones
   */
  async getConnectedDrones(): Promise<string[]> {
    const statuses = await this.getAllStatuses();
    return Object.keys(statuses).filter(id => statuses[id]?.status === 'online');
  }

  /**
   * Send a message from one drone to another
   */
  async sendMessage(
    fromDroneId: string,
    toDroneId: string,
    content: string,
    type: 'command' | 'status' | 'data' | 'alert' = 'data'
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.config.enabled) {
      return { success: false, error: 'MCP client is disabled' };
    }

    return this.callTool(fromDroneId, 'send_message', {
      toDroneId,
      content,
      type,
      priority: 'normal',
    }) as Promise<{ success: boolean; error?: string }>;
  }

  /**
   * Move a drone to a specific position
   */
  async moveDrone(
    droneId: string,
    position: [number, number, number]
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.config.enabled) {
      return { success: false, error: 'MCP client is disabled' };
    }

    return this.callTool(droneId, 'move_to', {
      x: position[0],
      y: position[1],
      z: position[2],
    }) as Promise<{ success: boolean; error?: string }>;
  }

  /**
   * Trigger an emergency response
   */
  async triggerEmergency(
    sosId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.config.enabled) {
      return { success: false, error: 'MCP client is disabled' };
    }

    // Trigger emergency on all drones
    const droneIds = Object.keys(this.ports);
    const results = await Promise.all(
      droneIds.map(id =>
        this.callTool(id, 'trigger_emergency', {
          emergencyId: sosId,
          severity: 'critical',
        })
      )
    );

    const allSuccessful = results.every(r => r.success);
    return {
      success: allSuccessful,
      error: allSuccessful ? undefined : 'Some drones failed to respond',
    };
  }

  /**
   * Coordinate a swarm mission
   */
  async coordinateSwarm(
    missionType: string,
    targetDrones: string[],
    params: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.config.enabled) {
      return { success: false, error: 'MCP client is disabled' };
    }

    return this.callTool('DRONE-01', 'coordinate_swarm', {
      missionType,
      targetDrones,
      parameters: params,
    }) as Promise<{ success: boolean; error?: string }>;
  }

  /**
   * Get list of available tools for a drone
   */
  async getAvailableTools(droneId: string): Promise<string[]> {
    if (!this.config.enabled) {
      return [];
    }

    try {
      const url = `${this.getUrl(droneId)}/api/tools`;
      const response = await this.fetchWithRetry(url, { method: 'GET' });
      const data = await response.json();
      return (data.tools || []).map((t: { name: string }) => t.name);
    } catch (error) {
      console.error(`MCP: Failed to get tools for ${droneId}:`, error);
      return [];
    }
  }

  /**
   * Clear connection cache (useful for testing)
   */
  clearCache(): void {
    this.connectionCache.clear();
    this.lastHealthCheck = 0;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MCPClientConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ─────────────────────────────────────────────────────────────────────────────────
// Singleton Instance
// ─────────────────────────────────────────────────────────────────────────────────

export const MCPClient = new MCPClientServiceClass();

// Export for testing
export { MCPClientServiceClass };

// ─────────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────────

/**
 * Create a default MCP client with custom config
 */
export function createMCPClient(config?: MCPClientConfig): MCPClientServiceClass {
  return new MCPClientServiceClass(config);
}

/**
 * Check if MCP is available (quick health check)
 */
export async function isMCPAvailable(): Promise<boolean> {
  try {
    return await MCPClient.isHealthy();
  } catch {
    return false;
  }
}
