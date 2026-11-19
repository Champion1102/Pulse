import { BookOpen, CalendarBlank, Lightning, ListNumbers, MagnifyingGlass, Plus, Question } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useToast } from '../../components/Toast';
import { AnimatedNumber, Button, Chip, cx, Empty, Input, PageHeader, Panel, Skeleton } from '../../components/ui';
import { api } from '../../lib/api';
import { useLoad, useMeta } from '../../lib/hooks';
import { ease, spring } from '../../lib/motion';
import type { Quiz } from '../../lib/types';
import { hostKeyStore } from '../../lib/workspace';

type Mode = { id: string; label: string; description: string };

export default function Quizzes() {
  const { data: quizzes, loading, error } = useLoad(() => api<Quiz[]>('/quizzes'));
  const meta = useMeta();
  const [q, setQ] = useState('');

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (quizzes ?? []).filter((x) => !t || x.title.toLowerCase().includes(t));
  }, [quizzes, q]);
  const totalQuestions = (quizzes ?? []).reduce((n, x) => n + x.questionIds.length, 0);

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Teach"
        title="Quizzes"
        description="Pick a quiz, choose how points work, and go live."
        actions={<Link to="/app/library"><Button variant="ink" icon={<Plus weight="bold" />}>Build a quiz</Button></Link>}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Quizzes" value={quizzes?.length ?? 0} icon={<ListNumbers weight="duotone" />} loading={loading && !quizzes} />
        <Stat label="Questions in quizzes" value={totalQuestions} icon={<Question weight="duotone" />} loading={loading && !quizzes} />
        <Stat
          label="Scoring modes"
          value={meta?.scoringModes.length ?? 0}
          icon={<Lightning weight="duotone" />}
          loading={!meta}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {quizzes && quizzes.length > 0 && (
        <div className="relative max-w-sm">
          <MagnifyingGlass weight="bold" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
          <Input aria-label="Search quizzes" placeholder="Search quizzes" value={q} onChange={(e) => setQ(e.target.value)} className="!h-11 !pl-10" />
        </div>
      )}

      {loading && !quizzes && <div className="grid gap-3"><Skeleton className="h-36" /><Skeleton className="h-36" /></div>}
      {error && <p className="text-bad">{error}</p>}
      {quizzes && quizzes.length === 0 && (
        <Empty
          icon={<ListNumbers weight="duotone" />}
          title="No quizzes yet"
          body="Select questions in your question bank and turn them into a quiz."
          action={<Link to="/app/library"><Button variant="ink" icon={<BookOpen weight="bold" />}>Open question bank</Button></Link>}
        />
      )}
      {quizzes && quizzes.length > 0 && shown.length === 0 && <p className="py-8 text-center text-sm text-ink-3">No quizzes match “{q}”.</p>}

      <motion.div className="grid gap-3" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}>
        <AnimatePresence initial={false}>
          {shown.map((quiz) => <QuizCard key={quiz.id} quiz={quiz} modes={meta?.scoringModes ?? []} />)}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function Stat({ label, value, icon, loading, className }: { label: string; value: number; icon: React.ReactNode; loading?: boolean; className?: string }) {
  return (
    <Panel className={cx('!p-4 sm:!p-5', className)}>
      <div className="flex items-center justify-between text-ink-3">
        <span className="text-[12.5px] font-medium">{label}</span>
        <span className="text-lg text-pulse">{icon}</span>
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-[-0.03em]">{loading ? <span className="text-ink-3">–</span> : <AnimatedNumber value={value} />}</p>
    </Panel>
  );
}

function QuizCard({ quiz, modes }: { quiz: Quiz; modes: Mode[] }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [mode, setMode] = useState('speed');
  const [busy, setBusy] = useState(false);
  const current = modes.find((m) => m.id === mode);

  const goLive = async () => {
    setBusy(true);
    try {
      const s = await api<{ code: string; hostKey: string; sessionId: string }>('/sessions', { method: 'POST', body: { quizId: quiz.id, scoringMode: mode } });
      hostKeyStore.set(s.code, s.hostKey);
      navigate(`/host/${s.code}`);
    } catch (e) {
      toast((e as Error).message, 'error');
      setBusy(false);
    }
  };

  return (
    <motion.div
      layout
      variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } } }}
      exit={{ opacity: 0, scale: 0.98 }}
    >
      <Panel spotlight className="grid gap-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-pulse to-pulse-2 text-xl text-white shadow-[var(--shadow-glow)]">
            <Lightning weight="fill" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold tracking-[-0.02em]">{quiz.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
              <Chip>{quiz.questionIds.length} questions</Chip>
              <span className="inline-flex items-center gap-1"><CalendarBlank weight="bold" /> {new Date(quiz.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
          <Button onClick={goLive} loading={busy} icon={busy ? undefined : <Lightning weight="fill" />} className="max-sm:w-full">
            Go live
          </Button>
        </div>

        {modes.length > 0 && (
          <div className="grid gap-2 border-t border-line pt-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-3">Scoring</p>
            <div role="radiogroup" aria-label="Scoring mode" className="flex flex-wrap gap-1.5">
              {modes.map((m) => {
                const on = m.id === mode;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setMode(m.id)}
                    className={cx('relative h-8 rounded-full px-3.5 text-[13px] font-semibold transition-colors', on ? 'text-pulse' : 'text-ink-2 hover:text-ink')}
                  >
                    {on && <motion.span layoutId={`mode-${quiz.id}`} transition={spring.snappy} className="absolute inset-0 rounded-full bg-pulse-soft ring-1 ring-inset ring-pulse/25" />}
                    {!on && <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-line" />}
                    <span className="relative">{m.label}</span>
                  </button>
                );
              })}
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={mode}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
                className="text-[13px] text-ink-2"
              >
                {current?.description}
              </motion.p>
            </AnimatePresence>
          </div>
        )}
      </Panel>
    </motion.div>
  );
}
