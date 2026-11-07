import { expect } from 'chai';
import { GradedRound, PollRound, DefaultRoundFactory, RoundContext } from '../../src/domain/session';
import { isGradable } from '../../src/domain/questions';
import { ManualClock } from '../../src/infrastructure/time/Clock';
import { mcq, poll, RecordingBus } from '../support/helpers';

function ctx(bus: RecordingBus, clock: ManualClock, players: string[]): RoundContext {
  return { roomCode: 'ABC', sessionId: 's1', roundIndex: 0, totalRounds: 1, bus, clock, scheduler: clock, activePlayerIds: () => players };
}

describe('Round (Template Method)', () => {
  it('runs the fixed steps in order: send -> timer -> collect -> grade -> reveal', async () => {
    const bus = new RecordingBus();
    const clock = new ManualClock();
    const q = mcq();
    const round = new DefaultRoundFactory().create(q, ctx(bus, clock, ['p1', 'p2']));
    expect(round).to.be.instanceOf(GradedRound);

    const done = round.run();
    expect(bus.types()).to.deep.equal(['round.started']);
    clock.advance(3000);
    expect(round.submit('p1', { kind: 'choice', optionIds: ['b'] })).to.deep.equal({ ok: true });
    clock.advance(20000); // timer fires, p2 never answered
    const outcome = await done;

    expect(bus.types()).to.deep.equal(['round.started', 'answer.submitted', 'round.ended']);
    expect(outcome.answers[0]).to.include({ playerId: 'p1', responseTimeMs: 3000 });
    expect(outcome.answers[0].grade).to.deep.equal({ correct: true, fraction: 1 });
    expect(outcome.reveal.correctAnswer).to.deep.equal({ kind: 'choice', optionIds: ['b'] });
    expect(outcome.reveal.distribution).to.deep.equal({ a: 0, b: 1, c: 0 });
    const ended = bus.last('round.ended');
    expect(ended.results.find((r) => r.playerId === 'p2')).to.include({ answered: false, correct: false });
  });

  it('closes early once every active player has answered', async () => {
    const bus = new RecordingBus();
    const clock = new ManualClock();
    const round = new DefaultRoundFactory().create(mcq(), ctx(bus, clock, ['p1']));
    const done = round.run();
    round.submit('p1', { kind: 'choice', optionIds: ['a'] });
    const outcome = await done; // resolves without advancing the clock
    expect(outcome.answers[0].grade?.correct).to.equal(false);
  });

  it('rejects duplicate, late and malformed answers', async () => {
    const bus = new RecordingBus();
    const clock = new ManualClock();
    const round = new DefaultRoundFactory().create(mcq(), ctx(bus, clock, ['p1', 'p2']));
    const done = round.run();
    expect(round.submit('p1', { kind: 'numeric', value: 4 })).to.deep.include({ ok: false });
    round.submit('p1', { kind: 'choice', optionIds: ['b'] });
    expect(round.submit('p1', { kind: 'choice', optionIds: ['a'] })).to.deep.equal({ ok: false, reason: 'Already answered' });
    clock.advance(20000);
    await done;
    expect(round.submit('p2', { kind: 'choice', optionIds: ['b'] })).to.deep.include({ ok: false });
  });

  it('a poll uses PollRound: same skeleton, no grading, no correct answer', async () => {
    const bus = new RecordingBus();
    const clock = new ManualClock();
    const p = poll();
    expect(isGradable(p)).to.equal(false);
    const round = new DefaultRoundFactory().create(p, ctx(bus, clock, ['p1']));
    expect(round).to.be.instanceOf(PollRound);
    const done = round.run();
    round.submit('p1', { kind: 'choice', optionIds: ['b'] });
    const outcome = await done;
    expect(outcome.gradable).to.equal(false);
    expect(outcome.reveal).to.include({ correctAnswer: null, correctCount: null });
    expect(outcome.reveal.distribution).to.deep.equal({ a: 0, b: 1 });
  });
});
