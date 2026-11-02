import { PlayerScore } from './Scorer';

export interface LeaderboardEntry extends PlayerScore {
  rank: number;
  nickname: string;
}

/**
 * Single Responsibility: ranking only. Ties share a rank ("1, 1, 3").
 * Ties are broken for display order by correct count, then nickname.
 */
export class Leaderboard {
  static rank(scores: PlayerScore[], nicknames: ReadonlyMap<string, string>): LeaderboardEntry[] {
    const sorted = [...scores].sort(
      (a, b) =>
        b.total - a.total ||
        b.correctCount - a.correctCount ||
        (nicknames.get(a.playerId) ?? '').localeCompare(nicknames.get(b.playerId) ?? ''),
    );
    let rank = 0;
    return sorted.map((s, i) => {
      if (i === 0 || s.total !== sorted[i - 1].total) rank = i + 1;
      return { ...s, rank, nickname: nicknames.get(s.playerId) ?? 'unknown' };
    });
  }
}
