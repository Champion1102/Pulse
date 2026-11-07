import { expect } from 'chai';
import { LiveSession, DefaultRoundFactory, RoomRegistry } from '../../src/domain/session';
import { ScoringRegistry } from '../../src/domain/scoring';
import { ManualClock } from '../../src/infrastructure/time/Clock';
import { SequentialIdGenerator } from '../../src/infrastructure/ids';
import { mcq, poll, RecordingBus } from '../support/helpers';

function session(strategy = 'accuracy') {
  const bus = new RecordingBus();
  const clock = new ManualClock();
  const ids = new SequentialIdGenerator();
  const s = new LiveSession({
    sessionId: 's1',
    workspaceId: 'ws1',
    code: 'ROOM42',
    quizId: 'quiz1',
    quizTitle: 'Demo',
    questions: [mcq('t1'), poll('t1'), mcq('t2')],
    scoring: ScoringRegistry.withDefaults().get(strategy),
    bus,
    clock,
    scheduler: clock,
    roundFactory: new DefaultRoundFactory(),
    newPlayerId: () => ids.next('player'),
  });
  return { s, bus, clock };
}

describe('LiveSession', () => {
  it('runs the core loop: join -> answer -> leaderboard', async () => {
    const { s, bus } = session();
    const ann = s.join('Ann');
    const bob = s.join('Bob');
    const r1 = s.startNextRound();
    s.submitAnswer(ann.id, { kind: 'choice', optionIds: ['b'] });
    s.submitAnswer(bob.id, { kind: 'choice', optionIds: ['a'] });
    await r1;

    const lb = bus.last('leaderboard.updated').entries;
    expect(lb.map((e) => [e.nickname, e.total, e.rank])).to.deep.equal([['Ann', 1000, 1], ['Bob', 0, 2]]);
    expect(s.currentState).to.equal('between_rounds');
  });

  it('poll rounds do not change scores', async () => {
    const { s } = session();
    const ann = s.join('Ann');
    const r1 = s.startNextRound();
    s.submitAnswer(ann.id, { kind: 'choice', optionIds: ['b'] });
    await r1;
    const r2 = s.startNextRound();
    s.submitAnswer(ann.id, { kind: 'choice', optionIds: ['a'] });
    await r2;
    expect(s.leaderboard()[0].total).to.equal(1000);
  });

  it('enforces unique nicknames and supports reconnecting with a player id', () => {
    const { s } = session();
    const ann = s.join('Ann');
    expect(() => s.join('ann')).to.throw(/taken/);
    s.disconnect(ann.id);
    expect(s.join('', ann.id).id).to.equal(ann.id);
  });

  it('refuses to start a second round while one is running', () => {
    const { s } = session();
    s.join('Ann');
    void s.startNextRound();
    expect(() => s.startNextRound()).to.throw(/already running/);
  });

  it('ending mid-round grades the open round first, then publishes session.ended', async () => {
    const { s, bus } = session();
    const ann = s.join('Ann');
    s.join('Bob');
    void s.startNextRound();
    s.submitAnswer(ann.id, { kind: 'choice', optionIds: ['b'] });
    const final = await s.end();
    expect(final[0]).to.include({ nickname: 'Ann', total: 1000 });
    const types = bus.types();
    expect(types.indexOf('leaderboard.updated')).to.be.lessThan(types.indexOf('session.ended'));
    expect(() => s.join('Cy')).to.throw(/ended/);
  });
});

describe('RoomRegistry (Singleton)', () => {
  afterEach(() => RoomRegistry.resetForTests());

  it('always returns the same instance', () => {
    expect(RoomRegistry.getInstance()).to.equal(RoomRegistry.getInstance());
  });

  it('stores rooms case-insensitively and rejects duplicate codes', () => {
    const { s } = session();
    const reg = RoomRegistry.getInstance();
    reg.add(s);
    expect(reg.get('room42')).to.equal(s);
    expect(() => reg.add(s)).to.throw(/already exists/);
  });
});
