import { ArrowRight, ChartBar } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { Chip, Empty, Skeleton } from '../../components/ui';
import { api } from '../../lib/api';
import { useLoad } from '../../lib/hooks';
import type { SessionSummary } from '../../lib/types';

export default function Reports() {
  const { data, loading } = useLoad(() => api<SessionSummary[]>('/sessions'));
  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tighter">Reports</h1>
        <p className="mt-2 text-ink-2">Every session you have run, with what the class found hard.</p>
      </div>
      {loading && !data && <Skeleton className="h-40" />}
      {data?.length === 0 && <Empty icon={<ChartBar />} title="No sessions yet" body="Run a quiz and its report shows up here after the first question." />}
      <div className="grid gap-2">
        {data?.map((s) => (
          <Link key={s.sessionId} to={s.sessionId} className="group flex flex-wrap items-center gap-4 rounded-3xl border border-line bg-card p-5 transition hover:border-ink">
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold tracking-tight">{s.quizTitle}</p>
              <p className="text-sm text-ink-2">
                {new Date(s.startedAt).toLocaleString()} · room <span className="font-mono">{s.roomCode}</span>
              </p>
            </div>
            <span className="text-sm text-ink-2">{s.players} players · {s.rounds} questions</span>
            {!s.endedAt && <Chip tone="pulse">Live</Chip>}
            <ArrowRight weight="bold" className="transition group-hover:translate-x-1" />
          </Link>
        ))}
      </div>
    </div>
  );
}
