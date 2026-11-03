import { Clock, Scheduler } from '../../infrastructure/time/Clock';
import { EventBus, PlayerRef } from '../events/EventBus';
import { AnswerPayload, Question } from '../questions/types';
import { Leaderboard, LeaderboardEntry } from '../scoring/Leaderboard';
import { Scorer } from '../scoring/Scorer';
import { ScoringStrategy } from '../scoring/ScoringStrategy';
import { Round, RoundOutcome, SubmitResult } from './Round';
import { RoundFactory } from './RoundFactory';

export type SessionState = 'lobby' | 'in_round' | 'between_rounds' | 'ended';

export interface Player extends PlayerRef {
  connected: boolean;
}

export interface LiveSessionDeps {
  sessionId: string;
  /** Owning instructor workspace (for reports). */
  workspaceId: string;
  code: string;
  quizId: string;
  quizTitle: string;
  questions: Question[];
  scoring: ScoringStrategy;
  bus: EventBus;
  clock: Clock;
  scheduler: Scheduler;
  roundFactory: RoundFactory;
  newPlayerId: () => string;
  maxPlayers?: number;
}

export interface SessionSnapshot {
  sessionId: string;
  code: string;
  quizTitle: string;
  state: SessionState;
  scoringMode: string;
  roundIndex: number;
  totalRounds: number;
  players: Player[];
  leaderboard: LeaderboardEntry[];
}

/**
 * One live room. Orchestrates players and rounds and delegates:
 *   rounds -> Round (template), scoring -> Scorer (strategy), ranking -> Leaderboard,
 *   notifications -> EventBus (observer).
 */
export class LiveSession {
  private state: SessionState = 'lobby';
  private readonly players = new Map<string, Player>();
  private readonly scorer: Scorer;
  private currentRound: Round | null = null;
  private pendingRound: Promise<RoundOutcome> | null = null;
  private roundIndex = -1;
  private readonly outcomes: RoundOutcome[] = [];
  readonly createdAt: number;

  constructor(private readonly deps: LiveSessionDeps) {
    if (deps.questions.length === 0) throw new Error('A session needs at least one question');
    this.scorer = new Scorer(deps.scoring);
    this.createdAt = deps.clock.now();
  }

  get id(): string {
    return this.deps.sessionId;
  }
  get workspaceId(): string {
    return this.deps.workspaceId;
  }
  get code(): string {
    return this.deps.code;
  }
  get quizId(): string {
    return this.deps.quizId;
  }
  get currentState(): SessionState {
    return this.state;
  }
  get hasMoreRounds(): boolean {
    return this.roundIndex + 1 < this.deps.questions.length;
  }

  // ---- players -----------------------------------------------------------

  join(nickname: string, existingPlayerId?: string): Player {
    if (this.state === 'ended') throw new Error('This session has ended');

    if (existingPlayerId && this.players.has(existingPlayerId)) {
      const p = this.players.get(existingPlayerId)!;
      p.connected = true;
      this.publishPlayer('player.joined', p);
      return { ...p };
    }

    const clean = nickname.trim().slice(0, 24);
    if (!clean) throw new Error('Nickname is required');
    const taken = [...this.players.values()].some((p) => p.nickname.toLowerCase() === clean.toLowerCase());
    if (taken) throw new Error('That nickname is already taken in this room');
    if (this.players.size >= (this.deps.maxPlayers ?? 500)) throw new Error('Room is full');

    const player: Player = { id: this.deps.newPlayerId(), nickname: clean, connected: true };
    this.players.set(player.id, player);
    this.scorer.ensurePlayer(player.id);
    this.publishPlayer('player.joined', player);
    return { ...player };
  }

  disconnect(playerId: string): void {
    const p = this.players.get(playerId);
    if (!p || !p.connected) return;
    p.connected = false;
    this.publishPlayer('player.left', p);
  }

  // ---- rounds ------------------------------------------------------------

