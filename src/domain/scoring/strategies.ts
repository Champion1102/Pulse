import { BASE_POINTS, ScoringInput, ScoringStrategy } from './ScoringStrategy';

/** Points only for being right (partial credit for multi-select). */
export class AccuracyOnlyScoring implements ScoringStrategy {
  readonly id = 'accuracy';
  readonly label = 'Accuracy only';
  readonly description = '1000 points for a correct answer, nothing for speed.';

  points({ grade }: ScoringInput): number {
    return Math.round(BASE_POINTS * grade.fraction);
  }
}

/** Half the points for being right, the other half decays linearly with time taken. */
export class SpeedBonusScoring implements ScoringStrategy {
  readonly id = 'speed';
  readonly label = 'Speed bonus';
  readonly description = 'Correct answers earn 500 points plus up to 500 more for answering fast.';

  points({ grade, responseTimeMs, timeLimitMs }: ScoringInput): number {
    if (grade.fraction === 0) return 0;
    const t = Math.min(Math.max(responseTimeMs / timeLimitMs, 0), 1);
    return Math.round(grade.fraction * (BASE_POINTS / 2 + (BASE_POINTS / 2) * (1 - t)));
  }
}

/** Rewards consecutive correct answers: +100 per streak step, capped at +500. */
export class StreakScoring implements ScoringStrategy {
  readonly id = 'streak';
  readonly label = 'Streaks';
  readonly description = 'Each correct answer in a row adds +100 (up to +500) on top of 1000.';

  constructor(
    private readonly stepBonus = 100,
    private readonly maxBonus = 500,
  ) {}

  points({ grade, streakBefore }: ScoringInput): number {
    if (!grade.correct) return Math.round(BASE_POINTS * grade.fraction);
    return BASE_POINTS + Math.min(streakBefore * this.stepBonus, this.maxBonus);
  }
}
