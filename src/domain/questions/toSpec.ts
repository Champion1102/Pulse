import { McqQuestion } from './McqQuestion';
import { MultiSelectQuestion } from './MultiSelectQuestion';
import { NumericQuestion } from './NumericQuestion';
import { PollQuestion } from './PollQuestion';
import { TrueFalseQuestion } from './TrueFalseQuestion';
import { Question, QuestionSpec } from './types';

/** Serialises a question back into plain data (for export / persistence / instructor view). */
export function toSpec(q: Question): QuestionSpec {
  const common = { id: q.id, type: q.type, prompt: q.prompt, topicId: q.topicId, timeLimitSec: q.timeLimitSec };
  if (q instanceof McqQuestion) {
    return { ...common, options: q.options.map((o) => ({ ...o, correct: o.id === q.correctOptionId })) };
  }
  if (q instanceof MultiSelectQuestion) {
    return { ...common, options: q.options.map((o) => ({ ...o, correct: q.correctOptionIds.has(o.id) })) };
  }
  if (q instanceof TrueFalseQuestion) return { ...common, answer: q.answer };
  if (q instanceof NumericQuestion) return { ...common, numericAnswer: q.answer, tolerance: q.tolerance };
  if (q instanceof PollQuestion) return { ...common, options: q.options.map((o) => ({ ...o })) };
  return common;
}
