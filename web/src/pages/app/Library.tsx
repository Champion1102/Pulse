import { CaretRight, Check, Clock, Folder, FolderOpen, Hash, MagnifyingGlass, Plus, Stack, Tag, Trash, X } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useToast } from '../../components/Toast';
import { Button, Chip, cx, Empty, Field, IconButton, Input, letter, OPTION_COLORS, OPTION_TEXT, PageHeader, Panel, Skeleton, Textarea } from '../../components/ui';
import { api } from '../../lib/api';
import { useLoad, useMeta } from '../../lib/hooks';
import { ease, spring } from '../../lib/motion';
import type { QuestionSpec, QuestionType, TopicNode } from '../../lib/types';

const TYPE_LABEL: Record<QuestionType, string> = {
  mcq: 'Multiple choice',
  multi_select: 'Multi-select',
  true_false: 'True or false',
  numeric: 'Numeric',
  poll: 'Poll',
};

function answerText(q: QuestionSpec): string {
  if (q.type === 'true_false') return q.answer ? 'True' : 'False';
  if (q.type === 'numeric') return `${q.numericAnswer}${q.tolerance ? ` ± ${q.tolerance}` : ''}`;
  if (q.type === 'poll') return 'No right answer';
  return (q.options ?? []).filter((o) => o.correct).map((o) => o.text).join(', ');
}

function findNode(nodes: TopicNode[], id: string | null): TopicNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = findNode(n.children, id);
    if (hit) return hit;
  }
  return null;
}

