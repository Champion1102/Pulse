import { GradeResult } from '../questions/types';

export interface ScoringInput {
  grade: GradeResult;
  responseTimeMs: number;
  timeLimitMs: number;
  /** Consecutive fully-correct answers *before* this one. */
  streakBefore: number;
}

/**
 * Strategy pattern: the scoring mode is chosen per session and swapped as a
 * whole. The live engine depends only on this interface (Dependency Inversion).
 */
export interface ScoringStrategy {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  points(input: ScoringInput): number;
}

export const BASE_POINTS = 1000;
