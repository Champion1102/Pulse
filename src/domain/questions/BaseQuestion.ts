import { AnswerPayload, Option, QuestionType, QuestionView, Renderable } from './types';

export interface BaseQuestionProps {
  id: string;
  prompt: string;
  topicId: string;
  timeLimitSec: number;
}

/** Shared state + rendering for every question type. Contains NO grading logic. */
export abstract class BaseQuestion implements Renderable {
  abstract readonly type: QuestionType;
  readonly id: string;
  readonly prompt: string;
  readonly topicId: string;
  readonly timeLimitSec: number;

  protected constructor(props: BaseQuestionProps) {
    if (!props.prompt.trim()) throw new Error('Question prompt cannot be empty');
    if (props.timeLimitSec < 5 || props.timeLimitSec > 300) {
      throw new Error('timeLimitSec must be between 5 and 300');
    }
    this.id = props.id;
    this.prompt = props.prompt.trim();
    this.topicId = props.topicId;
    this.timeLimitSec = props.timeLimitSec;
  }

  render(): QuestionView {
    return {
      id: this.id,
      type: this.type,
      prompt: this.prompt,
      timeLimitSec: this.timeLimitSec,
      input: this.inputKind(),
      options: this.renderOptions(),
    };
  }

  abstract accepts(answer: AnswerPayload): boolean;
  protected abstract inputKind(): QuestionView['input'];
  protected renderOptions(): Option[] | undefined {
    return undefined;
  }
}

/** Base for option-based questions (MCQ, multi-select, true/false, poll). */
export abstract class ChoiceQuestion extends BaseQuestion {
  readonly options: Option[];

  protected constructor(props: BaseQuestionProps & { options: Option[] }) {
    super(props);
    if (props.options.length < 2) throw new Error('A choice question needs at least 2 options');
    const ids = new Set(props.options.map((o) => o.id));
    if (ids.size !== props.options.length) throw new Error('Option ids must be unique');
    this.options = props.options.map((o) => ({ ...o }));
  }

  protected override renderOptions(): Option[] {
    return this.options.map((o) => ({ ...o }));
  }

  protected hasOption(id: string): boolean {
    return this.options.some((o) => o.id === id);
  }
}
