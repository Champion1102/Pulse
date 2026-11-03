/** Dependency Inversion for time: the engine never calls Date.now()/setTimeout directly. */
export interface Clock {
  now(): number;
}

export type TimerHandle = { cancel(): void };

export interface Scheduler {
  schedule(ms: number, fn: () => void): TimerHandle;
}

export class SystemClock implements Clock, Scheduler {
  now(): number {
    return Date.now();
  }
  schedule(ms: number, fn: () => void): TimerHandle {
    const t = setTimeout(fn, ms);
    return { cancel: () => clearTimeout(t) };
  }
}

/** Deterministic clock for tests: time only moves when advance() is called. */
export class ManualClock implements Clock, Scheduler {
  private current = 0;
  private timers: Array<{ at: number; fn: () => void; cancelled: boolean }> = [];

  now(): number {
    return this.current;
  }

  schedule(ms: number, fn: () => void): TimerHandle {
    const timer = { at: this.current + ms, fn, cancelled: false };
    this.timers.push(timer);
    return { cancel: () => (timer.cancelled = true) };
  }

  advance(ms: number): void {
    const target = this.current + ms;
    for (;;) {
      const due = this.timers
        .filter((t) => !t.cancelled && t.at <= target)
        .sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      this.current = due.at;
      due.cancelled = true;
      due.fn();
    }
    this.current = target;
    this.timers = this.timers.filter((t) => !t.cancelled);
  }
}
