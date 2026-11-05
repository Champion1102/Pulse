import { Clock } from '../infrastructure/time/Clock';
import { IdGenerator } from '../infrastructure/ids';
import { NotFoundError, ValidationError } from './errors';
import { Quiz, QuizRepository, QuestionRepository } from './ports';

export class QuizService {
  constructor(
    private readonly quizzes: QuizRepository,
    private readonly questions: QuestionRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  create(ws: string, title: string, questionIds: string[]): Quiz {
    if (typeof title !== 'string' || !title.trim()) throw new ValidationError('Quiz title is required');
    if (!Array.isArray(questionIds) || !questionIds.length) throw new ValidationError('A quiz needs at least one question');
    const missing = questionIds.filter((id) => !this.questions.get(ws, id));
    if (missing.length) throw new ValidationError(`Unknown question(s): ${missing.join(', ')}`);
    const quiz: Quiz = {
      id: this.ids.next('quiz'),
      workspaceId: ws,
      title: title.trim().slice(0, 120),
      questionIds: [...questionIds],
      createdAt: this.clock.now(),
    };
    this.quizzes.save(quiz);
    return quiz;
  }

  get(ws: string, id: string): Quiz {
    const quiz = this.quizzes.get(ws, id);
    if (!quiz) throw new NotFoundError(`Quiz "${id}" not found`);
    return quiz;
  }

  list(ws: string): Quiz[] {
    return this.quizzes.list(ws).sort((a, b) => b.createdAt - a.createdAt);
  }
}
