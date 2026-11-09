import { FileArrowUp, UploadSimple } from '@phosphor-icons/react';
import { FormEvent, useEffect, useState } from 'react';
import { useToast } from '../../components/Toast';
import { Button, Chip, Field, Panel, Select, Textarea } from '../../components/ui';
import { api } from '../../lib/api';
import { flattenTopics, useLoad, useMeta } from '../../lib/hooks';
import type { TopicNode } from '../../lib/types';
import { TopicPicker } from './TopicPicker';

const SAMPLE_CSV = `type,prompt,options,correct,time_limit
mcq,Which pattern swaps the scoring mode?,Factory|Strategy|Adapter,2,20
multi_select,Which are behavioural patterns?,Strategy|Adapter|Observer,1|3,25
true_false,A poll should implement Gradable,,false,15
numeric,How many SOLID principles are there?,,5,15`;

const HELP: Record<string, string> = {
  csv: 'Columns: type, prompt, options, correct, time_limit. Options are separated by |. "correct" is the option number (2, or 1|3 for several), true/false, or a number such as 42±0.5.',
  google_forms: 'Paste the JSON from the Google Forms API (forms.get) for a quiz-mode form. Answer keys become correct answers; ungraded questions become polls.',
};

export default function ImportPage() {
  const toast = useToast();
  const meta = useMeta();
  const topics = useLoad(async () => flattenTopics(await api<TopicNode[]>('/bank/tree')));
  const [format, setFormat] = useState('csv');
  const [topicId, setTopicId] = useState('');
  const [content, setContent] = useState(SAMPLE_CSV);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ imported: unknown[]; errors: string[] } | null>(null);

  useEffect(() => {
    if (!topicId && topics.data?.length) setTopicId(topics.data[0].id);
  }, [topics.data, topicId]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      setResult(await api('/questions/import', { method: 'POST', body: { format, content, topicId } }));
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tighter">Import questions</h1>
        <p className="mt-2 text-ink-2">Bring questions in from a spreadsheet or a Google Form.</p>
      </div>
      <Panel className="max-w-3xl">
        <form onSubmit={submit} className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Format">
              {(id) => (
                <Select id={id} value={format} onChange={(e) => { setFormat(e.target.value); setContent(e.target.value === 'csv' ? SAMPLE_CSV : ''); setResult(null); }}>
                  {(meta?.importFormats ?? ['csv', 'google_forms']).map((f) => <option key={f} value={f}>{f === 'csv' ? 'CSV' : 'Google Forms JSON'}</option>)}
                </Select>
              )}
            </Field>
            <TopicPicker topics={topics.data} value={topicId} onChange={setTopicId} label="Put questions in" />
          </div>
          <p className="text-sm text-ink-2">{HELP[format]}</p>
          <Field label="Content">
            {(id) => <Textarea id={id} value={content} onChange={(e) => setContent(e.target.value)} className="!min-h-56 font-mono text-sm" />}
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-5 text-[15px] font-semibold ring-1 ring-inset ring-line hover:bg-paper-2">
              <FileArrowUp weight="bold" /> Choose file
              <input type="file" accept=".csv,.json,.txt" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setContent(await f.text()); }} />
            </label>
            <Button type="submit" loading={busy} disabled={!content.trim() || !topicId} icon={<UploadSimple weight="bold" />}>Import</Button>
          </div>
          {result && (
            <div className="grid gap-2 rounded-2xl bg-paper-2 p-4">
              <div className="flex gap-2">
                <Chip tone="good">{result.imported.length} imported</Chip>
                {result.errors.length > 0 && <Chip tone="bad">{result.errors.length} skipped</Chip>}
              </div>
              {result.errors.map((e) => <p key={e} className="text-sm text-ink-2">{e}</p>)}
            </div>
          )}
        </form>
      </Panel>
    </div>
  );
}
