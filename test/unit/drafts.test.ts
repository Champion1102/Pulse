import { expect } from 'chai';
import { FallbackQuestionGenerator } from '../../src/ai/FallbackQuestionGenerator';
import { OfflineQuestionGenerator } from '../../src/ai/OfflineQuestionGenerator';
import { QuestionGenerator } from '../../src/ai/QuestionGenerator';
import { createContainer } from '../../src/config/container';
import { RoomRegistry } from '../../src/domain/session';
import { ManualClock } from '../../src/infrastructure/time/Clock';
import { SequentialIdGenerator } from '../../src/infrastructure/ids';

const stubAi: QuestionGenerator = {
  name: 'stub',
  async generate({ topicId }) {
    return [
      { type: 'mcq', topicId, prompt: 'Good draft', options: [{ text: 'x', correct: true }, { text: 'y' }] },
      { type: 'mcq', topicId, prompt: 'Broken draft (no correct option)', options: [{ text: 'x' }, { text: 'y' }] },
    ];
  },
};

describe('AI drafts', () => {
  function setup(generator: QuestionGenerator = stubAi) {
    RoomRegistry.resetForTests();
    const c = createContainer({ generator, clock: new ManualClock(), ids: new SequentialIdGenerator(), rooms: RoomRegistry.getInstance() });
    const ws = c.workspaces.create('Test').id;
    const course = c.bank.createCourse(ws, 'C');
    const unit = c.bank.createUnit(ws, course.id, 'U');
    const topic = c.bank.createTopic(ws, unit.id, 'T');
    return { c, ws, topicId: topic.id };
  }

  it('drafts stay out of the bank until approved', async () => {
    const { c, ws, topicId } = setup();
    const drafts = await c.drafts.generate(ws, { notes: 'notes', topicId, count: 2 });
    expect(drafts.every((d) => d.status === 'pending')).to.equal(true);
    expect(c.bank.listQuestions(ws)).to.have.length(0);

    const approved = c.drafts.approve(ws, drafts[0].id);
    expect(approved.status).to.equal('approved');
    expect(c.bank.listQuestions(ws)).to.have.length(1);
  });

  it('the Factory still validates AI output: a broken draft cannot be approved as-is', async () => {
    const { c, ws, topicId } = setup();
    const [, broken] = await c.drafts.generate(ws, { notes: 'notes', topicId, count: 2 });
    expect(() => c.drafts.approve(ws, broken.id)).to.throw(/exactly one/);
    // ...but the instructor can fix it while approving
    const fixed = c.drafts.approve(ws, broken.id, { options: [{ text: 'x', correct: true }, { text: 'y' }] });
    expect(fixed.status).to.equal('approved');
  });

  it('rejecting a draft is final', async () => {
    const { c, ws, topicId } = setup();
    const [d] = await c.drafts.generate(ws, { notes: 'notes', topicId, count: 1 });
    c.drafts.reject(ws, d.id);
    expect(() => c.drafts.approve(ws, d.id)).to.throw(/already rejected/);
  });

  it('falls back to the offline generator when the AI provider is down', async () => {
    const down: QuestionGenerator = { name: 'down', generate: async () => { throw new Error('503'); } };
    const gen = new FallbackQuestionGenerator(down, new OfflineQuestionGenerator(), () => undefined);
    const out = await gen.generate({ notes: 'The Strategy pattern lets the scoring mode change per session.', topicId: 't', count: 3 });
    expect(out).to.have.length(1);
    expect(out[0].type).to.equal('true_false');
  });
});
