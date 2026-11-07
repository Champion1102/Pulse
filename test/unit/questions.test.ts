import { expect } from 'chai';
import { isGradable, McqQuestion, PollQuestion, QuestionFactory } from '../../src/domain/questions';
import { SequentialIdGenerator } from '../../src/infrastructure/ids';
import { factory } from '../support/helpers';

describe('Questions + QuestionFactory', () => {
  it('creates every built-in type from a spec', () => {
    const f = factory();
    expect(f.supportedTypes()).to.have.members(['mcq', 'multi_select', 'true_false', 'numeric', 'poll']);
    const q = f.create({ type: 'mcq', topicId: 't', prompt: 'Q', options: [{ text: 'a', correct: true }, { text: 'b' }] });
    expect(q).to.be.instanceOf(McqQuestion);
  });

  it('rejects invalid specs', () => {
    const f = factory();
    expect(() => f.create({ type: 'mcq', topicId: 't', prompt: 'Q', options: [{ text: 'a' }, { text: 'b' }] })).to.throw(/exactly one/);
    expect(() => f.create({ type: 'mcq', topicId: 't', prompt: 'Q', options: [{ text: 'a', correct: true }] })).to.throw(/at least 2/);
    expect(() => f.create({ type: 'numeric', topicId: 't', prompt: 'Q' })).to.throw(/numericAnswer/);
    expect(() => f.create({ type: 'true_false', topicId: 't', prompt: ' ', answer: true })).to.throw(/empty/);
    expect(() => f.create({ type: 'essay' as any, topicId: 't', prompt: 'Q' })).to.throw(/Unsupported/);
  });

  it('is open for extension: a new type is registered, not coded into the factory', () => {
    const f = factory().register('yes_no_poll', (spec, ids) =>
      new PollQuestion({ id: ids.next('q'), prompt: spec.prompt, topicId: spec.topicId, timeLimitSec: 20, options: [{ id: 'y', text: 'Yes' }, { id: 'n', text: 'No' }] }),
    );
    expect(f.create({ type: 'yes_no_poll' as any, topicId: 't', prompt: 'Coffee?' }).type).to.equal('poll');
  });

  it('render() never leaks the correct answer', () => {
    const q = factory().create({ type: 'mcq', topicId: 't', prompt: 'Q', options: [{ text: 'a', correct: true }, { text: 'b' }] });
    expect(JSON.stringify(q.render())).not.to.match(/correct/i);
  });

  it('grades MCQ, true/false and numeric (with tolerance)', () => {
    const f = factory();
    const m = f.create({ type: 'mcq', topicId: 't', prompt: 'Q', options: [{ text: 'a' }, { text: 'b', correct: true }] });
    const tf = f.create({ type: 'true_false', topicId: 't', prompt: 'Q', answer: false });
    const n = f.create({ type: 'numeric', topicId: 't', prompt: 'Q', numericAnswer: 3.14, tolerance: 0.01 });
    if (!isGradable(m) || !isGradable(tf) || !isGradable(n)) throw new Error('expected gradable');
    expect(m.grade({ kind: 'choice', optionIds: ['b'] }).correct).to.equal(true);
    expect(m.grade({ kind: 'choice', optionIds: ['a'] }).correct).to.equal(false);
    expect(tf.grade({ kind: 'choice', optionIds: ['false'] }).correct).to.equal(true);
    expect(n.grade({ kind: 'numeric', value: 3.15 }).correct).to.equal(true);
    expect(n.grade({ kind: 'numeric', value: 3.2 }).correct).to.equal(false);
  });

  it('gives partial credit on multi-select and penalises wrong picks', () => {
    const q = factory().create({
      type: 'multi_select',
      topicId: 't',
      prompt: 'Q',
      options: [{ text: 'a', correct: true }, { text: 'b', correct: true }, { text: 'c' }],
    });
    if (!isGradable(q)) throw new Error('expected gradable');
    expect(q.grade({ kind: 'choice', optionIds: ['a', 'b'] })).to.deep.equal({ correct: true, fraction: 1 });
    expect(q.grade({ kind: 'choice', optionIds: ['a'] })).to.deep.equal({ correct: false, fraction: 0.5 });
    expect(q.grade({ kind: 'choice', optionIds: ['a', 'c'] })).to.deep.equal({ correct: false, fraction: 0 });
  });

  it('a poll is Renderable but NOT Gradable (ISP / LSP)', () => {
    const p = factory().create({ type: 'poll', topicId: 't', prompt: 'Q', options: [{ text: 'x' }, { text: 'y' }] });
    expect(isGradable(p)).to.equal(false);
    expect((p as any).grade).to.equal(undefined);
    expect(p.render().options).to.have.length(2);
  });

  it('accepts() validates answer shape per type', () => {
    const q = factory().create({ type: 'mcq', topicId: 't', prompt: 'Q', options: [{ text: 'a', correct: true }, { text: 'b' }] });
    expect(q.accepts({ kind: 'choice', optionIds: ['a'] })).to.equal(true);
    expect(q.accepts({ kind: 'choice', optionIds: ['zzz'] })).to.equal(false);
    expect(q.accepts({ kind: 'numeric', value: 1 })).to.equal(false);
  });

  it('uses the injected id generator', () => {
    const f = QuestionFactory.withDefaults(new SequentialIdGenerator());
    expect(f.create({ type: 'true_false', topicId: 't', prompt: 'Q', answer: true }).id).to.equal('q_1');
  });
});
