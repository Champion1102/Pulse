import { IdGenerator } from '../../infrastructure/ids';
import { McqQuestion } from './McqQuestion';
import { MultiSelectQuestion } from './MultiSelectQuestion';
import { NumericQuestion } from './NumericQuestion';
import { PollQuestion } from './PollQuestion';
import { TrueFalseQuestion } from './TrueFalseQuestion';
import { Option, Question, QuestionSpec, QuestionType } from './types';

/** A creator builds one concrete question type from a validated spec. */
export type QuestionCreator = (spec: QuestionSpec, ids: IdGenerator) => Question;

const DEFAULT_TIME_LIMIT = 20;

function base(spec: QuestionSpec, ids: IdGenerator) {
  return {
    id: spec.id ?? ids.next('q'),
    prompt: spec.prompt,
    topicId: spec.topicId,
    timeLimitSec: spec.timeLimitSec ?? DEFAULT_TIME_LIMIT,
  };
}

function options(spec: QuestionSpec): { options: Option[]; correct: string[] } {
  const raw = spec.options ?? [];
  const opts = raw.map((o, i) => ({ id: o.id ?? String.fromCharCode(97 + i), text: o.text.trim() }));
  const correct = raw.flatMap((o, i) => (o.correct ? [opts[i].id] : []));
  return { options: opts, correct };
}

/**
 * Factory pattern: turns one "add question" request into the right concrete class.
 *
 * Open/Closed: new question types are added with register(); this class is not edited.
 */
export class QuestionFactory {
  private readonly creators = new Map<QuestionType | string, QuestionCreator>();

  constructor(private readonly ids: IdGenerator) {}

  register(type: string, creator: QuestionCreator): this {
    this.creators.set(type, creator);
    return this;
  }

  supportedTypes(): string[] {
    return [...this.creators.keys()];
  }

  create(spec: QuestionSpec): Question {
    const creator = this.creators.get(spec.type);
    if (!creator) throw new Error(`Unsupported question type "${spec.type}"`);
    if (!spec.topicId) throw new Error('Every question must belong to a topic');
    return creator(spec, this.ids);
  }

  /** The factory pre-loaded with the five built-in types. */
  static withDefaults(ids: IdGenerator): QuestionFactory {
    return new QuestionFactory(ids)
      .register('mcq', (spec, idg) => {
        const { options: opts, correct } = options(spec);
        if (correct.length !== 1) throw new Error('MCQ needs exactly one correct option');
        return new McqQuestion({ ...base(spec, idg), options: opts, correctOptionId: correct[0] });
      })
      .register('multi_select', (spec, idg) => {
        const { options: opts, correct } = options(spec);
        return new MultiSelectQuestion({ ...base(spec, idg), options: opts, correctOptionIds: correct });
      })
      .register('true_false', (spec, idg) => {
        if (typeof spec.answer !== 'boolean') throw new Error('True/false question needs a boolean answer');
        return new TrueFalseQuestion({ ...base(spec, idg), answer: spec.answer });
      })
      .register('numeric', (spec, idg) => {
        if (typeof spec.numericAnswer !== 'number') throw new Error('Numeric question needs numericAnswer');
        return new NumericQuestion({ ...base(spec, idg), answer: spec.numericAnswer, tolerance: spec.tolerance });
      })
      .register('poll', (spec, idg) => new PollQuestion({ ...base(spec, idg), options: options(spec).options }));
  }
}
