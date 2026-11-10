/**
 * Simulated players — doubles as the load test and the backup demo.
 *
 *   # bots join a room an instructor is hosting (backup demo if Wi-Fi fails)
 *   npm run load-test -- --code ABC123 --players 60
 *
 *   # fully automatic: starts a session, drives every round, prints latency stats
 *   npm run load-test -- --players 200
 *
 * Options: --url http://localhost:3000  --players 50  --code XXXXXX  --accuracy 0.7  --mode speed
 */
import { io, Socket } from 'socket.io-client';

const args = Object.fromEntries(
  process.argv.slice(2).reduce<[string, string][]>((acc, cur, i, all) => {
    if (cur.startsWith('--')) acc.push([cur.slice(2), all[i + 1]?.startsWith('--') ? 'true' : all[i + 1] ?? 'true']);
    return acc;
  }, []),
);
const URL = args.url ?? 'http://localhost:3000';
const PLAYERS = Number(args.players ?? 50);
const ACCURACY = Number(args.accuracy ?? 0.7);
const MODE = args.mode ?? 'speed';

type Ack = { ok: boolean; error?: string; [k: string]: any };
const emit = (s: Socket, ev: string, msg: unknown = {}) => new Promise<Ack>((r) => s.emit(ev, msg, r));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const NAMES = ['Asha', 'Rohan', 'Meera', 'Kabir', 'Isha', 'Arjun', 'Diya', 'Vivaan', 'Anaya', 'Reyansh', 'Sara', 'Aarav'];

const answerLatencies: number[] = [];
let answerErrors = 0;

function percentile(xs: number[], p: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}

function makeBot(code: string, index: number): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const s = io(URL, { transports: ['websocket'], forceNew: true });
    s.on('connect_error', reject);
    s.on('connect', async () => {
      const res = await emit(s, 'player:join', { code, nickname: `${pick(NAMES)}-bot${index}` });
      if (!res.ok) return reject(new Error(res.error));
      resolve(s);
    });
    s.on('round:started', async (r: any) => {
      const q = r.question;
      const thinkMs = 500 + Math.random() * Math.min(q.timeLimitSec * 1000 * 0.6, 8000);
      await sleep(thinkMs);
      let answer: unknown;
      if (q.input === 'number') answer = { kind: 'numeric', value: Math.random() < ACCURACY ? 3 : Math.round(Math.random() * 10) };
      else if (q.input === 'multiple') answer = { kind: 'choice', optionIds: q.options.filter(() => Math.random() < 0.5).map((o: any) => o.id).slice(0, 3).concat(q.options[0].id).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i) };
      else answer = { kind: 'choice', optionIds: [pick(q.options as { id: string }[]).id] };
      const t0 = performance.now();
      const ack = await emit(s, 'player:answer', { answer });
      answerLatencies.push(performance.now() - t0);
      if (!ack.ok) answerErrors++;
    });
  });
}

let workspaceKey = '';
async function api(path: string, body?: unknown) {
  const res = await fetch(URL + '/api' + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', ...(workspaceKey ? { 'x-workspace-key': workspaceKey } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  let code: string = args.code;
  let host: Socket | null = null;

  if (!code) {
    // A throwaway workspace with the sample quiz (login-less, so nothing to configure).
    workspaceKey = (await api('/workspaces', { name: 'Load test', sample: true })).key;
    const quizzes = await api('/quizzes');
    if (!quizzes.length) throw new Error('No quizzes in the load-test workspace');
    const started = await api('/sessions', { quizId: quizzes[0].id, scoringMode: MODE });
    code = started.code;
    host = io(URL, { transports: ['websocket'], forceNew: true });
    await new Promise<void>((r) => host!.on('connect', () => r()));
    const att = await emit(host, 'host:attach', { code, hostKey: started.hostKey });
    if (!att.ok) throw new Error(att.error);
    console.log(`Started session ${code} ("${quizzes[0].title}", scoring: ${MODE})`);
  }

  console.log(`Joining ${PLAYERS} bots to room ${code} at ${URL}…`);
  const t0 = performance.now();
  const bots = await Promise.all(Array.from({ length: PLAYERS }, (_, i) => makeBot(code, i + 1)));
  console.log(`  ${bots.length} joined in ${Math.round(performance.now() - t0)} ms`);

  const finished = new Promise<any>((r) => bots[0].on('session:ended', r));

  if (host) {
    // Drive the session ourselves: next -> wait for leaderboard -> next … -> end.
    for (;;) {
      const lb = new Promise<any>((r) => host!.once('leaderboard', r));
      const res = await emit(host, 'host:next');
      if (!res.ok) break; // no more questions
      const t = performance.now();
      const board = await lb;
      console.log(`  round ${board.roundIndex + 1}: closed + scored in ${Math.round(performance.now() - t)} ms, leader ${board.entries[0]?.nickname} (${board.entries[0]?.total})`);
      await sleep(300);
    }
    await emit(host, 'host:end-session');
  } else {
    console.log('  Bots are in. Run the quiz from the host screen; Ctrl+C to stop.');
  }

  const end = await finished;
  console.log('\nSession ended. Top 3:', end.leaderboard.slice(0, 3).map((e: any) => `${e.nickname} ${e.total}`).join(', '));
  console.log(`Answers: ${answerLatencies.length} (errors: ${answerErrors})`);
  console.log(`Answer ack latency ms  p50=${percentile(answerLatencies, 50).toFixed(1)}  p95=${percentile(answerLatencies, 95).toFixed(1)}  p99=${percentile(answerLatencies, 99).toFixed(1)}  max=${Math.max(0, ...answerLatencies).toFixed(1)}`);
  bots.forEach((b) => b.close());
  host?.close();
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
