import { createHash, randomBytes } from 'crypto';
import { Clock } from '../infrastructure/time/Clock';
import { IdGenerator } from '../infrastructure/ids';
import { ForbiddenError, ValidationError } from './errors';
import { Workspace, WorkspaceRepository } from './ports';

export interface CreatedWorkspace {
  id: string;
  name: string;
  /** Shown once; the instructor keeps it in their browser / bookmarks the link. */
  key: string;
}

/**
 * Login-less instructors: a workspace is identified by an unguessable secret
 * key (like a private share link). No email, no password. Only a hash is stored.
 */
export class WorkspaceService {
  constructor(
    private readonly workspaces: WorkspaceRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  create(name?: string): CreatedWorkspace {
    const clean = (name ?? '').trim().slice(0, 60) || 'My classroom';
    const key = randomBytes(18).toString('base64url');
    const ws: Workspace = { id: this.ids.next('ws'), name: clean, keyHash: hashKey(key), createdAt: this.clock.now() };
    this.workspaces.save(ws);
    return { id: ws.id, name: ws.name, key };
  }

  /** Resolves a secret key to its workspace, or throws 403. */
  authenticate(key: unknown): Workspace {
    if (typeof key !== 'string' || key.length < 16 || key.length > 64) throw new ForbiddenError('Missing or invalid workspace key');
    const ws = this.workspaces.findByKeyHash(hashKey(key));
    if (!ws) throw new ForbiddenError('Unknown workspace key');
    return ws;
  }

  rename(ws: Workspace, name: string): Workspace {
    const clean = (name ?? '').trim().slice(0, 60);
    if (!clean) throw new ValidationError('Name is required');
    const updated = { ...ws, name: clean };
    this.workspaces.save(updated);
    return updated;
  }
}

export function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}
