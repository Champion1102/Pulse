import { ArrowRight, ArrowsOut, ChartLineUp, Crown, FlagCheckered, Lock, Stop, Users } from '@phosphor-icons/react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import type { Socket } from 'socket.io-client';
import { OptionTile } from '../components/OptionTile';
import { useToast } from '../components/Toast';
import { Button, cx, letter, Logo, OPTION_COLORS } from '../components/ui';
import { connect, emit } from '../lib/socket';
import type { LeaderboardEntry, Player, RoundEnded, RoundStarted, SessionSnapshot } from '../lib/types';
import { useMeta } from '../lib/hooks';
import { useCountdown } from '../lib/useCountdown';
import { hostKeyStore } from '../lib/workspace';

type View = 'connecting' | 'denied' | 'lobby' | 'round' | 'reveal' | 'ended';

export default function Host() {
  const code = (useParams().code ?? '').toUpperCase();
  const toast = useToast();
  const socketRef = useRef<Socket | null>(null);
  const [view, setView] = useState<View>('connecting');
  const [snap, setSnap] = useState<SessionSnapshot | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [round, setRound] = useState<RoundStarted | null>(null);
  const [progress, setProgress] = useState({ answeredCount: 0, playerCount: 0 });
  const [ended, setEnded] = useState<RoundEnded | null>(null);
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hostKey = hostKeyStore.get(code);
    if (!hostKey) {
      setView('denied');
      return;
    }
    const socket = connect();
    socketRef.current = socket;
    socket.on('connect', async () => {
      const res = await emit<{ snapshot: SessionSnapshot }>(socket, 'host:attach', { code, hostKey });
      if (!res.ok) {
        setView('denied');
        return;
      }
      const s = res.snapshot;
      setSnap(s);
      setPlayers(s.players);
      setBoard(s.leaderboard);
      setView((v) => {
        if (s.state === 'ended') return 'ended';
        if (v !== 'connecting') return v; // reconnect: keep the current screen
        return s.state === 'lobby' ? 'lobby' : 'reveal';
      });
    });
    socket.on('lobby:update', (e: { players: Player[] }) => setPlayers(e.players));
    socket.on('round:started', (r: RoundStarted) => {
      setRound(r);
      setEnded(null);
      setProgress({ answeredCount: 0, playerCount: 0 });
      setView('round');
    });
    socket.on('round:progress', setProgress);
    socket.on('round:ended', (e: RoundEnded) => {
      setEnded(e);
      setView('reveal');
    });
    socket.on('leaderboard', (e: { entries: LeaderboardEntry[] }) => setBoard(e.entries));
    socket.on('session:ended', (e: { leaderboard: LeaderboardEntry[]; sessionId: string }) => {
      setBoard(e.leaderboard);
      setView('ended');
    });
    return () => {
      socket.close();
    };
  }, [code]);

  const act = useCallback(async (event: string) => {
    if (!socketRef.current) return;
    setBusy(true);
    const res = await emit(socketRef.current, event);
    setBusy(false);
    if (!res.ok) toast(res.error, 'error');
  }, [toast]);

  const isLast = round ? round.roundIndex + 1 >= round.totalRounds : snap ? snap.roundIndex + 1 >= snap.totalRounds : false;

  // Projector remote: Space / Right arrow advances.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.key === ' ' || e.key === 'ArrowRight') || (e.target as HTMLElement).tagName === 'INPUT') return;
      e.preventDefault();
      if (view === 'lobby' || (view === 'reveal' && !isLast)) void act('host:next');
      else if (view === 'round') void act('host:end-round');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, isLast, act]);

  const online = players.filter((p) => p.connected);

  if (view === 'denied') {
    return (
      <Shell code={code}>
        <div className="m-auto grid max-w-md justify-items-start gap-5">
          <Lock size={48} weight="duotone" className="text-pulse" />
          <h1 className="text-4xl font-bold tracking-tighter">This screen can't control room {code}.</h1>
          <p className="text-ink-2">Only the browser that started the session can host it. Start a new session from your workspace.</p>
          <Link to="/app"><Button variant="ink">Open my workspace</Button></Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell code={code} title={snap?.quizTitle} mode={snap?.scoringMode}>
      {view === 'connecting' && <p className="m-auto text-ink-2">Connecting to room {code}...</p>}
      {view === 'lobby' && <LobbyView code={code} players={online} onStart={() => act('host:next')} busy={busy} />}
      {view === 'round' && round && (
        <RoundView round={round} progress={{ answeredCount: progress.answeredCount, playerCount: progress.playerCount || online.length }} onEnd={() => act('host:end-round')} />
      )}
      {view === 'reveal' && (
        <RevealView
          round={round}
          ended={ended}
          board={board}
          isLast={isLast}
          busy={busy}
          onNext={() => act('host:next')}
          onFinish={() => act('host:end-session')}
        />
      )}
      {view === 'ended' && <EndedView board={board} sessionId={snap?.sessionId} />}
    </Shell>
  );
}

