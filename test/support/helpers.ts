import { InMemoryEventBus, PulseEventName, PulseEvents } from '../../src/domain/events/EventBus';
import { QuestionFactory } from '../../src/domain/questions/QuestionFactory';
import { SequentialIdGenerator } from '../../src/infrastructure/ids';

export const factory = () => QuestionFactory.withDefaults(new SequentialIdGenerator());

export const mcq = (topicId = 't1', timeLimitSec = 20) =>
  factory().create({
    type: 'mcq',
    topicId,
    prompt: '2 + 2 = ?',
    timeLimitSec,
    options: [{ text: '3' }, { text: '4', correct: true }, { text: '5' }],
  });

export const poll = (topicId = 't1') =>
  factory().create({ type: 'poll', topicId, prompt: 'Favourite colour?', options: [{ text: 'Red' }, { text: 'Blue' }] });

/** An event bus that also records everything published, for assertions. */
export class RecordingBus extends InMemoryEventBus {
  readonly log: Array<{ type: PulseEventName; payload: unknown }> = [];

  override publish<K extends PulseEventName>(type: K, payload: PulseEvents[K]): void {
    this.log.push({ type, payload });
    super.publish(type, payload);
  }

  types(): PulseEventName[] {
    return this.log.map((e) => e.type);
  }

  last<K extends PulseEventName>(type: K): PulseEvents[K] {
    const hit = [...this.log].reverse().find((e) => e.type === type);
    if (!hit) throw new Error(`No ${type} event`);
    return hit.payload as PulseEvents[K];
  }
}
