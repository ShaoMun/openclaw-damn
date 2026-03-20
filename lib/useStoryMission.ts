'use client';

import { useEffect, useRef } from 'react';
import { useStore } from './store';
import {
  createStoryMission,
  updateStoryProgress,
  type StoryContext,
} from './story-progression';

const STORY_CHECK_INTERVAL = 3000; // Check story progression every 3 seconds

export function useStoryMission() {
  const sosSignals = useStore((s) => s.sosSignals);
  const drones = useStore((s) => s.drones);
  const activeScans = useStore((s) => s.activeScans);
  const activeMission = useStore((s) => s.activeMission);
  const activeStoryMission = useStore((s) => s.activeStoryMission);
  const autoProgressStory = useStore((s) => s.autoProgressStory);

  const startStoryMission = useStore((s) => s.startStoryMission);
  const advanceStoryPhase = useStore((s) => s.advanceStoryPhase);
  const updateStoryNarrative = useStore((s) => s.updateStoryNarrative);
  const achieveStoryMilestone = useStore((s) => s.achieveStoryMilestone);
  const completeStoryMission = useStore((s) => s.completeStoryMission);
  const generateMission = useStore((s) => s.generateMission);

  const storyInitialized = useRef(false);

  // Initialize story mission when first SOS appears
  useEffect(() => {
    if (
      !storyInitialized.current &&
      sosSignals.length > 0 &&
      !activeStoryMission &&
      autoProgressStory
    ) {
      // Generate a scan mission for the story
      const mission = generateMission("scan");

      // Create story mission
      const story = createStoryMission(mission);

      // Start the story
      startStoryMission(story);

      storyInitialized.current = true;
    }
  }, [sosSignals.length, activeStoryMission, autoProgressStory, generateMission, startStoryMission]);

  // Check story progression periodically
  useEffect(() => {
    if (!activeStoryMission || !autoProgressStory) return;

    const interval = setInterval(() => {
      const story = useStore.getState().activeStoryMission;
      if (!story || story.phase === 'complete' || story.phase === 'failed') return;

      // Build context
      const dispatchedDrones = drones.filter((d) => d.targetPosition).length;

      const humansFound = activeScans.reduce((sum, scan) => {
        return sum + scan.targets.filter((t) => t.isHuman).length;
      }, 0);

      const resolvedSOS = sosSignals.filter((sos) => sos.relayDroneIds.length >= 2).length;

      const context: StoryContext = {
        sosCount: sosSignals.length,
        dispatchedDrones,
        humansFound,
        resolvedSOS,
        totalSOS: sosSignals.length,
        activeScans: activeScans.length,
      };

      // Update story progress
      const progress = updateStoryProgress(story, context);

      // Achieve milestones
      progress.achievedMilestones.forEach((milestoneId) => {
        achieveStoryMilestone(milestoneId);
      });

      // Advance phase if needed
      if (progress.shouldAdvance && progress.newPhase) {
        advanceStoryPhase(progress.newPhase);

        if (progress.narrative) {
          updateStoryNarrative(progress.narrative);
        }

        // Complete story if reached terminal phase
        if (progress.newPhase === 'complete') {
          setTimeout(() => {
            completeStoryMission();
          }, 2000); // Delay for dramatic effect
        }
      }
    }, STORY_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [
    activeStoryMission,
    drones,
    sosSignals,
    activeScans,
    autoProgressStory,
    advanceStoryPhase,
    updateStoryNarrative,
    achieveStoryMilestone,
    completeStoryMission,
  ]);

  return {
    storyInitialized: storyInitialized.current,
    activeStory: activeStoryMission,
  };
}
