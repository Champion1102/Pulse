/**
 * Ports: interfaces the application layer depends on. Infrastructure provides
 * the implementations — Dependency Inversion.
 *
 * Every authoring entity belongs to a Workspace (login-less instructor space).
 */
import { TopicComponent } from '../domain/bank/TopicComponent';
import { Question, QuestionSpec } from '../domain/questions/types';
import { SessionRecord } from '../domain/reports/SessionRecord';

export interface Workspace {
  id: string;
  name: string;
  /** sha256 of the secret key; the key itself is only ever shown to the instructor. */
  keyHash: string;
  createdAt: number;
}

export interface Quiz {
  id: string;
  workspaceId: string;
  title: string;
  questionIds: string[];
  createdAt: number;
}

export type DraftStatus = 'pending' | 'approved' | 'rejected';

export interface QuestionDraft {
  id: string;
  workspaceId: string;
  spec: QuestionSpec;
  source: string;
  status: DraftStatus;
  createdAt: number;
  approvedQuestionId?: string;
}

export interface WorkspaceRepository {
  save(w: Workspace): void;
  get(id: string): Workspace | undefined;
  findByKeyHash(hash: string): Workspace | undefined;
}

export interface QuestionRepository {
  save(workspaceId: string, q: Question): void;
  get(workspaceId: string, id: string): Question | undefined;
  list(workspaceId: string, filter?: { topicIds?: string[] }): Question[];
  delete(workspaceId: string, id: string): boolean;
}

export interface TopicRepository {
  /** Saves (or re-saves after a change) a whole course tree. */
  saveRoot(workspaceId: string, root: TopicComponent): void;
  roots(workspaceId: string): TopicComponent[];
  find(workspaceId: string, id: string): TopicComponent | undefined;
}

export interface QuizRepository {
  save(q: Quiz): void;
  get(workspaceId: string, id: string): Quiz | undefined;
  list(workspaceId: string): Quiz[];
}

export interface DraftRepository {
  save(d: QuestionDraft): void;
  get(workspaceId: string, id: string): QuestionDraft | undefined;
  list(workspaceId: string, status?: DraftStatus): QuestionDraft[];
}

export interface SessionRecordRepository {
  save(r: SessionRecord): void;
  get(workspaceId: string, sessionId: string): SessionRecord | undefined;
  list(workspaceId: string): SessionRecord[];
}
