import { QuestionSpec } from '../domain/questions/types';
import { GenerateRequest, QuestionGenerator } from './QuestionGenerator';

/**
 * No-network fallback. Turns declarative sentences from the notes into
 * true/false drafts. Crude on purpose — it exists so the drafting flow works
 * with no API key and when the AI provider is down. The instructor still reviews.
 */
export class OfflineQuestionGenerator implements QuestionGenerator {
  readonly name = 'offline';

  async generate({ notes, topicId, count }: GenerateRequest): Promise<QuestionSpec[]> {
    const sentences = notes
      .split(/(?<=[.!?])\s+|\n+/)
      .map((s) => s.trim().replace(/^[-*•\d.)\s]+/, ''))
      .filter((s) => s.split(/\s+/).length >= 5 && s.length <= 200 && !s.endsWith('?'));

    return sentences.slice(0, Math.max(1, count)).map((sentence) => ({
      type: 'true_false' as const,
      prompt: `True or false: ${sentence.replace(/[.!]$/, '')}.`,
      topicId,
      answer: true,
      timeLimitSec: 20,
    }));
  }
}
