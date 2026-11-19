import { Check, Cpu, Minus, Plus, ShieldCheck, Sparkle, X } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { FormEvent, useEffect, useState } from 'react';
import { useToast } from '../../components/Toast';
import { Button, Chip, cx, Empty, Field, letter, PageHeader, Panel, Skeleton, Textarea } from '../../components/ui';
import { api } from '../../lib/api';
import { flattenTopics, useLoad, useMeta } from '../../lib/hooks';
import { ease, spring } from '../../lib/motion';
import type { Draft, TopicNode } from '../../lib/types';
import { TopicPicker } from './TopicPicker';

const MAX = 50000;

export default function Drafts() {
  const toast = useToast();
  const meta = useMeta();
  const topics = useLoad(async () => flattenTopics(await api<TopicNode[]>('/bank/tree')));
  const drafts = useLoad(() => api<Draft[]>('/drafts?status=pending'));
  const [topicId, setTopicId] = useState('');
  const [notes, setNotes] = useState('');
  const [count, setCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const [exitDir, setExitDir] = useState<Record<string, 1 | -1>>({});

  useEffect(() => {
    if (!topicId && topics.data?.length) setTopicId(topics.data[0].id);
  }, [topics.data, topicId]);

  const topicName = (id: string) => topics.data?.find((t) => t.id === id)?.name ?? 'Topic';

  const generate = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const created = await api<Draft[]>('/drafts/generate', { method: 'POST', body: { notes, topicId, count } });
      toast(`${created.length} draft${created.length === 1 ? '' : 's'} ready for review`, 'success');
      drafts.reload();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const decide = async (d: Draft, ok: boolean) => {
    setExitDir((m) => ({ ...m, [d.id]: ok ? 1 : -1 }));
    try {
      await api(`/drafts/${d.id}/${ok ? 'approve' : 'reject'}`, { method: 'POST', body: {} });
      drafts.setData((list) => list?.filter((x) => x.id !== d.id) ?? null);
      if (ok) toast('Added to your question bank', 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const pending = drafts.data?.length ?? 0;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Assist"
        title={<>AI drafts <Sparkle weight="fill" className="inline align-[-0.08em] text-pulse" size="0.8em" /></>}
        description="Paste lecture notes and get draft questions. Nothing reaches students until you approve it, and the AI never grades."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Panel className="lg:sticky lg:top-8">
          <form onSubmit={generate} className="grid gap-5">
            <TopicPicker topics={topics.data} value={topicId} onChange={setTopicId} label="Drafts go into" />
            <Field label="Lecture notes" hint="Plain text works best. Up to 50,000 characters.">
              {(id) => (
                <div className="relative">
                  <Textarea id={id} value={notes} onChange={(e) => setNotes(e.target.value)} className="!min-h-60 pb-8" placeholder="Paste notes, a transcript or a reading…" />
                  <span className={cx('pointer-events-none absolute bottom-3 right-4 font-mono text-[11px] tabular', notes.length > MAX ? 'text-bad' : 'text-ink-3')}>
                    {notes.length.toLocaleString()} / {MAX.toLocaleString()}
                  </span>
                </div>
              )}
            </Field>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="grid gap-2">
                <span className="text-[13px] font-semibold">How many</span>
                <div className="flex h-12 items-center rounded-[14px] border border-line bg-card p-1">
                  <button type="button" aria-label="Fewer" onClick={() => setCount((c) => Math.max(1, c - 1))} className="grid size-10 place-items-center rounded-[10px] text-ink-2 hover:bg-paper-2 active:scale-90"><Minus weight="bold" /></button>
                  <span className="relative w-10 overflow-hidden text-center font-mono text-lg font-semibold">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span key={count} initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={spring.snappy} className="inline-block" aria-live="polite">{count}</motion.span>
                    </AnimatePresence>
                  </span>
                  <button type="button" aria-label="More" onClick={() => setCount((c) => Math.min(20, c + 1))} className="grid size-10 place-items-center rounded-[10px] text-ink-2 hover:bg-paper-2 active:scale-90"><Plus weight="bold" /></button>
                </div>
              </div>
              <Button type="submit" size="lg" loading={busy} disabled={!notes.trim() || !topicId} icon={<Sparkle weight="fill" />}>
                {busy ? 'Drafting…' : 'Draft questions'}
              </Button>
            </div>
            {meta && (
              <div className="flex items-start gap-2.5 rounded-2xl bg-paper-2 px-4 py-3 text-[12.5px] text-ink-2">
                <Cpu weight="duotone" className="mt-0.5 shrink-0 text-base text-pulse" />
                <p>
                  Drafting with <b className="text-ink">{meta.aiProvider}</b>
                  {meta.aiProvider === 'offline' && '. Set ANTHROPIC_API_KEY on the server to use Claude.'}
                </p>
              </div>
            )}
          </form>
        </Panel>

        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-[-0.02em]">
              Waiting for review
              {pending > 0 && <Chip tone="pulse">{pending}</Chip>}
            </h2>
            <span className="flex items-center gap-1.5 text-[12px] text-ink-3"><ShieldCheck weight="fill" className="text-good" /> You approve every question</span>
          </div>

          <AnimatePresence>
            {busy && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="grid gap-3 overflow-hidden">
                {Array.from({ length: Math.min(count, 3) }).map((_, i) => <Skeleton key={i} className="h-40" />)}
              </motion.div>
            )}
          </AnimatePresence>

          {drafts.loading && !drafts.data && <Skeleton className="h-40" />}
          {drafts.data?.length === 0 && !busy && <Empty icon={<Sparkle weight="duotone" />} title="Nothing to review" body="Drafts you generate appear here for approval." />}
          <AnimatePresence initial={false} mode="popLayout">
            {drafts.data?.map((d, i) => (
              <motion.div
                key={d.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease, delay: Math.min(i, 6) * 0.04 } }}
                exit={{ opacity: 0, x: (exitDir[d.id] ?? 1) * 140, rotate: (exitDir[d.id] ?? 1) * 6, transition: { duration: 0.35, ease } }}
                className="grid gap-4 rounded-[20px] border border-line bg-card p-5 shadow-[var(--shadow-soft)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone="pulse"><Sparkle weight="fill" /> {d.source}</Chip>
                  <Chip className="capitalize">{d.spec.type.replace('_', ' ')}</Chip>
                  <Chip tone="outline">{topicName(d.spec.topicId)}</Chip>
                </div>
                <p className="text-[17px] font-semibold leading-snug tracking-[-0.01em]">{d.spec.prompt}</p>
                {d.spec.options ? (
                  <ul className="grid gap-1.5 text-sm">
                    {d.spec.options.map((o, j) => (
                      <li key={j} className={cx('flex items-center gap-2.5 rounded-xl px-3 py-2', o.correct ? 'bg-good-soft font-semibold text-good' : 'bg-paper-2/60 text-ink-2')}>
                        <span className="font-mono text-xs font-bold opacity-70">{letter(j)}</span>
                        <span className="flex-1">{o.text}</span>
                        {o.correct && <Check weight="bold" />}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink-2">Answer: <b className="text-ink">{d.spec.type === 'true_false' ? String(d.spec.answer) : d.spec.numericAnswer}</b></p>
                )}
                <div className="flex gap-2 border-t border-line pt-4">
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
