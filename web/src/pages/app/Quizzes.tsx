import { BookOpen, Lightning, ListNumbers } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useToast } from '../../components/Toast';
import { Button, Empty, Select, Skeleton } from '../../components/ui';
import { api } from '../../lib/api';
import { useLoad, useMeta } from '../../lib/hooks';
import type { Quiz } from '../../lib/types';
import { hostKeyStore } from '../../lib/workspace';

export default function Quizzes() {
  const { data: quizzes, loading, error } = useLoad(() => api<Quiz[]>('/quizzes'));
  const meta = useMeta();

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter">Quizzes</h1>
          <p className="mt-2 text-ink-2">Pick a quiz, choose how points work, and go live.</p>
        </div>
        <Link to="/app/library"><Button variant="ghost" icon={<BookOpen weight="bold" />}>Build a quiz</Button></Link>
      </div>

      {loading && <div className="grid gap-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>}
      {error && <p className="text-bad">{error}</p>}
      {quizzes && quizzes.length === 0 && (
        <Empty
          icon={<ListNumbers />}
          title="No quizzes yet"
          body="Select questions in your question bank and turn them into a quiz."
          action={<Link to="/app/library"><Button variant="ink">Open question bank</Button></Link>}
        />
      )}
      <div className="grid gap-3">
        {quizzes?.map((q) => <QuizRow key={q.id} quiz={q} modes={meta?.scoringModes ?? []} />)}
      </div>
    </div>
  );
}

function QuizRow({ quiz, modes }: { quiz: Quiz; modes: Array<{ id: string; label: string; description: string }> }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [mode, setMode] = useState('speed');
  const [busy, setBusy] = useState(false);

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
    <div className="grid items-center gap-4 rounded-3xl border border-line bg-card p-5 sm:grid-cols-[1fr_auto_auto] sm:p-6">
      <div className="min-w-0">
        <p className="truncate text-xl font-bold tracking-tight">{quiz.title}</p>
        <p className="text-sm text-ink-2">{quiz.questionIds.length} questions · created {new Date(quiz.createdAt).toLocaleDateString()}</p>
      </div>
      <div className="grid gap-1">
        <label className="sr-only" htmlFor={`mode-${quiz.id}`}>Scoring mode</label>
        <Select id={`mode-${quiz.id}`} value={mode} onChange={(e) => setMode(e.target.value)} className="!h-11 sm:w-48" title={modes.find((m) => m.id === mode)?.description}>
          {modes.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </Select>
      </div>
      <Button onClick={goLive} loading={busy} icon={busy ? undefined : <Lightning weight="fill" />}>
        Go live
      </Button>
    </div>
  );
}
