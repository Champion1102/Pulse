import { QuestionSpec } from '../domain/questions/types';
import { GenerateRequest, QuestionGenerator } from './QuestionGenerator';

/** Tries the primary generator and falls back to the secondary if it fails. */
export class FallbackQuestionGenerator implements QuestionGenerator {
  constructor(
    private readonly primary: QuestionGenerator,
    private readonly secondary: QuestionGenerator,
    private readonly log: (msg: string) => void = console.warn,
  ) {}

  get name(): string {
    return `${this.primary.name} (fallback: ${this.secondary.name})`;
  }

  async generate(req: GenerateRequest): Promise<QuestionSpec[]> {
    try {
      const out = await this.primary.generate(req);
      if (out.length > 0) return out;
      this.log(`[ai] ${this.primary.name} returned no drafts, using ${this.secondary.name}`);
    } catch (err) {
      this.log(`[ai] ${this.primary.name} failed (${(err as Error).message}), using ${this.secondary.name}`);
    }
    return this.secondary.generate(req);
  }
}
