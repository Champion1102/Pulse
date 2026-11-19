import { ArrowRight, ChartBar, Check, CheckCircle, Fire, Timer, Trophy, WifiSlash, XCircle } from '@phosphor-icons/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { Socket } from 'socket.io-client';
import { Confetti } from '../components/Confetti';
import { OptionTile } from '../components/OptionTile';
import { useToast } from '../components/Toast';
import { AnimatedNumber, Avatar, Button, Chip, cx, Input, Logo, ThemeToggle } from '../components/ui';
import { api } from '../lib/api';
import { haptic } from '../lib/haptics';
import { ease, spring } from '../lib/motion';
import { sfx } from '../lib/sfx';
import { connect, emit } from '../lib/socket';
import type { AnswerPayload, LeaderboardEntry, Player, PlayerRoundResult, RoundStarted } from '../lib/types';
import { useCountdown } from '../lib/useCountdown';

type View = 'code' | 'nick' | 'lobby' | 'question' | 'locked' | 'result' | 'ended';
interface RoomInfo { code: string; quizTitle: string; state: string; players: number }

const playerKey = (code: string) => `pulse:player:${code}`;
const readPlayer = (code: string): Player | null => {
  try { return JSON.parse(localStorage.getItem(playerKey(code)) ?? 'null'); } catch { return null; }
};

