-- Pulse relational schema (PostgreSQL). Mirrors the ER diagram in docs/diagrams.md.
-- The running code uses in-memory repositories behind interfaces (src/application/ports.ts);
-- a Postgres implementation of those same interfaces can use this schema with no service changes.

CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  role        TEXT NOT NULL CHECK (role IN ('instructor', 'student', 'admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Composite topic tree: course -> unit -> topic
CREATE TABLE courses (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id  UUID NOT NULL REFERENCES users(id),
  name      TEXT NOT NULL
);

CREATE TABLE units (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id  UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  position   INT  NOT NULL DEFAULT 0
);

CREATE TABLE topics (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id   UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  position  INT  NOT NULL DEFAULT 0
);

CREATE TABLE questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id        UUID NOT NULL REFERENCES topics(id),
  type            TEXT NOT NULL CHECK (type IN ('mcq', 'multi_select', 'true_false', 'numeric', 'poll')),
  prompt          TEXT NOT NULL,
  time_limit_sec  INT  NOT NULL DEFAULT 20 CHECK (time_limit_sec BETWEEN 5 AND 300),
  tf_answer       BOOLEAN,           -- true_false only
  numeric_answer  DOUBLE PRECISION,  -- numeric only
  tolerance       DOUBLE PRECISION DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ        -- soft delete: old session reports still resolve prompts
);
CREATE INDEX questions_topic_idx ON questions(topic_id);

CREATE TABLE options (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  text         TEXT NOT NULL,
  is_correct   BOOLEAN NOT NULL DEFAULT false,  -- ignored for polls
  position     INT NOT NULL
);

CREATE TABLE question_drafts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id    UUID NOT NULL REFERENCES topics(id),
  spec        JSONB NOT NULL,
  source      TEXT NOT NULL,       -- 'anthropic', 'offline', ...
  status      TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_question_id UUID REFERENCES questions(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quizzes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES users(id),
  title       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quiz_questions (
  quiz_id      UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_id  UUID NOT NULL REFERENCES questions(id),
  position     INT  NOT NULL,
  PRIMARY KEY (quiz_id, question_id)
);

CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id       UUID NOT NULL REFERENCES quizzes(id),
  host_id       UUID REFERENCES users(id),
  room_code     CHAR(6) NOT NULL,
  scoring_mode  TEXT NOT NULL,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at      TIMESTAMPTZ
);
-- a room code is only unique among live sessions
CREATE UNIQUE INDEX sessions_live_code_idx ON sessions(room_code) WHERE ended_at IS NULL;

CREATE TABLE participants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  nickname     TEXT NOT NULL,
  final_score  INT,
  final_rank   INT,
  UNIQUE (session_id, nickname)
);

CREATE TABLE answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id  UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES questions(id),
  payload         JSONB NOT NULL,
  is_correct      BOOLEAN,           -- NULL for polls
  fraction        REAL,
  response_ms     INT NOT NULL,
  points          INT NOT NULL DEFAULT 0,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, participant_id, question_id)  -- one answer per question
);
CREATE INDEX answers_session_question_idx ON answers(session_id, question_id);