function Shell({ code, title, mode, children }: { code: string; title?: string; mode?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-line px-4 sm:px-8">
        <Logo className="!text-lg" />
        {title && <span className="hidden truncate font-semibold text-ink-2 md:inline">{title}</span>}
        <div className="ml-auto flex items-center gap-3">
          {mode && <span className="hidden rounded-full bg-paper-2 px-3 py-1 text-xs font-semibold sm:inline">Scoring: {mode}</span>}
          <span className="rounded-full bg-ink px-3 py-1 font-mono text-sm font-bold tracking-widest text-paper">{code}</span>
          <button
            aria-label="Full screen"
            className="grid size-9 place-items-center rounded-full ring-1 ring-line hover:bg-paper-2"
            onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => undefined)}
          >
            <ArrowsOut weight="bold" />
          </button>
        </div>
      </header>
      <main className="flex flex-1 flex-col px-4 py-6 sm:px-8 lg:px-12">{children}</main>
    </div>
  );
}

function LobbyView({ code, players, onStart, busy }: { code: string; players: Player[]; onStart: () => void; busy: boolean }) {
  const meta = useMeta();
  const origin = meta?.joinOrigin ?? location.origin;
  const url = `${origin}/play/${code}`;
  return (
    <div className="grid flex-1 gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
      <div className="grid gap-8">
        <div>
          <p className="text-xl text-ink-2 lg:text-2xl">Go to <b className="text-ink">{origin.replace(/^https?:\/\//, '')}</b> and enter</p>
          <p className="font-mono text-[clamp(4.5rem,13vw,11rem)] font-bold leading-none tracking-[0.08em]">{code}</p>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <div className="rounded-3xl bg-white p-4">
            <QRCodeSVG value={url} size={168} />
          </div>
          <p className="max-w-[22ch] text-lg text-ink-2">Or scan this with your phone camera to jump straight in.</p>
        </div>
      </div>
      <div className="grid gap-5 self-stretch rounded-3xl border border-line bg-card p-6 lg:p-8">
        <div className="flex items-center justify-between gap-4">
          <p className="flex items-center gap-2 text-2xl font-bold"><Users weight="duotone" /> {players.length}</p>
          <Button size="lg" onClick={onStart} loading={busy} disabled={players.length === 0} icon={<ArrowRight weight="bold" />}>
            Start quiz
          </Button>
        </div>
        <div className="flex min-h-40 flex-wrap content-start gap-2">
          <AnimatePresence>
            {players.map((p, i) => (
              <motion.span
                key={p.id}
                initial={{ opacity: 0, scale: 0.4, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className={cx('rounded-full px-4 py-2 text-lg font-semibold', OPTION_COLORS[i % 6], i % 6 === 1 ? 'text-[#1d1500]' : 'text-white')}
              >
                {p.nickname}
              </motion.span>
            ))}
          </AnimatePresence>
          {players.length === 0 && <p className="text-ink-2">Waiting for the first player...</p>}
        </div>
        <p className="text-sm text-ink-2">Tip: press Space or the right arrow key to advance.</p>
      </div>
    </div>
  );
}

function RoundView({ round, progress, onEnd }: { round: RoundStarted; progress: { answeredCount: number; playerCount: number }; onEnd: () => void }) {
  const left = useCountdown(round.endsAt, round.serverNow);
  const q = round.question;
  const total = q.timeLimitSec;
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-wrap items-center gap-4">
        <span className="rounded-full bg-paper-2 px-4 py-1.5 font-semibold">Question {round.roundIndex + 1} of {round.totalRounds}</span>
        <span className="rounded-full bg-paper-2 px-4 py-1.5 font-semibold">{progress.answeredCount} / {progress.playerCount || '-'} answered</span>
        <div className="ml-auto flex items-center gap-4">
          <Countdown left={left} total={total} />
          <Button variant="ghost" icon={<Stop weight="fill" />} onClick={onEnd}>End round</Button>
        </div>
      </div>
      <h1 className="max-w-[28ch] text-[clamp(2rem,4.5vw,4rem)] font-bold leading-[1.05] tracking-tighter">{q.prompt}</h1>
      {q.options ? (
        <div className="mt-auto grid gap-4 md:grid-cols-2">
          {q.options.map((o, i) => <OptionTile key={o.id} index={i} text={o.text} big tabIndex={-1} />)}
        </div>
      ) : (
        <p className="mt-auto text-2xl text-ink-2">Students type a number on their phones.</p>
      )}
    </div>
  );
}

function Countdown({ left, total }: { left: number; total: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid size-16 place-items-center">
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-line)" strokeWidth="6" />
        <circle
          cx="32" cy="32" r={r} fill="none" stroke="var(--color-pulse)" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - left / total)} style={{ transition: 'stroke-dashoffset 0.2s linear' }}
        />
      </svg>
      <span className={cx('font-mono text-xl font-bold', left <= 5 && 'text-bad')}>{left}</span>
    </div>
  );
}

