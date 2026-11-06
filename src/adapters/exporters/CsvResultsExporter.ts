import { SessionReport } from '../../domain/reports/ReportBuilder';
import { toCsvField } from '../importers/csv';
import { ExportedFile, ResultsExporter } from './ResultsExporter';

const pct = (x: number | null) => (x === null ? '' : `${Math.round(x * 100)}%`);

/** Spreadsheet-friendly export: leaderboard, then per-question, then per-group sections. */
export class CsvResultsExporter implements ResultsExporter {
  readonly format = 'csv';

  export(r: SessionReport): ExportedFile {
    const lines: unknown[][] = [
      ['Pulse results', r.quizTitle, `room ${r.roomCode}`, `scoring: ${r.scoringMode}`],
      [],
      ['rank', 'nickname', 'score', 'correct_answers'],
      ...r.leaderboard.map((e) => [e.rank, e.nickname, e.total, e.correctCount]),
      [],
      ['question', 'topic', 'answered', 'correct', 'accuracy', 'avg_response_ms'],
      ...r.questions.map((q) => [q.prompt, q.topicPath, q.answered, q.correct, pct(q.accuracy), q.avgResponseMs ?? '']),
      [],
      [r.groupLevel, 'answered', 'correct', 'accuracy'],
      ...r.groups.map((g) => [g.path, g.answered, g.correct, pct(g.accuracy)]),
    ];
    return {
      filename: `pulse-${r.roomCode}-results.csv`,
      contentType: 'text/csv; charset=utf-8',
      body: lines.map((l) => l.map(toCsvField).join(',')).join('\n') + '\n',
    };
  }
}
