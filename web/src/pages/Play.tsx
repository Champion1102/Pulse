import { ArrowRight, ChartBar, CheckCircle, Fire, Timer, Trophy, WifiSlash, XCircle } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import type { Socket } from 'socket.io-client';
import { OptionTile } from '../components/OptionTile';
import { useToast } from '../components/Toast';
import { Button, cx, Input, Logo } from '../components/ui';
import { api } from '../lib/api';
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
    <div className="flex min-h-[100dvh] flex-col">
      <header className="flex h-16 items-center justify-between gap-3 px-4">
        <Link to="/"><Logo className="!text-lg" /></Link>
        <div className="flex items-center gap-2">
          {!online && <span className="flex items-center gap-1 text-sm font-semibold text-bad"><WifiSlash weight="bold" /> Reconnecting</span>}
          {me && score && (
            <span className="rounded-full bg-ink px-3 py-1 font-mono text-sm font-bold text-paper">
              #{score.rank} · {score.total}
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={view + (round?.roundIndex ?? '')}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-1 flex-col"
          >
            {view === 'code' && <CodeStep onSubmit={(c) => navigate(`/play/${c}`)} />}
            {view === 'nick' && room && <NickStep room={room} onSubmit={(n) => join(room.code, n)} />}
            {view === 'lobby' && me && <Lobby me={me} title={room?.quizTitle} count={playerCount} />}
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

function CodeStep({ onSubmit }: { onSubmit: (code: string) => void }) {
  const [code, setCode] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (code.length >= 4) onSubmit(code);
  };
  return (
    <form onSubmit={submit} className="my-auto grid gap-6">
      <h1 className="text-5xl font-bold leading-none tracking-tighter">Got a code?</h1>
      <div className="grid gap-2">
        <label htmlFor="code" className="text-sm font-semibold">Room code</label>
        <Input
          id="code"
          autoFocus
          autoComplete="off"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6))}
          className="!h-20 text-center font-mono text-4xl font-bold tracking-[0.25em]"
        />
        <p className="text-sm text-ink-2">It is on the projector, six letters and numbers.</p>
      </div>
      <Button size="lg" type="submit" disabled={code.length < 4} icon={<ArrowRight weight="bold" />}>Continue</Button>
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
    <form onSubmit={submit} className="my-auto grid gap-6">
      <div>
        <p className="font-mono text-sm font-bold tracking-widest text-pulse">{room.code}</p>
        <h1 className="mt-2 text-4xl font-bold leading-tight tracking-tighter">{room.quizTitle}</h1>
      </div>
      <div className="grid gap-2">
        <label htmlFor="nick" className="text-sm font-semibold">Your nickname</label>
        <Input id="nick" autoFocus maxLength={24} value={nick} onChange={(e) => setNick(e.target.value)} className="!h-16 text-2xl font-semibold" />
        <p className="text-sm text-ink-2">This is what shows on the leaderboard.</p>
      </div>
      <Button size="lg" type="submit" loading={busy} disabled={!nick.trim()}>Join the room</Button>
    </form>
  );
}

function Lobby({ me, title, count }: { me: Player; title?: string; count: number }) {
  return (
    <div className="my-auto grid justify-items-center gap-8 text-center">
      <div className="relative grid size-40 place-items-center">
        <span className="absolute inset-0 animate-beat rounded-full bg-pulse/30" />
        <span className="relative grid size-28 place-items-center rounded-full bg-pulse text-4xl font-bold text-pulse-ink">
          {me.nickname.slice(0, 1).toUpperCase()}
        </span>
      </div>
      <div className="grid gap-2">
        <h1 className="text-4xl font-bold tracking-tighter">You're in, {me.nickname}.</h1>
        <p className="text-ink-2">{title ? `${title}. ` : ''}Waiting for the instructor to start.</p>
      </div>
      <p className="rounded-full bg-paper-2 px-4 py-1.5 text-sm font-semibold">{count} {count === 1 ? 'player' : 'players'} here</p>
    </div>
  );
}

