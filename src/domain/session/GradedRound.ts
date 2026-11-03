import { RevealView } from '../events/EventBus';
import { Gradable, Renderable } from '../questions/types';
import { CollectedAnswer, GradedEntry, Round, RoundContext } from './Round';

/** A round for any question with a right answer. Grading is the question's own fixed code. */
export class GradedRound extends Round {
  constructor(
    protected override readonly question: Renderable & Gradable,
    ctx: RoundContext,
  ) {
    super(question, ctx);
  }

  protected isGradable(): boolean {
    return true;
  }

  protected gradeAnswers(answers: CollectedAnswer[]): GradedEntry[] {
    return answers.map((a) => ({ ...a, grade: this.question.grade(a.answer) }));
  }

  protected buildReveal(graded: GradedEntry[]): RevealView {
    return {
      questionId: this.question.id,
      correctAnswer: this.question.correctAnswer(),
      ...this.distribution(graded),
      answeredCount: graded.length,
      correctCount: graded.filter((g) => g.grade?.correct).length,
    };
  }
}
