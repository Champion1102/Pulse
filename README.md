# Pulse

**A real-time classroom quiz platform.** SESD (System Design) capstone by Team Pulse.

Instructors run live quizzes from a topic-organised question bank (or AI-drafted questions they approve),
students join from their phones with a room code, answers are scored instantly under the chosen scoring
mode, and the instructor gets a report of which topics the class struggled with.

> The rule for AI: **the AI drafts, the instructor approves, the fixed grading code grades.** The AI never scores anything.

---

## Quick start

```bash
npm install
npm run build          # builds the React app into web/dist
npm run dev            # http://localhost:3000
```

While working on the frontend, run the Vite dev server too for instant reloads:

```bash
npm run dev            # terminal 1: API + Socket.IO on :3000
npm run dev:web        # terminal 2: React app on http://localhost:5173 (proxies to :3000)
```

### Login-less flow

| Who | What they do | Identity |
|---|---|---|
| **Instructor** | Opens `/app`, names the classroom, gets a **private workspace link** (`/app#k=...`). Builds questions, goes live. | The secret key in that link (saved in the browser). Only a hash is stored on the server. |
| **Student** | Opens `/play`, types the room code (or scans the QR), picks a nickname. | A player id saved on the phone, so a refresh or Wi-Fi drop rejoins as the same player. |
| **Host screen** | The browser that pressed *Go live* controls the room (`/host/CODE`). | A per-session host key. |

1. Instructor: **Start teaching** → a sample course and quiz are created → **Go live**.
2. The projector shows the room code and a QR code. Students join from their phones.
3. Space or the right arrow key advances. Leaderboard after every question, podium at the end.
4. **Open the topic report** shows what the class struggled with, by topic, unit or course. Export CSV/JSON.

| Command | What it does |
|---|---|
| `npm run dev` / `npm start` | Run the server (serves `web/dist` if built) |
| `npm run dev:web` | Vite dev server for the frontend |
| `npm run build` | Build the frontend |
| `npm test` | Mocha/Chai unit + integration tests |
| `npm run typecheck` | Type-check server and frontend |
| `npm run load-test -- --players 200` | Creates a workspace, starts a session, joins 200 bots, prints latency p50/p95/p99 |
| `npm run load-test -- --code ABC123 --players 60` | **Backup demo**: 60 bots join a room you're hosting |

### Environment variables (all optional)

| Variable | Effect |
|---|---|
| `DATABASE_URL` | Postgres connection string. Without it everything is in memory and resets on restart. |
| `ANTHROPIC_API_KEY` | Enables Claude (`claude-opus-5-5`) for AI drafts. Otherwise a simple offline drafter is used. |
| `PUBLIC_URL` | Address shown on the projector / in the QR code. Locally it falls back to your Wi-Fi IP. |
| `PULSE_AI_PROVIDER=offline` | Force the offline drafter. |
| `PULSE_ANSWER_LOG=./logs/answers.jsonl` | Log every answer (example Observer). |

## Deploying to Render

Vercel is not suitable: Pulse needs one long-running process for Socket.IO connections, round timers and the in-memory room list.

1. Push the repo to GitHub.
2. Create a free Postgres database (Neon or Supabase work well) and copy its connection string.
3. On Render: **New > Blueprint**, pick the repo (it reads `render.yaml`), set `DATABASE_URL` (and optionally `ANTHROPIC_API_KEY`, `PUBLIC_URL`).
4. Keep it at **one instance** (see `docs/scaling.md`). The free plan sleeps after ~15 minutes idle, so open the site a few minutes before class.

## Architecture

Layered + event-driven. Dependencies point inward; only `src/config/container.ts` knows concrete classes.

```
src/
  domain/                    ← pure business logic, no I/O, fully unit-tested
    questions/               Renderable / Gradable, 5 question types, QuestionFactory      (Factory, ISP, LSP)
    bank/                    TopicComponent / TopicGroup / TopicLeaf                        (Composite)
    scoring/                 ScoringStrategy + Accuracy/Speed/Streak, Scorer, Leaderboard   (Strategy, SRP)
    session/                 Round (template) → GradedRound / PollRound, LiveSession,
                             RoomRegistry                                                   (Template Method, Singleton)
    events/                  EventBus + event types                                         (Observer)
    reports/                 ReportBuilder, SessionRecord
  application/               use-cases (services) + ports (repository interfaces)          (DIP)
    observers/               SessionRecorder (analytics), AnswerLogObserver                 (Observer)
  ai/                        QuestionGenerator + Anthropic / Offline / Fallback             (Adapter, DIP)
  adapters/                  CSV & Google Forms importers, CSV & JSON exporters             (Adapter)
  infrastructure/            repositories (in-memory + write-through), DocumentStore (memory / Postgres), ids, Clock
  transport/
    http/                    REST routes (Express)
    socket/                  SocketGateway (inbound) + SocketBroadcaster (outbound Observer)
  config/                    container.ts (composition root), seed.ts
web/                         React + TypeScript + Tailwind v4 frontend (Vite)
  src/pages/                 Home, Play (student), Host (projector), app/* (instructor workspace)
  src/components/            UI kit, answer tiles, homepage demos
  src/lib/                   API client, socket helper, workspace key storage
scripts/load-test.ts         simulated players: load test + backup demo
test/unit, test/integration  Mocha + Chai
docs/                        diagrams, patterns & SOLID map, scaling note, SQL schema
```

