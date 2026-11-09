import { CaretRight, Folder, FolderOpen, Plus, Tag, Trash, X } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useToast } from '../../components/Toast';
import { Button, Chip, cx, Empty, Field, Input, letter, Panel, Select, Skeleton, Textarea } from '../../components/ui';
import { api } from '../../lib/api';
import { useLoad, useMeta } from '../../lib/hooks';
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

  const selected = useMemo(() => findNode(tree.data ?? [], selectedId), [tree.data, selectedId]);

  const createQuiz = async () => {
    try {
      await api('/quizzes', { method: 'POST', body: { title: quizTitle, questionIds: picked } });
      toast('Quiz created');
      navigate('/app');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  return (
    <div className="grid gap-8 pb-28">
      <div>
        <h1 className="text-4xl font-bold tracking-tighter">Question bank</h1>
        <p className="mt-2 text-ink-2">Organise questions by course, unit and topic. Reports group results the same way.</p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[300px_1fr]">
        <TopicTree tree={tree.data} loading={tree.loading} selectedId={selectedId} onSelect={setSelectedId} onChanged={tree.reload} />

        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold tracking-tight">{selected ? selected.name : 'All questions'}</h2>
            <Button
              size="sm"
              variant={adding ? 'ghost' : 'ink'}
              icon={adding ? <X weight="bold" /> : <Plus weight="bold" />}
              onClick={() => setAdding((a) => !a)}
            >
              {adding ? 'Close' : 'Add question'}
            </Button>
          </div>

          <AnimatePresence initial={false}>
            {adding && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <QuestionForm
                  topic={selected?.level === 'topic' ? selected : null}
                  onSaved={() => {
                    questions.reload();
                    toast('Question saved');
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {questions.loading && !questions.data && <><Skeleton className="h-20" /><Skeleton className="h-20" /></>}
          {questions.data?.length === 0 && (
            <Empty icon={<Tag />} title="No questions here" body="Pick a topic on the left and add a question, or import a CSV / Google Form." />
          )}
          <ul className="grid gap-2">
            {questions.data?.map((q) => {
              const on = picked.includes(q.id!);
              return (
                <li key={q.id} className={cx('flex items-start gap-4 rounded-2xl border bg-card p-4 transition', on ? 'border-ink' : 'border-line')}>
                  <input
                    type="checkbox"
                    aria-label="Add to quiz"
                    checked={on}
                    onChange={() => setPicked((p) => (on ? p.filter((x) => x !== q.id) : [...p, q.id!]))}
                    className="mt-1 size-5 accent-[var(--color-pulse)]"
                  />
                  <div className="grid min-w-0 flex-1 gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip>{TYPE_LABEL[q.type]}</Chip>
                      <span className="text-xs text-ink-2">{q.timeLimitSec}s</span>
                      {on && <Chip tone="pulse">#{picked.indexOf(q.id!) + 1} in quiz</Chip>}
                    </div>
                    <p className="font-semibold leading-snug">{q.prompt}</p>
                    <p className="text-sm text-ink-2">Answer: {answerText(q)}</p>
                  </div>
                  <button
                    aria-label="Delete question"
                    className="grid size-9 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-bad/10 hover:text-bad"
                    onClick={async () => {
                      await api(`/questions/${q.id}`, { method: 'DELETE' }).catch((e) => toast(e.message, 'error'));
                      setPicked((p) => p.filter((x) => x !== q.id));
                      questions.reload();
                    }}
                  >
                    <Trash weight="bold" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <AnimatePresence>
        {picked.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed inset-x-0 bottom-4 z-30 px-4"
          >
            <form
              onSubmit={(e) => { e.preventDefault(); void createQuiz(); }}
              className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 rounded-full bg-ink p-2 pl-5 text-paper shadow-2xl"
            >
              <span className="font-semibold">{picked.length} selected</span>
              <label htmlFor="quiz-title" className="sr-only">Quiz title</label>
              <input
                id="quiz-title"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="Quiz title"
                className="h-10 min-w-0 flex-1 rounded-full bg-white/10 px-4 text-paper placeholder:text-paper/60 focus:outline-none"
              />
              <Button type="button" size="sm" variant="ghost" className="!text-paper !ring-white/25 hover:!bg-white/10" onClick={() => setPicked([])}>Clear</Button>
              <Button type="submit" size="sm" disabled={!quizTitle.trim()}>Create quiz</Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TopicTree({ tree, loading, selectedId, onSelect, onChanged }: {
  tree: TopicNode[] | null; loading: boolean; selectedId: string | null; onSelect: (id: string | null) => void; onChanged: () => void;
}) {
  const toast = useToast();
  const [adding, setAdding] = useState<{ parent: TopicNode | null } | null>(null);
  const [name, setName] = useState('');

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

  const renderNode = (n: TopicNode, depth: number) => {
    const active = n.id === selectedId;
    return (
      <li key={n.id}>
        <div className={cx('group flex items-center gap-1 rounded-xl pr-1', active ? 'bg-ink text-paper' : 'hover:bg-paper-2')} style={{ paddingLeft: depth * 14 }}>
          <button className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-sm" onClick={() => onSelect(n.id)}>
            {n.level === 'topic' ? <CaretRight weight="bold" className="shrink-0 opacity-50" /> : active ? <FolderOpen weight="duotone" className="shrink-0" /> : <Folder weight="duotone" className="shrink-0" />}
            <span className={cx('truncate', n.level !== 'topic' && 'font-semibold')}>{n.name}</span>
          </button>
          {n.level !== 'topic' && (
            <button
              aria-label={`Add ${childLevel(n)} to ${n.name}`}
              className="grid size-7 shrink-0 place-items-center rounded-full opacity-60 hover:opacity-100"
              onClick={() => { setAdding({ parent: n }); setName(''); }}
            >
              <Plus weight="bold" size={14} />
            </button>
          )}
        </div>
        {adding?.parent?.id === n.id && <AddForm level={childLevel(n)} name={name} setName={setName} onSubmit={submit} onCancel={() => setAdding(null)} depth={depth + 1} />}
        {n.children.length > 0 && <ul>{n.children.map((c) => renderNode(c, depth + 1))}</ul>}
      </li>
    );
  };

  return (
    <Panel className="grid gap-3 lg:sticky lg:top-32">
      <button onClick={() => onSelect(null)} className={cx('rounded-xl px-2 py-2 text-left text-sm font-semibold', selectedId === null ? 'bg-ink text-paper' : 'hover:bg-paper-2')}>
        All questions
      </button>
      {loading && !tree ? <Skeleton className="h-40" /> : <ul className="grid gap-0.5">{tree?.map((n) => renderNode(n, 0))}</ul>}
      {adding?.parent === null ? (
        <AddForm level="course" name={name} setName={setName} onSubmit={submit} onCancel={() => setAdding(null)} depth={0} />
      ) : (
        <Button size="sm" variant="ghost" icon={<Plus weight="bold" />} onClick={() => { setAdding({ parent: null }); setName(''); }}>
          New course
        </Button>
      )}
      <p className="text-xs text-ink-2">Use + on a course to add a unit, and on a unit to add a topic.</p>
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

  return (
    <Panel className="mb-2">
      <form onSubmit={save} className="grid gap-5">
        {!topic && <p className="rounded-2xl bg-pulse-soft px-4 py-3 text-sm font-medium text-pulse">Select a topic in the tree to add questions to it.</p>}
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <Field label="Type">
            {(id) => (
              <Select id={id} value={type} onChange={(e) => setType(e.target.value as QuestionType)}>
                {(meta?.questionTypes ?? (Object.keys(TYPE_LABEL) as QuestionType[])).map((t) => <option key={t} value={t}>{TYPE_LABEL[t] ?? t}</option>)}
              </Select>
            )}
          </Field>
          <Field label="Time (seconds)">
            {(id) => <Input id={id} type="number" min={5} max={300} value={time} onChange={(e) => setTime(Number(e.target.value))} />}
          </Field>
        </div>
        <Field label="Question">
          {(id) => <Textarea id={id} value={prompt} onChange={(e) => setPrompt(e.target.value)} className="!min-h-20" />}
        </Field>

        {choice && (
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-semibold">
              Options {type === 'mcq' ? '(mark the correct one)' : type === 'multi_select' ? '(mark every correct one)' : ''}
            </legend>
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 font-mono text-sm font-bold text-ink-2">{letter(i)}</span>
                <Input aria-label={`Option ${letter(i)}`} value={o.text} onChange={(e) => setOptions(options.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} className="!h-11" />
                {type !== 'poll' && (
                  <label className="flex shrink-0 items-center gap-1.5 text-sm">
                    <input
                      type={type === 'mcq' ? 'radio' : 'checkbox'}
                      name="correct"
                      checked={o.correct}
                      onChange={(e) => setOptions(options.map((x, j) => (type === 'mcq' ? { ...x, correct: j === i } : j === i ? { ...x, correct: e.target.checked } : x)))}
                      className="size-4 accent-[var(--color-good)]"
                    />
                    Correct
                  </label>
                )}
              </div>
            ))}
            {options.length < 6 && (
              <Button type="button" size="sm" variant="ghost" className="justify-self-start" icon={<Plus weight="bold" />} onClick={() => setOptions([...options, { text: '', correct: false }])}>
                Option
              </Button>
            )}
          </fieldset>
        )}
        {type === 'true_false' && (
          <div className="flex gap-2">
            {[true, false].map((v) => (
              <button type="button" key={String(v)} onClick={() => setTf(v)} className={cx('rounded-full px-5 py-2 font-semibold ring-1 ring-inset', tf === v ? 'bg-ink text-paper ring-ink' : 'ring-line')}>
                {v ? 'True' : 'False'}
              </button>
            ))}
          </div>
        )}
        {type === 'numeric' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Correct answer">{(id) => <Input id={id} type="number" step="any" value={num} onChange={(e) => setNum(e.target.value)} />}</Field>
            <Field label="Allowed error" hint="0 means it must be exact.">{(id) => <Input id={id} type="number" step="any" min={0} value={tol} onChange={(e) => setTol(e.target.value)} />}</Field>
          </div>
        )}
        <Button type="submit" loading={busy} disabled={!topic || !prompt.trim()} className="justify-self-start">Save question</Button>
      </form>
    </Panel>
  );
}
