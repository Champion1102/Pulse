import { expect } from 'chai';
import {
  AccuracyOnlyScoring,
  Leaderboard,
  Scorer,
  ScoringRegistry,
  SpeedBonusScoring,
  StreakScoring,
} from '../../src/domain/scoring';

const right = { correct: true, fraction: 1 };
const wrong = { correct: false, fraction: 0 };

describe('Scoring strategies', () => {
  it('accuracy-only ignores time', () => {
    const s = new AccuracyOnlyScoring();
    expect(s.points({ grade: right, responseTimeMs: 100, timeLimitMs: 20000, streakBefore: 0 })).to.equal(1000);
    expect(s.points({ grade: right, responseTimeMs: 19000, timeLimitMs: 20000, streakBefore: 0 })).to.equal(1000);
    expect(s.points({ grade: { correct: false, fraction: 0.5 }, responseTimeMs: 0, timeLimitMs: 1, streakBefore: 0 })).to.equal(500);
  });

  it('speed bonus decays from 1000 to 500 over the time limit', () => {
    const s = new SpeedBonusScoring();
    expect(s.points({ grade: right, responseTimeMs: 0, timeLimitMs: 20000, streakBefore: 0 })).to.equal(1000);
    expect(s.points({ grade: right, responseTimeMs: 10000, timeLimitMs: 20000, streakBefore: 0 })).to.equal(750);
    expect(s.points({ grade: right, responseTimeMs: 99999, timeLimitMs: 20000, streakBefore: 0 })).to.equal(500);
    expect(s.points({ grade: wrong, responseTimeMs: 0, timeLimitMs: 20000, streakBefore: 0 })).to.equal(0);
  });

  it('streaks add +100 per step, capped at +500', () => {
    const s = new StreakScoring();
    expect(s.points({ grade: right, responseTimeMs: 0, timeLimitMs: 1, streakBefore: 0 })).to.equal(1000);
    expect(s.points({ grade: right, responseTimeMs: 0, timeLimitMs: 1, streakBefore: 2 })).to.equal(1200);
    expect(s.points({ grade: right, responseTimeMs: 0, timeLimitMs: 1, streakBefore: 99 })).to.equal(1500);
  });

  it('registry exposes the three default modes and rejects unknown ones', () => {
    const r = ScoringRegistry.withDefaults();
    expect(r.list().map((s) => s.id)).to.deep.equal(['accuracy', 'speed', 'streak']);
    expect(() => r.get('negative')).to.throw(/Unknown/);
  });
});

describe('Scorer', () => {
  it('tracks totals and streaks; non-answers break the streak', () => {
    const scorer = new Scorer(new StreakScoring());
    scorer.applyRound([{ playerId: 'a', grade: right, responseTimeMs: 1 }], ['a', 'b'], 20000);
    scorer.applyRound([{ playerId: 'a', grade: right, responseTimeMs: 1 }], ['a', 'b'], 20000);
    const [a, b] = scorer.all();
    expect(a).to.include({ total: 2100, streak: 2, correctCount: 2, lastPoints: 1100 });
    expect(b).to.include({ total: 0, streak: 0, lastCorrect: false });
  });
});

describe('Leaderboard', () => {
  it('ranks by score and shares ranks on ties', () => {
    const base = { streak: 0, lastPoints: 0, lastCorrect: null, correctCount: 0 };
    const entries = Leaderboard.rank(
      [
        { ...base, playerId: 'a', total: 500 },
        { ...base, playerId: 'b', total: 900 },
        { ...base, playerId: 'c', total: 500 },
      ],
      new Map([['a', 'Ann'], ['b', 'Bob'], ['c', 'Cy']]),
    );
    expect(entries.map((e) => [e.nickname, e.rank])).to.deep.equal([['Bob', 1], ['Ann', 2], ['Cy', 2]]);
  });
});
