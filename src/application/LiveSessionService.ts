import { randomBytes, timingSafeEqual } from 'crypto';
import { EventBus } from '../domain/events/EventBus';
import { AnswerPayload } from '../domain/questions/types';
import { ScoringRegistry } from '../domain/scoring/ScoringRegistry';
import { LiveSession, Player, SessionSnapshot } from '../domain/session/LiveSession';
import { RoomCodeGenerator } from '../domain/session/RoomCodeGenerator';
import { RoomStore } from '../domain/session/RoomRegistry';
import { RoundFactory } from '../domain/session/RoundFactory';
import { Clock, Scheduler } from '../infrastructure/time/Clock';
import { IdGenerator } from '../infrastructure/ids';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from './errors';
import { QuestionRepository } from './ports';
import { QuizService } from './QuizService';

export interface StartedSession {
  sessionId: string;
  code: string;
  hostKey: string;
}

export interface LiveSessionServiceDeps {
  rooms: RoomStore;
  quizzes: QuizService;
  questions: QuestionRepository;
  scoring: ScoringRegistry;
  bus: EventBus;
  clock: Clock;
  scheduler: Scheduler;
  roundFactory: RoundFactory;
  codes: RoomCodeGenerator;
  ids: IdGenerator;
  /** How long an ended room stays around so late reconnects can still see results. */
  endedRoomTtlMs?: number;
}

/** Live-engine use-cases. Host-only actions require the room's hostKey. */
export class LiveSessionService {
  private readonly hostKeys = new Map<string, string>();

  constructor(private readonly d: LiveSessionServiceDeps) {}

  start(ws: string, quizId: string, scoringMode: string): StartedSession {
    const quiz = this.d.quizzes.get(ws, quizId);
    let scoring;
    try {
      scoring = this.d.scoring.get(scoringMode);
    } catch (err) {
      throw new ValidationError((err as Error).message);
    }
    const questions = quiz.questionIds.map((id) => {
      const q = this.d.questions.get(ws, id);
      if (!q) throw new ValidationError(`Quiz references a deleted question (${id})`);
      return q;
    });

    const code = this.d.codes.generate((c) => this.d.rooms.has(c));
    const session = new LiveSession({
      sessionId: this.d.ids.next('session'),
      workspaceId: ws,
      code,
      quizId: quiz.id,
      quizTitle: quiz.title,
      questions,
      scoring,
      bus: this.d.bus,
      clock: this.d.clock,
      scheduler: this.d.scheduler,
      roundFactory: this.d.roundFactory,
      newPlayerId: () => this.d.ids.next('player'),
    });
    this.d.rooms.add(session);
    const hostKey = randomBytes(16).toString('hex');
    this.hostKeys.set(code, hostKey);
    return { sessionId: session.id, code, hostKey };
  }

  join(code: string, nickname: string, playerId?: string): { player: Player; snapshot: SessionSnapshot } {
    const room = this.room(code);
    try {
      const player = room.join(nickname, playerId);
      return { player, snapshot: room.snapshot() };
    } catch (err) {
      throw new ConflictError((err as Error).message);
    }
  }

  leave(code: string, playerId: string): void {
    this.d.rooms.get(code)?.disconnect(playerId);
  }

  answer(code: string, playerId: string, payload: AnswerPayload): void {
    const result = this.room(code).submitAnswer(playerId, payload);
    if (!result.ok) throw new ConflictError(result.reason);
  }

  nextRound(code: string, hostKey: string): void {
    const room = this.hostRoom(code, hostKey);
    try {
      room.startNextRound().catch((err) => console.error('[live] round failed', err));
    } catch (err) {
      throw new ConflictError((err as Error).message);
    }
  }

  endRound(code: string, hostKey: string): void {
    this.hostRoom(code, hostKey).endRoundEarly();
  }

  async endSession(code: string, hostKey: string): Promise<SessionSnapshot> {
    const room = this.hostRoom(code, hostKey);
    await room.end();
    const ttl = this.d.endedRoomTtlMs ?? 30 * 60 * 1000;
    this.d.scheduler.schedule(ttl, () => {
      this.d.rooms.remove(code);
      this.hostKeys.delete(code.toUpperCase());
    });
    return room.snapshot();
  }

  snapshot(code: string): SessionSnapshot {
    return this.room(code).snapshot();
  }

  isHost(code: string, hostKey: string): boolean {
    const expected = this.hostKeys.get(code.toUpperCase());
    if (!expected || typeof hostKey !== 'string' || hostKey.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(hostKey));
  }

  private room(code: string): LiveSession {
    const room = typeof code === 'string' ? this.d.rooms.get(code.trim()) : undefined;
    if (!room) throw new NotFoundError('No live session with that room code');
    return room;
  }

  private hostRoom(code: string, hostKey: string): LiveSession {
    const room = this.room(code);
    if (!this.isHost(code, hostKey)) throw new ForbiddenError('Only the instructor can do that');
    return room;
  }
}
