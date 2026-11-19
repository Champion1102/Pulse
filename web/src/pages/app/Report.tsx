import { ArrowLeft, CheckCircle, Crown, DownloadSimple, Question, SortAscending, Timer, Users, Warning } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useToast } from '../../components/Toast';
import { AnimatedNumber, Avatar, Button, Chip, cx, Panel, pct, ProgressRing, Segmented, Skeleton } from '../../components/ui';
import { api, download } from '../../lib/api';
import { useLoad } from '../../lib/hooks';
import { ease } from '../../lib/motion';
import type { SessionReport, TopicLevel } from '../../lib/types';

const tone = (x: number | null) => (x === null ? 'bg-line-strong' : x < 0.6 ? 'bg-bad' : x < 0.8 ? 'bg-warn' : 'bg-good');
const toneText = (x: number | null) => (x === null ? 'text-ink-3' : x < 0.6 ? 'text-bad' : x < 0.8 ? 'text-warn' : 'text-good');

export default function Report() {
  const { sessionId } = useParams();
  const toast = useToast();
  const reduce = useReducedMotion();
  const [groupBy, setGroupBy] = useState<TopicLevel>('topic');
  const [hardestFirst, setHardestFirst] = useState(false);
  const { data: r, loading, error } = useLoad(() => api<SessionReport>(`/sessions/${sessionId}/report?groupBy=${groupBy}`), [sessionId, groupBy]);

  const exportAs = (format: string) => download(`/sessions/${sessionId}/export?format=${format}&groupBy=${groupBy}`).catch((e) => toast(e.message, 'error'));

  const overall = useMemo(() => {
    if (!r) return null;
    const answered = r.groups.reduce((n, g) => n + g.answered, 0);
    const correct = r.groups.reduce((n, g) => n + g.correct, 0);
    return answered ? correct / answered : null;
  }, [r]);

  const questions = useMemo(() => {
    if (!r) return [];
    if (!hardestFirst) return r.questions;
    return [...r.questions].sort((a, b) => (a.accuracy ?? 2) - (b.accuracy ?? 2));
  }, [r, hardestFirst]);

  return (
    <div className="grid gap-8">
      <Link to="/app/reports" className="group flex w-fit items-center gap-2 text-[13px] font-semibold text-ink-3 transition hover:text-ink">
        <ArrowLeft weight="bold" className="transition group-hover:-translate-x-0.5" /> All reports
      </Link>
      {error && <p className="text-bad">{error}</p>}
      {loading && !r && <div className="grid gap-4"><Skeleton className="h-16 w-2/3 !rounded-xl" /><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div><Skeleton className="h-72" /></div>}
      {r && (
        <>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-pulse">Session report</p>
              <h1 className="mt-2 text-[clamp(1.9rem,3.4vw,2.6rem)] font-semibold leading-[1.05] tracking-[-0.035em]">{r.quizTitle}</h1>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
                <Chip>Scoring: {r.scoringMode}</Chip>
                <span>room <span className="font-mono font-semibold text-ink-2">{r.roomCode}</span></span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" icon={<DownloadSimple weight="bold" />} onClick={() => exportAs('csv')}>CSV</Button>
              <Button size="sm" variant="ghost" icon={<DownloadSimple weight="bold" />} onClick={() => exportAs('json')}>JSON</Button>
            </div>
          </motion.div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Panel className="col-span-2 flex items-center gap-5 !p-5 lg:col-span-1">
              <ProgressRing value={overall ?? 0} size={76} stroke={7} tone={overall === null ? 'var(--color-line-strong)' : overall < 0.6 ? 'var(--color-bad)' : overall < 0.8 ? 'var(--color-warn)' : 'var(--color-good)'}>
                <span className="font-mono text-sm font-bold">{pct(overall)}</span>
              </ProgressRing>
              <div>
                <p className="text-[12.5px] font-medium text-ink-3">Overall accuracy</p>
                <p className="mt-1 text-sm text-ink-2">across graded answers</p>
              </div>
            </Panel>
            <StatTile icon={<Users weight="duotone" />} label="Players" value={r.playerCount} />
            <StatTile icon={<Question weight="duotone" />} label="Questions" value={r.questions.length} />
            <StatTile icon={<Warning weight="duotone" />} label={`${groupBy}s to reteach`} value={r.struggling.length} danger={r.struggling.length > 0} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Panel className="grid content-start gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold capitalize tracking-[-0.02em]">Results by {groupBy}</h2>
                <Segmented<TopicLevel>
                  size="sm"
                  value={groupBy}
                  onChange={setGroupBy}
                  options={(['topic', 'unit', 'course'] as TopicLevel[]).map((g) => ({ value: g, label: g }))}
                />
              </div>
              {r.groups.length === 0 && <p className="text-ink-2">No graded answers yet.</p>}
              <div className="grid gap-5">
                {r.groups.map((g, i) => (
                  <div key={g.id + groupBy} className="grid gap-2">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="min-w-0 truncate text-[14px] font-medium">{g.path}</span>
                      <span className={cx('shrink-0 font-mono text-sm font-bold', toneText(g.accuracy))}>{pct(g.accuracy)}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-paper-2">
                      <motion.div
                        className={cx('h-full origin-left rounded-full', tone(g.accuracy))}
                        style={{ width: `${Math.max(3, (g.accuracy ?? 0) * 100)}%` }}
                        initial={reduce ? false : { scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.9, delay: 0.1 + i * 0.06, ease }}
                      />
                    </div>
                    <span className="text-xs text-ink-3">{g.correct} of {g.answered} answers correct</span>
                  </div>
                ))}
              </div>
            </Panel>

            <div className="grid content-start gap-6">
              <Panel className={cx('grid gap-3', r.struggling.length > 0 && '!border-bad/30 !bg-bad-soft/60')}>
                <h2 className="flex items-center gap-2 text-lg font-semibold tracking-[-0.02em]">
                  {r.struggling.length > 0 ? <Warning weight="duotone" className="text-bad" /> : <CheckCircle weight="duotone" className="text-good" />} Reteach
                </h2>
                {r.struggling.length === 0 ? (
                  <p className="text-ink-2">Every {groupBy} is at 60% or above.</p>
                ) : (
                  r.struggling.map((s, i) => (
                    <motion.div key={s.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.05 }} className="flex items-center justify-between gap-3 rounded-xl bg-card/70 px-3 py-2">
                      <span className="truncate font-semibold">{s.name}</span>
                      <span className="font-mono font-bold text-bad">{pct(s.accuracy)}</span>
                    </motion.div>
                  ))
                )}
              </Panel>
              <Panel className="grid gap-1.5">
                <h2 className="mb-2 text-lg font-semibold tracking-[-0.02em]">Leaderboard</h2>
                {r.leaderboard.length === 0 && <p className="text-sm text-ink-3">No players.</p>}
                {r.leaderboard.slice(0, 5).map((e, i) => (
                  <motion.div key={e.playerId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className={cx('flex items-center gap-3 rounded-xl px-2 py-2', i === 0 && 'bg-pulse-soft')}>
                    <span className="w-5 text-center font-mono text-sm font-bold text-ink-3">{e.rank}</span>
                    <Avatar name={e.nickname} size="sm" />
                    <span className="flex-1 truncate text-sm font-semibold">{e.nickname}</span>
                    {i === 0 && <Crown weight="fill" className="text-opt-b" />}
                    <span className="font-mono text-sm font-semibold tabular">{e.total.toLocaleString()}</span>
                  </motion.div>
                ))}
              </Panel>
            </div>
          </div>

          <Panel className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-[-0.02em]">Questions</h2>
              <Button size="sm" variant={hardestFirst ? 'ink' : 'ghost'} icon={<SortAscending weight="bold" />} onClick={() => setHardestFirst((h) => !h)}>
                Hardest first
              </Button>
            </div>
            <motion.div layout className="grid gap-3 sm:grid-cols-2">
              {questions.map((q, i) => (
                <motion.div
                  layout
                  key={q.questionId + i}
                  transition={{ layout: { type: 'spring', stiffness: 300, damping: 30 } }}
                  className="grid content-start gap-2.5 rounded-2xl border border-line bg-paper/60 p-4"
                >
                  <div className="flex items-center gap-2">
                    {q.gradable ? <Chip tone={q.accuracy !== null && q.accuracy < 0.6 ? 'bad' : 'good'}>{pct(q.accuracy)} correct</Chip> : <Chip>Poll</Chip>}
                    {q.avgResponseMs !== null && <span className="inline-flex items-center gap-1 text-xs text-ink-3"><Timer weight="bold" /> avg {(q.avgResponseMs / 1000).toFixed(1)}s</span>}
                  </div>
                  <p className="font-semibold leading-snug tracking-[-0.01em]">{q.prompt}</p>
                  {q.gradable && (
                    <div className="h-1.5 overflow-hidden rounded-full bg-paper-2">
                      <div className={cx('h-full rounded-full', tone(q.accuracy))} style={{ width: `${Math.max(2, (q.accuracy ?? 0) * 100)}%` }} />
                    </div>
                  )}
                  <p className="text-xs text-ink-3">{q.topicPath} · {q.answered} answered</p>
                </motion.div>
              ))}
            </motion.div>
          </Panel>
        </>
      )}
    </div>
  );
}

function StatTile({ icon, label, value, danger }: { icon: React.ReactNode; label: string; value: number; danger?: boolean }) {
  return (
    <Panel className="!p-5">
      <div className="flex items-center justify-between text-ink-3">
        <span className="text-[12.5px] font-medium capitalize">{label}</span>
        <span className={cx('text-lg', danger ? 'text-bad' : 'text-pulse')}>{icon}</span>
      </div>
      <p className={cx('mt-2 text-3xl font-semibold tracking-[-0.03em]', danger && 'text-bad')}><AnimatedNumber value={value} /></p>
    </Panel>
  );
}
