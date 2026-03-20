import { DronePersonality } from "./store";

// ─── Local AI Personality Rules ────────────────────────────────────────────

export const LOCAL_AI_RULES: Record<
  DronePersonality,
  {
    scanFrequency: number;      // 0-1: Probability of scanning per tick
    moveSpeed: number;          // Speed multiplier for movement
    riskTolerance: "low" | "medium" | "high";
    reasoningTemplates: string[];
    actionTemplates: string[];
  }
> = {
  aggressive: {
    scanFrequency: 0.9,
    moveSpeed: 1.5,
    riskTolerance: "high",
    reasoningTemplates: [
      "Target detected. Pursuing immediately.",
      "Optimizing search pattern. Speed priority.",
      "Detecting signatures. Closing in fast.",
      "Sector sweep. Maximum coverage mode.",
      "Confident approach. Engaging target area.",
    ],
    actionTemplates: [
      "Executing rapid scan protocol",
      "Advancing to target coordinates",
      "Sprinting to next waypoint",
      "High-speed reconnaissance sweep",
    ],
  },
  cautious: {
    scanFrequency: 0.5,
    moveSpeed: 0.8,
    riskTolerance: "low",
    reasoningTemplates: [
      "Verifying sector safety before proceeding.",
      "Conserving battery. Optimal path calculated.",
      "Scanning perimeter. Thorough check in progress.",
      "Analyzing terrain. Safe route identified.",
      "Stabilizing systems. Careful advance.",
    ],
    actionTemplates: [
      "Executing careful approach",
      "Scanning with high precision",
      "Moving to safe vantage point",
      "Conducting methodical sweep",
    ],
  },
  balanced: {
    scanFrequency: 0.7,
    moveSpeed: 1.0,
    riskTolerance: "medium",
    reasoningTemplates: [
      "Balancing scan coverage and movement efficiency.",
      "Optimizing resource allocation for current task.",
      "Standard sweep pattern in effect.",
      "Maintaining optimal operational parameters.",
      "Executing mission parameters. Steady progress.",
    ],
    actionTemplates: [
      "Executing standard patrol",
      "Moving to assigned waypoint",
      "Conducting routine sector scan",
      "Advancing on planned route",
    ],
  },
  efficiency: {
    scanFrequency: 0.6,
    moveSpeed: 1.2,
    riskTolerance: "medium",
    reasoningTemplates: [
      "Minimizing energy expenditure. Maximum results.",
      "Maximizing coverage per watt. Optimal trajectory.",
      "Efficient route calculated. Fuel-saving mode.",
      "Balancing power consumption with objectives.",
      "Streamlined operations. Peak efficiency.",
    ],
    actionTemplates: [
      "Optimizing route for efficiency",
      "Executing low-power scan",
      "Moving on energy-saving path",
      "Conducting cost-effective sweep",
    ],
  },
};

// ─── Context-Based Reasoning ───────────────────────────────────────────────

export interface LocalAIContext {
  droneId: string;
  battery: number;
  status: string;
  personality: DronePersonality;
  currentGoal: string;
  peopleFound: number;
  scansCompleted: number;
}

export function getContextualReasoning(context: LocalAIContext): string {
  const { battery, status, personality, peopleFound, scansCompleted } = context;
  const rules = LOCAL_AI_RULES[personality];

  // Low battery reasoning
  if (battery < 20) {
    return battery < 10
      ? `CRITICAL: Battery at ${battery.toFixed(0)}%. Initiating return protocol.`
      : `WARNING: Battery at ${battery.toFixed(0)}%. Considering return to base.`;
  }

  // Status-based reasoning
  if (status === "syncing") {
    return "Synchronizing data. Temporary pause in operations.";
  }

  if (status === "offline") {
    return "Connection lost. Attempting re-establishment.";
  }

  // Performance-based reasoning
  if (peopleFound > 0) {
    return `${peopleFound} target${peopleFound > 1 ? "s" : ""} located. Continuing search pattern.`;
  }

  if (scansCompleted > 10 && peopleFound === 0) {
    return "Sector clear. No targets detected in ${scansCompleted} scans.";
  }

  // Default personality-based reasoning
  return rules.reasoningTemplates[
    Math.floor(Math.random() * rules.reasoningTemplates.length)
  ];
}

// ─── Action Generation ─────────────────────────────────────────────────────

export function generateAction(personality: DronePersonality): string {
  const rules = LOCAL_AI_RULES[personality];
  return rules.actionTemplates[
    Math.floor(Math.random() * rules.actionTemplates.length)
  ];
}

// ─── Decision Making ───────────────────────────────────────────────────────

export interface LocalAIDecision {
  shouldScan: boolean;
  shouldMove: boolean;
  shouldReturn: boolean;
  reasoning: string;
  action: string;
}

export function makeLocalAIDecision(context: LocalAIContext): LocalAIDecision {
  const { battery, personality, status } = context;
  const rules = LOCAL_AI_RULES[personality];

  // Critical battery - always return
  if (battery < 10) {
    return {
      shouldScan: false,
      shouldMove: false,
      shouldReturn: true,
      reasoning: `CRITICAL: Battery ${battery.toFixed(0)}%. Returning to base immediately.`,
      action: "Executing emergency return protocol",
    };
  }

  // Low battery - reduce scanning
  if (battery < 20) {
    return {
      shouldScan: Math.random() < rules.scanFrequency * 0.3,
      shouldMove: true,
      shouldReturn: false,
      reasoning: getContextualReasoning(context),
      action: generateAction(personality),
    };
  }

  // Offline/syncing - no actions
  if (status === "offline" || status === "syncing") {
    return {
      shouldScan: false,
      shouldMove: false,
      shouldReturn: false,
      reasoning: getContextualReasoning(context),
      action: "Awaiting status resolution",
    };
  }

  // Normal operation
  return {
    shouldScan: Math.random() < rules.scanFrequency,
    shouldMove: true,
    shouldReturn: false,
    reasoning: getContextualReasoning(context),
    action: generateAction(personality),
  };
}

// ─── Statistics Calculation ───────────────────────────────────────────────

export function calculatePeopleFoundPerMinute(
  peopleFound: number,
  uptimeMs: number
): number {
  const uptimeMinutes = uptimeMs / (1000 * 60);
  return uptimeMinutes > 0 ? peopleFound / uptimeMinutes : 0;
}

export function calculateEfficiency(
  successfulActions: number,
  batteryUsed: number
): number {
  if (batteryUsed <= 0) return 100;
  return Math.min(100, (successfulActions / batteryUsed) * 10);
}
