import { BaseQuestionProps, ChoiceQuestion } from './BaseQuestion';
import { AnswerPayload, Option, QuestionView } from './types';

/**
 * A poll has no correct answer, so it implements Renderable ONLY.
 * It deliberately has no grade() method (LSP + ISP): code that needs to grade
 * must ask isGradable(q) first, and a poll can never be passed where a
 * Gradable is required.
 */
export class PollQuestion extends ChoiceQuestion {
  readonly type = 'poll' as const;

  constructor(props: BaseQuestionProps & { options: Option[] }) {
    super(props);
  }

  protected inputKind(): QuestionView['input'] {
    return 'single';
  }

  accepts(answer: AnswerPayload): boolean {
    return answer.kind === 'choice' && answer.optionIds.length === 1 && this.hasOption(answer.optionIds[0]);
  }
}
