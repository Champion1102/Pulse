import { RoundOutcome } from '../session/Round';
import { LeaderboardEntry } from '../scoring/Leaderboard';
import { PlayerRef } from '../events/EventBus';

/** Everything we keep about a finished (or running) session — the input to reports and exports. */
export interface SessionRecord {
  sessionId: string;
  workspaceId: string;
  roomCode: string;
  quizId: string;
  quizTitle: string;
  scoringMode: string;
  startedAt: number;
  endedAt: number | null;
  players: PlayerRef[];
  rounds: RoundOutcome[];
  leaderboard: LeaderboardEntry[];
}
