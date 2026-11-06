import { QuestionSpec } from '../../domain/questions/types';

/** Imported specs may omit topicId; the service fills in the target topic. */
export type ImportedSpec = Omit<QuestionSpec, 'topicId'> & { topicId?: string };

/** Adapter target: every external question source is adapted to this. */
export interface QuestionImporter {
  readonly format: string;
  parse(content: string): ImportedSpec[];
}
