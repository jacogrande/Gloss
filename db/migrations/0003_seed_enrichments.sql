CREATE TABLE seed_enrichments (
  id TEXT PRIMARY KEY,
  seed_id TEXT NOT NULL REFERENCES seeds(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  payload JSONB,
  schema_version TEXT NOT NULL,
  prompt_template_version TEXT NOT NULL,
  model TEXT,
  provider TEXT,
  error_code TEXT,
  guardrail_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX seed_enrichments_seed_id_uidx ON seed_enrichments (seed_id);
CREATE INDEX seed_enrichments_user_id_idx ON seed_enrichments (user_id);
CREATE INDEX seed_enrichments_status_idx ON seed_enrichments (status);

CREATE TABLE seed_enrichment_traces (
  id TEXT PRIMARY KEY,
  seed_enrichment_id TEXT NOT NULL REFERENCES seed_enrichments(id) ON DELETE CASCADE,
  seed_id TEXT NOT NULL REFERENCES seeds(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  prompt_template_version TEXT NOT NULL,
  model TEXT,
  provider TEXT,
  lexical_evidence JSONB NOT NULL,
  validation_result JSONB NOT NULL DEFAULT '{"accepted": false, "issues": []}'::jsonb,
  output_redacted JSONB NOT NULL DEFAULT 'null'::jsonb,
  guardrail_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX seed_enrichment_traces_seed_enrichment_id_idx
  ON seed_enrichment_traces (seed_enrichment_id);
CREATE INDEX seed_enrichment_traces_seed_id_idx ON seed_enrichment_traces (seed_id);
CREATE INDEX seed_enrichment_traces_user_id_idx ON seed_enrichment_traces (user_id);
