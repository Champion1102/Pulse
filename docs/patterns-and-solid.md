# Design patterns & SOLID: where to point in the code

Use this during the viva: every claim links to a file.

## Design patterns

| Pattern | Problem it solves in Pulse | Where |
|---|---|---|
| **Factory** | One "add question" request (from the form, CSV, Google Forms or AI drafts) must become the right concrete class, validated | `src/domain/questions/QuestionFactory.ts` — `register()` + `create()`; default types in `withDefaults()` |
| **Strategy** | Scoring mode is chosen per session and swapped as a whole | `src/domain/scoring/ScoringStrategy.ts` (interface), `strategies.ts` (Accuracy / Speed / Streak), `ScoringRegistry.ts` |
| **Template Method** | Every round runs the same steps; only grading + display differ by question type | `src/domain/session/Round.ts` — `run()` is the template; hooks `gradeAnswers()`, `buildReveal()` in `GradedRound.ts` / `PollRound.ts` |
| **Observer** | "Player joined", "answer submitted", "round ended" must reach screens, analytics and logs without the engine knowing them | `src/domain/events/EventBus.ts` (subject), observers: `transport/socket/SocketBroadcaster.ts`, `application/observers/SessionRecorder.ts`, `AnswerLogObserver.ts` |
| **Composite** | Question bank is a tree course → unit → topic; reports aggregate up the tree | `src/domain/bank/TopicComponent.ts` (`TopicGroup` / `TopicLeaf`, `aggregate()`), used by `domain/reports/ReportBuilder.ts` |
| **Adapter** | External formats and vendors must fit our interfaces | Import: `adapters/importers/CsvQuestionImporter.ts`, `GoogleFormsImporter.ts`. Export: `adapters/exporters/*`. AI: `ai/AnthropicQuestionGenerator.ts` adapts the Claude API to `QuestionGenerator`. Storage: `infrastructure/persistence/PostgresDocumentStore.ts` adapts Postgres to `DocumentStore` |
| **Singleton** | One in-memory list of live rooms per server | `src/domain/session/RoomRegistry.ts` (`getInstance()`); fetched once in `config/container.ts` and injected |

Bonus patterns you can mention: **Registry** (`AdapterRegistry`, `ScoringRegistry`), **Chain/Fallback** (`FallbackQuestionGenerator`), **Composition Root** (`config/container.ts`), **Repository** (`application/ports.ts`).

## SOLID

| Principle | Where it shows up |
|---|---|
| **S** — Single Responsibility | `Round` runs a round, `Scorer` turns grades into points, `Leaderboard` only ranks, `ReportBuilder` only builds reports, `SocketGateway` only translates inbound messages, `SocketBroadcaster` only pushes outbound events. Each has one reason to change. |
| **O** — Open/Closed | New question type → `factory.register('ordering', …)`. New scoring mode → one class implementing `ScoringStrategy` + `registry.register()`. New reaction to an event → one new `EventObserver`. New import format → one `QuestionImporter`. The engine is not edited. |
| **L** — Liskov Substitution | `PollQuestion` has no right answer, so it does **not** implement `Gradable` and has no `grade()` to throw from. Only gradable types can be used where grading is expected (`GradedRound` requires `Renderable & Gradable`). Test: `test/unit/questions.test.ts` "a poll is Renderable but NOT Gradable". |
| **I** — Interface Segregation | `Renderable` (every question) is split from `Gradable` (only questions with a right answer) — `src/domain/questions/types.ts`. |
| **D**: Dependency Inversion | `LiveSession` depends on `ScoringStrategy`, `RoundFactory`, `EventBus`, `Clock`/`Scheduler`; `DraftService` depends on `QuestionGenerator` (not on Anthropic); services depend on repository interfaces in `application/ports.ts`; repositories write through a `DocumentStore` interface, so memory vs Postgres is a one-line choice in `server.ts`. Only `config/container.ts` knows concrete classes. If the AI is down, `FallbackQuestionGenerator` drops to the offline generator and quizzes still run from the bank. |

## "Live-coding" requests and the exact change

| Request | Change |
|---|---|
| New question type (ordering, match-the-pair) | New class implementing `Renderable` (+ `Gradable` if it has a right answer) and one `factory.register(...)` line in `QuestionFactory.withDefaults`. `DefaultRoundFactory` picks `GradedRound` automatically. Add the type to the UI form in `public/author.html` and the input kind in `play.html` if it needs a new input. |
| New scoring mode (negative marking) | `class NegativeMarkingScoring implements ScoringStrategy { points({grade}) { return grade.correct ? 1000 : -250 } }` + `.register(new NegativeMarkingScoring())` in `ScoringRegistry.withDefaults`. The host dropdown picks it up from `/api/meta`. |
| Log every answer to a file | Already there: `AnswerLogObserver` — enable with `PULSE_ANSWER_LOG=./logs/answers.jsonl`. "Play a sound on round end" = a client listener on `round:ended`, or another observer. |
| Import from a new source | One class implementing `QuestionImporter` + add it to the `AdapterRegistry` in `container.ts`. |
| Results by unit instead of topic | Already there: `GET /api/sessions/:id/report?groupBy=unit` — `ReportBuilder` calls `nodesAt('unit')` and `aggregate()` on the Composite. |
