import { ImportedSpec, QuestionImporter } from './QuestionImporter';

/**
 * Adapts the Google Forms API "forms.get" JSON (a quiz-mode form) to Pulse specs.
 * Shape used: { items: [{ title, questionItem: { question: {
 *    choiceQuestion?: { type: 'RADIO' | 'CHECKBOX' | 'DROP_DOWN', options: [{ value }] },
 *    textQuestion?: {},
 *    grading?: { correctAnswers?: { answers: [{ value }] } } } } }] }
 * Items that are not questions (section headers, images) are skipped.
 */
interface FormsItem {
  title?: string;
  questionItem?: {
    question?: {
      choiceQuestion?: { type?: string; options?: Array<{ value?: string }> };
      textQuestion?: unknown;
      grading?: { correctAnswers?: { answers?: Array<{ value?: string }> } };
    };
  };
}

export class GoogleFormsImporter implements QuestionImporter {
  readonly format = 'google_forms';

  parse(content: string): ImportedSpec[] {
    let form: { items?: FormsItem[] };
    try {
      form = JSON.parse(content);
    } catch {
      throw new Error('Google Forms import expects the forms.get JSON');
    }
    const out: ImportedSpec[] = [];
    for (const item of form.items ?? []) {
      const q = item.questionItem?.question;
      if (!q || !item.title) continue;
      const answers = new Set((q.grading?.correctAnswers?.answers ?? []).map((a) => (a.value ?? '').trim()));

      if (q.choiceQuestion) {
        const options = (q.choiceQuestion.options ?? []).map((o) => (o.value ?? '').trim()).filter(Boolean);
        const isTrueFalse =
          options.length === 2 && options.map((o) => o.toLowerCase()).sort().join() === 'false,true';
        if (isTrueFalse && answers.size === 1) {
          out.push({ type: 'true_false', prompt: item.title, answer: [...answers][0].toLowerCase() === 'true' });
        } else if (answers.size === 0) {
          out.push({ type: 'poll', prompt: item.title, options: options.map((text) => ({ text })) });
        } else {
          const type = q.choiceQuestion.type === 'CHECKBOX' ? 'multi_select' : 'mcq';
          out.push({ type, prompt: item.title, options: options.map((text) => ({ text, correct: answers.has(text) })) });
        }
      } else if (q.textQuestion && answers.size > 0) {
        const value = Number([...answers][0]);
        if (Number.isFinite(value)) out.push({ type: 'numeric', prompt: item.title, numericAnswer: value, tolerance: 0 });
      }
    }
    return out;
  }
}
