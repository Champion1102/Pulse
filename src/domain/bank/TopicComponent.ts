/**
 * Composite pattern: the question bank is a tree  course -> unit -> topic.
 * Leaves (topics) own questions; groups (courses, units) aggregate their children.
 * The report walks this tree, so "results by unit instead of topic" is just
 * one level up — no new data needed.
 */

export type TopicLevel = 'course' | 'unit' | 'topic';

export interface TopicStats {
  answered: number;
  correct: number;
}

export interface TopicNodeJSON {
  id: string;
  name: string;
  level: TopicLevel;
  children: TopicNodeJSON[];
}

export const emptyStats = (): TopicStats => ({ answered: 0, correct: 0 });
export const accuracy = (s: TopicStats): number | null => (s.answered === 0 ? null : s.correct / s.answered);

export abstract class TopicComponent {
  parent: TopicGroup | null = null;

  protected constructor(
    readonly id: string,
    readonly name: string,
    readonly level: TopicLevel,
  ) {}

  abstract children(): readonly TopicComponent[];

  /** Ids of every leaf topic in this subtree. */
  abstract leafIds(): string[];

  /** Total stats for this subtree, given per-leaf stats. */
  abstract aggregate(statsByTopic: ReadonlyMap<string, TopicStats>): TopicStats;

  find(id: string): TopicComponent | undefined {
    if (this.id === id) return this;
    for (const child of this.children()) {
      const hit = child.find(id);
      if (hit) return hit;
    }
    return undefined;
  }

  /** Walk upwards until we reach a node at the given level. */
  ancestorAt(level: TopicLevel): TopicComponent | undefined {
    let node: TopicComponent | null = this;
    while (node && node.level !== level) node = node.parent;
    return node ?? undefined;
  }

  /** e.g. "SESD / Design Patterns / Strategy" */
  path(): string {
    const parts: string[] = [];
    let node: TopicComponent | null = this;
    while (node) {
      parts.unshift(node.name);
      node = node.parent;
    }
    return parts.join(' / ');
  }

  /** Every node at a given level within this subtree. */
  nodesAt(level: TopicLevel): TopicComponent[] {
    const out: TopicComponent[] = this.level === level ? [this] : [];
    for (const c of this.children()) out.push(...c.nodesAt(level));
    return out;
  }

  toJSON(): TopicNodeJSON {
    return { id: this.id, name: this.name, level: this.level, children: this.children().map((c) => c.toJSON()) };
  }
}

/** Leaf: a single topic. */
export class TopicLeaf extends TopicComponent {
  constructor(id: string, name: string) {
    super(id, name, 'topic');
  }

  children(): readonly TopicComponent[] {
    return [];
  }

  leafIds(): string[] {
    return [this.id];
  }

  aggregate(statsByTopic: ReadonlyMap<string, TopicStats>): TopicStats {
    const s = statsByTopic.get(this.id);
    return s ? { ...s } : emptyStats();
  }
}

/** Composite: a course or a unit. */
export class TopicGroup extends TopicComponent {
  private readonly kids: TopicComponent[] = [];

  constructor(id: string, name: string, level: 'course' | 'unit') {
    super(id, name, level);
  }

  add(child: TopicComponent): this {
    const allowed: Record<'course' | 'unit', TopicLevel> = { course: 'unit', unit: 'topic' };
    if (child.level !== allowed[this.level as 'course' | 'unit']) {
      throw new Error(`A ${this.level} can only contain ${allowed[this.level as 'course' | 'unit']}s`);
    }
    child.parent = this;
    this.kids.push(child);
    return this;
  }

  children(): readonly TopicComponent[] {
    return this.kids;
  }

  leafIds(): string[] {
    return this.kids.flatMap((k) => k.leafIds());
  }

  aggregate(statsByTopic: ReadonlyMap<string, TopicStats>): TopicStats {
    return this.kids.reduce<TopicStats>((acc, k) => {
      const s = k.aggregate(statsByTopic);
      return { answered: acc.answered + s.answered, correct: acc.correct + s.correct };
    }, emptyStats());
  }
}
