import { BaseQuestionProps, ChoiceQuestion } from './BaseQuestion';
import { AnswerPayload, Gradable, GradeResult, Option, QuestionView } from './types';

/**
 * One or more correct options. Partial credit:
 * fraction = max(0, (rightPicks - wrongPicks) / totalCorrect).
 */
export class MultiSelectQuestion extends ChoiceQuestion implements Gradable {
  readonly type = 'multi_select' as const;
  readonly correctOptionIds: ReadonlySet<string>;

  constructor(props: BaseQuestionProps & { options: Option[]; correctOptionIds: string[] }) {
    super(props);
    if (props.correctOptionIds.length === 0) throw new Error('Multi-select needs at least one correct option');
    for (const id of props.correctOptionIds) {
      if (!this.hasOption(id)) throw new Error(`Unknown correct option "${id}"`);
    }
    this.correctOptionIds = new Set(props.correctOptionIds);
  }

  protected inputKind(): QuestionView['input'] {
    return 'multiple';
  }

  accepts(answer: AnswerPayload): boolean {
    return (
      answer.kind === 'choice' &&
      answer.optionIds.length > 0 &&
      new Set(answer.optionIds).size === answer.optionIds.length &&
      answer.optionIds.every((id) => this.hasOption(id))
    );
  }

  grade(answer: AnswerPayload): GradeResult {
    if (answer.kind !== 'choice') return { correct: false, fraction: 0 };
    const picked = new Set(answer.optionIds);
    let right = 0;
    let wrong = 0;
    for (const id of picked) (this.correctOptionIds.has(id) ? right++ : wrong++);
    const fraction = Math.max(0, (right - wrong) / this.correctOptionIds.size);
    return { correct: right === this.correctOptionIds.size && wrong === 0, fraction };
  }

  correctAnswer(): AnswerPayload {
    return { kind: 'choice', optionIds: [...this.correctOptionIds] };
  }
}
