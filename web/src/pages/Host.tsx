import { ArrowRight, ArrowsIn, ArrowsOut, CaretDown, CaretUp, ChartLineUp, Check, Copy, Crown, FlagCheckered, Keyboard, Lock, Stop, Users } from '@phosphor-icons/react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import type { Socket } from 'socket.io-client';
import { Confetti } from '../components/Confetti';
import { OptionTile } from '../components/OptionTile';
import { useToast } from '../components/Toast';
import {
  AnimatedNumber,
  Avatar,
  Button,
  Chip,
  cx,
  Dialog,
  IconButton,
  Kbd,
  letter,
  LogoMark,
  OPTION_COLORS,
  OPTION_SHAPES,
  OPTION_TEXT,
  ProgressRing,
  SoundToggle,
  ThemeToggle,
} from '../components/ui';
import { useMeta } from '../lib/hooks';
import { ease, spring } from '../lib/motion';
import { setSound, sfx, soundOn } from '../lib/sfx';
import { connect, emit } from '../lib/socket';
import type { LeaderboardEntry, Player, RoundEnded, RoundStarted, SessionSnapshot } from '../lib/types';
import { useCountdown } from '../lib/useCountdown';
import { hostKeyStore } from '../lib/workspace';

type View = 'connecting' | 'denied' | 'lobby' | 'round' | 'reveal' | 'ended';

const toggleFullscreen = () =>
  (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => undefined);

function useJoinUrl(code: string) {
  const meta = useMeta();
  const origin = meta?.joinOrigin ?? location.origin;
  return { origin, url: `${origin}/play/${code}` };
}

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
  const [help, setHelp] = useState(false);

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

  // Extra shortcuts: F fullscreen, M mute, ? help.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'f') void toggleFullscreen();
      else if (k === 'm') setSound(!soundOn());
      else if (e.key === '?') setHelp((h) => !h);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const online = players.filter((p) => p.connected);

  if (view === 'denied') {
    return (
      <Shell code={code} online={0} onHelp={() => setHelp(true)}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }} className="m-auto grid max-w-lg justify-items-start gap-6">
          <span className="grid size-16 place-items-center rounded-2xl border border-line bg-card text-3xl text-pulse shadow-[var(--shadow-soft)]">
            <Lock weight="duotone" />
          </span>
          <h1 className="text-[clamp(2.2rem,4vw,3.2rem)] font-semibold leading-[1.02] tracking-[-0.04em]">This screen can't control room <span className="font-mono text-pulse">{code}</span>.</h1>
          <p className="text-lg leading-relaxed text-ink-2">Only the browser that started the session can host it. Start a new session from your workspace.</p>
          <Link to="/app"><Button variant="ink" size="lg" iconRight={<ArrowRight weight="bold" />}>Open my workspace</Button></Link>
        </motion.div>
        <HelpDialog open={help} onClose={() => setHelp(false)} />
      </Shell>
    );
  }

  return (
    <Shell code={code} title={snap?.quizTitle} mode={snap?.scoringMode} online={online.length} onHelp={() => setHelp(true)}>
      <AnimatePresence mode="wait">
        <motion.div
          key={view + (view === 'round' ? round?.roundIndex : '')}
          initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
          transition={{ duration: 0.45, ease }}
          className="flex flex-1 flex-col"
        >
          {view === 'connecting' && <Connecting code={code} />}
          {view === 'lobby' && <LobbyView code={code} players={online} onStart={() => { sfx.start(); void act('host:next'); }} busy={busy} />}
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
        </motion.div>
      </AnimatePresence>
      <HelpDialog open={help} onClose={() => setHelp(false)} />
    </Shell>
  );
}

/* ------------------------------------------------------------------ chrome */

