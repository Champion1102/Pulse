import type { Server } from 'socket.io';
import { EventBus, EventObserver } from '../../domain/events/EventBus';
import { RoomStore } from '../../domain/session/RoomRegistry';

export const roomChannel = (code: string) => `room:${code.toUpperCase()}`;
export const hostChannel = (code: string) => `host:${code.toUpperCase()}`;
export const playerChannel = (playerId: string) => `player:${playerId}`;

const TOP_N = 10;

/**
 * Observer that pushes domain events to screens over Socket.IO.
 * The engine never imports socket.io — swapping transports means swapping this class.
 */
export class SocketBroadcaster implements EventObserver {
  constructor(
    private readonly io: Server,
    private readonly rooms: RoomStore,
  ) {}

  attach(bus: EventBus): void {
    const lobby = (roomCode: string, playerCount: number) => {
      const players = this.rooms.get(roomCode)?.playerList() ?? [];
      this.io.to(hostChannel(roomCode)).emit('lobby:update', { players, playerCount });
      this.io.to(roomChannel(roomCode)).emit('room:count', { playerCount });
    };
    bus.subscribe('player.joined', (e) => lobby(e.roomCode, e.playerCount));
    bus.subscribe('player.left', (e) => lobby(e.roomCode, e.playerCount));

    bus.subscribe('round.started', (e) => {
      this.io.to(roomChannel(e.roomCode)).emit('round:started', {
        roundIndex: e.roundIndex,
        totalRounds: e.totalRounds,
        question: e.question,
        endsAt: e.endsAt,
        serverNow: Date.now(),
      });
    });

    bus.subscribe('answer.submitted', (e) => {
      this.io.to(hostChannel(e.roomCode)).emit('round:progress', {
        answeredCount: e.answeredCount,
        playerCount: e.playerCount,
      });
      this.io.to(playerChannel(e.playerId)).emit('answer:accepted', { roundIndex: e.roundIndex });
    });

    bus.subscribe('round.ended', (e) => {
      this.io.to(roomChannel(e.roomCode)).emit('round:ended', {
        roundIndex: e.roundIndex,
        gradable: e.gradable,
        reveal: e.reveal,
      });
      for (const r of e.results) this.io.to(playerChannel(r.playerId)).emit('round:result', r);
    });

    bus.subscribe('leaderboard.updated', (e) => {
      this.io.to(roomChannel(e.roomCode)).emit('leaderboard', { roundIndex: e.roundIndex, entries: e.entries.slice(0, TOP_N) });
      for (const entry of e.entries) this.io.to(playerChannel(entry.playerId)).emit('player:score', entry);
    });

    bus.subscribe('session.ended', (e) => {
      this.io.to(roomChannel(e.roomCode)).emit('session:ended', {
        sessionId: e.sessionId,
        leaderboard: e.leaderboard.slice(0, TOP_N),
      });
      for (const entry of e.leaderboard) this.io.to(playerChannel(entry.playerId)).emit('player:score', entry);
    });
  }
}
