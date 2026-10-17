// Research-owned timing state for the HLR and DART RCT arms.  It is separate
// from Vocabulary and from the SM-2 control state so ordinary app learning
// history cannot alter the intervention timing.

import { DEFAULT_DART_WEIGHTS, dartSchedule, type RetrievalType } from "./dart";
import { hlrSchedule } from "./baselines/hlr";

export type AdaptiveResearchCondition = "hlr" | "dart";
export const RESEARCH_TIMING_STATE_VERSION = "hlr-dart-timing-v1";

export interface ResearchTimingState {
  stateVersion: typeof RESEARCH_TIMING_STATE_VERSION;
  interval: number;
  nextReviewDate: Date;
  lastRetrievalType: RetrievalType;
  halfLife: number;
  predictedRecall: number;
}

export function initialResearchTimingState(now = new Date()): ResearchTimingState {
  return {
    stateVersion: RESEARCH_TIMING_STATE_VERSION,
    interval: 1,
    nextReviewDate: new Date(now),
    lastRetrievalType: 0,
    halfLife: 1,
    predictedRecall: 0.5,
  };
}

/** Apply the arm-specific timing rule after a server-scored response. */
export function transitionResearchTimingState(input: {
  condition: AdaptiveResearchCondition;
  featureVector: number[];
  lastRetrievalType: RetrievalType;
  quality: number;
  now?: Date;
}): ResearchTimingState {
  if (!Number.isInteger(input.quality) || input.quality < 0 || input.quality > 5) {
    throw new Error("Research timing quality must be an integer from 0 to 5");
  }
  const now = input.now ?? new Date();
  const schedule = input.condition === "hlr"
    ? hlrSchedule(DEFAULT_DART_WEIGHTS, input.featureVector)
    : dartSchedule(DEFAULT_DART_WEIGHTS, input.featureVector, input.lastRetrievalType);
  const successful = input.quality >= 3;
  const rawInterval = successful ? schedule.intervalDays : Math.max(1, schedule.intervalDays * 0.3);
  const interval = Math.max(1, Math.round(rawInterval));
  const nextReviewDate = new Date(now);
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);
  return {
    stateVersion: RESEARCH_TIMING_STATE_VERSION,
    interval,
    nextReviewDate,
    lastRetrievalType: input.lastRetrievalType,
    halfLife: schedule.halfLife,
    predictedRecall: schedule.predictedRecall,
  };
}

