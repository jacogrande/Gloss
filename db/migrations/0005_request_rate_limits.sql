CREATE TABLE request_rate_limits (
  id TEXT PRIMARY KEY,
  actor_key TEXT NOT NULL,
  policy_key TEXT NOT NULL,
  request_count INTEGER NOT NULL,
  window_seconds INTEGER NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX request_rate_limits_actor_policy_window_uidx
  ON request_rate_limits (actor_key, policy_key, window_started_at);

CREATE INDEX request_rate_limits_actor_policy_idx
  ON request_rate_limits (actor_key, policy_key);

CREATE INDEX request_rate_limits_updated_at_idx
  ON request_rate_limits (updated_at);
