import { QuestionSpec, QuestionType } from '../domain/questions/types';

export interface GenerateRequest {
  notes: string;
  topicId: string;
  count: number;
  types?: Exclude<QuestionType, 'poll'>[];
}

/**
 * Dependency Inversion: the app depends on this interface, never on an AI vendor.
 * Implementations only DRAFT questions. Drafts are validated by the
 * QuestionFactory and approved by an instructor before students see them, and
 * grading is always done by the fixed question classes — never by the AI.
 */
export interface QuestionGenerator {
  readonly name: string;
  generate(req: GenerateRequest): Promise<QuestionSpec[]>;
}