function Shell({ code, title, mode, online, onHelp, children }: { code: string; title?: string; mode?: string; online: number; onHelp: () => void; children: ReactNode }) {
  const toast = useToast();
  const { url } = useJoinUrl(code);
  const [full, setFull] = useState(false);
  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const copy = () => void navigator.clipboard?.writeText(url).then(() => toast('Join link copied', 'success'));
  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-x-clip">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60vh] bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,color-mix(in_oklab,var(--color-pulse)_14%,transparent),transparent)]" />
      <header className="glass sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line px-4 sm:px-8">
        <Link to="/app" aria-label="Back to workspace"><LogoMark /></Link>
        {title && <span className="hidden truncate text-[15px] font-semibold tracking-tight md:inline">{title}</span>}
        <div className="ml-auto flex items-center gap-2">
          {mode && <Chip tone="outline" className="hidden capitalize sm:inline-flex">Scoring · {mode}</Chip>}
          <Chip tone="good" dot className="hidden sm:inline-flex"><Users weight="bold" /> <AnimatedNumber value={online} /> online</Chip>
          <button
            onClick={copy}
            title="Copy join link"
            className="group inline-flex h-9 items-center gap-2 rounded-full bg-ink px-4 font-mono text-sm font-bold tracking-[0.2em] text-paper shadow-[var(--shadow-soft)] transition active:scale-95"
          >
            {code}
            <Copy weight="bold" className="opacity-50 transition group-hover:opacity-100" />
          </button>
          <SoundToggle />
          <ThemeToggle />
          <IconButton label="Keyboard shortcuts" onClick={onHelp} className="hidden sm:grid"><Keyboard weight="bold" /></IconButton>
          <IconButton label={full ? 'Exit full screen' : 'Full screen'} onClick={() => void toggleFullscreen()}>
            {full ? <ArrowsIn weight="bold" /> : <ArrowsOut weight="bold" />}
          </IconButton>
        </div>
      </header>
      <main className="flex flex-1 flex-col px-4 py-8 sm:px-8 lg:px-14">{children}</main>
    </div>
  );
}

function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const rows: Array<[ReactNode, string]> = [
    [<><Kbd>Space</Kbd> <Kbd>→</Kbd></>, 'Start, end round, next question'],
    [<Kbd>F</Kbd>, 'Toggle full screen'],
    [<Kbd>M</Kbd>, 'Mute or unmute sounds'],
    [<Kbd>?</Kbd>, 'Show this help'],
    [<><Kbd>⌘</Kbd> <Kbd>K</Kbd></>, 'Command palette'],
  ];
  return (
    <AnimatePresence>
      {open && (
        <Dialog onClose={onClose} labelledBy="help-title">
          <h2 id="help-title" className="text-2xl font-semibold tracking-[-0.03em]">Keyboard shortcuts</h2>
          <p className="mt-1 text-sm text-ink-2">A clicker or keyboard is all you need to run the room.</p>
          <ul className="mt-6 grid gap-1">
            {rows.map(([keys, text], i) => (
              <motion.li key={text} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i, ease, duration: 0.4 }} className="flex items-center justify-between gap-4 rounded-xl px-3 py-2.5 odd:bg-paper-2/60">
                <span className="text-[14px]">{text}</span>
                <span className="flex gap-1">{keys}</span>
              </motion.li>
            ))}
          </ul>
        </Dialog>
      )}
    </AnimatePresence>
  );
}

function Connecting({ code }: { code: string }) {
  return (
    <div className="m-auto grid justify-items-center gap-5 text-center">
      <div className="relative grid place-items-center">
        <span className="absolute size-14 animate-beat rounded-2xl bg-pulse/30" />
        <LogoMark className="!size-14" />
      </div>
      <p className="text-ink-2">Connecting to room <span className="font-mono font-semibold text-ink">{code}</span>…</p>
    </div>
  );
}

/* ------------------------------------------------------------------ lobby */

