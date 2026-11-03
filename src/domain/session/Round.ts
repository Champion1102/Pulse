import { Clock, Scheduler, TimerHandle } from '../../infrastructure/time/Clock';
import { EventBus, PlayerRoundResult, RevealView } from '../events/EventBus';
import { AnswerPayload, GradeResult, Renderable } from '../questions/types';

export interface RoundContext {
  roomCode: string;
  sessionId: string;
  roundIndex: number;
  totalRounds: number;
  bus: EventBus;
  clock: Clock;
  scheduler: Scheduler;
  /** Players currently able to answer; used to close the round early once all have answered. */
  activePlayerIds: () => string[];
}

export interface CollectedAnswer {
  playerId: string;
  answer: AnswerPayload;
  responseTimeMs: number;
}

export interface GradedEntry extends CollectedAnswer {
  grade: GradeResult | null;
}

export interface RoundOutcome {
  questionId: string;
  topicId: string;
  gradable: boolean;
  timeLimitMs: number;
  answers: GradedEntry[];
  participants: string[];
  reveal: RevealView;
}

export type SubmitResult = { ok: true } | { ok: false; reason: string };
export type RoundPhase = 'pending' | 'open' | 'closed';

/**
 * Template Method pattern.
 *
 * Every round runs the same fixed skeleton in run():
 *   send question -> timer -> collect -> grade -> reveal
 *
 * Subclasses customise only the two hooks that differ by question type:
 *   gradeAnswers()  and  buildReveal()
 * run() itself must not be overridden.
 */
export abstract class Round {
  private phase: RoundPhase = 'pending';
  private startedAt = 0;
  private timer: TimerHandle | null = null;
  private closeRound: (() => void) | null = null;
  private readonly answers = new Map<string, CollectedAnswer>();

  constructor(
    protected readonly question: Renderable,
    protected readonly ctx: RoundContext,
  ) {}

  get currentPhase(): RoundPhase {
    return this.phase;
  }

  get endsAt(): number {
    return this.startedAt + this.timeLimitMs;
  }

  get timeLimitMs(): number {
    return this.question.timeLimitSec * 1000;
  }

  /** THE TEMPLATE METHOD. */
  async run(): Promise<RoundOutcome> {
    if (this.phase !== 'pending') throw new Error('A round can only be run once');
    this.sendQuestion();
    await this.runTimer();
    const collected = this.collectAnswers();
    const graded = this.gradeAnswers(collected);
    const reveal = this.buildReveal(graded);
    this.publishReveal(graded, reveal);
    return {
      questionId: this.question.id,
      topicId: this.question.topicId,
      gradable: this.isGradable(),
      timeLimitMs: this.timeLimitMs,
      answers: graded,
      participants: this.participants,
      reveal,
    };
  }

  /** Accepts an answer while the round is open (first answer wins). */
  submit(playerId: string, answer: AnswerPayload): SubmitResult {
    if (this.phase !== 'open') return { ok: false, reason: 'Round is not accepting answers' };
    if (this.answers.has(playerId)) return { ok: false, reason: 'Already answered' };
    if (!this.question.accepts(answer)) return { ok: false, reason: 'Invalid answer for this question' };

    const responseTimeMs = Math.max(0, this.ctx.clock.now() - this.startedAt);
    this.answers.set(playerId, { playerId, answer, responseTimeMs });

    const active = this.ctx.activePlayerIds();
    this.ctx.bus.publish('answer.submitted', {
      roomCode: this.ctx.roomCode,
      roundIndex: this.ctx.roundIndex,
      playerId,
      questionId: this.question.id,
      topicId: this.question.topicId,
      answer,
      responseTimeMs,
      answeredCount: this.answers.size,
      playerCount: active.length,
    });

    if (active.length > 0 && active.every((id) => this.answers.has(id))) this.close();
    return { ok: true };
  }

  /** Instructor pressed "end round" (or everyone answered). */
  close(): void {
    if (this.phase !== 'open') return;
    this.phase = 'closed';
    this.timer?.cancel();
    this.closeRound?.();
  }

  // ---- fixed steps -------------------------------------------------------

  private participants: string[] = [];

  private sendQuestion(): void {
    this.phase = 'open';
    this.startedAt = this.ctx.clock.now();
    this.participants = this.ctx.activePlayerIds();
    this.ctx.bus.publish('round.started', {
      roomCode: this.ctx.roomCode,
      roundIndex: this.ctx.roundIndex,
      totalRounds: this.ctx.totalRounds,
      question: this.question.render(),
      endsAt: this.endsAt,
    });
  }

  private runTimer(): Promise<void> {
    return new Promise((resolve) => {
      this.closeRound = resolve;
      this.timer = this.ctx.scheduler.schedule(this.timeLimitMs, () => this.close());
      if (this.phase === 'closed') resolve();
    });
  }

  private collectAnswers(): CollectedAnswer[] {
    return [...this.answers.values()];
  }

  private publishReveal(graded: GradedEntry[], reveal: RevealView): void {
    const byPlayer = new Map(graded.map((g) => [g.playerId, g]));
    const everyone = new Set([...this.participants, ...byPlayer.keys()]);
    const results: PlayerRoundResult[] = [...everyone].map((playerId) => {
      const g = byPlayer.get(playerId);
      return {
        playerId,
        answered: !!g,
        correct: g?.grade ? g.grade.correct : g ? null : this.isGradable() ? false : null,
        responseTimeMs: g?.responseTimeMs ?? null,
      };
    });
    this.ctx.bus.publish('round.ended', {
      roomCode: this.ctx.roomCode,
      sessionId: this.ctx.sessionId,
      roundIndex: this.ctx.roundIndex,
      questionId: this.question.id,
      topicId: this.question.topicId,
      questionType: this.question.type,
      gradable: this.isGradable(),
      reveal,
      results,
    });
  }

  // ---- hooks (vary by question type) -------------------------------------

  protected abstract isGradable(): boolean;
  protected abstract gradeAnswers(answers: CollectedAnswer[]): GradedEntry[];
  protected abstract buildReveal(graded: GradedEntry[]): RevealView;

  /** Shared helper for subclasses' display step. */
  protected distribution(graded: GradedEntry[]): Pick<RevealView, 'distribution' | 'numericAnswers'> {
    const distribution: Record<string, number> = {};
    for (const o of this.question.render().options ?? []) distribution[o.id] = 0;
    const numericAnswers: number[] = [];
    for (const g of graded) {
      if (g.answer.kind === 'choice') for (const id of g.answer.optionIds) distribution[id] = (distribution[id] ?? 0) + 1;
      else numericAnswers.push(g.answer.value);
    }
    return numericAnswers.length ? { distribution, numericAnswers } : { distribution };
  }
}