  /**
   * Starts the next question. Precondition errors throw synchronously; the
   * returned promise resolves when the round is graded and the leaderboard updated.
   */
  startNextRound(): Promise<RoundOutcome> {
    if (this.state === 'ended') throw new Error('Session has ended');
    if (this.state === 'in_round') throw new Error('A round is already running');
    if (!this.hasMoreRounds) throw new Error('No more questions in this quiz');

    this.roundIndex += 1;
    const question = this.deps.questions[this.roundIndex];
    this.state = 'in_round';
    this.currentRound = this.deps.roundFactory.create(question, {
      roomCode: this.code,
      sessionId: this.id,
      roundIndex: this.roundIndex,
      totalRounds: this.deps.questions.length,
      bus: this.deps.bus,
      clock: this.deps.clock,
      scheduler: this.deps.scheduler,
      activePlayerIds: () => [...this.players.values()].filter((p) => p.connected).map((p) => p.id),
    });

    this.pendingRound = this.currentRound.run().then((outcome) => {
      this.outcomes.push(outcome);
      this.applyScores(outcome);
      if (this.state === 'in_round') this.state = 'between_rounds';
      this.pendingRound = null;
      return outcome;
    });
    return this.pendingRound;
  }

  submitAnswer(playerId: string, answer: AnswerPayload): SubmitResult {
    if (!this.players.has(playerId)) return { ok: false, reason: 'Unknown player' };
    if (this.state !== 'in_round' || !this.currentRound) return { ok: false, reason: 'No question is open' };
    return this.currentRound.submit(playerId, answer);
  }

  /** Instructor closes the current round before the timer runs out. */
  endRoundEarly(): void {
    this.currentRound?.close();
  }

  /** Ends the session. If a round is running it is closed and graded first. */
  async end(): Promise<LeaderboardEntry[]> {
    if (this.state === 'ended') return this.leaderboard();
    if (this.pendingRound) {
      this.currentRound?.close();
      await this.pendingRound;
    }
    this.state = 'ended';
    const leaderboard = this.leaderboard();
    this.deps.bus.publish('session.ended', { roomCode: this.code, sessionId: this.id, leaderboard });
    return leaderboard;
  }

  // ---- read models -------------------------------------------------------

  leaderboard(): LeaderboardEntry[] {
    return Leaderboard.rank(this.scorer.all(), this.nicknames());
  }

  roundOutcomes(): RoundOutcome[] {
    return [...this.outcomes];
  }

  playerList(): Player[] {
    return [...this.players.values()].map((p) => ({ ...p }));
  }

  snapshot(): SessionSnapshot {
    return {
      sessionId: this.id,
      code: this.code,
      quizTitle: this.deps.quizTitle,
      state: this.state,
      scoringMode: this.scorer.mode.id,
      roundIndex: this.roundIndex,
      totalRounds: this.deps.questions.length,
      players: this.playerList(),
      leaderboard: this.leaderboard(),
    };
  }

  // ---- internals ---------------------------------------------------------

  private applyScores(outcome: RoundOutcome): void {
    if (outcome.gradable) {
      this.scorer.applyRound(
        outcome.answers
          .filter((a) => a.grade !== null)
          .map((a) => ({ playerId: a.playerId, grade: a.grade!, responseTimeMs: a.responseTimeMs })),
        outcome.participants,
        outcome.timeLimitMs,
      );
    } else {
      this.scorer.markUngradedRound();
    }
    this.deps.bus.publish('leaderboard.updated', {
      roomCode: this.code,
      roundIndex: this.roundIndex,
      entries: this.leaderboard(),
    });
  }

  private nicknames(): Map<string, string> {
    return new Map([...this.players.values()].map((p) => [p.id, p.nickname]));
  }

  private publishPlayer(type: 'player.joined' | 'player.left', p: Player): void {
    const playerCount = [...this.players.values()].filter((x) => x.connected).length;
    this.deps.bus.publish(type, { roomCode: this.code, player: { id: p.id, nickname: p.nickname }, playerCount });
  }
}