function LobbyView({ code, players, onStart, busy }: { code: string; players: Player[]; onStart: () => void; busy: boolean }) {
  const toast = useToast();
  const reduce = useReducedMotion();
  const { origin, url } = useJoinUrl(code);
  const prev = useRef(players.length);
  useEffect(() => {
    if (players.length > prev.current) sfx.pop();
    prev.current = players.length;
  }, [players.length]);
  const copy = () => void navigator.clipboard?.writeText(url).then(() => toast('Join link copied', 'success'));
  return (
    <div className="grid flex-1 gap-10 lg:grid-cols-[1.25fr_1fr] lg:items-center lg:gap-14">
      <div className="grid gap-10">
        <div className="grid gap-3">
          <p className="text-xl text-ink-2 lg:text-2xl">
            Go to <b className="font-semibold text-ink">{origin.replace(/^https?:\/\//, '')}</b> and enter
          </p>
          <p className="flex font-mono text-[clamp(4.5rem,12vw,10.5rem)] font-bold leading-none tracking-[0.06em]" aria-label={code}>
            {code.split('').map((ch, i) => (
              <motion.span
                key={i}
                aria-hidden
                initial={reduce ? false : { opacity: 0, y: 40, rotateX: -80, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)' }}
                transition={{ ...spring.bouncy, delay: 0.1 + i * 0.07 }}
                className={cx('inline-block', i % 2 === 1 && 'text-gradient')}
              >
                {ch}
              </motion.span>
            ))}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-7">
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.85, rotate: -4 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ ...spring.smooth, delay: 0.5 }}
            className="relative"
          >
            <span aria-hidden className="absolute -inset-4 rounded-[36px] bg-pulse/25 blur-2xl" />
            <div className="relative rounded-[28px] bg-white p-5 shadow-[var(--shadow-float)]">
              <QRCodeSVG value={url} size={176} fgColor="#0c0c0e" />
            </div>
          </motion.div>
          <div className="grid max-w-[24ch] gap-4">
            <p className="text-lg leading-relaxed text-ink-2">Or scan with a phone camera to jump straight in.</p>
            <Button variant="ghost" size="sm" className="justify-self-start" icon={<Copy weight="bold" />} onClick={copy}>Copy join link</Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 self-stretch rounded-[28px] border border-line bg-card p-6 shadow-[var(--shadow-lift)] lg:p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="grid gap-0.5">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-3">In the room</p>
            <p className="flex items-baseline gap-2 text-5xl font-semibold tracking-[-0.04em]">
              <AnimatedNumber value={players.length} />
              <span className="text-lg font-medium text-ink-3">{players.length === 1 ? 'player' : 'players'}</span>
            </p>
          </div>
          <Button size="lg" onClick={onStart} loading={busy} disabled={players.length === 0} iconRight={<ArrowRight weight="bold" />}>
            Start quiz
          </Button>
        </div>
        <div className="flex min-h-48 flex-wrap content-start gap-2.5">
          <AnimatePresence>
            {players.map((p) => (
              <motion.span
                key={p.id}
                layout
                initial={{ opacity: 0, scale: 0.3, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.5, filter: 'blur(4px)' }}
                transition={spring.bouncy}
                className="flex items-center gap-2 rounded-full border border-line bg-paper py-1 pl-1 pr-4 text-lg font-semibold shadow-[var(--shadow-soft)]"
              >
                <Avatar name={p.nickname} size="md" />
                {p.nickname}
              </motion.span>
            ))}
          </AnimatePresence>
          {players.length === 0 && (
            <div className="flex items-center gap-3 text-ink-3">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span key={i} className="size-2 rounded-full bg-ink-3" animate={{ opacity: [0.25, 1, 0.25] }} transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }} />
                ))}
              </span>
              Waiting for the first player
            </div>
          )}
        </div>
        <p className="flex items-center gap-2 text-sm text-ink-3">Press <Kbd>Space</Kbd> or <Kbd>→</Kbd> to start · <Kbd>?</Kbd> for shortcuts</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ round */

