/**
 * Core question contracts.
 *
 * Interface Segregation: every question is Renderable, but only questions that
 * have a right answer are Gradable. A poll implements Renderable only, so it is
 * never asked to support a grade() method it cannot honour (Liskov Substitution).
 */

export type QuestionType = 'mcq' | 'multi_select' | 'true_false' | 'numeric' | 'poll';

export interface Option {
  id: string;
  text: string;
}

/** What a student's phone receives. Never contains the correct answer. */
export interface QuestionView {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: Option[];
  /** Hint for the client UI: single tap vs. tick several vs. number pad. */
  input: 'single' | 'multiple' | 'number';
  timeLimitSec: number;
}

/** A player's answer as it arrives over the wire. */
export type AnswerPayload =
  | { kind: 'choice'; optionIds: string[] }
  | { kind: 'numeric'; value: number };

export interface GradeResult {
  /** True only when the answer is fully right. */
  correct: boolean;
  /** 0..1, allows partial credit (multi-select). */
  fraction: number;
}

/** Anything that can be shown to players. */
export interface Renderable {
  readonly id: string;
  readonly type: QuestionType;
  readonly prompt: string;
  readonly topicId: string;
  readonly timeLimitSec: number;
  render(): QuestionView;
  /** Validates the *shape* of an answer for this question (not its correctness). */
  accepts(answer: AnswerPayload): boolean;
}

/** Only questions with a right answer implement this. */
export interface Gradable {
  grade(answer: AnswerPayload): GradeResult;
  /** Revealed to everyone after the round closes. */
  correctAnswer(): AnswerPayload;
}

export type Question = Renderable | (Renderable & Gradable);

export function isGradable(q: Renderable): q is Renderable & Gradable {
  return typeof (q as Partial<Gradable>).grade === 'function';
}

/** Plain data used to create/persist a question (input to the Factory). */
export interface QuestionSpec {
  id?: string;
  type: QuestionType;
  prompt: string;
  topicId: string;
  timeLimitSec?: number;
  options?: Array<{ id?: string; text: string; correct?: boolean }>;
  /** true/false questions */
  answer?: boolean;
  /** numeric questions */
  numericAnswer?: number;
  tolerance?: number;
}