export default function Library() {
  const toast = useToast();
  const navigate = useNavigate();
  const tree = useLoad(() => api<TopicNode[]>('/bank/tree'));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const questions = useLoad(() => api<QuestionSpec[]>(`/questions${selectedId ? `?node=${encodeURIComponent(selectedId)}` : ''}`), [selectedId]);
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [quizTitle, setQuizTitle] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<QuestionType | 'all'>('all');

  const selected = useMemo(() => findNode(tree.data ?? [], selectedId), [tree.data, selectedId]);

  const shown = useMemo(() => {
    const t = search.trim().toLowerCase();
    return (questions.data ?? []).filter(
      (q) => (typeFilter === 'all' || q.type === typeFilter) && (!t || q.prompt.toLowerCase().includes(t) || answerText(q).toLowerCase().includes(t)),
    );
  }, [questions.data, search, typeFilter]);

  const typesPresent = useMemo(() => [...new Set((questions.data ?? []).map((q) => q.type))], [questions.data]);

  const createQuiz = async () => {
    try {
      await api('/quizzes', { method: 'POST', body: { title: quizTitle, questionIds: picked } });
      toast('Quiz created', 'success');
      navigate('/app');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  return (
    <div className="grid gap-8 pb-28">
      <PageHeader
        eyebrow="Build"
        title="Question bank"
        description="Organise questions by course, unit and topic. Reports group results the same way."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[280px_1fr]">
        <TopicTree tree={tree.data} loading={tree.loading} selectedId={selectedId} onSelect={setSelectedId} onChanged={tree.reload} />

        <div className="grid min-w-0 gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-3">{selected ? selected.level : 'Everything'}</p>
              <AnimatePresence mode="wait" initial={false}>
                <motion.h2 key={selected?.id ?? 'all'} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25, ease }} className="truncate text-xl font-semibold tracking-[-0.02em]">
                  {selected ? selected.name : 'All questions'}
                  {questions.data && <span className="ml-2 font-normal text-ink-3">{questions.data.length}</span>}
                </motion.h2>
              </AnimatePresence>
            </div>
            <Button size="sm" variant={adding ? 'ghost' : 'ink'} icon={adding ? <X weight="bold" /> : <Plus weight="bold" />} onClick={() => setAdding((a) => !a)}>
              {adding ? 'Close' : 'Add question'}
            </Button>
          </div>

          <AnimatePresence initial={false}>
            {adding && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.45, ease }} className="overflow-hidden">
                <QuestionForm
                  topic={selected?.level === 'topic' ? selected : null}
                  onSaved={() => {
                    questions.reload();
                    toast('Question saved', 'success');
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {(questions.data?.length ?? 0) > 0 && (
            <div className="grid gap-3">
              <div className="relative">
                <MagnifyingGlass weight="bold" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
                <Input aria-label="Search questions" placeholder="Search questions and answers" value={search} onChange={(e) => setSearch(e.target.value)} className="!h-11 !pl-10" />
              </div>
              {typesPresent.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  {(['all', ...typesPresent] as Array<QuestionType | 'all'>).map((t) => {
                    const on = t === typeFilter;
                    return (
                      <button key={t} onClick={() => setTypeFilter(t)} className={cx('relative h-8 rounded-full px-3.5 text-[12.5px] font-semibold transition-colors', on ? 'text-paper' : 'text-ink-2 hover:text-ink')}>
                        {on && <motion.span layoutId="type-filter" transition={spring.snappy} className="absolute inset-0 rounded-full bg-ink" />}
                        {!on && <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-line" />}
                        <span className="relative">{t === 'all' ? 'All types' : TYPE_LABEL[t]}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {questions.loading && !questions.data && <><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></>}
          {questions.data?.length === 0 && (
            <Empty icon={<Tag weight="duotone" />} title="No questions here" body="Pick a topic on the left and add a question, or import a CSV / Google Form." />
          )}
          {(questions.data?.length ?? 0) > 0 && shown.length === 0 && <p className="py-6 text-center text-sm text-ink-3">Nothing matches your filters.</p>}

          <ul className="grid gap-2">
            <AnimatePresence initial={false}>
              {shown.map((q, i) => {
                const on = picked.includes(q.id!);
                return (
                  <motion.li
                    key={q.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease, delay: Math.min(i, 8) * 0.03 } }}
                    exit={{ opacity: 0, x: -30, transition: { duration: 0.2 } }}
                    className={cx(
                      'group flex items-start gap-4 rounded-[18px] border bg-card p-4 transition-[border-color,box-shadow] duration-300',
                      on ? 'border-pulse/60 shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-pulse)_12%,transparent)]' : 'border-line hover:border-line-strong hover:shadow-[var(--shadow-soft)]',
                    )}
                  >
                    <PickBox on={on} onToggle={() => setPicked((p) => (on ? p.filter((x) => x !== q.id) : [...p, q.id!]))} />
                    <div className="grid min-w-0 flex-1 gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Chip>{TYPE_LABEL[q.type]}</Chip>
                        <span className="inline-flex items-center gap-1 text-xs text-ink-3"><Clock weight="bold" /> {q.timeLimitSec}s</span>
                        <AnimatePresence>
                          {on && (
                            <motion.span initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={spring.bouncy}>
                              <Chip tone="pulse">#{picked.indexOf(q.id!) + 1} in quiz</Chip>
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                      <p className="font-semibold leading-snug tracking-[-0.01em]">{q.prompt}</p>
                      <p className="text-sm text-ink-2">
                        <span className="text-ink-3">Answer · </span>{answerText(q)}
                      </p>
                    </div>
                    <IconButton
                      label="Delete question"
                      tone="danger"
                      size="sm"
                      className="opacity-60 group-hover:opacity-100"
                      onClick={async () => {
                        await api(`/questions/${q.id}`, { method: 'DELETE' }).catch((e) => toast(e.message, 'error'));
                        setPicked((p) => p.filter((x) => x !== q.id));
                        questions.reload();
                      }}
                    >
                      <Trash weight="bold" />
                    </IconButton>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </div>
      </div>

      <AnimatePresence>
        {picked.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.95 }}
            transition={spring.smooth}
            className="fixed inset-x-0 bottom-24 z-30 px-4 lg:bottom-6 lg:pl-[264px]"
          >
            <form
              onSubmit={(e) => { e.preventDefault(); void createQuiz(); }}
              className="glass mx-auto flex max-w-2xl flex-wrap items-center gap-2 rounded-[22px] border border-line p-2 pl-3 shadow-[var(--shadow-float)] sm:flex-nowrap sm:rounded-full"
            >
              <span className="flex items-center gap-2 pr-1 text-sm font-semibold">
                <span className="grid size-7 place-items-center rounded-full bg-pulse font-mono text-xs text-white">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span key={picked.length} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }}>{picked.length}</motion.span>
                  </AnimatePresence>
                </span>
                selected
              </span>
              <label htmlFor="quiz-title" className="sr-only">Quiz title</label>
              <input
                id="quiz-title"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="Name this quiz…"
                className="h-10 min-w-0 flex-1 rounded-full border border-line bg-card px-4 text-sm text-ink placeholder:text-ink-3 focus:border-pulse focus:outline-none"
              />
              <Button type="button" size="sm" variant="ghost" onClick={() => setPicked([])}>Clear</Button>
              <Button type="submit" size="sm" disabled={!quizTitle.trim()} icon={<Stack weight="bold" />}>Create quiz</Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PickBox({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label="Add to quiz"
      onClick={onToggle}
      className={cx(
        'mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-[7px] border-[1.5px] transition-colors duration-200 active:scale-90',
        on ? 'border-pulse bg-pulse text-white' : 'border-line-strong bg-card hover:border-ink-3',
      )}
    >
      <AnimatePresence>
        {on && (
          <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={spring.bouncy} className="inline-flex">
            <Check weight="bold" size={13} />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

function TopicTree({ tree, loading, selectedId, onSelect, onChanged }: {
  tree: TopicNode[] | null; loading: boolean; selectedId: string | null; onSelect: (id: string | null) => void; onChanged: () => void;
}) {
  const toast = useToast();
  const [adding, setAdding] = useState<{ parent: TopicNode | null } | null>(null);
  const [name, setName] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const childLevel = (p: TopicNode | null) => (!p ? 'course' : p.level === 'course' ? 'unit' : 'topic');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!adding) return;
    const p = adding.parent;
    const path = !p ? '/bank/courses' : p.level === 'course' ? `/bank/courses/${p.id}/units` : `/bank/units/${p.id}/topics`;
    try {
      const node = await api<TopicNode>(path, { method: 'POST', body: { name } });
      setName('');
      setAdding(null);
      onChanged();
      onSelect(node.id);
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const toggle = (id: string) =>
    setCollapsed((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const renderNode = (n: TopicNode, depth: number) => {
    const active = n.id === selectedId;
    const open = !collapsed.has(n.id);
    const hasKids = n.children.length > 0;
    return (
      <li key={n.id}>
        <div className="group relative flex items-center gap-0.5 rounded-xl pr-1" style={{ paddingLeft: depth * 14 }}>
          {active && <motion.span layoutId="tree-active" transition={spring.snappy} className="absolute inset-0 rounded-xl bg-pulse-soft ring-1 ring-inset ring-pulse/20" />}
          {!active && <span className="absolute inset-0 rounded-xl bg-paper-2 opacity-0 transition-opacity group-hover:opacity-100" />}
          {n.level !== 'topic' ? (
            <button aria-label={open ? `Collapse ${n.name}` : `Expand ${n.name}`} onClick={() => toggle(n.id)} className="relative grid size-6 shrink-0 place-items-center rounded-md text-ink-3 hover:text-ink">
              <motion.span animate={{ rotate: open && hasKids ? 90 : 0 }} transition={spring.snappy} className={cx('inline-flex', !hasKids && 'opacity-30')}>
                <CaretRight weight="bold" size={11} />
              </motion.span>
            </button>
          ) : (
            <span className="relative grid size-6 shrink-0 place-items-center text-ink-3"><Hash weight="bold" size={12} /></span>
          )}
          <button className={cx('relative flex min-w-0 flex-1 items-center gap-2 py-2 pr-1 text-left text-[13.5px]', active ? 'text-pulse' : 'text-ink')} onClick={() => onSelect(n.id)}>
            {n.level !== 'topic' && (active || open ? <FolderOpen weight="duotone" className="shrink-0" /> : <Folder weight="duotone" className="shrink-0" />)}
            <span className={cx('truncate', n.level !== 'topic' && 'font-semibold')}>{n.name}</span>
          </button>
          {n.level !== 'topic' && (
            <button
              aria-label={`Add ${childLevel(n)} to ${n.name}`}
              title={`Add ${childLevel(n)}`}
              className="relative grid size-7 shrink-0 place-items-center rounded-full text-ink-3 opacity-0 transition hover:bg-card hover:text-pulse focus-visible:opacity-100 group-hover:opacity-100 max-lg:opacity-70"
              onClick={() => { setAdding({ parent: n }); setName(''); if (!open) toggle(n.id); }}
            >
              <Plus weight="bold" size={13} />
            </button>
          )}
        </div>
        <AnimatePresence initial={false}>
          {adding?.parent?.id === n.id && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <AddForm level={childLevel(n)} name={name} setName={setName} onSubmit={submit} onCancel={() => setAdding(null)} depth={depth + 1} />
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence initial={false}>
          {hasKids && open && (
            <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease }} className="overflow-hidden">
              {n.children.map((c) => renderNode(c, depth + 1))}
            </motion.ul>
          )}
        </AnimatePresence>
      </li>
    );
  };

  return (
    <Panel className="grid gap-2 !p-3 lg:sticky lg:top-8">
      <p className="px-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Topics</p>
      <button onClick={() => onSelect(null)} className="group relative flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[13.5px] font-semibold">
        {selectedId === null && <motion.span layoutId="tree-active" transition={spring.snappy} className="absolute inset-0 rounded-xl bg-pulse-soft ring-1 ring-inset ring-pulse/20" />}
        {selectedId !== null && <span className="absolute inset-0 rounded-xl bg-paper-2 opacity-0 transition-opacity group-hover:opacity-100" />}
        <Stack weight="duotone" className={cx('relative', selectedId === null && 'text-pulse')} />
        <span className={cx('relative', selectedId === null && 'text-pulse')}>All questions</span>
      </button>
      {loading && !tree ? <div className="grid gap-1.5 p-1"><Skeleton className="h-8 !rounded-lg" /><Skeleton className="h-8 !rounded-lg" /><Skeleton className="h-8 !rounded-lg" /></div> : <ul className="grid gap-0.5">{tree?.map((n) => renderNode(n, 0))}</ul>}
      <div className="border-t border-line pt-2">
        {adding?.parent === null ? (
          <AddForm level="course" name={name} setName={setName} onSubmit={submit} onCancel={() => setAdding(null)} depth={0} />
        ) : (
          <Button size="sm" variant="soft" className="w-full" icon={<Plus weight="bold" />} onClick={() => { setAdding({ parent: null }); setName(''); }}>
            New course
          </Button>
        )}
        <p className="mt-2 px-1 text-[11.5px] leading-relaxed text-ink-3">Use + on a course to add a unit, and on a unit to add a topic.</p>
      </div>
    </Panel>
  );
}

function AddForm({ level, name, setName, onSubmit, onCancel, depth }: {
  level: string; name: string; setName: (s: string) => void; onSubmit: (e: FormEvent) => void; onCancel: () => void; depth: number;
}) {
  return (
    <form onSubmit={onSubmit} className="flex gap-1.5 py-1" style={{ paddingLeft: depth * 14 }}>
      <label className="sr-only" htmlFor={`add-${level}`}>New {level} name</label>
      <Input id={`add-${level}`} autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={`New ${level}`} className="!h-9 !rounded-xl text-sm" onKeyDown={(e) => e.key === 'Escape' && onCancel()} />
      <Button size="sm" type="submit" disabled={!name.trim()}>Add</Button>
    </form>
  );
}

function QuestionForm({ topic, onSaved }: { topic: TopicNode | null; onSaved: () => void }) {
  const meta = useMeta();
  const toast = useToast();
  const [type, setType] = useState<QuestionType>('mcq');
  const [prompt, setPrompt] = useState('');
  const [time, setTime] = useState(20);
  const [options, setOptions] = useState([{ text: '', correct: false }, { text: '', correct: false }, { text: '', correct: false }, { text: '', correct: false }]);
  const [tf, setTf] = useState(true);
  const [num, setNum] = useState('');
  const [tol, setTol] = useState('0');
  const [busy, setBusy] = useState(false);

  const choice = type === 'mcq' || type === 'multi_select' || type === 'poll';

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!topic) return toast('Pick a topic in the tree first', 'error');
    const spec: QuestionSpec = { type, prompt, topicId: topic.id, timeLimitSec: time };
    if (choice) spec.options = options.filter((o) => o.text.trim()).map((o) => ({ text: o.text, correct: type === 'poll' ? undefined : o.correct }));
    if (type === 'true_false') spec.answer = tf;
    if (type === 'numeric') { spec.numericAnswer = Number(num); spec.tolerance = Number(tol || 0); }
    setBusy(true);
    try {
      await api('/questions', { method: 'POST', body: spec });
      setPrompt('');
      setOptions(options.map(() => ({ text: '', correct: false })));
      setNum('');
      onSaved();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const types = meta?.questionTypes ?? (Object.keys(TYPE_LABEL) as QuestionType[]);

  return (
    <Panel className="mb-2">
      <form onSubmit={save} className="grid gap-5">
        {!topic && (
          <p className="flex items-center gap-2 rounded-2xl border border-pulse/20 bg-pulse-soft px-4 py-3 text-sm font-medium text-pulse">
            <Tag weight="fill" /> Select a topic in the tree to add questions to it.
          </p>
        )}
        {topic && <p className="text-[13px] text-ink-3">Adding to <b className="font-semibold text-ink">{topic.name}</b></p>}

        <div className="grid gap-2">
          <span className="text-[13px] font-semibold">Type</span>
          <div role="radiogroup" aria-label="Question type" className="flex flex-wrap gap-1.5">
            {types.map((t) => {
              const on = t === type;
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setType(t)}
                  className={cx('relative h-9 rounded-full px-4 text-[13px] font-semibold transition-colors', on ? 'text-paper' : 'text-ink-2 hover:text-ink')}
                >
                  {on && <motion.span layoutId="qtype" transition={spring.snappy} className="absolute inset-0 rounded-full bg-ink" />}
                  {!on && <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-line" />}
                  <span className="relative">{TYPE_LABEL[t] ?? t}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
          <Field label="Question">
            {(id) => <Textarea id={id} value={prompt} onChange={(e) => setPrompt(e.target.value)} className="!min-h-12" placeholder="What do you want to ask?" />}
          </Field>
          <Field label="Time (seconds)">
            {(id) => <Input id={id} type="number" min={5} max={300} value={time} onChange={(e) => setTime(Number(e.target.value))} className="font-mono" />}
          </Field>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={choice ? 'choice' : type} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
            {choice && (
              <fieldset className="grid gap-2">
                <legend className="mb-2 text-[13px] font-semibold">
                  Options <span className="font-normal text-ink-3">{type === 'mcq' ? '· mark the correct one' : type === 'multi_select' ? '· mark every correct one' : ''}</span>
                </legend>
                {options.map((o, i) => (
                  <motion.div key={i} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
                    <span className={cx('grid size-9 shrink-0 place-items-center rounded-[11px] font-mono text-sm font-bold', OPTION_COLORS[i % 6], OPTION_TEXT[i % 6])}>{letter(i)}</span>
                    <Input aria-label={`Option ${letter(i)}`} value={o.text} placeholder={`Option ${letter(i)}`} onChange={(e) => setOptions(options.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} className="!h-11" />
                    {type !== 'poll' && (
                      <button
                        type="button"
                        role={type === 'mcq' ? 'radio' : 'checkbox'}
                        aria-checked={o.correct}
                        aria-label={`Mark ${letter(i)} correct`}
                        onClick={() => setOptions(options.map((x, j) => (type === 'mcq' ? { ...x, correct: j === i } : j === i ? { ...x, correct: !x.correct } : x)))}
                        className={cx(
                          'flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors',
                          o.correct ? 'bg-good-soft text-good ring-1 ring-inset ring-good/30' : 'text-ink-3 ring-1 ring-inset ring-line hover:text-ink',
                        )}
                      >
                        <motion.span animate={{ scale: o.correct ? 1 : 0.85 }} transition={spring.bouncy} className="inline-flex"><Check weight="bold" /></motion.span>
                        <span className="max-sm:hidden">Correct</span>
                      </button>
                    )}
                  </motion.div>
                ))}
                {options.length < 6 && (
                  <Button type="button" size="sm" variant="ghost" className="justify-self-start" icon={<Plus weight="bold" />} onClick={() => setOptions([...options, { text: '', correct: false }])}>
                    Option
                  </Button>
                )}
              </fieldset>
            )}
            {type === 'true_false' && (
              <div className="grid gap-2">
                <span className="text-[13px] font-semibold">Correct answer</span>
                <div className="grid max-w-sm grid-cols-2 gap-2">
                  {[true, false].map((v) => (
                    <button
                      type="button"
                      key={String(v)}
                      onClick={() => setTf(v)}
                      className={cx('relative h-12 rounded-2xl font-semibold transition-colors', tf === v ? 'text-paper' : 'text-ink-2 ring-1 ring-inset ring-line hover:text-ink')}
                    >
                      {tf === v && <motion.span layoutId="tf" transition={spring.snappy} className="absolute inset-0 rounded-2xl bg-ink" />}
                      <span className="relative">{v ? 'True' : 'False'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {type === 'numeric' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Correct answer">{(id) => <Input id={id} type="number" step="any" value={num} onChange={(e) => setNum(e.target.value)} className="font-mono" />}</Field>
                <Field label="Allowed error" hint="0 means it must be exact.">{(id) => <Input id={id} type="number" step="any" min={0} value={tol} onChange={(e) => setTol(e.target.value)} className="font-mono" />}</Field>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center gap-3 border-t border-line pt-4">
          <Button type="submit" loading={busy} disabled={!topic || !prompt.trim()} icon={<Check weight="bold" />}>Save question</Button>
          <span className="text-[12px] text-ink-3">Saved to the bank. Add it to a quiz by ticking it below.</span>
        </div>
      </form>
    </Panel>
  );
}
