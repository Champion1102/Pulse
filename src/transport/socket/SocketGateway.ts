import type { Server, Socket } from 'socket.io';
import { LiveSessionService } from '../../application/LiveSessionService';
import { AnswerPayload } from '../../domain/questions/types';
import { hostChannel, playerChannel, roomChannel } from './SocketBroadcaster';

type Ack = (res: { ok: true; [k: string]: unknown } | { ok: false; error: string }) => void;

interface SocketState {
  code?: string;
  playerId?: string;
  hostKey?: string;
}

/** Inbound side of the real-time transport: translates socket messages into service calls. */
export class SocketGateway {
  constructor(
    private readonly io: Server,
    private readonly live: LiveSessionService,
  ) {}

  listen(): void {
    this.io.on('connection', (socket) => this.onConnection(socket));
  }

  private onConnection(socket: Socket): void {
    const state = socket.data as SocketState;

    this.on(socket, 'player:join', async (msg: { code: string; nickname: string; playerId?: string }) => {
      const code = String(msg?.code ?? '').toUpperCase().trim();
      const { player, snapshot } = this.live.join(code, String(msg?.nickname ?? ''), msg?.playerId);
      state.code = code;
      state.playerId = player.id;
      await socket.join([roomChannel(code), playerChannel(player.id)]);
      const me = snapshot.leaderboard.find((e) => e.playerId === player.id);
      return { player, state: snapshot.state, quizTitle: snapshot.quizTitle, score: me ?? null };
    });

    this.on(socket, 'player:answer', async (msg: { answer: AnswerPayload }) => {
      if (!state.code || !state.playerId) throw new Error('Join a room first');
      this.live.answer(state.code, state.playerId, sanitizeAnswer(msg?.answer));
      return {};
    });

    this.on(socket, 'host:attach', async (msg: { code: string; hostKey: string }) => {
      const code = String(msg?.code ?? '').toUpperCase().trim();
      if (!this.live.isHost(code, msg?.hostKey)) throw new Error('Invalid room code or host key');
      state.code = code;
      state.hostKey = msg.hostKey;
      await socket.join([roomChannel(code), hostChannel(code)]);
      return { snapshot: this.live.snapshot(code) };
    });

    this.on(socket, 'host:next', async () => {
      this.live.nextRound(this.req(state.code), this.req(state.hostKey));
      return {};
    });

    this.on(socket, 'host:end-round', async () => {
      this.live.endRound(this.req(state.code), this.req(state.hostKey));
      return {};
    });

    this.on(socket, 'host:end-session', async () => {
      const snapshot = await this.live.endSession(this.req(state.code), this.req(state.hostKey));
      return { sessionId: snapshot.sessionId };
    });

    socket.on('disconnect', () => {
      if (state.code && state.playerId) this.live.leave(state.code, state.playerId);
    });
  }

  /** Wraps a handler so every message gets a uniform {ok, ...} / {ok:false, error} ack. */
  private on<T>(socket: Socket, event: string, handler: (msg: T) => Promise<Record<string, unknown>>): void {
    socket.on(event, async (msg: T, ack?: Ack) => {
      const reply: Ack = typeof ack === 'function' ? ack : () => undefined;
      try {
        reply({ ok: true, ...(await handler(msg)) });
      } catch (err) {
        reply({ ok: false, error: (err as Error).message });
      }
    });
  }

  private req(v: string | undefined): string {
    if (!v) throw new Error('Not attached to a room as host');
    return v;
  }
}

/** Never trust the wire: rebuild the answer from known fields only. */
function sanitizeAnswer(raw: unknown): AnswerPayload {
  const a = raw as Partial<{ kind: string; optionIds: unknown; value: unknown }>;
  if (a?.kind === 'choice' && Array.isArray(a.optionIds)) {
    return { kind: 'choice', optionIds: a.optionIds.slice(0, 20).map(String) };
  }
  if (a?.kind === 'numeric' && typeof a.value === 'number') return { kind: 'numeric', value: a.value };
  throw new Error('Malformed answer');
}
