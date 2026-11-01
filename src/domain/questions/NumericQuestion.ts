import { BaseQuestion, BaseQuestionProps } from './BaseQuestion';
import { AnswerPayload, Gradable, GradeResult, QuestionView } from './types';

/** Correct when |value - answer| <= tolerance. */
export class NumericQuestion extends BaseQuestion implements Gradable {
  readonly type = 'numeric' as const;
  readonly answer: number;
  readonly tolerance: number;

  constructor(props: BaseQuestionProps & { answer: number; tolerance?: number }) {
    super(props);
    if (!Number.isFinite(props.answer)) throw new Error('Numeric answer must be a finite number');
    const tolerance = props.tolerance ?? 0;
    if (tolerance < 0) throw new Error('Tolerance cannot be negative');
    this.answer = props.answer;
    this.tolerance = tolerance;
  }

  protected inputKind(): QuestionView['input'] {
    return 'number';
  }

  accepts(answer: AnswerPayload): boolean {
    return answer.kind === 'numeric' && Number.isFinite(answer.value);
  }

  grade(answer: AnswerPayload): GradeResult {
    const correct = answer.kind === 'numeric' && Math.abs(answer.value - this.answer) <= this.tolerance + 1e-9;
    return { correct, fraction: correct ? 1 : 0 };
  }

  correctAnswer(): AnswerPayload {
    return { kind: 'numeric', value: this.answer };
  }
}
