import { Quiz, QuestionDraft, Workspace } from '../application/ports';
import { TopicComponent, TopicGroup, TopicLeaf, TopicNodeJSON } from '../domain/bank/TopicComponent';
import { QuestionSpec } from '../domain/questions/types';
import { SessionRecord } from '../domain/reports/SessionRecord';
import type { Container } from './container';

function buildTree(json: TopicNodeJSON): TopicComponent {
  if (json.level === 'topic') return new TopicLeaf(json.id, json.name);
  const group = new TopicGroup(json.id, json.name, json.level);
  for (const child of json.children) group.add(buildTree(child));
  return group;
}

/** Rebuilds the in-memory working set from the DocumentStore on boot. */
export async function hydrate(c: Container): Promise<Record<string, number>> {
  const docs = await c.store.loadAll();
  const counts: Record<string, number> = {};
  const order = ['workspace', 'course', 'question', 'quiz', 'draft', 'session'];
  docs.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  for (const doc of docs) {
    try {
      switch (doc.kind) {
        case 'workspace':
          c.repos.workspaces.save(doc.data as Workspace, false);
          break;
        case 'course':
          c.repos.topics.saveRoot(doc.workspaceId, buildTree(doc.data as TopicNodeJSON), false);
          break;
        case 'question':
          c.repos.questions.save(doc.workspaceId, c.factory.create(doc.data as QuestionSpec), false);
          break;
        case 'quiz':
          c.repos.quizzes.save(doc.data as Quiz, false);
          break;
        case 'draft':
          c.repos.drafts.save(doc.data as QuestionDraft, false);
          break;
        case 'session':
          c.repos.records.save(doc.data as SessionRecord, false);
          break;
      }
      counts[doc.kind] = (counts[doc.kind] ?? 0) + 1;
    } catch (err) {
      console.error(`[hydrate] skipped ${doc.kind} ${doc.id}: ${(err as Error).message}`);
    }
  }
  return counts;
}
