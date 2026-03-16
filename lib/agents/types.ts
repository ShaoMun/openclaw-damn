import type { DroneRole } from '../store';

// ─── Agent Identity ───────────────────────────────────────────────────────────

export type AgentId = string;
export type AgentType = 'master' | 'relay' | 'drone';
export type ConnectivityMode = 'online' | 'offline' | 'transitioning';
export type InstructionPriority = 'critical' | 'high' | 'normal' | 'low';
export type InstructionStatus = 'pending' | 'executing' | 'done' | 'failed' | 'expired';

// ─── Instructions ─────────────────────────────────────────────────────────────
// An AgentInstruction is the atomic unit of intent that flows through the system.
// The Master Agent creates them; the Relay Agent caches and forwards them;
// Drone Agents receive and execute them.

export interface AgentInstruction {
  id: string;
  issuedBy: AgentId;                   // 'MASTER' | relay drone ID | drone ID
  targetAgentId: AgentId;              // specific drone ID, 'BROADCAST', or role name
  priority: InstructionPriority;
  toolName: string;                    // matches a key in the MCP tool registry
  params: Record<string, unknown>;
  timestamp: number;                   // unix ms — when it was issued
  expiresAt?: number;                  // unix ms — TTL; undefined = no expiry
  requiresOnline: boolean;             // some tools need live API access
  status: InstructionStatus;
  executedAt?: number;
  result?: string;                     // human-readable outcome after