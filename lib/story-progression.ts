import { MissionPhase, StoryMission, StoryMilestone, Mission } from "./store";

// ─── Story Configuration ───────────────────────────────────────────────────────

const STORY_PHASES: Record<
  MissionPhase,
  { title: string; description: string; objectives: string[] }
> = {
  briefing: {
    title: "MISSION BRIEFING",
    description:
      "Emergency distress signals detected in Sector 7G. Multiple SOS received from damaged infrastructure. Deploy drone swarm to establish communication and locate survivors.",
    objectives: [
      "Analyze distress signals",
      "Identify drone capabilities",
      "Plan deployment strategy",
    ],
  },
  deployment: {
    title: "DEPLOYMENT PHASE",
    description:
      "Dispatching drones to target sectors. Establishing relay networks for communication coverage. Positioning units for maximum operational efficiency.",
    objectives: [
      "Deploy relay drones",
      "Position WiFi coverage",
      "Ready supply units",
    ],
  },
  search: {
    title: "ACTIVE SEARCH",
    description:
      "Scanning designated sectors with thermal imaging. Detecting heat signatures and human movement. Analyzing terrain data for survivor locations.",
    objectives: [
      "Execute thermal scans",
      "Analyze sensor data",
      "Identify human targets",
    ],
  },
  rescue: {
    title: "RESCUE OPERATIONS",
    description:
      "Survivors located! Coordinating extraction and supply delivery. Maintaining communication links with base camp. Monitoring drone battery levels.",
    objectives: [
      "Confirm survivor locations",
      "Dispatch supply drones",
      "Establish relay chains",
    ],
  },
  complete: {
    title: "MISSION COMPLETE",
    description:
      "All survivors located and supplies delivered. Communication network restored. Drone fleet returning to base for debriefing.",
    objectives: [
      "All targets rescued",
      "Coverage restored",
      "Mission objectives met",
    ],
  },
  failed: {
    title: "MISSION FAILED",
    description:
      "Critical failure in mission execution. Unable to complete primary objectives. Reviewing telemetry data for analysis.",
    objectives: [
      "Analyze failure points",
      "Review drone logs",
      "Plan next attempt",
    ],
  },
};

// ─── Story Generation ───────────────────────────────────────────────────────────

/**
 * Create a new story mission from an existing mission
 */
export function createStoryMission(mission: Mission): StoryMission {
  const now = Date.now();

  return {
    id: `STORY-${mission.id}`,
    name: mission.name,
    phase: "briefing",
    startTime: now,
    narrative: {
      title: STORY_PHASES.briefing.title,
      description: STORY_PHASES.briefing.description,
      objectives: STORY_PHASES.briefing.objectives,
      progress: 0,
    },
    milestones: generateInitialMilestones(mission),
    mission,
  };
}

function generateInitialMilestones(mission: Mission): StoryMilestone[] {
  return [
    {
      id: "deploy-1",
      name: "Drones Deployed",
      achieved: false,
    },
    {
      id: "search-1",
      name: "First Scan Complete",
      achieved: false,
    },
    {
      id: "rescue-1",
      name: "Survivors Found",
      achieved: false,
    },
    {
      id: "relay-1",
      name: "Relay Established",
      achieved: false,
    },
    {
      id: "complete-1",
      name: "Mission Complete",
      achieved: false,
    },
  ];
}

// ─── Phase Progression Logic ─────────────────────────────────────────────────────

export interface StoryContext {
  sosCount: number;
  dispatchedDrones: number;
  humansFound: number;
  resolvedSOS: number;
  totalSOS: number;
  activeScans: number;
}

/**
 * Determine if story should advance to next phase
 */
export function shouldAdvanceStory(
  currentPhase: MissionPhase,
  context: StoryContext
): MissionPhase | null {
  switch (currentPhase) {
    case "briefing":
      // Advance to deployment if SOS signals exist
      if (context.sosCount > 0) {
        return "deployment";
      }
      break;

    case "deployment":
      // Advance to search if 3+ drones have targets
      if (context.dispatchedDrones >= 3) {
        return "search";
      }
      break;

    case "search":
      // Advance to rescue if humans found
      if (context.humansFound > 0) {
        return "rescue";
      }
      break;

    case "rescue":
      // Advance to complete if all SOS resolved
      if (context.resolvedSOS === context.totalSOS && context.totalSOS > 0) {
        return "complete";
      }
      break;

    case "complete":
    case "failed":
      // Terminal states
      break;
  }

  return null;
}

/**
 * Update story narrative for a phase
 */
export function getPhaseNarrative(phase: MissionPhase): StoryMission["narrative"] {
  const phaseData = STORY_PHASES[phase];

  // Calculate progress based on phase
  const progressMap: Record<MissionPhase, number> = {
    briefing: 10,
    deployment: 30,
    search: 50,
    rescue: 80,
    complete: 100,
    failed: 0,
  };

  return {
    title: phaseData.title,
    description: phaseData.description,
    objectives: phaseData.objectives,
    progress: progressMap[phase],
  };
}

/**
 * Check if a milestone should be achieved
 */
export function checkMilestoneAchievement(
  milestoneId: string,
  context: StoryContext
): boolean {
  switch (milestoneId) {
    case "deploy-1":
      return context.dispatchedDrones >= 3;
    case "search-1":
      return context.activeScans > 0;
    case "rescue-1":
      return context.humansFound > 0;
    case "relay-1":
      return context.resolvedSOS > 0;
    case "complete-1":
      return context.resolvedSOS === context.totalSOS && context.totalSOS > 0;
    default:
      return false;
  }
}

/**
 * Get next milestone to achieve
 */
export function getNextMilestone(story: StoryMission): StoryMilestone | null {
  return story.milestones.find((m) => !m.achieved) || null;
}

/**
 * Update story progress based on current state
 */
export function updateStoryProgress(
  story: StoryMission,
  context: StoryContext
): {
  shouldAdvance: boolean;
  newPhase?: MissionPhase;
  achievedMilestones: string[];
  narrative?: StoryMission["narrative"];
} {
  const achievedMilestones: string[] = [];
  let narrative: StoryMission["narrative"] | undefined = undefined;

  // Check milestones
  story.milestones.forEach((milestone) => {
    if (!milestone.achieved && checkMilestoneAchievement(milestone.id, context)) {
      achievedMilestones.push(milestone.id);
    }
  });

  // Check phase advancement
  const newPhase = shouldAdvanceStory(story.phase, context);
  const shouldAdvance = newPhase !== null;

  if (shouldAdvance && newPhase) {
    narrative = getPhaseNarrative(newPhase);
  }

  return {
    shouldAdvance,
    newPhase,
    achievedMilestones,
    narrative,
  };
}
