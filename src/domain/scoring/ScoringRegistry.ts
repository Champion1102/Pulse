import { ScoringStrategy } from './ScoringStrategy';
import { AccuracyOnlyScoring, SpeedBonusScoring, StreakScoring } from './strategies';

/** Lookup of available scoring modes. New mode = register() one more Strategy. */
export class ScoringRegistry {
  private readonly strategies = new Map<string, ScoringStrategy>();

  register(strategy: ScoringStrategy): this {
    this.strategies.set(strategy.id, strategy);
    return this;
  }

  get(id: string): ScoringStrategy {
    const s = this.strategies.get(id);
    if (!s) throw new Error(`Unknown scoring mode "${id}"`);
    return s;
  }

  list(): ScoringStrategy[] {
    return [...this.strategies.values()];
  }

  static withDefaults(): ScoringRegistry {
    return new ScoringRegistry()
      .register(new AccuracyOnlyScoring())
      .register(new SpeedBonusScoring())
      .register(new StreakScoring());
  }
}
