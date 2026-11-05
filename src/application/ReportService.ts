import { AdapterRegistry } from '../adapters/AdapterRegistry';
import { ExportedFile, ResultsExporter } from '../adapters/exporters/ResultsExporter';
import { TopicLevel } from '../domain/bank/TopicComponent';
import { ReportBuilder, SessionReport } from '../domain/reports/ReportBuilder';
import { NotFoundError, ValidationError } from './errors';
import { SessionRecordRepository } from './ports';

export class ReportService {
  constructor(
    private readonly records: SessionRecordRepository,
    private readonly builder: ReportBuilder,
    private readonly exporters: AdapterRegistry<ResultsExporter>,
  ) {}

  listSessions(ws: string) {
    return this.records.list(ws).sort((a, b) => b.startedAt - a.startedAt).map((r) => ({
      sessionId: r.sessionId,
      roomCode: r.roomCode,
      quizTitle: r.quizTitle,
      startedAt: r.startedAt,
      endedAt: r.endedAt,
      players: r.players.length,
      rounds: r.rounds.length,
    }));
  }

  report(ws: string, sessionId: string, groupBy: TopicLevel = 'topic'): SessionReport {
    if (!['topic', 'unit', 'course'].includes(groupBy)) throw new ValidationError('groupBy must be topic, unit or course');
    const record = this.records.get(ws, sessionId);
    if (!record) throw new NotFoundError(`No results for session "${sessionId}"`);
    return this.builder.build(record, { groupBy });
  }

  export(ws: string, sessionId: string, format: string, groupBy: TopicLevel = 'topic'): ExportedFile {
    let exporter;
    try {
      exporter = this.exporters.get(format);
    } catch (err) {
      throw new ValidationError((err as Error).message);
    }
    return exporter.export(this.report(ws, sessionId, groupBy));
  }
}
