import {
  DraftRepository,
  DraftStatus,
  Quiz,
  QuizRepository,
  QuestionDraft,
  QuestionRepository,
  SessionRecordRepository,
  TopicRepository,
  Workspace,
  WorkspaceRepository,
} from '../../application/ports';
import { TopicComponent } from '../../domain/bank/TopicComponent';
import { toSpec } from '../../domain/questions/toSpec';
import { Question } from '../../domain/questions/types';
import { SessionRecord } from '../../domain/reports/SessionRecord';
import { DocumentStore, NullDocumentStore } from '../persistence/DocumentStore';

/*
 * In-memory working set + write-through to a DocumentStore (memory-only or Postgres).
 * Reads never hit the database, so the live engine stays synchronous and fast.
 */

const noStore = new NullDocumentStore();

export class InMemoryWorkspaceRepository implements WorkspaceRepository {
  private readonly items = new Map<string, Workspace>();
  constructor(private readonly store: DocumentStore = noStore) {}
  save(w: Workspace, persist = true): void {
    this.items.set(w.id, w);
    if (persist) this.store.put({ kind: 'workspace', id: w.id, workspaceId: w.id, data: w });
  }
  get(id: string): Workspace | undefined {
    return this.items.get(id);
  }
  findByKeyHash(hash: string): Workspace | undefined {
    for (const w of this.items.values()) if (w.keyHash === hash) return w;
    return undefined;
  }
}

export class InMemoryQuestionRepository implements QuestionRepository {
  private readonly items = new Map<string, { ws: string; q: Question }>();
  constructor(private readonly store: DocumentStore = noStore) {}
  save(ws: string, q: Question, persist = true): void {
    this.items.set(q.id, { ws, q });
    if (persist) this.store.put({ kind: 'question', id: q.id, workspaceId: ws, data: toSpec(q) });
  }
  get(ws: string, id: string): Question | undefined {
    const hit = this.items.get(id);
    return hit && hit.ws === ws ? hit.q : undefined;
  }
  list(ws: string, filter?: { topicIds?: string[] }): Question[] {
    const ids = filter?.topicIds ? new Set(filter.topicIds) : null;
    return [...this.items.values()].filter((x) => x.ws === ws && (!ids || ids.has(x.q.topicId))).map((x) => x.q);
  }
  delete(ws: string, id: string): boolean {
    if (!this.get(ws, id)) return false;
    this.items.delete(id);
    this.store.remove('question', id);
    return true;
  }
}

export class InMemoryTopicRepository implements TopicRepository {
  private readonly rootsByWs = new Map<string, Map<string, TopicComponent>>();
  constructor(private readonly store: DocumentStore = noStore) {}
  saveRoot(ws: string, root: TopicComponent, persist = true): void {
    if (!this.rootsByWs.has(ws)) this.rootsByWs.set(ws, new Map());
    this.rootsByWs.get(ws)!.set(root.id, root);
    if (persist) this.store.put({ kind: 'course', id: root.id, workspaceId: ws, data: root.toJSON() });
  }
  roots(ws: string): TopicComponent[] {
    return [...(this.rootsByWs.get(ws)?.values() ?? [])];
  }
  find(ws: string, id: string): TopicComponent | undefined {
    for (const r of this.roots(ws)) {
      const hit = r.find(id);
      if (hit) return hit;
    }
    return undefined;
  }
}

export class InMemoryQuizRepository implements QuizRepository {
  private readonly items = new Map<string, Quiz>();
  constructor(private readonly store: DocumentStore = noStore) {}
  save(q: Quiz, persist = true): void {
    const copy = { ...q, questionIds: [...q.questionIds] };
    this.items.set(q.id, copy);
    if (persist) this.store.put({ kind: 'quiz', id: q.id, workspaceId: q.workspaceId, data: copy });
  }
  get(ws: string, id: string): Quiz | undefined {
    const q = this.items.get(id);
    return q && q.workspaceId === ws ? q : undefined;
  }
  list(ws: string): Quiz[] {
    return [...this.items.values()].filter((q) => q.workspaceId === ws);
  }
}

export class InMemoryDraftRepository implements DraftRepository {
  private readonly items = new Map<string, QuestionDraft>();
  constructor(private readonly store: DocumentStore = noStore) {}
  save(d: QuestionDraft, persist = true): void {
    this.items.set(d.id, d);
    if (persist) this.store.put({ kind: 'draft', id: d.id, workspaceId: d.workspaceId, data: d });
  }
  get(ws: string, id: string): QuestionDraft | undefined {
    const d = this.items.get(id);
    return d && d.workspaceId === ws ? d : undefined;
  }
  list(ws: string, status?: DraftStatus): QuestionDraft[] {
    return [...this.items.values()].filter((d) => d.workspaceId === ws && (!status || d.status === status));
  }
}

export class InMemorySessionRecordRepository implements SessionRecordRepository {
  private readonly items = new Map<string, SessionRecord>();
  constructor(private readonly store: DocumentStore = noStore) {}
  save(r: SessionRecord, persist = true): void {
    this.items.set(r.sessionId, r);
    if (persist) this.store.put({ kind: 'session', id: r.sessionId, workspaceId: r.workspaceId, data: r });
  }
  get(ws: string, sessionId: string): SessionRecord | undefined {
    const r = this.items.get(sessionId);
    return r && r.workspaceId === ws ? r : undefined;
  }
  list(ws: string): SessionRecord[] {
    return [...this.items.values()].filter((r) => r.workspaceId === ws);
  }
}
