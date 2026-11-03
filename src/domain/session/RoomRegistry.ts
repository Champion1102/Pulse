import { LiveSession } from './LiveSession';

/** What the application layer depends on (Dependency Inversion). */
export interface RoomStore {
  add(session: LiveSession): void;
  get(code: string): LiveSession | undefined;
  remove(code: string): void;
  has(code: string): boolean;
  all(): LiveSession[];
}

/**
 * Singleton pattern: the one in-memory list of live rooms on this server.
 *
 * Known limit (viva question!): this only works with ONE server process.
 * With two servers behind a load balancer, players of the same room may land on
 * different machines. Fix: sticky sessions + a shared store / Redis pub/sub
 * (see docs/scaling.md). Because the app depends on the RoomStore interface,
 * swapping in a RedisRoomStore needs no change to the engine.
 *
 * The composition root fetches the instance once and injects it, so nothing
 * else calls getInstance() — tests can create isolated stores via resetForTests().
 */
export class RoomRegistry implements RoomStore {
  private static instance: RoomRegistry | null = null;
  private readonly rooms = new Map<string, LiveSession>();

  private constructor() {}

  static getInstance(): RoomRegistry {
    if (!RoomRegistry.instance) RoomRegistry.instance = new RoomRegistry();
    return RoomRegistry.instance;
  }

  /** Test-only: drop the singleton so each test starts clean. */
  static resetForTests(): void {
    RoomRegistry.instance = null;
  }

  add(session: LiveSession): void {
    const code = session.code.toUpperCase();
    if (this.rooms.has(code)) throw new Error(`Room ${code} already exists`);
    this.rooms.set(code, session);
  }

  get(code: string): LiveSession | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  has(code: string): boolean {
    return this.rooms.has(code.toUpperCase());
  }

  remove(code: string): void {
    this.rooms.delete(code.toUpperCase());
  }

  all(): LiveSession[] {
    return [...this.rooms.values()];
  }
}
