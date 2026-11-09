import { ArrowLeft, DownloadSimple, Warning } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useToast } from '../../components/Toast';
import { Button, Chip, cx, Panel, pct, Skeleton } from '../../components/ui';
import { api, download } from '../../lib/api';
import { useLoad } from '../../lib/hooks';
import type { SessionReport, TopicLevel } from '../../lib/types';

const tone = (x: number | null) => (x === null ? 'bg-line' : x < 0.6 ? 'bg-bad' : x < 0.8 ? 'bg-opt-b' : 'bg-good');

export default function Report() {
  const { sessionId } = useParams();
  const toast = useToast();
  const [groupBy, setGroupBy] = useState<TopicLevel>('topic');
  const { data: r, loading, error } = useLoad(() => api<SessionReport>(`/sessions/${sessionId}/report?groupBy=${groupBy}`), [sessionId, groupBy]);

  const exportAs = (format: string) => download(`/sessions/${sessionId}/export?format=${format}&groupBy=${groupBy}`).catch((e) => toast(e.message, 'error'));

  return (
    <div className="grid gap-8">
      <Link to="/app/reports" className="flex w-fit items-center gap-2 text-sm font-semibold text-ink-2 hover:text-ink"><ArrowLeft weight="bold" /> All reports</Link>
      {error && <p className="text-bad">{error}</p>}
      {loading && !r && <Skeleton className="h-72" />}
      {r && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tighter">{r.quizTitle}</h1>
              <p className="mt-2 text-ink-2">{r.playerCount} players · scoring: {r.scoringMode} · room <span className="font-mono">{r.roomCode}</span></p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" icon={<DownloadSimple weight="bold" />} onClick={() => exportAs('csv')}>CSV</Button>
              <Button size="sm" variant="ghost" icon={<DownloadSimple weight="bold" />} onClick={() => exportAs('json')}>JSON</Button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Panel className="grid content-start gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold tracking-tight">Results by {groupBy}</h2>
                <div className="flex rounded-full bg-paper-2 p-1" role="tablist">
                  {(['topic', 'unit', 'course'] as TopicLevel[]).map((g) => (
                    <button key={g} role="tab" aria-selected={g === groupBy} onClick={() => setGroupBy(g)} className={cx('rounded-full px-4 py-1.5 text-sm font-semibold capitalize', g === groupBy ? 'bg-ink text-paper' : 'text-ink-2')}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              {r.groups.length === 0 && <p className="text-ink-2">No graded answers yet.</p>}
              {r.groups.map((g) => (
                <div key={g.id} className="grid gap-2">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-medium">{g.path}</span>
                    <span className="shrink-0 font-mono font-bold">{pct(g.accuracy)}</span>
                  </div>
                  <div className={cx('h-3 rounded-full', tone(g.accuracy))} style={{ width: `${Math.max(3, (g.accuracy ?? 0) * 100)}%` }} />
                  <span className="text-xs text-ink-2">{g.correct} of {g.answered} answers correct</span>
                </div>
              ))}
            </Panel>

            <div className="grid content-start gap-6">
              <Panel className={cx('grid gap-3', r.struggling.length > 0 && 'border-bad/40 bg-bad/5')}>
                <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight"><Warning weight="duotone" className="text-bad" /> Reteach</h2>
                {r.struggling.length === 0 ? <p className="text-ink-2">Every {groupBy} is at 60% or above.</p> : r.struggling.map((s) => (
                  <div key={s.id} className="flex justify-between gap-3"><span className="font-semibold">{s.name}</span><span className="font-mono font-bold text-bad">{pct(s.accuracy)}</span></div>
                ))}
              </Panel>
              <Panel className="grid gap-2">
                <h2 className="mb-1 text-xl font-bold tracking-tight">Leaderboard</h2>
                {r.leaderboard.slice(0, 5).map((e) => (
                  <div key={e.playerId} className="flex gap-3 text-sm">
                    <span className="w-5 font-mono font-bold">{e.rank}</span><span className="flex-1 font-semibold">{e.nickname}</span><span className="font-mono">{e.total}</span>
                  </div>
                ))}
              </Panel>
            </div>
          </div>

          <Panel className="grid gap-4">
            <h2 className="text-xl font-bold tracking-tight">Questions</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {r.questions.map((q, i) => (
                <div key={q.questionId + i} className="grid content-start gap-2 rounded-2xl bg-paper p-4">
                  <div className="flex items-center gap-2">
                    {q.gradable ? <Chip tone={q.accuracy !== null && q.accuracy < 0.6 ? 'bad' : 'good'}>{pct(q.accuracy)} correct</Chip> : <Chip>Poll</Chip>}
                    {q.avgResponseMs !== null && <span className="text-xs text-ink-2">avg {(q.avgResponseMs / 1000).toFixed(1)}s</span>}
                  </div>
                  <p className="font-semibold leading-snug">{q.prompt}</p>
                  <p className="text-xs text-ink-2">{q.topicPath} · {q.answered} answered</p>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