function RoundView({ round, progress, onEnd }: { round: RoundStarted; progress: { answeredCount: number; playerCount: number }; onEnd: () => void }) {
  const left = useCountdown(round.endsAt, round.serverNow);
  const q = round.question;
  const total = q.timeLimitSec;
  const urgent = left <= 5 && left > 0;
  useEffect(() => {
    if (urgent) sfx.tick();
  }, [left, urgent]);
  const ratio = progress.playerCount ? progress.answeredCount / progress.playerCount : 0;
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-wrap items-center gap-4">
        <Chip tone="pulse" className="!h-8 !px-3.5 !text-[13px]">Question {round.roundIndex + 1} of {round.totalRounds}</Chip>
        <div className="grid min-w-56 gap-1.5">
          <p className="text-sm font-semibold text-ink-2">
            <AnimatedNumber value={progress.answeredCount} className="text-ink" /> / {progress.playerCount || '-'} answered
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-pulse to-pulse-2" animate={{ width: `${ratio * 100}%` }} transition={spring.smooth} />
          </div>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <motion.div animate={urgent ? { scale: [1, 1.08, 1] } : { scale: 1 }} transition={{ duration: 0.4 }} key={urgent ? left : 'calm'}>
            <ProgressRing value={total ? left / total : 0} size={84} stroke={7} tone={urgent ? 'var(--color-bad)' : 'var(--color-pulse)'}>
              <span className={cx('font-mono text-2xl font-bold tabular', urgent && 'text-bad')}>{left}</span>
            </ProgressRing>
          </motion.div>
          <Button variant="ghost" icon={<Stop weight="fill" />} onClick={onEnd}>End round</Button>
        </div>
      </div>
      <motion.h1
        initial={{ opacity: 0, y: 18, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.7, ease }}
        className="max-w-[26ch] text-[clamp(2.2rem,4.6vw,4.3rem)] font-semibold leading-[1.04] tracking-[-0.04em]"
      >
        {q.prompt}
      </motion.h1>
      {q.options ? (
        <div className="mt-auto grid gap-4 md:grid-cols-2">
          {q.options.map((o, i) => (
            <motion.div key={o.id} initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...spring.smooth, delay: 0.25 + i * 0.07 }}>
              <OptionTile index={i} text={o.text} big tabIndex={-1} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="mt-auto flex items-center gap-4 rounded-[28px] border border-dashed border-line-strong p-8 text-2xl text-ink-2">
          <span className="font-mono text-4xl text-pulse">123</span> Students type a number on their phones.
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ reveal */

function RevealView({ round, ended, board, isLast, busy, onNext, onFinish }: {
  round: RoundStarted | null; ended: RoundEnded | null; board: LeaderboardEntry[]; isLast: boolean; busy: boolean;
  onNext: () => void; onFinish: () => void;
}) {
  const q = round?.question;
  const correct = new Set(ended?.reveal.correctAnswer?.kind === 'choice' ? ended.reveal.correctAnswer.optionIds : []);
  const max = Math.max(1, ...Object.values(ended?.reveal.distribution ?? { x: 1 }));
  useEffect(() => {
    if (ended) sfx.reveal();
  }, [ended]);

  // Rank movement since the previous board.
  const prevRanks = useRef<Map<string, number>>(new Map());
  const [moves, setMoves] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    const m = new Map<string, number>();
    board.forEach((e) => {
      const before = prevRanks.current.get(e.playerId);
      if (before !== undefined) m.set(e.playerId, before - e.rank);
    });
    setMoves(m);
    prevRanks.current = new Map(board.map((e) => [e.playerId, e.rank]));
  }, [board]);

  return (
    <div className="grid flex-1 gap-8 lg:grid-cols-[1.35fr_1fr] lg:gap-12">
      <div className="grid content-start gap-7">
        {q && <h2 className="text-[clamp(1.8rem,3vw,2.6rem)] font-semibold leading-[1.08] tracking-[-0.035em]">{q.prompt}</h2>}
        {q?.options && ended ? (
          <div className="grid gap-5">
            {q.options.map((o, i) => {
              const n = ended.reveal.distribution[o.id] ?? 0;
              const isRight = correct.has(o.id);
              const dim = ended.gradable && !isRight;
              const Shape = OPTION_SHAPES[i % 6];
              return (
                <motion.div key={o.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: dim ? 0.42 : 1, x: 0 }} transition={{ duration: 0.5, delay: i * 0.08, ease }} className="grid gap-2.5">
                  <div className="flex items-center gap-3 text-lg font-semibold">
                    <span className={cx('relative grid size-9 place-items-center rounded-xl font-mono text-sm font-bold', OPTION_COLORS[i % 6], OPTION_TEXT[i % 6])}>
                      {letter(i)}
                      <Shape weight="fill" size={9} className="absolute -bottom-0.5 -right-0.5 opacity-80" />
                    </span>
                    <span className="flex-1">{o.text}</span>
                    {isRight && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...spring.bouncy, delay: 0.5 }} className="inline-flex items-center gap-1 rounded-full bg-good px-3 py-1 text-sm text-white shadow-[0_6px_18px_-6px_var(--color-good)]">
                        <Check weight="bold" /> Correct
                      </motion.span>
                    )}
                    <AnimatedNumber value={n} className="w-10 text-right font-mono text-xl font-bold" />
                  </div>
                  <div className="h-4 overflow-hidden rounded-full bg-paper-2">
                    <motion.div
                      className={cx('h-full rounded-full', OPTION_COLORS[i % 6])}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(2, (n / max) * 100)}%` }}
                      transition={{ ...spring.gentle, delay: 0.15 + i * 0.08 }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : ended?.reveal.correctAnswer?.kind === 'numeric' ? (
          <div className="grid gap-5 rounded-[28px] border border-line bg-card p-8 shadow-[var(--shadow-soft)]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-good">Correct answer</p>
            <motion.p initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring.bouncy} className="font-mono text-7xl font-bold tracking-tight">
              {ended.reveal.correctAnswer.value}
            </motion.p>
            <div className="flex flex-wrap gap-2">
              {(ended.reveal.numericAnswers ?? []).length === 0 && <span className="text-ink-3">No answers given</span>}
              {(ended.reveal.numericAnswers ?? []).map((v, i) => (
                <motion.span key={i} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...spring.snappy, delay: 0.2 + i * 0.03 }} className="rounded-full bg-paper-2 px-3 py-1 font-mono text-sm font-semibold">
                  {v}
                </motion.span>
              ))}
            </div>
          </div>
        ) : null}
        {ended?.gradable && (
          <p className="text-lg text-ink-2">
            <AnimatedNumber value={ended.reveal.correctCount ?? 0} className="font-semibold text-ink" /> of {ended.reveal.answeredCount} answered correctly.
          </p>
        )}
      </div>

      <div className="grid content-start gap-5 self-start rounded-[28px] border border-line bg-card p-6 shadow-[var(--shadow-lift)] lg:p-7">
        <h3 className="flex items-center gap-2 text-xl font-semibold tracking-tight"><ChartLineUp weight="duotone" className="text-pulse" /> Leaderboard</h3>
        <LayoutGroup>
          <ol className="grid gap-2">
            {board.slice(0, 8).map((e) => {
              const mv = moves.get(e.playerId) ?? 0;
              return (
                <motion.li layout key={e.playerId} transition={spring.smooth} className={cx('flex items-center gap-3 rounded-2xl px-3 py-2.5', e.rank === 1 ? 'bg-pulse-soft' : 'bg-paper')}>
                  <span className="w-6 text-center font-mono font-bold text-ink-2">{e.rank}</span>
                  <Avatar name={e.nickname} size="sm" />
                  <span className="flex-1 truncate text-lg font-semibold">{e.nickname}</span>
                  {mv > 0 && <span className="flex items-center text-xs font-bold text-good"><CaretUp weight="fill" />{mv}</span>}
                  {mv < 0 && <span className="flex items-center text-xs font-bold text-bad"><CaretDown weight="fill" />{-mv}</span>}
                  {e.lastPoints > 0 && <Chip tone="good">+{e.lastPoints}</Chip>}
                  <AnimatedNumber value={e.total} className="w-16 text-right font-mono text-lg font-bold" />
                </motion.li>
              );
            })}
          </ol>
        </LayoutGroup>
        {board.length === 0 && <p className="text-ink-2">No players yet.</p>}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {!isLast && <Button size="lg" onClick={onNext} loading={busy} iconRight={<ArrowRight weight="bold" />}>Next question</Button>}
          <Button size="lg" variant={isLast ? 'primary' : 'ghost'} onClick={onFinish} icon={<FlagCheckered weight="bold" />}>
            {isLast ? 'Show final results' : 'End quiz now'}
          </Button>
          {!isLast && <span className="ml-auto hidden items-center gap-1 text-xs text-ink-3 sm:flex"><Kbd>Space</Kbd> next</span>}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ ended */

function EndedView({ board, sessionId }: { board: LeaderboardEntry[]; sessionId?: string }) {
  const podium = [board[1], board[0], board[2]];
  const heights = ['h-40', 'h-56', 'h-28'];
  const [fire, setFire] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      setFire(Date.now());
      sfx.fanfare();
    }, 1100);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="m-auto grid w-full max-w-4xl gap-12">
      <Confetti fire={fire} origin={{ x: 0.5, y: 0.3 }} count={220} />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }} className="grid justify-items-center gap-2 text-center">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-pulse">That's a wrap</p>
        <h1 className="text-[clamp(3rem,7vw,5.5rem)] font-semibold leading-none tracking-[-0.05em]">Final results</h1>
      </motion.div>
      <div className="grid grid-cols-3 items-end gap-3 sm:gap-6">
        {podium.map((e, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.gentle, delay: [0.5, 0.9, 0.2][i] }}
            className="grid justify-items-center gap-3"
          >
            {e && (
              <>
                {i === 1 && (
                  <motion.span initial={{ scale: 0, rotate: -30, y: 10 }} animate={{ scale: 1, rotate: 0, y: 0 }} transition={{ ...spring.bouncy, delay: 1.25 }}>
                    <Crown size={48} weight="fill" className="text-opt-b drop-shadow-[0_6px_14px_rgb(242_164_31/0.5)]" />
                  </motion.span>
                )}
                <Avatar name={e.nickname} size={i === 1 ? 'xl' : 'lg'} className={i === 1 ? 'ring-4 ring-pulse/30' : ''} />
                <p className="max-w-full truncate text-xl font-semibold tracking-tight sm:text-2xl">{e.nickname}</p>
                <AnimatedNumber value={e.total} className="font-mono text-ink-2" />
              </>
            )}
            {e && (
              <div
                className={cx(
                  'relative grid w-full place-items-center overflow-hidden rounded-t-[28px] font-mono text-5xl font-bold',
                  heights[i],
                  i === 1 ? 'bg-gradient-to-b from-pulse to-pulse-2 text-white shadow-[var(--shadow-glow)]' : 'border border-b-0 border-line bg-card text-ink-2',
                )}
              >
                <span aria-hidden className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent" />
                {[2, 1, 3][i]}
              </div>
            )}
          </motion.div>
        ))}
      </div>
      {board.length > 3 && (
        <ol className="mx-auto grid w-full max-w-xl gap-2">
          {board.slice(3, 10).map((e, i) => (
            <motion.li key={e.playerId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 + i * 0.05, duration: 0.4, ease }} className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-2.5">
              <span className="w-6 font-mono font-bold text-ink-3">{e.rank}</span>
              <Avatar name={e.nickname} size="sm" />
              <span className="flex-1 truncate font-semibold">{e.nickname}</span>
              <span className="font-mono font-bold">{e.total}</span>
            </motion.li>
          ))}
        </ol>
      )}
      {sessionId && (
        <Link to={`/app/reports/${sessionId}`} className="justify-self-center">
          <Button variant="ink" size="lg" icon={<ChartLineUp weight="bold" />}>Open the topic report</Button>
        </Link>
      )}
    </div>
  );
}
