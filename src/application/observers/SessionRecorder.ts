import { EventBus, EventObserver } from '../../domain/events/EventBus';
import { RoomStore } from '../../domain/session/RoomRegistry';
import { Clock } from '../../infrastructure/time/Clock';
import { SessionRecordRepository } from '../ports';

/**
 * Analytics observer: after every scored round, and when a session ends, it
 * snapshots the room into the SessionRecordRepository so reports are always
 * up to date (even mid-session).
 */
export class SessionRecorder implements EventObserver {
  constructor(
    private readonly rooms: RoomStore,
    private readonly records: SessionRecordRepository,
    private readonly clock: Clock,
  ) {}

  attach(bus: EventBus): void {
    bus.subscribe('leaderboard.updated', (e) => this.record(e.roomCode, false));
    bus.subscribe('session.ended', (e) => this.record(e.roomCode, true));
  }

  private record(roomCode: string, ended: boolean): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;
    const snap = room.snapshot();
    this.records.save({
      sessionId: room.id,
      workspaceId: room.workspaceId,
      roomCode: room.code,
      quizId: room.quizId,
      quizTitle: snap.quizTitle,
      scoringMode: snap.scoringMode,
      startedAt: room.createdAt,
      endedAt: ended ? this.clock.now() : null,
      players: snap.players.map(({ id, nickname }) => ({ id, nickname })),
      rounds: room.roundOutcomes(),
      leaderboard: snap.leaderboard,
    });
  }
}
