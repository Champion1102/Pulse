import { CheckCircle, FileArrowUp, FileCsv, GoogleLogo, UploadSimple, WarningCircle } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { DragEvent, FormEvent, useEffect, useState } from 'react';
import { useToast } from '../../components/Toast';
import { Button, Chip, cx, Field, PageHeader, Panel, Segmented, Textarea } from '../../components/ui';
import { api } from '../../lib/api';
import { flattenTopics, useLoad, useMeta } from '../../lib/hooks';
import { ease, spring } from '../../lib/motion';
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
  const [drag, setDrag] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

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

  const changeFormat = (f: string) => {
    setFormat(f);
    setContent(f === 'csv' ? SAMPLE_CSV : '');
    setResult(null);
    setFileName(null);
  };

  const readFile = async (f: File | undefined) => {
    if (!f) return;
    setContent(await f.text());
    setFileName(f.name);
    setResult(null);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    void readFile(e.dataTransfer.files?.[0]);
  };

  const formats = meta?.importFormats ?? ['csv', 'google_forms'];

  return (
    <div className="grid gap-8">
      <PageHeader eyebrow="Build" title="Import questions" description="Bring questions in from a spreadsheet or a Google Form." />

      <Panel className="max-w-3xl">
        <form onSubmit={submit} className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <span className="text-[13px] font-semibold">Format</span>
              <Segmented
                value={format}
                onChange={changeFormat}
                className="w-fit"
                options={formats.map((f) => ({
                  value: f,
                  label: f === 'csv' ? 'CSV' : 'Google Forms',
                  icon: f === 'csv' ? <FileCsv weight="bold" /> : <GoogleLogo weight="bold" />,
                }))}
              />
            </div>
            <TopicPicker topics={topics.data} value={topicId} onChange={setTopicId} label="Put questions in" />
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.p key={format} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="rounded-2xl bg-paper-2 px-4 py-3 text-[13px] leading-relaxed text-ink-2">
              {HELP[format]}
            </motion.p>
          </AnimatePresence>

          <label
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            className={cx(
              'relative grid cursor-pointer justify-items-center gap-2 rounded-[20px] border-[1.5px] border-dashed px-6 py-8 text-center transition-all duration-300',
              drag ? 'scale-[1.01] border-pulse bg-pulse-soft' : 'border-line-strong hover:border-ink-3 hover:bg-paper-2/50',
            )}
          >
            <motion.span animate={{ y: drag ? -4 : 0, scale: drag ? 1.1 : 1 }} transition={spring.bouncy} className="grid size-12 place-items-center rounded-2xl border border-line bg-card text-2xl text-pulse shadow-[var(--shadow-soft)]">
              <FileArrowUp weight="duotone" />
            </motion.span>
            <p className="text-sm font-semibold">{drag ? 'Drop to load' : fileName ? fileName : 'Drop a file here, or click to choose'}</p>
            <p className="text-xs text-ink-3">.csv, .json or .txt</p>
            <input type="file" accept=".csv,.json,.txt" className="sr-only" onChange={(e) => void readFile(e.target.files?.[0])} />
          </label>

          <Field label="Content">
            {(id) => <Textarea id={id} value={content} onChange={(e) => setContent(e.target.value)} className="!min-h-56 font-mono !text-[13px]" spellCheck={false} />}
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="lg" loading={busy} disabled={!content.trim() || !topicId} icon={<UploadSimple weight="bold" />}>Import</Button>
            <span className="text-[12px] text-ink-3">Questions land in the topic you picked.</span>
          </div>

          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease }}
                className={cx('grid gap-3 rounded-2xl border p-4', result.errors.length ? 'border-warn/30 bg-warn/5' : 'border-good/25 bg-good-soft')}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {result.errors.length ? <WarningCircle weight="fill" className="text-xl text-warn" /> : <CheckCircle weight="fill" className="text-xl text-good" />}
                  <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...spring.bouncy, delay: 0.1 }}>
                    <Chip tone="good">{result.imported.length} imported</Chip>
                  </motion.span>
                  {result.errors.length > 0 && (
                    <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...spring.bouncy, delay: 0.18 }}>
                      <Chip tone="bad">{result.errors.length} skipped</Chip>
                    </motion.span>
                  )}
                </div>
                {result.errors.map((e) => <p key={e} className="font-mono text-[12px] text-ink-2">{e}</p>)}
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </Panel>
    </div>
  );
}
