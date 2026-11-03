import { accuracy, TopicComponent, TopicLevel, TopicStats } from '../bank/TopicComponent';
import { LeaderboardEntry } from '../scoring/Leaderboard';
import { SessionRecord } from './SessionRecord';

export interface QuestionReportRow {
  questionId: string;
  prompt: string;
  topicId: string;
  topicPath: string;
  gradable: boolean;
  answered: number;
  correct: number;
  accuracy: number | null;
  avgResponseMs: number | null;
}

export interface GroupReportRow {
  id: string;
  name: string;
  path: string;
  level: TopicLevel;
  answered: number;
  correct: number;
  accuracy: number | null;
}

export interface SessionReport {
  sessionId: string;
  roomCode: string;
  quizTitle: string;
  scoringMode: string;
  playerCount: number;
  generatedAt: number;
  leaderboard: LeaderboardEntry[];
  questions: QuestionReportRow[];
  groups: GroupReportRow[];
  groupLevel: TopicLevel;
  /** Weakest groups first — the "what did the class struggle with" answer. */
  struggling: GroupReportRow[];
  hardestQuestions: QuestionReportRow[];
}

export interface ReportOptions {
  /** Aggregate by 'topic' (default), 'unit' or 'course' — just walks the Composite tree. */
  groupBy?: TopicLevel;
  /** Groups below this accuracy are flagged as struggling. */
  struggleThreshold?: number;
}

/**
 * Single Responsibility: turns a SessionRecord into a report. It does no I/O
 * and knows nothing about sockets or formats (exporters handle formats).
 */
export class ReportBuilder {
  constructor(
    private readonly roots: (workspaceId: string) => TopicComponent[],
    private readonly promptOf: (questionId: string) => string | undefined,
    private readonly now: () => number = Date.now,
  ) {}

  build(record: SessionRecord, options: ReportOptions = {}): SessionReport {
    const groupLevel = options.groupBy ?? 'topic';
    const threshold = options.struggleThreshold ?? 0.6;
    const roots = this.roots(record.workspaceId);
    const findNode = (id: string) => roots.map((r) => r.find(id)).find(Boolean);

    const statsByTopic = new Map<string, TopicStats>();
    const questions: QuestionReportRow[] = record.rounds.map((round) => {
      const graded = round.answers.filter((a) => a.grade !== null);
      const correct = graded.filter((a) => a.grade!.correct).length;
      if (round.gradable) {
        const s = statsByTopic.get(round.topicId) ?? { answered: 0, correct: 0 };
        // Non-answers count as "not correct" — silence is a signal too.
        const attempted = Math.max(round.participants.length, graded.length);
        statsByTopic.set(round.topicId, { answered: s.answered + attempted, correct: s.correct + correct });
      }
      const times = round.answers.map((a) => a.responseTimeMs);
      const attempted = Math.max(round.participants.length, round.answers.length);
      return {
        questionId: round.questionId,
        prompt: this.promptOf(round.questionId) ?? '(deleted question)',
        topicId: round.topicId,
        topicPath: findNode(round.topicId)?.path() ?? 'Unknown topic',
        gradable: round.gradable,
        answered: round.answers.length,
        correct,
        accuracy: round.gradable && attempted > 0 ? correct / attempted : null,
        avgResponseMs: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null,
      };
    });

    // Composite walk: every node at the chosen level aggregates its own subtree.
    const groups: GroupReportRow[] = roots
      .flatMap((root) => root.nodesAt(groupLevel))
      .map((node) => {
        const s = node.aggregate(statsByTopic);
        return { id: node.id, name: node.name, path: node.path(), level: node.level, ...s, accuracy: accuracy(s) };
      })
      .filter((g) => g.answered > 0);

    const struggling = groups
      .filter((g) => g.accuracy !== null && g.accuracy < threshold)
      .sort((a, b) => a.accuracy! - b.accuracy!);

    const hardestQuestions = questions
      .filter((q) => q.accuracy !== null)
      .sort((a, b) => a.accuracy! - b.accuracy!)
      .slice(0, 5);

    return {
      sessionId: record.sessionId,
      roomCode: record.roomCode,
      quizTitle: record.quizTitle,
      scoringMode: record.scoringMode,
      playerCount: record.players.length,
      generatedAt: this.now(),
      leaderboard: record.leaderboard,
      questions,
      groups,
      groupLevel,
      struggling,
      hardestQuestions,
    };
  }
}