export default function Play() {
  const params = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const socketRef = useRef<Socket | null>(null);
  const meRef = useRef<Player | null>(null);

  const [view, setView] = useState<View>('code');
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [me, setMe] = useState<Player | null>(null);
  const [round, setRound] = useState<RoundStarted | null>(null);
  const [result, setResult] = useState<PlayerRoundResult | null>(null);
  const [score, setScore] = useState<LeaderboardEntry | null>(null);
  const [finalBoard, setFinalBoard] = useState<LeaderboardEntry[]>([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [online, setOnline] = useState(true);

  // ---- socket lifecycle ----------------------------------------------------
  const join = useCallback(async (code: string, nickname: string, silent = false) => {
    const socket = socketRef.current!;
    const saved = readPlayer(code);
    const res = await emit<{ player: Player; state: string; score: LeaderboardEntry | null }>(socket, 'player:join', {
      code, nickname, playerId: saved?.id,
    });
    if (!res.ok) {
      if (!silent) toast(res.error, 'error');
      return false;
    }
    meRef.current = res.player;
    setMe(res.player);
    if (res.score) setScore(res.score);
    try { localStorage.setItem(playerKey(code), JSON.stringify(res.player)); localStorage.setItem('pulse:nick', res.player.nickname); } catch { /* ignore */ }
    if (res.state === 'ended') setView('ended');
    else if (!silent) setView('lobby');
    return true;
  }, [toast]);

  useEffect(() => {
    const socket = connect();
    socketRef.current = socket;
    socket.on('connect', () => {
      setOnline(true);
      const p = meRef.current;
      const code = room?.code ?? params.code?.toUpperCase();
      if (p && code) void join(code, p.nickname, true); // transparent rejoin after a drop
    });
    socket.on('disconnect', () => setOnline(false));
    socket.on('room:count', (e: { playerCount: number }) => setPlayerCount(e.playerCount));
    socket.on('round:started', (r: RoundStarted) => {
      setRound(r);
      setResult(null);
      setView('question');
    });
    socket.on('answer:accepted', () => setView((v) => (v === 'question' ? 'locked' : v)));
    socket.on('round:result', (r: PlayerRoundResult) => {
      setResult(r);
      setView('result');
    });
    socket.on('player:score', (s: LeaderboardEntry) => setScore(s));
    socket.on('session:ended', (e: { leaderboard: LeaderboardEntry[] }) => {
      setFinalBoard(e.leaderboard);
      setView('ended');
    });
    return () => {
      socket.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- code from the URL -----------------------------------------------------
  const lookup = useCallback(async (code: string) => {
    try {
      const info = await api<RoomInfo>(`/rooms/${encodeURIComponent(code)}`);
      setRoom(info);
      setPlayerCount(info.players);
      const saved = readPlayer(info.code);
      if (saved && (await join(info.code, saved.nickname, true))) {
        setView((v) => (v === 'code' || v === 'nick' ? 'lobby' : v));
      } else setView(info.state === 'ended' ? 'ended' : 'nick');
    } catch (e) {
      toast((e as Error).message, 'error');
      setView('code');
    }
  }, [join, toast]);

  useEffect(() => {
    if (!params.code) return;
    const t = setTimeout(() => void lookup(params.code!.toUpperCase()), 50); // let the socket connect first
    return () => clearTimeout(t);
  }, [params.code, lookup]);

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-x-clip">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[50vh] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,color-mix(in_oklab,var(--color-pulse)_16%,transparent),transparent)]" />
      <header className="flex h-16 items-center justify-between gap-3 px-4 pt-[env(safe-area-inset-top)]">
        <Link to="/" aria-label="Pulse home"><Logo className="!text-[17px]" /></Link>
        <div className="flex items-center gap-1.5">
          <AnimatePresence>
            {!online && (
              <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                <Chip tone="bad"><WifiSlash weight="bold" /> Reconnecting</Chip>
              </motion.span>
            )}
          </AnimatePresence>
          {me && score && (
            <motion.span
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex h-8 items-center gap-2 rounded-full bg-ink px-3.5 font-mono text-[13px] font-bold text-paper shadow-[var(--shadow-soft)]"
            >
              <span className="text-paper/60">#{score.rank}</span>
              <AnimatedNumber value={score.total} />
            </motion.span>
          )}
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <AnimatePresence mode="wait">
          <motion.div
            key={view + (round?.roundIndex ?? '')}
            initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -12, filter: 'blur(6px)' }}
            transition={{ duration: 0.35, ease }}
            className="flex flex-1 flex-col"
          >
            {view === 'code' && <CodeStep onSubmit={(c) => navigate(`/play/${c}`)} />}
            {view === 'nick' && room && <NickStep room={room} onSubmit={(n) => join(room.code, n)} />}
            {view === 'lobby' && me && <Lobby me={me} title={room?.quizTitle} count={Math.max(playerCount, 1)} />}
            {view === 'question' && round && (
              <QuestionView
                round={round}
                onAnswer={async (answer) => {
                  setView('locked'); // switch first: if this was the last answer the result can arrive before the ack
                  const res = await emit(socketRef.current!, 'player:answer', { answer });
                  if (!res.ok) {
                    toast(res.error, 'error');
                    setView((v) => (v === 'locked' ? 'question' : v));
                  }
                }}
              />
            )}
            {view === 'locked' && <Waiting title="Answer locked in" body="Hold tight while everyone else answers." />}
            {view === 'result' && result && <ResultView result={result} score={score} />}
            {view === 'ended' && <Ended score={score} board={finalBoard} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ join */

function CodeStep({ onSubmit }: { onSubmit: (code: string) => void }) {
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (code.length >= 4) onSubmit(code);
  };
  return (
    <form onSubmit={submit} className="my-auto grid gap-8">
      <div className="grid gap-3">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-pulse">Join a live quiz</p>
        <h1 className="text-[2.75rem] font-semibold leading-[1] tracking-[-0.045em]">Got a code?</h1>
        <p className="text-ink-2">It is on the projector, six letters and numbers.</p>
      </div>
      <div className="relative" onClick={() => inputRef.current?.focus()}>
        <label htmlFor="code" className="sr-only">Room code</label>
        <input
          ref={inputRef}
          id="code"
          autoFocus
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={code}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            const next = e.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6);
            if (next.length > code.length) haptic.tap();
            setCode(next);
            if (next.length === 6) setTimeout(() => onSubmit(next), 180);
          }}
          className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
        />
        <div className="grid grid-cols-6 gap-2" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => {
            const ch = code[i];
            const active = focused && (i === code.length || (code.length === 6 && i === 5));
            return (
              <motion.div
                key={i}
                animate={{ scale: active ? 1.04 : 1, y: ch ? 0 : 0 }}
                transition={spring.snappy}
                className={cx(
                  'relative grid aspect-[4/5] place-items-center rounded-2xl border bg-card font-mono text-[2rem] font-bold shadow-[var(--shadow-soft)] transition-colors duration-200',
                  active ? 'border-pulse shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-pulse)_18%,transparent)]' : ch ? 'border-line-strong' : 'border-line',
                )}
              >
                <AnimatePresence mode="popLayout">
                  {ch && (
                    <motion.span key={ch + i} initial={{ y: 14, opacity: 0, scale: 0.6 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={spring.bouncy}>
                      {ch}
                    </motion.span>
                  )}
                </AnimatePresence>
                {active && !ch && <motion.span className="h-8 w-[2px] rounded-full bg-pulse" animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1 }} />}
              </motion.div>
            );
          })}
        </div>
      </div>
      <Button size="xl" type="submit" disabled={code.length < 4} iconRight={<ArrowRight weight="bold" />}>Continue</Button>
    </form>
  );
}

