import { QuestionType } from '../../domain/questions/types';
import { parseCsv } from './csv';
import { ImportedSpec, QuestionImporter } from './QuestionImporter';

/**
 * CSV columns (header row required):
 *   type, prompt, options, correct, time_limit, topic_id
 * - options: pipe separated, e.g. "Factory|Strategy|Observer"
 * - correct: for mcq/multi_select the 1-based index/indices ("2" or "1|3");
 *            for true_false "true"/"false"; for numeric the number (optional "±tol", e.g. "42±0.5")
 */
export class CsvQuestionImporter implements QuestionImporter {
  readonly format = 'csv';

  parse(content: string): ImportedSpec[] {
    const [header, ...rows] = parseCsv(content);
    if (!header) return [];
    const col = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name);
    const idx = { type: col('type'), prompt: col('prompt'), options: col('options'), correct: col('correct'), time: col('time_limit'), topic: col('topic_id') };
    if (idx.type < 0 || idx.prompt < 0) throw new Error('CSV needs at least "type" and "prompt" columns');

    return rows.map((r, line) => {
      const get = (i: number) => (i >= 0 ? (r[i] ?? '').trim() : '');
      const type = get(idx.type).toLowerCase() as QuestionType;
      const correct = get(idx.correct);
      const time = Number(get(idx.time));
      const spec: ImportedSpec = {
        type,
        prompt: get(idx.prompt),
        timeLimitSec: Number.isFinite(time) && time > 0 ? time : undefined,
        topicId: get(idx.topic) || undefined,
      };
      if (!spec.prompt) throw new Error(`Row ${line + 2}: prompt is empty`);

      if (type === 'mcq' || type === 'multi_select' || type === 'poll') {
        const right = new Set(correct.split('|').filter(Boolean).map((n) => Number(n) - 1));
        spec.options = get(idx.options)
          .split('|')
          .map((t) => t.trim())
          .filter(Boolean)
          .map((text, i) => ({ text, correct: type === 'poll' ? undefined : right.has(i) }));
      } else if (type === 'true_false') {
        spec.answer = correct.toLowerCase() === 'true';
      } else if (type === 'numeric') {
        const [value, tol] = correct.split('±');
        spec.numericAnswer = Number(value);
        spec.tolerance = tol ? Number(tol) : 0;
      }
      return spec;
    });
  }
}