function RevealView({ round, ended, board, isLast, busy, onNext, onFinish }: {
  round: RoundStarted | null; ended: RoundEnded | null; board: LeaderboardEntry[]; isLast: boolean; busy: boolean;
  onNext: () => void; onFinish: () => void;
}) {
  const q = round?.question;
  const correct = new Set(ended?.reveal.correctAnswer?.kind === 'choice' ? ended.reveal.correctAnswer.optionIds : []);
  const max = Math.max(1, ...Object.values(ended?.reveal.distribution ?? { x: 1 }));
  return (
    <div className="grid flex-1 gap-8 lg:grid-cols-[1.3fr_1fr]">
      <div className="grid content-start gap-6">
        {q && <h2 className="text-3xl font-bold leading-tight tracking-tighter">{q.prompt}</h2>}
        {q?.options && ended ? (
          <div className="grid gap-4">
            {q.options.map((o, i) => {
              const n = ended.reveal.distribution[o.id] ?? 0;
              return (
                <div key={o.id} className={cx('grid gap-2', ended.gradable && !correct.has(o.id) && 'opacity-45')}>
                  <div className="flex items-center gap-3 text-lg font-semibold">
                    <span className={cx('grid size-8 place-items-center rounded-full font-mono text-sm font-bold', OPTION_COLORS[i % 6], i % 6 === 1 ? 'text-[#1d1500]' : 'text-white')}>{letter(i)}</span>
                    <span className="flex-1">{o.text}</span>
                    {correct.has(o.id) && <span className="rounded-full bg-good px-3 py-0.5 text-sm text-white">Correct</span>}
                    <span className="font-mono">{n}</span>
                  </div>
                  <motion.div
                    className={cx('h-4 origin-left rounded-full', OPTION_COLORS[i % 6])}
                    style={{ width: `${Math.max(2, (n / max) * 100)}%` }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.7, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              );
            })}
          </div>
        ) : ended?.reveal.correctAnswer?.kind === 'numeric' ? (
          <div className="grid gap-2">
            <p className="text-ink-2">Correct answer</p>
            <p className="font-mono text-6xl font-bold">{ended.reveal.correctAnswer.value}</p>
            <p className="text-ink-2">Answers given: {(ended.reveal.numericAnswers ?? []).join(', ') || 'none'}</p>
          </div>
        ) : null}
        {ended?.gradable && (
          <p className="text-lg text-ink-2">{ended.reveal.correctCount} of {ended.reveal.answeredCount} answered correctly.</p>
        )}
      </div>

      <div className="grid content-start gap-4 self-start rounded-3xl border border-line bg-card p-6">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-xl font-bold"><ChartLineUp weight="duotone" /> Leaderboard</h3>
        </div>
        <LayoutGroup>
          <ol className="grid gap-2">
            {board.slice(0, 8).map((e) => (
              <motion.li layout key={e.playerId} transition={{ type: 'spring', stiffness: 260, damping: 26 }} className="flex items-center gap-3 rounded-2xl bg-paper px-4 py-3">
                <span className="w-6 font-mono font-bold">{e.rank}</span>
                <span className="flex-1 truncate text-lg font-semibold">{e.nickname}</span>
                {e.lastPoints > 0 && <span className="font-mono text-sm text-good">+{e.lastPoints}</span>}
                <span className="font-mono text-lg font-bold">{e.total}</span>
              </motion.li>
            ))}
          </ol>
        </LayoutGroup>
        {board.length === 0 && <p className="text-ink-2">No players yet.</p>}
        <div className="mt-2 flex flex-wrap gap-2">
          {!isLast && <Button size="lg" onClick={onNext} loading={busy} icon={<ArrowRight weight="bold" />}>Next question</Button>}
          <Button size="lg" variant={isLast ? 'primary' : 'ghost'} onClick={onFinish} icon={<FlagCheckered weight="bold" />}>
            {isLast ? 'Show final results' : 'End quiz now'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EndedView({ board, sessionId }: { board: LeaderboardEntry[]; sessionId?: string }) {
  const podium = [board[1], board[0], board[2]];
  const heights = ['h-40', 'h-56', 'h-28'];
  return (
    <div className="m-auto grid w-full max-w-4xl gap-10">
      <h1 className="text-center text-6xl font-bold tracking-tighter">Final results</h1>
      <div className="grid grid-cols-3 items-end gap-3 sm:gap-6">
        {podium.map((e, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 160, damping: 16, delay: [0.4, 0.8, 0][i] }}
            className="grid justify-items-center gap-3"
          >
            {e && (
              <>
                {i === 1 && <Crown size={44} weight="fill" className="text-opt-b" />}
                <p className="max-w-full truncate text-xl font-bold sm:text-2xl">{e.nickname}</p>
                <p className="font-mono text-ink-2">{e.total}</p>
              </>
            )}
            {e && (
              <div className={cx('grid w-full place-items-center rounded-t-3xl font-mono text-4xl font-bold', heights[i], i === 1 ? 'bg-pulse text-pulse-ink' : 'bg-paper-2')}>
                {[2, 1, 3][i]}
              </div>
            )}
          </motion.div>
        ))}
      </div>
      {sessionId && (
        <Link to={`/app/reports/${sessionId}`} className="justify-self-center">
          <Button variant="ink" size="lg" icon={<ChartLineUp weight="bold" />}>Open the topic report</Button>
        </Link>
      )}
    </div>
  );
}
