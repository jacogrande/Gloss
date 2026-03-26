CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT,
  author TEXT,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX sources_user_id_idx ON sources (user_id);

CREATE TABLE seeds (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  source_id TEXT REFERENCES sources(id) ON DELETE SET NULL,
  word TEXT NOT NULL,
  normalized_word TEXT NOT NULL,
  stage TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX seeds_user_id_idx ON seeds (user_id);
CREATE INDEX seeds_source_id_idx ON seeds (source_id);
CREATE INDEX seeds_normalized_word_idx ON seeds (normalized_word);
CREATE INDEX seeds_stage_idx ON seeds (stage);

CREATE TABLE seed_contexts (
  id TEXT PRIMARY KEY,
  seed_id TEXT NOT NULL REFERENCES seeds(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  text TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX seed_contexts_seed_id_idx ON seed_contexts (seed_id);
