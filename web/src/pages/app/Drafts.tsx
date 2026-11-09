import { Check, Sparkle, X } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { FormEvent, useEffect, useState } from 'react';
import { useToast } from '../../components/Toast';
import { Button, Chip, Empty, Field, Input, letter, Panel, Skeleton, Textarea } from '../../components/ui';
import { api } from '../../lib/api';
import { flattenTopics, useLoad, useMeta } from '../../lib/hooks';
import type { Draft, TopicNode } from '../../lib/types';
import { TopicPicker } from './TopicPicker';

export default function Drafts() {
  const toast = useToast();
  const meta = useMeta();
  const topics = useLoad(async () => flattenTopics(await api<TopicNode[]>('/bank/tree')));
  const drafts = useLoad(() => api<Draft[]>('/drafts?status=pending'));
  const [topicId, setTopicId] = useState('');
  const [notes, setNotes] = useState('');
  const [count, setCount] = useState(5);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!topicId && topics.data?.length) setTopicId(topics.data[0].id);
  }, [topics.data, topicId]);

  const topicName = (id: string) => topics.data?.find((t) => t.id === id)?.name ?? 'Topic';

  const generate = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const created = await api<Draft[]>('/drafts/generate', { method: 'POST', body: { notes, topicId, count } });
      toast(`${created.length} draft${created.length === 1 ? '' : 's'} ready for review`);
      drafts.reload();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const decide = async (d: Draft, ok: boolean) => {
    try {
      await api(`/drafts/${d.id}/${ok ? 'approve' : 'reject'}`, { method: 'POST', body: {} });
      drafts.setData((list) => list?.filter((x) => x.id !== d.id) ?? null);
      if (ok) toast('Added to your question bank');
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tighter">AI drafts</h1>
        <p className="mt-2 max-w-[60ch] text-ink-2">
          Paste lecture notes and get draft questions. Nothing reaches students until you approve it, and the AI never grades.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Panel>
          <form onSubmit={generate} className="grid gap-5">
            <TopicPicker topics={topics.data} value={topicId} onChange={setTopicId} label="Drafts go into" />
            <Field label="Lecture notes" hint="Plain text works best. Up to 50,000 characters.">
              {(id) => <Textarea id={id} value={notes} onChange={(e) => setNotes(e.target.value)} className="!min-h-56" />}
            </Field>
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-28">
                <Field label="How many">{(id) => <Input id={id} type="number" min={1} max={20} value={count} onChange={(e) => setCount(Number(e.target.value))} />}</Field>
              </div>
              <Button type="submit" loading={busy} disabled={!notes.trim() || !topicId} icon={<Sparkle weight="fill" />}>
                Draft questions
              </Button>
            </div>
            {meta && (
              <p className="text-xs text-ink-2">
                Drafting with: <b>{meta.aiProvider}</b>
                {meta.aiProvider === 'offline' && '. Set ANTHROPIC_API_KEY on the server to use Claude.'}
              </p>
            )}
          </form>
        </Panel>

        <div className="grid gap-3">
          <h2 className="text-xl font-bold tracking-tight">Waiting for review {drafts.data?.length ? <span className="text-ink-2">({drafts.data.length})</span> : null}</h2>
          {drafts.loading && !drafts.data && <Skeleton className="h-40" />}
          {drafts.data?.length === 0 && <Empty icon={<Sparkle />} title="Nothing to review" body="Drafts you generate appear here for approval." />}
          <AnimatePresence initial={false}>
            {drafts.data?.map((d) => (
              <motion.div
                key={d.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 60 }}
                className="grid gap-3 rounded-3xl border border-line bg-card p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone="pulse"><Sparkle weight="fill" /> {d.source}</Chip>
                  <Chip>{d.spec.type.replace('_', ' ')}</Chip>
                  <Chip>{topicName(d.spec.topicId)}</Chip>
                </div>
                <p className="text-lg font-semibold leading-snug">{d.spec.prompt}</p>
                {d.spec.options ? (
                  <ul className="grid gap-1 text-sm">
                    {d.spec.options.map((o, i) => (
                      <li key={i} className={o.correct ? 'font-semibold text-good' : 'text-ink-2'}>
                        {letter(i)}. {o.text} {o.correct && <Check weight="bold" className="inline" />}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink-2">Answer: <b className="text-ink">{d.spec.type === 'true_false' ? String(d.spec.answer) : d.spec.numericAnswer}</b></p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" variant="ink" icon={<Check weight="bold" />} onClick={() => decide(d, true)}>Approve</Button>
                  <Button size="sm" variant="ghost" icon={<X weight="bold" />} onClick={() => decide(d, false)}>Reject</Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
