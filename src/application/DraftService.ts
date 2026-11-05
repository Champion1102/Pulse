import { GenerateRequest, QuestionGenerator } from '../ai/QuestionGenerator';
import { toSpec } from '../domain/questions/toSpec';
import { QuestionSpec } from '../domain/questions/types';
import { Clock } from '../infrastructure/time/Clock';
import { IdGenerator } from '../infrastructure/ids';
import { ConflictError, NotFoundError, ValidationError } from './errors';
import { DraftRepository, QuestionDraft } from './ports';
import { QuestionBankService } from './QuestionBankService';

/**
 * AI-drafted questions. The rule: the AI drafts, the instructor approves, and
 * the fixed grading code grades. Drafts never reach students until approve()
 * pushes them through the QuestionFactory into the bank.
 */
export class DraftService {
  constructor(
    private readonly generator: QuestionGenerator,
    private readonly drafts: DraftRepository,
    private readonly bank: QuestionBankService,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  get providerName(): string {
    return this.generator.name;
  }

  async generate(ws: string, req: GenerateRequest): Promise<QuestionDraft[]> {
    if (typeof req.notes !== 'string' || !req.notes.trim()) throw new ValidationError('Lecture notes are required');
    if (req.notes.length > 50_000) throw new ValidationError('Notes are too long (max 50,000 characters)');
    this.bank.listQuestions(ws, req.topicId); // throws if the topic is not in this workspace
    const count = Math.min(Math.max(Math.floor(req.count || 5), 1), 20);
    const specs = await this.generator.generate({ ...req, count });
    const created = specs.map((spec) => {
      const draft: QuestionDraft = {
        id: this.ids.next('draft'),
        workspaceId: ws,
        spec: { ...spec, topicId: req.topicId },
        source: this.generator.name,
        status: 'pending',
        createdAt: this.clock.now(),
      };
      this.drafts.save(draft);
      return draft;
    });
    return created;
  }

  list(ws: string, status?: QuestionDraft['status']): QuestionDraft[] {
    return this.drafts.list(ws, status).sort((a, b) => b.createdAt - a.createdAt);
  }

  /** Instructor may edit the draft while approving. Validation happens in the Factory. */
  approve(ws: string, id: string, edits?: Partial<QuestionSpec>): QuestionDraft {
    const draft = this.pending(ws, id);
    const question = this.bank.createAndSave(ws, { ...draft.spec, ...edits, id: undefined });
    draft.status = 'approved';
    draft.spec = toSpec(question);
    draft.approvedQuestionId = question.id;
    this.drafts.save(draft);
    return draft;
  }

  reject(ws: string, id: string): QuestionDraft {
    const draft = this.pending(ws, id);
    draft.status = 'rejected';
    this.drafts.save(draft);
    return draft;
  }

  private pending(ws: string, id: string): QuestionDraft {
    const draft = this.drafts.get(ws, id);
    if (!draft) throw new NotFoundError(`Draft "${id}" not found`);
    if (draft.status !== 'pending') throw new ConflictError(`Draft is already ${draft.status}`);
    return draft;
  }
}
