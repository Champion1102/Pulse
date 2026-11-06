import { SessionReport } from '../../domain/reports/ReportBuilder';

export interface ExportedFile {
  filename: string;
  contentType: string;
  body: string;
}

/** Adapter target for every results output format. */
export interface ResultsExporter {
  readonly format: string;
  export(report: SessionReport): ExportedFile;
}
