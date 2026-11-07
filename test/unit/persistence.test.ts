import { expect } from 'chai';
import { createContainer } from '../../src/config/container';
import { hydrate } from '../../src/config/hydrate';
import { seedSampleContent } from '../../src/config/seed';
import { RoomRegistry } from '../../src/domain/session';
import { DocKind, DocumentStore, StoredDoc } from '../../src/infrastructure/persistence/DocumentStore';
import { ManualClock } from '../../src/infrastructure/time/Clock';
import { OfflineQuestionGenerator } from '../../src/ai/OfflineQuestionGenerator';

/** A store that keeps docs in a Map, standing in for Postgres. */
class FakeStore implements DocumentStore {
  readonly name = 'fake';
  readonly docs = new Map<string, StoredDoc>();
  async loadAll() {
    return [...this.docs.values()].map((d) => JSON.parse(JSON.stringify(d)));
  }
  put(doc: StoredDoc) {
    this.docs.set(`${doc.kind}:${doc.id}`, doc);
  }
  remove(kind: DocKind, id: string) {
    this.docs.delete(`${kind}:${id}`);
  }
  async flush() {}
}

const fresh = (store: DocumentStore) => {
  RoomRegistry.resetForTests();
  return createContainer({ store, clock: new ManualClock(), generator: new OfflineQuestionGenerator(), rooms: RoomRegistry.getInstance() });
};

describe('Workspaces + persistence', () => {
  it('a workspace key unlocks only its own content', () => {
    const c = fresh(new FakeStore());
    const a = c.workspaces.create('A');
    const b = c.workspaces.create('B');
    seedSampleContent(c, a.id);
    expect(c.workspaces.authenticate(a.key).id).to.equal(a.id);
    expect(() => c.workspaces.authenticate('x'.repeat(24))).to.throw(/Unknown/);
    expect(c.quizzes.list(a.id)).to.have.length(1);
    expect(c.quizzes.list(b.id)).to.have.length(0);
    expect(c.bank.listQuestions(b.id)).to.have.length(0);
    const qid = c.bank.listQuestions(a.id)[0].id!;
    expect(() => c.bank.deleteQuestion(b.id, qid)).to.throw(/not found/);
  });

  it('stores only a hash of the key', () => {
    const store = new FakeStore();
    const c = fresh(store);
    const a = c.workspaces.create('A');
    expect(JSON.stringify([...store.docs.values()])).not.to.contain(a.key);
  });

  it('everything survives a restart (write-through + hydrate)', async () => {
    const store = new FakeStore();
    const before = fresh(store);
    const a = before.workspaces.create('A');
    seedSampleContent(before, a.id);
    const quizId = before.quizzes.list(a.id)[0].id;
    const extraTopic = before.bank.tree(a.id)[0].children[0].children[0].id;
    before.bank.createTopic(a.id, before.bank.tree(a.id)[0].children[0].id, 'Added later');

    const after = fresh(store);
    const counts = await hydrate(after);
    expect(counts).to.include({ workspace: 1, course: 1, question: 6, quiz: 1 });
    expect(after.workspaces.authenticate(a.key).id).to.equal(a.id);
    expect(after.quizzes.get(a.id, quizId).questionIds).to.have.length(6);
    expect(after.bank.listQuestions(a.id, extraTopic)).to.have.length(2);
    expect(JSON.stringify(after.bank.tree(a.id))).to.contain('Added later');
  });
});
