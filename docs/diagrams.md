# Pulse — UML & ER diagrams

All diagrams are [Mermaid](https://mermaid.js.org/). They render directly on GitHub, in VS Code
(Markdown Preview Mermaid Support extension) or at <https://mermaid.live> — paste a block there to export PNG/SVG for slides.

---

## 1. Use-case diagram

Mermaid has no native use-case diagram, so this is drawn as a flowchart (actors on the outside, use cases in the system boundary).

```mermaid
flowchart LR
  Instructor([👩‍🏫 Instructor])
  Student([🎓 Student / Player])
  AI([🤖 AI service])

  subgraph Pulse["Pulse system"]
    UC1((Manage question bank<br/>course → unit → topic))
    UC2((Import questions<br/>CSV / Google Forms))
    UC3((Generate AI drafts))
    UC4((Approve / reject drafts))
    UC5((Build quiz))
    UC6((Start live session<br/>pick scoring mode))
    UC7((Join with room code))
    UC8((Answer question))
    UC9((View leaderboard))
    UC10((View topic report))
    UC11((Export results))
  end

  Instructor --- UC1 & UC2 & UC3 & UC4 & UC5 & UC6 & UC9 & UC10 & UC11
  Student --- UC7 & UC8 & UC9
  UC3 --- AI
  UC3 -. "«include»" .-> UC4
  UC8 -. "«include»" .-> UC7
```

---

## 2. Class diagram

```mermaid
classDiagram
  direction LR

  class Renderable {
    <<interface>>
    +id: string
    +type: QuestionType
    +prompt: string
    +topicId: string
    +timeLimitSec: number
    +render() QuestionView
    +accepts(answer) boolean
  }
  class Gradable {
    <<interface>>
    +grade(answer) GradeResult
    +correctAnswer() AnswerPayload
  }
  class BaseQuestion {
    <<abstract>>
  }
  class ChoiceQuestion {
    <<abstract>>
    +options: Option[]
  }
  class McqQuestion
  class MultiSelectQuestion
  class TrueFalseQuestion
  class NumericQuestion
  class PollQuestion

  Renderable <|.. BaseQuestion
  BaseQuestion <|-- ChoiceQuestion
  BaseQuestion <|-- NumericQuestion
  ChoiceQuestion <|-- McqQuestion
  ChoiceQuestion <|-- MultiSelectQuestion
  ChoiceQuestion <|-- TrueFalseQuestion
  ChoiceQuestion <|-- PollQuestion
  Gradable <|.. McqQuestion
  Gradable <|.. MultiSelectQuestion
  Gradable <|.. TrueFalseQuestion
  Gradable <|.. NumericQuestion
  note for PollQuestion "Renderable only — no grade() (ISP + LSP)"

  class QuestionFactory {
    -creators: Map
    +register(type, creator)
    +create(spec) Question
    +withDefaults(ids)$ QuestionFactory
  }
  QuestionFactory ..> Renderable : creates

  class ScoringStrategy {
    <<interface>>
    +id: string
    +points(input) number
  }
  class AccuracyOnlyScoring
  class SpeedBonusScoring
  class StreakScoring
  ScoringStrategy <|.. AccuracyOnlyScoring
  ScoringStrategy <|.. SpeedBonusScoring
  ScoringStrategy <|.. StreakScoring
  class Scorer {
    +applyRound(answers, participants, limit)
  }
  class Leaderboard {
    +rank(scores, names)$
  }
  Scorer --> ScoringStrategy

  class Round {
    <<abstract>>
    +run() RoundOutcome
    +submit(playerId, answer)
    +close()
    #isGradable()* boolean
    #gradeAnswers(answers)* GradedEntry[]
    #buildReveal(graded)* RevealView
  }
  class GradedRound
  class PollRound
  Round <|-- GradedRound
  Round <|-- PollRound
  class RoundFactory {
    <<interface>>
    +create(q, ctx) Round
  }
  class DefaultRoundFactory
  RoundFactory <|.. DefaultRoundFactory

  class LiveSession {
    +join(nickname)
    +startNextRound()
    +submitAnswer(playerId, answer)
    +end()
    +leaderboard()
  }
  LiveSession --> Round
  LiveSession --> Scorer
  LiveSession --> RoundFactory
  LiveSession --> EventBus

  class RoomStore {
    <<interface>>
  }
  class RoomRegistry {
    <<singleton>>
    -instance$
    +getInstance()$ RoomRegistry
  }
  RoomStore <|.. RoomRegistry
  RoomRegistry o-- LiveSession

  class EventBus {
    <<interface>>
    +publish(type, payload)
    +subscribe(type, handler)
  }
  class EventObserver {
    <<interface>>
    +attach(bus)
  }
  class SocketBroadcaster
  class SessionRecorder
  class AnswerLogObserver
  EventObserver <|.. SocketBroadcaster
  EventObserver <|.. SessionRecorder
  EventObserver <|.. AnswerLogObserver
  EventObserver ..> EventBus : subscribes

  class TopicComponent {
    <<abstract>>
    +aggregate(stats) TopicStats
    +leafIds() string[]
    +path() string
  }
  class TopicGroup {
    +add(child)
  }
  class TopicLeaf
  TopicComponent <|-- TopicGroup
  TopicComponent <|-- TopicLeaf
  TopicGroup o-- TopicComponent : children
  class ReportBuilder {
    +build(record, options) SessionReport
  }
  ReportBuilder --> TopicComponent

  class QuestionGenerator {
    <<interface>>
    +generate(req)
  }
  class AnthropicQuestionGenerator
  class OfflineQuestionGenerator
  class FallbackQuestionGenerator
  QuestionGenerator <|.. AnthropicQuestionGenerator
  QuestionGenerator <|.. OfflineQuestionGenerator
  QuestionGenerator <|.. FallbackQuestionGenerator
  FallbackQuestionGenerator o-- QuestionGenerator

  class QuestionImporter {
    <<interface>>
    +parse(content)
  }
  class CsvQuestionImporter
  class GoogleFormsImporter
  QuestionImporter <|.. CsvQuestionImporter
  QuestionImporter <|.. GoogleFormsImporter
  class ResultsExporter {
    <<interface>>
    +export(report)
  }
  class CsvResultsExporter
  class JsonResultsExporter
  ResultsExporter <|.. CsvResultsExporter
  ResultsExporter <|.. JsonResultsExporter
```

---

## 3. Sequence diagram — one full round

```mermaid
sequenceDiagram
  autonumber
  actor I as Instructor (host.html)
  participant GW as SocketGateway
  participant SVC as LiveSessionService
  participant LS as LiveSession
  participant R as GradedRound (template)
  participant Q as McqQuestion (Gradable)
  participant SC as Scorer + ScoringStrategy
  participant BUS as EventBus
  participant OBS as Observers (SocketBroadcaster, SessionRecorder)
  actor S as Students (play.html)

  I->>GW: host:next
  GW->>SVC: nextRound(code, hostKey)
  SVC->>LS: startNextRound()
  LS->>R: run()
  R->>BUS: publish round.started (QuestionView, no answer)
  BUS->>OBS: notify
  OBS-->>S: round:started (question + timer)
  loop until timer fires OR everyone answered
    S->>GW: player:answer
    GW->>SVC: answer(code, playerId, payload)
    SVC->>LS: submitAnswer()
    LS->>R: submit() — validates shape, records time
    R->>BUS: publish answer.submitted
    OBS-->>I: round:progress (n / total)
  end
  R->>R: collectAnswers()
  R->>Q: grade(answer) for each
  R->>R: buildReveal()
  R->>BUS: publish round.ended (reveal + per-player result)
  OBS-->>S: round:ended / round:result
  R-->>LS: RoundOutcome
  LS->>SC: applyRound(graded answers)
  SC-->>LS: totals + streaks
  LS->>BUS: publish leaderboard.updated
  BUS->>OBS: notify
  OBS-->>I: leaderboard (top 10)
  OBS-->>S: player:score (own rank & points)
  OBS->>OBS: SessionRecorder saves SessionRecord (for reports)
```

---

## 4. ER diagram

Matches `docs/schema.sql`.

```mermaid
erDiagram
  USER ||--o{ COURSE : owns
  USER ||--o{ QUIZ : creates
  COURSE ||--|{ UNIT : contains
  UNIT ||--|{ TOPIC : contains
  TOPIC ||--o{ QUESTION : groups
  QUESTION ||--o{ OPTION : has
  QUIZ ||--|{ QUIZ_QUESTION : orders
  QUESTION ||--o{ QUIZ_QUESTION : "used in"
  QUIZ ||--o{ SESSION : "run as"
  USER ||--o{ SESSION : hosts
  SESSION ||--o{ PARTICIPANT : has
  SESSION ||--o{ ANSWER : collects
  PARTICIPANT ||--o{ ANSWER : submits
  QUESTION ||--o{ ANSWER : "answered by"
  TOPIC ||--o{ QUESTION_DRAFT : "drafted for"

  USER {
    uuid id PK
    string name
    string email UK
    string role
  }
  COURSE {
    uuid id PK
    uuid owner_id FK
    string name
  }
  UNIT {
    uuid id PK
    uuid course_id FK
    string name
    int position
  }
  TOPIC {
    uuid id PK
    uuid unit_id FK
    string name
    int position
  }
  QUESTION {
    uuid id PK
    uuid topic_id FK
    string type
    text prompt
    int time_limit_sec
    bool tf_answer
    float numeric_answer
    float tolerance
  }
  OPTION {
    uuid id PK
    uuid question_id FK
    string text
    bool is_correct
    int position
  }
  QUIZ {
    uuid id PK
    uuid owner_id FK
    string title
  }
  QUIZ_QUESTION {
    uuid quiz_id PK
    uuid question_id PK
    int position
  }
  SESSION {
    uuid id PK
    uuid quiz_id FK
    uuid host_id FK
    string room_code
    string scoring_mode
    timestamp started_at
    timestamp ended_at
  }
  PARTICIPANT {
    uuid id PK
    uuid session_id FK
    string nickname
    int final_score
    int final_rank
  }
  ANSWER {
    uuid id PK
    uuid session_id FK
    uuid participant_id FK
    uuid question_id FK
    json payload
    bool is_correct
    float fraction
    int response_ms
    int points
  }
  QUESTION_DRAFT {
    uuid id PK
    uuid topic_id FK
    json spec
    string source
    string status
  }
```
