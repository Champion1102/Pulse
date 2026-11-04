/**
 * Durable storage port. Repositories keep their working set in memory (fast,
 * synchronous for the live engine) and write every change through to a
 * DocumentStore. On boot, everything is loaded back (see config/hydrate.ts).
 */
export type DocKind = 'workspace' | 'course' | 'question' | 'quiz' | 'draft' | 'session';

export interface StoredDoc {
  kind: DocKind;
  id: string;
  workspaceId: string;
  data: unknown;
}

export interface DocumentStore {
  readonly name: string;
  loadAll(): Promise<StoredDoc[]>;
  /** Fire-and-forget write; ordering is preserved. */
  put(doc: StoredDoc): void;
  remove(kind: DocKind, id: string): void;
  /** Resolves once all queued writes are done (shutdown, tests). */
  flush(): Promise<void>;
}

/** Memory-only mode: nothing survives a restart. Default for dev and tests. */
export class NullDocumentStore implements DocumentStore {
  readonly name = 'memory';
  async loadAll(): Promise<StoredDoc[]> {
    return [];
  }
  put(): void {}
  remove(): void {}
  async flush(): Promise<void> {}
}
