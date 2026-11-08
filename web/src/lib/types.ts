// Wire types shared with the server (kept in sync with src/domain/** on the backend).

export type QuestionType = 'mcq' | 'multi_select' | 'true_false' | 'numeric' | 'poll';
export type TopicLevel = 'course' | 'unit' | 'topic';

export interface Option { id: string; text: string }

export interface QuestionView {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: Option[];
  input: 'single' | 'multiple' | 'number';
  timeLimitSec: number;
}

export type AnswerPayload = { kind: 'choice'; optionIds: string[] } | { kind: 'numeric'; value: number };

export interface QuestionSpec {
  id?: string;
  type: QuestionType;
  prompt: string;
  topicId: string;
  timeLimitSec?: number;
  options?: Array<{ id?: string; text: string; correct?: boolean }>;
  answer?: boolean;
  numericAnswer?: number;
  tolerance?: number;
}

export interface TopicNode { id: string; name: string; level: TopicLevel; children: TopicNode[] }

export interface Quiz { id: string; title: string; questionIds: string[]; createdAt: number }

export interface Draft {
  id: string;
  spec: QuestionSpec;
  source: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export interface Meta {
  joinOrigin: string | null;
  questionTypes: QuestionType[];
  scoringModes: Array<{ id: string; label: string; description: string }>;
  importFormats: string[];
  exportFormats: string[];
  aiProvider: string;
  storage: string;
}

export interface Player { id: string; nickname: string; connected: boolean }

export interface LeaderboardEntry {
  playerId: string;
  nickname: string;
  rank: number;
  total: number;
  streak: number;
  correctCount: number;
  lastPoints: number;
  lastCorrect: boolean | null;
}

export interface SessionSnapshot {
  sessionId: string;
  code: string;
  quizTitle: string;
  state: 'lobby' | 'in_round' | 'between_rounds' | 'ended';
  scoringMode: string;
  roundIndex: number;
  totalRounds: number;
  players: Player[];
  leaderboard: LeaderboardEntry[];
}

export interface RoundStarted {
  roundIndex: number;
  totalRounds: number;
  question: QuestionView;
  endsAt: number;
  serverNow: number;
}

export interface RevealView {
  questionId: string;
  correctAnswer: AnswerPayload | null;
  distribution: Record<string, number>;
  numericAnswers?: number[];
  answeredCount: number;
  correctCount: number | null;
}

export interface RoundEnded { roundIndex: number; gradable: boolean; reveal: RevealView }
export interface PlayerRoundResult { playerId: string; answered: boolean; correct: boolean | null; responseTimeMs: number | null }

export interface SessionSummary {
  sessionId: string;
  roomCode: string;
  quizTitle: string;
  startedAt: number;
  endedAt: number | null;
  players: number;
  rounds: number;
}

export interface GroupRow { id: string; name: string; path: string; level: TopicLevel; answered: number; correct: number; accuracy: number | null }
export interface QuestionRow {
  questionId: string; prompt: string; topicId: string; topicPath: string; gradable: boolean;
  answered: number; correct: number; accuracy: number | null; avgResponseMs: number | null;
}
export interface SessionReport {
  sessionId: string; roomCode: string; quizTitle: string; scoringMode: string; playerCount: number; generatedAt: number;
  leaderboard: LeaderboardEntry[]; questions: QuestionRow[]; groups: GroupRow[]; groupLevel: TopicLevel;
  struggling: GroupRow[]; hardestQuestions: QuestionRow[];
}
