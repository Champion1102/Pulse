import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { QuestionSpec } from '../domain/questions/types';
import { GenerateRequest, QuestionGenerator } from './QuestionGenerator';

const DraftSchema = z.object({
  questions: z.array(
    z.object({
      type: z.enum(['mcq', 'multi_select', 'true_false', 'numeric']),
      prompt: z.string(),
      options: z.array(z.object({ text: z.string(), correct: z.boolean() })),
      answer: z.boolean().nullable(),
      numericAnswer: z.number().nullable(),
      tolerance: z.number().nullable(),
    }),
  ),
});

const SYSTEM_PROMPT = `You write draft quiz questions for a university instructor, based only on the lecture notes provided.
An instructor reviews every draft before students see it, so prefer clear, unambiguous questions that test understanding rather than trivia.
Rules per type:
- mcq: 3-4 options, exactly one has correct=true. answer/numericAnswer/tolerance are null.
- multi_select: 4-5 options, two or more have correct=true. answer/numericAnswer/tolerance are null.
- true_false: options is an empty array, answer is true or false.
- numeric: options is an empty array, numericAnswer is the number, tolerance is the allowed error (0 for exact).
Keep each prompt under 200 characters and each option under 80 characters.`;

/**
 * Adapter pattern: adapts the Claude Messages API to Pulse's QuestionGenerator
 * interface. Nothing outside this file knows which AI vendor is used.
 */
export class AnthropicQuestionGenerator implements QuestionGenerator {
  readonly name = 'anthropic';

  constructor(
    private readonly client: Anthropic = new Anthropic(),
    private readonly model = 'claude-opus-5-5',
  ) {}

  async generate({ notes, topicId, count, types }: GenerateRequest): Promise<QuestionSpec[]> {
    const allowed = types?.length ? types.join(', ') : 'mcq, multi_select, true_false, numeric';
    const response = await this.client.beta.messages.parse({
      model: this.model,
      max_tokens: 16000,
      // Server-side refusal fallback: if the model declines, the API retries on a fallback model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: betaZodOutputFormat(DraftSchema) },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Write ${count} draft question(s). Allowed types: ${allowed}.\n\n<lecture_notes>\n${notes}\n</lecture_notes>`,
        },
      ],
    });

    if (response.stop_reason === 'refusal') throw new Error('AI provider declined the request');
    const parsed = response.parsed_output;
    if (!parsed) throw new Error(`AI provider returned no parseable drafts (stop_reason=${response.stop_reason})`);

    return parsed.questions.slice(0, count).map((q) => ({
      type: q.type,
      prompt: q.prompt,
      topicId,
      timeLimitSec: 20,
      options: q.options.length ? q.options : undefined,
      answer: q.answer ?? undefined,
      numericAnswer: q.numericAnswer ?? undefined,
      tolerance: q.tolerance ?? undefined,
    }));
  }
}
