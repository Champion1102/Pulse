import { GradeResult } from '../questions/types';
import { ScoringStrategy } from './ScoringStrategy';

export interface PlayerScore {
  playerId: string;
  total: number;
  streak: number;
  correctCount: number;
  lastPoints: number;
  lastCorrect: boolean | null;
}

export interface GradedAnswer {
  playerId: string;
  grade: GradeResult;
  responseTimeMs: number;
}

/**
 * Single Responsibility: turns graded answers into points using the session's
 * strategy and keeps each player's running total + streak. It knows nothing
 * about rounds, sockets or ranking.
 */
export class Scorer {
  private readonly scores = new Map<string, PlayerScore>();

  constructor(private readonly strategy: ScoringStrategy) {}

  get mode(): ScoringStrategy {
    return this.strategy;
  }

  ensurePlayer(playerId: string): void {
    if (!this.scores.has(playerId)) {
      this.scores.set(playerId, { playerId, total: 0, streak: 0, correctCount: 0, lastPoints: 0, lastCorrect: null });
    }
  }

  /**
   * Apply one round. Players in `participants` who did not answer lose their
   * streak and score 0 for the round.
   */
  applyRound(answers: GradedAnswer[], participants: string[], timeLimitMs: number): PlayerScore[] {
    const byPlayer = new Map(answers.map((a) => [a.playerId, a]));
    for (const id of new Set([...participants, ...byPlayer.keys()])) {
      this.ensurePlayer(id);
      const s = this.scores.get(id)!;
      const a = byPlayer.get(id);
      if (!a) {
        Object.assign(s, { streak: 0, lastPoints: 0, lastCorrect: false });
        continue;
      }
      const points = this.strategy.points({
        grade: a.grade,
        responseTimeMs: a.responseTimeMs,
        timeLimitMs,
        streakBefore: s.streak,
      });
      s.total += points;
      s.lastPoints = points;
      s.lastCorrect = a.grade.correct;
      s.streak = a.grade.correct ? s.streak + 1 : 0;
      if (a.grade.correct) s.correctCount += 1;
    }
    return this.all();
  }

  /** Poll rounds: nothing is scored and streaks are left untouched. */
  markUngradedRound(): void {
    for (const s of this.scores.values()) Object.assign(s, { lastPoints: 0, lastCorrect: null });
  }

  all(): PlayerScore[] {
    return [...this.scores.values()].map((s) => ({ ...s }));
  }
}
