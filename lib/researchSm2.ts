// Research-owned SM-2 state. This deliberately does not reuse Vocabulary:
// RCT scheduling must remain isolated from normal application learning data.

import { calculateNextReview, type SRSData } from "./spacedRepetition";

export const RESEARCH_SM2_STATE_VERSION = "sm2-self-rating-v1";

export interface ResearchSm2State extends SRSData {
  stateVersion: typeof RESEARCH_SM2_STATE_VERSION;
}

export function initialResearchSm2State(now = new Date()): ResearchSm2State {
  return {
    stateVersion: RESEARCH_SM2_STATE_VERSION,
    easeFactor: 2.5,
    interval: 1,
    repetitions: 0,
    // The first item is eligible immediately. Each subsequent date comes from
    // the transition below and is persisted by the research write path.
    nextReviewDate: new Date(now),
  };
}

export function isResearchSm2Quality(quality: unknown): quality is number {
  return Number.isInteger(quality) && (quality as number) >= 0 && (quality as number) <= 5;
}

export function transitionResearchSm2State(
  current: ResearchSm2State,
  quality: number,
): ResearchSm2State {
  if (!isResearchSm2Quality(quality)) {
    throw new Error("SM-2 quality must be an integer from 0 to 5");
  }
  const next = calculateNextReview(current, quality);
  return { ...next, stateVersion: RESEARCH_SM2_STATE_VERSION };
}

