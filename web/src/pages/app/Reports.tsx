import { ArrowRight, ChartBar, Clock, Question, Users } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { Chip, Empty, PageHeader, Skeleton, useSpotlight } from '../../components/ui';
import { api } from '../../lib/api';
import { useLoad } from '../../lib/hooks';
import { ease } from '../../lib/motion';
import type { SessionSummary } from '../../lib/types';

export default function Reports() {
  const { data, loading } = useLoad(() => api<SessionSummary[]>('/sessions'));
  const onMove = useSpotlight<HTMLAnchorElement>();
  return (
    <div className="grid gap-8">
      <PageHeader eyebrow="Learn" title="Reports" description="Every session you have run, with what the class found hard." />
      {loading && !data && <div className="grid gap-2"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>}
      {data?.length === 0 && <Empty icon={<ChartBar weight="duotone" />} title="No sessions yet" body="Run a quiz and its report shows up here after the first question." />}
      <div className="grid gap-2.5">
        {data?.map((s, i) => (
          <motion.div key={s.sessionId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease, delay: Math.min(i, 8) * 0.04 }}>
            <Link
              to={s.sessionId}
              onMouseMove={onMove}
              className="spotlight group flex flex-wrap items-center gap-x-5 gap-y-3 rounded-[20px] border border-line bg-card p-5 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-lift)]"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-paper-2 text-xl text-pulse transition group-hover:bg-pulse-soft">
                <ChartBar weight="duotone" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[16px] font-semibold tracking-[-0.02em]">{s.quizTitle}</p>
                  {!s.endedAt && <Chip tone="pulse" dot>Live</Chip>}
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[13px] text-ink-3">
                  <span className="inline-flex items-center gap-1"><Clock weight="bold" /> {new Date(s.startedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  <span>room <span className="font-mono font-semibold text-ink-2">{s.roomCode}</span></span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Chip><Users weight="bold" /> {s.players}</Chip>
                <Chip><Question weight="bold" /> {s.rounds}</Chip>
              </div>
              <span className="grid size-9 place-items-center rounded-full text-ink-3 transition group-hover:translate-x-1 group-hover:bg-paper-2 group-hover:text-ink">
                <ArrowRight weight="bold" />
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
