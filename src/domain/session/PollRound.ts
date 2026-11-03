import { RevealView } from '../events/EventBus';
import { CollectedAnswer, GradedEntry, Round } from './Round';

/** A round for a poll: same skeleton, but nothing is graded and the reveal is just the tally. */
export class PollRound extends Round {
  protected isGradable(): boolean {
    return false;
  }

  protected gradeAnswers(answers: CollectedAnswer[]): GradedEntry[] {
    return answers.map((a) => ({ ...a, grade: null }));
  }

  protected buildReveal(graded: GradedEntry[]): RevealView {
    return {
      questionId: this.question.id,
      correctAnswer: null,
      ...this.distribution(graded),
      answeredCount: graded.length,
      correctCount: null,
    };
  }
}
