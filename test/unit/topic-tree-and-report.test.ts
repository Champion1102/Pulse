import { expect } from 'chai';
import { TopicGroup, TopicLeaf } from '../../src/domain/bank/TopicComponent';
import { ReportBuilder } from '../../src/domain/reports/ReportBuilder';
import { SessionRecord } from '../../src/domain/reports/SessionRecord';

function tree() {
  const course = new TopicGroup('c', 'SESD', 'course');
  const u1 = new TopicGroup('u1', 'Patterns', 'unit').add(new TopicLeaf('t1', 'Factory')).add(new TopicLeaf('t2', 'Strategy'));
  const u2 = new TopicGroup('u2', 'SOLID', 'unit').add(new TopicLeaf('t3', 'LSP'));
  course.add(u1).add(u2);
  return course;
}

describe('Topic tree (Composite)', () => {
  it('aggregates stats up the tree', () => {
    const c = tree();
    const stats = new Map([
      ['t1', { answered: 10, correct: 9 }],
      ['t2', { answered: 10, correct: 3 }],
      ['t3', { answered: 5, correct: 5 }],
    ]);
    expect(c.find('u1')!.aggregate(stats)).to.deep.equal({ answered: 20, correct: 12 });
    expect(c.aggregate(stats)).to.deep.equal({ answered: 25, correct: 17 });
    expect(c.find('t2')!.path()).to.equal('SESD / Patterns / Strategy');
    expect(c.find('t3')!.ancestorAt('unit')!.id).to.equal('u2');
    expect(c.leafIds()).to.deep.equal(['t1', 't2', 't3']);
  });

  it('enforces course -> unit -> topic nesting', () => {
    expect(() => new TopicGroup('c', 'C', 'course').add(new TopicLeaf('t', 'T'))).to.throw(/only contain units/);
  });
});

describe('ReportBuilder', () => {
  const g = (correct: boolean) => ({ correct, fraction: correct ? 1 : 0 });
  const answer = (playerId: string, correct: boolean) => ({
    playerId,
    answer: { kind: 'choice' as const, optionIds: ['a'] },
    responseTimeMs: 1000,
    grade: g(correct),
  });
  const reveal = { questionId: 'x', correctAnswer: null, distribution: {}, answeredCount: 0, correctCount: 0 };
  const record: SessionRecord = {
    sessionId: 's',
    workspaceId: 'ws',
    roomCode: 'R',
    quizId: 'q',
    quizTitle: 'Quiz',
    scoringMode: 'accuracy',
    startedAt: 0,
    endedAt: 1,
    players: [{ id: 'a', nickname: 'A' }, { id: 'b', nickname: 'B' }],
    leaderboard: [],
    rounds: [
      { questionId: 'q1', topicId: 't1', gradable: true, timeLimitMs: 20000, participants: ['a', 'b'], answers: [answer('a', true), answer('b', true)], reveal },
      { questionId: 'q2', topicId: 't2', gradable: true, timeLimitMs: 20000, participants: ['a', 'b'], answers: [answer('a', false)], reveal },
      { questionId: 'q3', topicId: 't3', gradable: true, timeLimitMs: 20000, participants: ['a', 'b'], answers: [answer('a', true), answer('b', false)], reveal },
    ],
  };
  const builder = new ReportBuilder(() => [tree()], (id) => `Prompt ${id}`, () => 42);

  it('reports per topic and flags what the class struggled with', () => {
    const r = builder.build(record);
    expect(r.groups.map((x) => [x.name, x.accuracy])).to.deep.equal([['Factory', 1], ['Strategy', 0], ['LSP', 0.5]]);
    expect(r.struggling.map((x) => x.name)).to.deep.equal(['Strategy', 'LSP']);
    expect(r.hardestQuestions[0].questionId).to.equal('q2');
  });

  it('switches to per-unit results just by walking one level up', () => {
    const r = builder.build(record, { groupBy: 'unit' });
    expect(r.groups.map((x) => [x.name, x.answered, x.correct])).to.deep.equal([['Patterns', 4, 2], ['SOLID', 2, 1]]);
  });
});
