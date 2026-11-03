import { AnswerPayload, QuestionType, QuestionView } from '../questions/types';
import { LeaderboardEntry } from '../scoring/Leaderboard';

export interface PlayerRef {
  id: string;
  nickname: string;
}

export interface RevealView {
  questionId: string;
  correctAnswer: AnswerPayload | null;
  /** optionId -> count, for choice questions */
  distribution: Record<string, number>;
  /** numeric answers as submitted, for numeric questions */
  numericAnswers?: number[];
  answeredCount: number;
  correctCount: number | null;
}

export interface PlayerRoundResult {
  playerId: string;
  answered: boolean;
  correct: boolean | null;
  responseTimeMs: number | null;
}

/** Every event in the system, with its payload type. */
export interface PulseEvents {
  'player.joined': { roomCode: string; player: PlayerRef; playerCount: number };
  'player.left': { roomCode: string; player: PlayerRef; playerCount: number };
  'round.started': {
    roomCode: string;
    roundIndex: number;
    totalRounds: number;
    question: QuestionView;
    endsAt: number;
  };
  'answer.submitted': {
    roomCode: string;
    roundIndex: number;
    playerId: string;
    questionId: string;
    topicId: string;
    answer: AnswerPayload;
    responseTimeMs: number;
    answeredCount: number;
    playerCount: number;
  };
  'round.ended': {
    roomCode: string;
    sessionId: string;
    roundIndex: number;
    questionId: string;
    topicId: string;
    questionType: QuestionType;
    gradable: boolean;
    reveal: RevealView;
    results: PlayerRoundResult[];
  };
  'leaderboard.updated': { roomCode: string; roundIndex: number; entries: LeaderboardEntry[] };
  'session.ended': { roomCode: string; sessionId: string; leaderboard: LeaderboardEntry[] };
}

export type PulseEventName = keyof PulseEvents;
export type Handler<K extends PulseEventName> = (payload: PulseEvents[K]) => void;
export type Unsubscribe = () => void;

/** Observer pattern: the subject. Publishers don't know who is listening. */
export interface EventBus {
  publish<K extends PulseEventName>(type: K, payload: PulseEvents[K]): void;
  subscribe<K extends PulseEventName>(type: K, handler: Handler<K>): Unsubscribe;
}

/** An observer registers itself for the events it cares about. */
export interface EventObserver {
  attach(bus: EventBus): void;
}

export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<PulseEventName, Set<Handler<any>>>();

  constructor(private readonly onHandlerError: (err: unknown, type: string) => void = defaultErrorHandler) {}

  publish<K extends PulseEventName>(type: K, payload: PulseEvents[K]): void {
    for (const h of this.handlers.get(type) ?? []) {
      // One broken observer must never break the live engine or other observers.
      try {
        h(payload);
      } catch (err) {
        this.onHandlerError(err, type);
      }
    }
  }

  subscribe<K extends PulseEventName>(type: K, handler: Handler<K>): Unsubscribe {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }
}

function defaultErrorHandler(err: unknown, type: string): void {
  console.error(`[EventBus] observer for "${type}" failed:`, err);
}