function QuestionView({ round, onAnswer }: { round: RoundStarted; onAnswer: (a: AnswerPayload) => void }) {
  const q = round.question;
  const left = useCountdown(round.endsAt, round.serverNow);
  const [picked, setPicked] = useState<string[]>([]);
  const [num, setNum] = useState('');
  const total = q.timeLimitSec;

  return (
    <div className="flex flex-1 flex-col gap-5 pt-2">
      <div className="grid gap-3">
        <div className="flex items-center justify-between text-sm font-semibold text-ink-2">
          <span>Question {round.roundIndex + 1} of {round.totalRounds}</span>
          <span className={cx('font-mono text-lg font-bold', left <= 5 ? 'text-bad' : 'text-ink')}>{left}s</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full">
          <motion.div
            className="h-full origin-left rounded-full bg-pulse"
            initial={{ scaleX: Math.min(1, left / total) || 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: Math.max(0, (round.endsAt - round.serverNow) / 1000), ease: 'linear' }}
          />
        </div>
        <h1 className="text-2xl font-bold leading-snug tracking-tight sm:text-3xl">{q.prompt}</h1>
      </div>

      {q.input === 'number' ? (
        <form
          className="mt-auto grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const value = Number(num);
            if (num.trim() !== '' && Number.isFinite(value)) onAnswer({ kind: 'numeric', value });
          }}
        >
          <label htmlFor="num" className="text-sm font-semibold">Your answer</label>
          <Input id="num" autoFocus type="number" step="any" inputMode="decimal" value={num} onChange={(e) => setNum(e.target.value)} className="!h-20 text-center font-mono text-4xl font-bold" />
          <Button size="lg" type="submit" disabled={num.trim() === ''}>Submit</Button>
        </form>
      ) : (
        <div className="mt-auto grid gap-3">
          {q.options!.map((o, i) => (
            <OptionTile
              key={o.id}
              index={i}
              text={o.text}
              selected={picked.includes(o.id)}
              onClick={() => {
                if (q.input === 'single') onAnswer({ kind: 'choice', optionIds: [o.id] });
                else setPicked((p) => (p.includes(o.id) ? p.filter((x) => x !== o.id) : [...p, o.id]));
              }}
            />
          ))}
          {q.input === 'multiple' && (
            <>
              <p className="text-center text-sm text-ink-2">Pick every answer that applies.</p>
              <Button size="lg" variant="ink" disabled={!picked.length} onClick={() => onAnswer({ kind: 'choice', optionIds: picked })}>
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
    <div className="my-auto grid justify-items-center gap-4 text-center">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.span key={i} className="size-3 rounded-full bg-pulse" animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }} />
        ))}
      </div>
      <h1 className="text-3xl font-bold tracking-tighter">{title}</h1>
      <p className="text-ink-2">{body}</p>
    </div>
  );
}

function ResultView({ result, score }: { result: PlayerRoundResult; score: LeaderboardEntry | null }) {
  const poll = result.correct === null;
  const tone = poll ? 'bg-ink text-paper' : result.correct ? 'bg-good text-white' : 'bg-bad text-white';
  const Icon = poll ? ChartBar : result.correct ? CheckCircle : result.answered ? XCircle : Timer;
  const title = poll ? (result.answered ? 'Vote counted' : 'Poll closed') : result.correct ? 'Correct!' : result.answered ? 'Not this time' : "Time's up";
  return (
    <motion.div
      initial={{ scale: 0.92 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      className={cx('my-auto grid justify-items-center gap-5 rounded-[2.5rem] px-6 py-14 text-center', tone)}
    >
      <Icon size={88} weight="fill" />
      <h1 className="text-5xl font-bold tracking-tighter">{title}</h1>
      {score && !poll && (
        <div className="grid gap-1 text-lg font-semibold opacity-90">
          <p className="font-mono text-3xl font-bold">+{score.lastPoints}</p>
          <p>You are #{score.rank} with {score.total} points</p>
          {score.streak > 1 && <p className="flex items-center justify-center gap-1"><Fire weight="fill" /> {score.streak} in a row</p>}
        </div>
      )}
    </motion.div>
  );
}

function Ended({ score, board }: { score: LeaderboardEntry | null; board: LeaderboardEntry[] }) {
  return (
    <div className="my-auto grid gap-8">
      <div className="grid justify-items-center gap-3 text-center">
        <Trophy size={64} weight="duotone" className="text-pulse" />
        <h1 className="text-5xl font-bold tracking-tighter">That's a wrap.</h1>
        {score && <p className="text-lg text-ink-2">You finished #{score.rank} with {score.total} points.</p>}
      </div>
      {board.length > 0 && (
        <ol className="grid gap-2">
          {board.slice(0, 5).map((e) => (
            <li key={e.playerId} className={cx('flex items-center gap-3 rounded-2xl px-4 py-3', e.playerId === score?.playerId ? 'bg-pulse text-pulse-ink' : 'bg-card')}>
              <span className="w-6 font-mono font-bold">{e.rank}</span>
              <span className="flex-1 font-semibold">{e.nickname}</span>
              <span className="font-mono font-bold">{e.total}</span>
            </li>
          ))}
        </ol>
      )}
      <Link to="/" className="justify-self-center"><Button variant="ghost">Back to Pulse</Button></Link>
    </div>
  );
}
