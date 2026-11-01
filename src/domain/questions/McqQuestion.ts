import { BaseQuestionProps, ChoiceQuestion } from './BaseQuestion';
import { AnswerPayload, Gradable, GradeResult, Option, QuestionView } from './types';

/** Exactly one correct option. */
export class McqQuestion extends ChoiceQuestion implements Gradable {
  readonly type = 'mcq' as const;
  readonly correctOptionId: string;

  constructor(props: BaseQuestionProps & { options: Option[]; correctOptionId: string }) {
    super(props);
    if (!this.hasOption(props.correctOptionId)) throw new Error('Correct option must be one of the options');
    this.correctOptionId = props.correctOptionId;
  }

  protected inputKind(): QuestionView['input'] {
    return 'single';
  }

  accepts(answer: AnswerPayload): boolean {
    return answer.kind === 'choice' && answer.optionIds.length === 1 && this.hasOption(answer.optionIds[0]);
  }

  grade(answer: AnswerPayload): GradeResult {
    const correct = answer.kind === 'choice' && answer.optionIds[0] === this.correctOptionId;
    return { correct, fraction: correct ? 1 : 0 };
  }

  correctAnswer(): AnswerPayload {
    return { kind: 'choice', optionIds: [this.correctOptionId] };
  }
}
