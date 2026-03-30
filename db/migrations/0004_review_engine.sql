CREATE TABLE review_states (
  id TEXT PRIMARY KEY,
  seed_id TEXT NOT NULL REFERENCES seeds(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  recognition_score INTEGER NOT NULL,
  distinction_score INTEGER NOT NULL,
  usage_score INTEGER NOT NULL,
  recognition_due_at TIMESTAMPTZ NOT NULL,
  distinction_due_at TIMESTAMPTZ NOT NULL,
  usage_due_at TIMESTAMPTZ NOT NULL,
  last_reviewed_at TIMESTAMPTZ,
  last_session_id TEXT,
  scheduler_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX review_states_seed_user_uidx
  ON review_states (seed_id, user_id);
CREATE INDEX review_states_user_id_idx ON review_states (user_id);
CREATE INDEX review_states_due_idx
  ON review_states (recognition_due_at, distinction_due_at, usage_due_at);

CREATE TABLE review_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  card_count INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX review_sessions_user_id_idx ON review_sessions (user_id);
CREATE INDEX review_sessions_status_idx ON review_sessions (status);
CREATE UNIQUE INDEX review_sessions_active_user_uidx
  ON review_sessions (user_id)
  WHERE status = 'active';

CREATE TABLE review_cards (
  id TEXT PRIMARY KEY,
  review_session_id TEXT NOT NULL REFERENCES review_sessions(id) ON DELETE CASCADE,
  seed_id TEXT NOT NULL REFERENCES seeds(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  exercise_type TEXT NOT NULL,
  dimension TEXT NOT NULL,
  status TEXT NOT NULL,
  prompt_payload JSONB NOT NULL,
  answer_key JSONB NOT NULL,
  generation_source TEXT NOT NULL,
  prompt_template_version TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  model TEXT,
  provider TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX review_cards_session_position_uidx
  ON review_cards (review_session_id, position);
CREATE INDEX review_cards_session_id_idx ON review_cards (review_session_id);
CREATE INDEX review_cards_seed_id_idx ON review_cards (seed_id);
CREATE INDEX review_cards_user_id_idx ON review_cards (user_id);
CREATE INDEX review_cards_status_idx ON review_cards (status);

CREATE TABLE review_events (
  id TEXT PRIMARY KEY,
  review_session_id TEXT NOT NULL REFERENCES review_sessions(id) ON DELETE CASCADE,
  review_card_id TEXT NOT NULL REFERENCES review_cards(id) ON DELETE CASCADE,
  seed_id TEXT NOT NULL REFERENCES seeds(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  exercise_type TEXT NOT NULL,
  dimension TEXT NOT NULL,
  outcome TEXT NOT NULL,
  response_payload JSONB NOT NULL,
  response_latency_ms INTEGER,
  state_delta JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX review_events_session_id_idx ON review_events (review_session_id);
CREATE INDEX review_events_card_id_idx ON review_events (review_card_id);
CREATE INDEX review_events_seed_id_idx ON review_events (seed_id);
CREATE INDEX review_events_user_id_idx ON review_events (user_id);
CREATE UNIQUE INDEX review_events_card_uidx ON review_events (review_card_id);

CREATE TABLE review_card_traces (
  id TEXT PRIMARY KEY,
  review_card_id TEXT NOT NULL REFERENCES review_cards(id) ON DELETE CASCADE,
  review_session_id TEXT NOT NULL REFERENCES review_sessions(id) ON DELETE CASCADE,
  seed_id TEXT NOT NULL REFERENCES seeds(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  generation_source TEXT NOT NULL,
  prompt_template_version TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  model TEXT,
  provider TEXT,
  input_redacted JSONB,
  output_redacted JSONB NOT NULL,
  validation_result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX review_card_traces_card_uidx
  ON review_card_traces (review_card_id);
CREATE INDEX review_card_traces_session_id_idx
  ON review_card_traces (review_session_id);
CREATE INDEX review_card_traces_seed_id_idx ON review_card_traces (seed_id);
CREATE INDEX review_card_traces_user_id_idx ON review_card_traces (user_id);
