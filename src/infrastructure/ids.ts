import { randomUUID } from 'crypto';

/** Abstraction over id creation so tests can use predictable ids. */
export interface IdGenerator {
  next(prefix: string): string;
}

export class UuidGenerator implements IdGenerator {
  next(prefix: string): string {
    return `${prefix}_${randomUUID().slice(0, 8)}`;
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private counter = 0;
  next(prefix: string): string {
    this.counter += 1;
    return `${prefix}_${this.counter}`;
  }
}
