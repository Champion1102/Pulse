/**
 * Composition root: the ONLY place that knows concrete classes.
 * Everything else receives its dependencies through constructors (Dependency Inversion),
 * which is also what lets tests swap in a ManualClock, fake AI, etc.
 */
import Anthropic from '@anthropic-ai/sdk';
import { AdapterRegistry } from '../adapters/AdapterRegistry';
import { CsvResultsExporter } from '../adapters/exporters/CsvResultsExporter';
import { JsonResultsExporter } from '../adapters/exporters/JsonResultsExporter';
import { ResultsExporter } from '../adapters/exporters/ResultsExporter';
import { CsvQuestionImporter } from '../adapters/importers/CsvQuestionImporter';
import { GoogleFormsImporter } from '../adapters/importers/GoogleFormsImporter';
import { QuestionImporter } from '../adapters/importers/QuestionImporter';
import { AnthropicQuestionGenerator } from '../ai/AnthropicQuestionGenerator';
import { FallbackQuestionGenerator } from '../ai/FallbackQuestionGenerator';
import { OfflineQuestionGenerator } from '../ai/OfflineQuestionGenerator';
import { QuestionGenerator } from '../ai/QuestionGenerator';
import { DraftService } from '../application/DraftService';
import { LiveSessionService } from '../application/LiveSessionService';
import { AnswerLogObserver } from '../application/observers/AnswerLogObserver';
import { SessionRecorder } from '../application/observers/SessionRecorder';
import { QuestionBankService } from '../application/QuestionBankService';
import { QuizService } from '../application/QuizService';
import { WorkspaceService } from '../application/WorkspaceService';
import { ReportService } from '../application/ReportService';
import { EventBus, InMemoryEventBus } from '../domain/events/EventBus';
import { QuestionFactory } from '../domain/questions/QuestionFactory';
import { ReportBuilder } from '../domain/reports/ReportBuilder';
import { ScoringRegistry } from '../domain/scoring/ScoringRegistry';
import { RandomRoomCodeGenerator, RoomCodeGenerator } from '../domain/session/RoomCodeGenerator';
import { RoomRegistry, RoomStore } from '../domain/session/RoomRegistry';
import { DefaultRoundFactory } from '../domain/session/RoundFactory';
import { IdGenerator, UuidGenerator } from '../infrastructure/ids';
import { DocumentStore, NullDocumentStore } from '../infrastructure/persistence/DocumentStore';
import {
  InMemoryDraftRepository,
  InMemoryWorkspaceRepository,
  InMemoryQuestionRepository,
  InMemoryQuizRepository,
  InMemorySessionRecordRepository,
  InMemoryTopicRepository,
} from '../infrastructure/repositories/InMemoryRepositories';
import { Clock, Scheduler, SystemClock } from '../infrastructure/time/Clock';

export interface ContainerOverrides {
  clock?: Clock & Scheduler;
  ids?: IdGenerator;
  rooms?: RoomStore;
  generator?: QuestionGenerator;
  codes?: RoomCodeGenerator;
  answerLogPath?: string;
  store?: DocumentStore;
}

export type Container = ReturnType<typeof createContainer>;

export function createContainer(o: ContainerOverrides = {}) {
  const clock = o.clock ?? new SystemClock();
  const ids = o.ids ?? new UuidGenerator();
  const bus: EventBus = new InMemoryEventBus();
  const rooms = o.rooms ?? RoomRegistry.getInstance();

  const store = o.store ?? new NullDocumentStore();
  const repos = {
    workspaces: new InMemoryWorkspaceRepository(store),
    topics: new InMemoryTopicRepository(store),
    questions: new InMemoryQuestionRepository(store),
    quizzes: new InMemoryQuizRepository(store),
    drafts: new InMemoryDraftRepository(store),
    records: new InMemorySessionRecordRepository(store),
  };

  const factory = QuestionFactory.withDefaults(ids);
  const scoring = ScoringRegistry.withDefaults();
  const importers = new AdapterRegistry<QuestionImporter>([new CsvQuestionImporter(), new GoogleFormsImporter()]);
  const exporters = new AdapterRegistry<ResultsExporter>([new CsvResultsExporter(), new JsonResultsExporter()]);

  const workspaces = new WorkspaceService(repos.workspaces, ids, clock);
  const bank = new QuestionBankService(repos.topics, repos.questions, factory, importers, ids);
  const quizzes = new QuizService(repos.quizzes, repos.questions, ids, clock);
  const drafts = new DraftService(o.generator ?? defaultGenerator(), repos.drafts, bank, ids, clock);
  const live = new LiveSessionService({
    rooms,
    quizzes,
    questions: repos.questions,
    scoring,
    bus,
    clock,
    scheduler: clock,
    roundFactory: new DefaultRoundFactory(),
    codes: o.codes ?? new RandomRoomCodeGenerator(),
    ids,
  });
  // Prompts are looked up by id for reports; deleted questions keep their last known prompt.
  const promptCache = new Map<string, string>();
  const origSave = repos.questions.save.bind(repos.questions);
  repos.questions.save = (ws, q, persist = true) => {
    promptCache.set(q.id, q.prompt);
    origSave(ws, q, persist);
  };
  const reportBuilder = new ReportBuilder(
    (ws) => repos.topics.roots(ws),
    (id) => promptCache.get(id),
    () => clock.now(),
  );
  const reports = new ReportService(repos.records, reportBuilder, exporters);

  // Observers
  new SessionRecorder(rooms, repos.records, clock).attach(bus);
  const answerLog = o.answerLogPath ?? process.env.PULSE_ANSWER_LOG;
  if (answerLog) new AnswerLogObserver(answerLog).attach(bus);

  return { clock, ids, bus, rooms, store, repos, factory, scoring, exporters, workspaces, bank, quizzes, drafts, live, reports };
}

/**
 * PULSE_AI_PROVIDER=offline forces the offline generator.
 * Otherwise Claude is used when credentials are configured, with the offline
 * generator as fallback so quizzes never depend on the AI being up.
 */
function defaultGenerator(): QuestionGenerator {
  const offline = new OfflineQuestionGenerator();
  const hasCreds = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  if (process.env.PULSE_AI_PROVIDER === 'offline' || !hasCreds) return offline;
  return new FallbackQuestionGenerator(new AnthropicQuestionGenerator(new Anthropic()), offline);
}