function NickStep({ room, onSubmit }: { room: RoomInfo; onSubmit: (nick: string) => Promise<boolean> }) {
  const [nick, setNick] = useState(() => { try { return localStorage.getItem('pulse:nick') ?? ''; } catch { return ''; } });
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nick.trim()) return;
    setBusy(true);
    await onSubmit(nick.trim());
    setBusy(false);
  };
  return (
    <form onSubmit={submit} className="my-auto grid gap-8">
      <div className="grid justify-items-start gap-3">
        <Chip tone="pulse" className="font-mono tracking-[0.16em]">{room.code}</Chip>
        <h1 className="text-[2.4rem] font-semibold leading-[1.05] tracking-[-0.04em]">{room.quizTitle}</h1>
      </div>
      <div className="grid gap-3">
        <label htmlFor="nick" className="text-[13px] font-semibold">Your nickname</label>
        <div className="relative">
          <motion.div key={(nick.trim()[0] ?? '?').toUpperCase()} initial={{ scale: 0.5, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={spring.bouncy} className="absolute left-3 top-1/2 z-10 -translate-y-1/2">
            <Avatar name={nick.trim() || '?'} size="lg" />
          </motion.div>
          <Input id="nick" autoFocus maxLength={24} value={nick} onChange={(e) => setNick(e.target.value)} className="!h-[4.5rem] !rounded-[20px] !pl-[4.5rem] text-2xl font-semibold" />
        </div>
        <p className="text-[13px] text-ink-3">This is what shows on the leaderboard.</p>
      </div>
      <Button size="xl" type="submit" loading={busy} disabled={!nick.trim()} iconRight={<ArrowRight weight="bold" />}>Join the room</Button>
    </form>
  );
}

function Lobby({ me, title, count }: { me: Player; title?: string; count: number }) {
  return (
    <div className="my-auto grid justify-items-center gap-9 text-center">
      <div className="relative grid size-48 place-items-center">
        <span className="absolute inset-4 animate-beat rounded-full bg-pulse/25" />
        <span className="absolute inset-4 animate-beat rounded-full bg-pulse/20 [animation-delay:0.6s]" />
        <span className="absolute inset-4 animate-beat rounded-full bg-pulse/15 [animation-delay:1.2s]" />
        <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring.bouncy}>
          <Avatar name={me.nickname} size="xl" className="ring-8 ring-paper" />
        </motion.div>
      </div>
      <div className="grid gap-2">
        <h1 className="text-[2.4rem] font-semibold leading-tight tracking-[-0.04em]">You're in, {me.nickname}.</h1>
        <p className="text-ink-2">{title ? `${title}. ` : ''}Waiting for the instructor to start.</p>
      </div>
      <Chip tone="good" dot className="!h-8 !px-4 !text-[13px]">
        <AnimatedNumber value={count} /> {count === 1 ? 'player' : 'players'} here
      </Chip>
    </div>
  );
}

/* ------------------------------------------------------------------ question */

