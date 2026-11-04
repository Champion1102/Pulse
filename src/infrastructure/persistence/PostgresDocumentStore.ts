import { Pool } from 'pg';
import { DocKind, DocumentStore, StoredDoc } from './DocumentStore';

/**
 * Adapter: stores each aggregate (workspace, course tree, question, quiz,
 * draft, session record) as one JSONB row. docs/schema.sql shows the fully
 * normalised design; this document table is the pragmatic first step and
 * can be swapped without touching any service.
 */
export class PostgresDocumentStore implements DocumentStore {
  readonly name = 'postgres';
  private queue: Promise<unknown> = Promise.resolve();
  private readonly pool: Pool;

  constructor(connectionString: string) {
    const local = /localhost|127\.0\.0\.1/.test(connectionString);
    this.pool = new Pool({ connectionString, ssl: local ? false : { rejectUnauthorized: false }, max: 5 });
  }

  async init(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS pulse_documents (
        kind          TEXT NOT NULL,
        id            TEXT NOT NULL,
        workspace_id  TEXT NOT NULL,
        data          JSONB NOT NULL,
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (kind, id)
      );
      CREATE INDEX IF NOT EXISTS pulse_documents_ws_idx ON pulse_documents (workspace_id, kind);
    `);
  }

  async loadAll(): Promise<StoredDoc[]> {
    const { rows } = await this.pool.query(
      'SELECT kind, id, workspace_id, data FROM pulse_documents ORDER BY updated_at ASC',
    );
    return rows.map((r) => ({ kind: r.kind as DocKind, id: r.id, workspaceId: r.workspace_id, data: r.data }));
  }

  put(doc: StoredDoc): void {
    this.enqueue(() =>
      this.pool.query(
        `INSERT INTO pulse_documents (kind, id, workspace_id, data, updated_at)
         VALUES ($1, $2, $3, $4, now())
         ON CONFLICT (kind, id) DO UPDATE SET data = EXCLUDED.data, workspace_id = EXCLUDED.workspace_id, updated_at = now()`,
        [doc.kind, doc.id, doc.workspaceId, JSON.stringify(doc.data)],
      ),
    );
  }

  remove(kind: DocKind, id: string): void {
    this.enqueue(() => this.pool.query('DELETE FROM pulse_documents WHERE kind = $1 AND id = $2', [kind, id]));
  }

  async flush(): Promise<void> {
    await this.queue;
  }

  async close(): Promise<void> {
    await this.flush();
    await this.pool.end();
  }

  private enqueue(op: () => Promise<unknown>): void {
    this.queue = this.queue.then(op).catch((err) => console.error('[postgres] write failed:', err.message));
  }
}
