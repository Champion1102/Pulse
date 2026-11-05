import { appendFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { EventBus, EventObserver } from '../../domain/events/EventBus';

/**
 * Example of "add a reaction to an event = add one Observer":
 * appends every submitted answer and round result to a JSON-lines file.
 * Enabled with PULSE_ANSWER_LOG=./logs/answers.jsonl
 */
export class AnswerLogObserver implements EventObserver {
  private ready: Promise<unknown>;

  constructor(private readonly filePath: string) {
    this.ready = mkdir(dirname(filePath), { recursive: true });
  }

  attach(bus: EventBus): void {
    bus.subscribe('answer.submitted', (e) => this.write({ event: 'answer.submitted', at: Date.now(), ...e }));
    bus.subscribe('round.ended', (e) =>
      this.write({ event: 'round.ended', at: Date.now(), roomCode: e.roomCode, questionId: e.questionId, reveal: e.reveal }),
    );
  }

  private write(entry: object): void {
    this.ready = this.ready
      .then(() => appendFile(this.filePath, JSON.stringify(entry) + '\n'))
      .catch((err) => console.error('[answer-log] write failed', err));
  }
}