function QuestionView({ round, onAnswer }: { round: RoundStarted; onAnswer: (a: AnswerPayload) => void }) {
  const q = round.question;
  const left = useCountdown(round.endsAt, round.serverNow);
  const [picked, setPicked] = useState<string[]>([]);
  const [num, setNum] = useState('');
  const total = q.timeLimitSec;
  const urgent = left <= 5;

  return (
    <div className="flex flex-1 flex-col gap-6 pt-2">
      <div className="grid gap-4">
        <div className="flex items-center justify-between text-[13px] font-semibold text-ink-2">
          <span>Question {round.roundIndex + 1} <span className="text-ink-3">of {round.totalRounds}</span></span>
          <motion.span key={urgent ? left : 'c'} animate={urgent ? { scale: [1.25, 1] } : {}} className={cx('inline-flex items-center gap-1 font-mono text-lg font-bold tabular', urgent ? 'text-bad' : 'text-ink')}>
            <Timer weight="bold" size={16} /> {left}s
          </motion.span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-line">
          <motion.div
            className={cx('h-full origin-left rounded-full', urgent ? 'bg-bad' : 'bg-gradient-to-r from-pulse to-pulse-2')}
            initial={{ scaleX: Math.min(1, left / total) || 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: Math.max(0, (round.endsAt - round.serverNow) / 1000), ease: 'linear' }}
          />
        </div>
        <motion.h1 initial={{ opacity: 0, filter: 'blur(8px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} transition={{ duration: 0.6, ease }} className="text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-3xl">
          {q.prompt}
        </motion.h1>
      </div>

      {q.input === 'number' ? (
        <form
          className="mt-auto grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const value = Number(num);
            if (num.trim() !== '' && Number.isFinite(value)) {
              haptic.select();
              sfx.tap();
              onAnswer({ kind: 'numeric', value });
            }
          }}
        >
          <label htmlFor="num" className="text-[13px] font-semibold">Your answer</label>
          <Input id="num" autoFocus type="number" step="any" inputMode="decimal" value={num} onChange={(e) => setNum(e.target.value)} className="!h-24 !rounded-[22px] text-center font-mono text-5xl font-bold" />
          <Button size="xl" type="submit" disabled={num.trim() === ''}>Submit</Button>
        </form>
      ) : (
        <div className="mt-auto grid gap-3">
          {q.options!.map((o, i) => {
            const on = picked.includes(o.id);
            return (
              <motion.div key={o.id} className="relative" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.smooth, delay: 0.1 + i * 0.05 }}>
                <OptionTile
                  index={i}
                  text={o.text}
                  selected={on}
                  onClick={() => {
                    haptic.tap();
                    sfx.tap();
                    if (q.input === 'single') onAnswer({ kind: 'choice', optionIds: [o.id] });
                    else setPicked((p) => (p.includes(o.id) ? p.filter((x) => x !== o.id) : [...p, o.id]));
                  }}
                />
                {q.input === 'multiple' && (
                  <span
                    aria-hidden
                    className={cx(
                      'pointer-events-none absolute right-4 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full border-2 transition duration-200',
                      on ? 'border-white bg-white text-ink' : 'border-white/60',
                    )}
                  >
                    <AnimatePresence>{on && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={spring.bouncy}><Check weight="bold" /></motion.span>}</AnimatePresence>
                  </span>
                )}
              </motion.div>
            );
          })}
          {q.input === 'multiple' && (
            <>
              <p className="text-center text-[13px] text-ink-3">Pick every answer that applies.</p>
              <Button size="xl" variant="ink" disabled={!picked.length} onClick={() => { haptic.select(); onAnswer({ kind: 'choice', optionIds: picked }); }}>
                Submit {picked.length ? `(${picked.length})` : ''}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Waiting({ title, body }: { title: string; body: string }) {
  return (
    <div className="my-auto grid justify-items-center gap-6 text-center">
      <div className="relative grid size-28 place-items-center">
        <motion.span className="absolute inset-0 rounded-full border-2 border-pulse/20 border-t-pulse" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }} />
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring.bouncy} className="grid size-16 place-items-center rounded-full bg-pulse text-2xl text-white shadow-[var(--shadow-glow)]">
          <Check weight="bold" />
        </motion.span>
      </div>
      <h1 className="text-3xl font-semibold tracking-[-0.035em]">{title}</h1>
      <p className="text-ink-2">{body}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ result */

function ResultView({ result, score }: { result: PlayerRoundResult; score: LeaderboardEntry | null }) {
  const reduce = useReducedMotion();
  const poll = result.correct === null;
  const tone = poll
    ? 'bg-gradient-to-br from-ink to-[color-mix(in_oklab,var(--color-ink)_80%,var(--color-pulse))] text-paper'
    : result.correct
      ? 'bg-gradient-to-br from-good to-[color-mix(in_oklab,var(--color-good)_70%,#0fa892)] text-white'
      : 'bg-gradient-to-br from-bad to-[color-mix(in_oklab,var(--color-bad)_75%,#e0468d)] text-white';
  const Icon = poll ? ChartBar : result.correct ? CheckCircle : result.answered ? XCircle : Timer;
  const title = poll ? (result.answered ? 'Vote counted' : 'Poll closed') : result.correct ? 'Correct!' : result.answered ? 'Not this time' : "Time's up";
  const [fire, setFire] = useState(0);
  useEffect(() => {
    if (poll) return;
    if (result.correct) {
      haptic.success();
      sfx.correct();
      setFire(Date.now());
    } else {
      haptic.error();
      sfx.wrong();
    }
  }, [poll, result.correct]);
  const wrong = !poll && !result.correct;
  return (
    <>
      <Confetti fire={fire} origin={{ x: 0.5, y: 0.4 }} />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={wrong && !reduce ? { scale: 1, opacity: 1, x: [0, -10, 10, -6, 6, 0] } : { scale: 1, opacity: 1 }}
        transition={wrong ? { duration: 0.5, ease } : spring.bouncy}
        className={cx('relative my-auto grid justify-items-center gap-5 overflow-hidden rounded-[36px] px-6 py-16 text-center shadow-[var(--shadow-float)]', tone)}
      >
        <span aria-hidden className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent" />
        <span aria-hidden className="absolute -right-16 -top-16 size-56 rounded-full bg-white/10 blur-2xl" />
        <motion.span initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...spring.bouncy, delay: 0.1 }} className="relative">
          <Icon size={92} weight="fill" />
        </motion.span>
        <h1 className="relative text-5xl font-semibold tracking-[-0.045em]">{title}</h1>
        {score && !poll && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5, ease }} className="relative grid gap-2 text-lg font-semibold">
            <p className="font-mono text-4xl font-bold">+<AnimatedNumber value={score.lastPoints} /></p>
            <p className="opacity-85">You are #{score.rank} with <AnimatedNumber value={score.total} /> points</p>
            {score.streak > 1 && (
              <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...spring.bouncy, delay: 0.5 }} className="mx-auto mt-1 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-1.5 text-base">
                <Fire weight="fill" className="text-[#ffd27a]" /> {score.streak} in a row
              </motion.p>
            )}
          </motion.div>
        )}
      </motion.div>
    </>
  );
}

