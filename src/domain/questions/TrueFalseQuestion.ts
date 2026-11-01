import { BaseQuestionProps, ChoiceQuestion } from './BaseQuestion';
import { AnswerPayload, Gradable, GradeResult, QuestionView } from './types';

export class TrueFalseQuestion extends ChoiceQuestion implements Gradable {
  readonly type = 'true_false' as const;
  readonly answer: boolean;

  constructor(props: BaseQuestionProps & { answer: boolean }) {
    super({
      ...props,
      options: [
        { id: 'true', text: 'True' },
        { id: 'false', text: 'False' },
      ],
    });
    this.answer = props.answer;
  }

  protected inputKind(): QuestionView['input'] {
    return 'single';
  }

  accepts(answer: AnswerPayload): boolean {
    return answer.kind === 'choice' && answer.optionIds.length === 1 && this.hasOption(answer.optionIds[0]);
  }

  grade(answer: AnswerPayload): GradeResult {
    const correct = answer.kind === 'choice' && answer.optionIds[0] === String(this.answer);
    return { correct, fraction: correct ? 1 : 0 };
  }

  correctAnswer(): AnswerPayload {
    return { kind: 'choice', optionIds: [String(this.answer)] };
  }
}
