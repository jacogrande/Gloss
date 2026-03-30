CREATE TABLE product_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  actor_tag text NOT NULL,
  user_id text REFERENCES "user" (id) ON DELETE SET NULL,
  session_id text,
  seed_id text REFERENCES seeds (id) ON DELETE SET NULL,
  review_session_id text REFERENCES review_sessions (id) ON DELETE SET NULL,
  schema_version text NOT NULL,
  payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_events_type_idx ON product_events (type);
CREATE INDEX product_events_occurred_at_idx ON product_events (occurred_at);
CREATE INDEX product_events_user_id_idx ON product_events (user_id);
CREATE INDEX product_events_seed_id_idx ON product_events (seed_id);
CREATE INDEX product_events_review_session_id_idx
  ON product_events (review_session_id);