function Ended({ score, board }: { score: LeaderboardEntry | null; board: LeaderboardEntry[] }) {
  const [fire, setFire] = useState(0);
  useEffect(() => {
    if (score && score.rank <= 3) {
      const t = setTimeout(() => {
        setFire(Date.now());
        haptic.celebrate();
        sfx.fanfare();
      }, 400);
      return () => clearTimeout(t);
    }
  }, [score]);
  return (
    <div className="my-auto grid gap-8">
      <Confetti fire={fire} origin={{ x: 0.5, y: 0.25 }} count={200} />
      <div className="grid justify-items-center gap-3 text-center">
        <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={spring.bouncy} className="relative grid size-24 place-items-center">
          <span className="absolute inset-0 rounded-3xl bg-pulse/20 blur-xl" />
          <span className="relative grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-pulse to-pulse-2 text-white shadow-[var(--shadow-glow)]">
            <Trophy size={44} weight="fill" />
          </span>
        </motion.div>
        <h1 className="text-5xl font-semibold tracking-[-0.045em]">That's a wrap.</h1>
        {score && <p className="text-lg text-ink-2">You finished <b className="text-ink">#{score.rank}</b> with <AnimatedNumber value={score.total} className="font-semibold text-ink" /> points.</p>}
      </div>
      {board.length > 0 && (
        <ol className="grid gap-2">
          {board.slice(0, 5).map((e, i) => {
            const self = e.playerId === score?.playerId;
            return (
              <motion.li
                key={e.playerId}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.06, duration: 0.45, ease }}
                className={cx(
                  'flex items-center gap-3 rounded-2xl px-3 py-2.5',
                  self ? 'bg-pulse text-pulse-ink shadow-[var(--shadow-glow)]' : 'border border-line bg-card',
                )}
              >
                <span className={cx('w-6 text-center font-mono font-bold', self ? 'text-pulse-ink/70' : 'text-ink-3')}>{e.rank}</span>
                <Avatar name={e.nickname} size="sm" />
                <span className="flex-1 truncate font-semibold">{e.nickname}{self && ' (you)'}</span>
                <span className="font-mono font-bold">{e.total}</span>
              </motion.li>
            );
          })}
        </ol>
      )}
      <Link to="/" className="justify-self-center"><Button variant="ghost">Back to Pulse</Button></Link>
    </div>
  );
}
