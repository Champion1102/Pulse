import { AdapterRegistry } from '../adapters/AdapterRegistry';
import { QuestionImporter } from '../adapters/importers/QuestionImporter';
import { TopicComponent, TopicGroup, TopicLeaf, TopicNodeJSON } from '../domain/bank/TopicComponent';
import { QuestionFactory } from '../domain/questions/QuestionFactory';
import { toSpec } from '../domain/questions/toSpec';
import { Question, QuestionSpec } from '../domain/questions/types';
import { IdGenerator } from '../infrastructure/ids';
import { NotFoundError, ValidationError } from './errors';
import { QuestionRepository, TopicRepository } from './ports';

export interface ImportResult {
  imported: QuestionSpec[];
  errors: string[];
}

/** Authoring use-cases: the topic tree and the questions in it. Every call is scoped to a workspace. */
export class QuestionBankService {
  constructor(
    private readonly topics: TopicRepository,
    private readonly questions: QuestionRepository,
    private readonly factory: QuestionFactory,
    private readonly importers: AdapterRegistry<QuestionImporter>,
    private readonly ids: IdGenerator,
  ) {}

  // ---- topic tree (Composite) -------------------------------------------

  tree(ws: string): TopicNodeJSON[] {
    return this.topics.roots(ws).map((r) => r.toJSON());
  }

  createCourse(ws: string, name: string): TopicNodeJSON {
    const course = new TopicGroup(this.ids.next('course'), this.requireName(name), 'course');
    this.topics.saveRoot(ws, course);
    return course.toJSON();
  }

  createUnit(ws: string, courseId: string, name: string): TopicNodeJSON {
    const unit = new TopicGroup(this.ids.next('unit'), this.requireName(name), 'unit');
    const course = this.group(ws, courseId, 'course');
    course.add(unit);
    this.topics.saveRoot(ws, course);
    return unit.toJSON();
  }

  createTopic(ws: string, unitId: string, name: string): TopicNodeJSON {
    const topic = new TopicLeaf(this.ids.next('topic'), this.requireName(name));
    const unit = this.group(ws, unitId, 'unit');
    unit.add(topic);
    this.topics.saveRoot(ws, rootOf(unit));
    return topic.toJSON();
  }

  // ---- questions (Factory) ----------------------------------------------

  addQuestion(ws: string, spec: QuestionSpec): QuestionSpec {
    return toSpec(this.createAndSave(ws, spec));
  }

  /** Create through the Factory (validates) and persist. Used by drafts and imports too. */
  createAndSave(ws: string, spec: QuestionSpec): Question {
    const node = this.topics.find(ws, spec?.topicId);
    if (!node || node.level !== 'topic') throw new ValidationError('Pick a topic for this question');
    let question: Question;
    try {
      question = this.factory.create(spec);
    } catch (err) {
      throw new ValidationError((err as Error).message);
    }
    this.questions.save(ws, question);
    return question;
  }

  /** All questions under any node: a topic, a whole unit, or a whole course. */
  listQuestions(ws: string, nodeId?: string): QuestionSpec[] {
    if (!nodeId) return this.questions.list(ws).map(toSpec);
    const node = this.topics.find(ws, nodeId);
    if (!node) throw new NotFoundError(`Topic node "${nodeId}" not found`);
    return this.questions.list(ws, { topicIds: node.leafIds() }).map(toSpec);
  }

  getQuestion(ws: string, id: string): Question {
    const q = this.questions.get(ws, id);
    if (!q) throw new NotFoundError(`Question "${id}" not found`);
    return q;
  }

  deleteQuestion(ws: string, id: string): void {
    if (!this.questions.delete(ws, id)) throw new NotFoundError(`Question "${id}" not found`);
  }

  supportedTypes(): string[] {
    return this.factory.supportedTypes();
  }

  // ---- import (Adapter) --------------------------------------------------

  importQuestions(ws: string, format: string, content: string, defaultTopicId: string): ImportResult {
    let parsed;
    try {
      parsed = this.importers.get(format).parse(String(content ?? ''));
    } catch (err) {
      throw new ValidationError((err as Error).message);
    }
    const result: ImportResult = { imported: [], errors: [] };
    parsed.forEach((spec, i) => {
      try {
        result.imported.push(this.addQuestion(ws, { ...spec, topicId: spec.topicId ?? defaultTopicId }));
      } catch (err) {
        result.errors.push(`Item ${i + 1}: ${(err as Error).message}`);
      }
    });
    return result;
  }

  importFormats(): string[] {
    return this.importers.formats();
  }

  private group(ws: string, id: string, level: 'course' | 'unit'): TopicGroup {
    const node = this.topics.find(ws, id);
    if (!(node instanceof TopicGroup) || node.level !== level) throw new NotFoundError(`${level} "${id}" not found`);
    return node;
  }

  private requireName(name: string): string {
    if (typeof name !== 'string' || !name.trim()) throw new ValidationError('Name is required');
    return name.trim().slice(0, 80);
  }
}

function rootOf(node: TopicComponent): TopicComponent {
  let n = node;
  while (n.parent) n = n.parent;
  return n;
}