**Read next:**
- [`docs/patterns-and-solid.md`](docs/patterns-and-solid.md): every pattern and SOLID principle mapped to a file, plus the live-coding answers
- [`docs/diagrams.md`](docs/diagrams.md): use-case, class, sequence and ER diagrams (Mermaid)
- [`docs/scaling.md`](docs/scaling.md): answer spikes, why the Singleton breaks with 2 servers, sticky sessions + Redis pub/sub
- [`docs/schema.sql`](docs/schema.sql): relational schema

### Real-time protocol (Socket.IO)

| Direction | Event | Payload |
|---|---|---|
| client → server | `player:join` | `{ code, nickname, playerId? }` → ack `{ ok, player, state, score }` |
| | `player:answer` | `{ answer: {kind:'choice', optionIds} \| {kind:'numeric', value} }` |
| | `host:attach` | `{ code, hostKey }` → ack `{ ok, snapshot }` |
| | `host:next` / `host:end-round` / `host:end-session` | — |
| server → room | `round:started` | question (no answers), `endsAt`, `serverNow` |
| | `round:ended` | reveal: correct answer + distribution |
| | `leaderboard` | top 10 |
| | `session:ended` | final top 10 |
| server → host | `lobby:update`, `round:progress` | players, answered count |
| server → one player | `round:result`, `player:score`, `answer:accepted` | own correctness, rank, points, streak |

### REST API (prefix `/api`)

`GET /meta` · `GET /bank/tree` · `POST /bank/courses` · `POST /bank/courses/:id/units` · `POST /bank/units/:id/topics` ·
`GET|POST /questions` · `DELETE /questions/:id` · `POST /questions/import` · `GET /drafts` · `POST /drafts/generate` ·
`POST /drafts/:id/approve|reject` · `GET|POST /quizzes` · `POST /sessions` · `GET /sessions` ·
`GET /sessions/:id/report?groupBy=topic|unit|course` · `GET /sessions/:id/export?format=csv|json`

---

## Team split (from the reference; everyone must know the whole codebase for the viva)

| Owner | Module | Main files |
|---|---|---|
| Member 1 | **Authoring**: question types, bank (Composite), Factory, AI generator, import adapters, workspaces | `domain/questions`, `domain/bank`, `ai/`, `adapters/importers`, `application/QuestionBankService.ts`, `DraftService.ts`, `WorkspaceService.ts`, `web/src/pages/app/{Library,Drafts,Import}.tsx` |
| Member 2 | **Live engine**: rooms (Singleton), rounds (Template Method), events (Observer), Socket.IO | `domain/session`, `domain/events`, `transport/socket`, `application/LiveSessionService.ts`, `web/src/pages/{Host,Play}.tsx` |
| Member 3 | **Scoring & reports**: strategies, leaderboard, topic report, persistence, load test | `domain/scoring`, `domain/reports`, `adapters/exporters`, `infrastructure/persistence`, `application/ReportService.ts`, `scripts/load-test.ts`, `web/src/pages/app/Report*.tsx` |

## Status / what's left

Done: core loop, 5 question types, 3 scoring modes, topic report (topic / unit / course), CSV + Google Forms import,
CSV + JSON export, AI drafts with approval, login-less instructor workspaces, optional Postgres persistence,
React + Tailwind frontend (homepage, student, projector, workspace), Render blueprint, load test, 44 tests.

Suggested next steps (M2):
- [ ] **Cypress e2e tests** (`npm i -D cypress`): host + 2 players happy path. `test/integration/live-flow.test.ts` already covers the flow at socket level.
- [ ] Edit existing questions and re-order quiz questions in the UI.
- [ ] Normalised Postgres repositories using `docs/schema.sql` (today: one JSONB document table, same interfaces).
- [ ] Stretch: `@socket.io/redis-adapter` + sticky sessions demo (see `docs/scaling.md`).
- [ ] Project management: mirror this list as Jira/Linear sprint tickets.
