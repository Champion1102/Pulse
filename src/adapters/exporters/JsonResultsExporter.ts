import { SessionReport } from '../../domain/reports/ReportBuilder';
import { ExportedFile, ResultsExporter } from './ResultsExporter';

export class JsonResultsExporter implements ResultsExporter {
  readonly format = 'json';

  export(r: SessionReport): ExportedFile {
    return {
      filename: `pulse-${r.roomCode}-results.json`,
      contentType: 'application/json',
      body: JSON.stringify(r, null, 2),
    };
  }
}
