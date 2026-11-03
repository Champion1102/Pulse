import { isGradable, Renderable } from '../questions/types';
import { GradedRound } from './GradedRound';
import { PollRound } from './PollRound';
import { Round, RoundContext } from './Round';

export interface RoundFactory {
  create(question: Renderable, ctx: RoundContext): Round;
}

/** Picks the round subclass from the question's capabilities, not its concrete type. */
export class DefaultRoundFactory implements RoundFactory {
  create(question: Renderable, ctx: RoundContext): Round {
    return isGradable(question) ? new GradedRound(question, ctx) : new PollRound(question, ctx);
  }
}
