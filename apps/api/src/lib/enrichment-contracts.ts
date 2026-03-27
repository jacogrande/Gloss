import {
  lexicalEvidenceSnapshotSchema,
  seedEnrichmentPayloadSchema,
  seedEnrichmentPayloadSchemaVersion,
  seedEnrichmentSchema,
} from "@gloss/shared/contracts";
import type {
  LexicalEvidenceSnapshot,
  SeedDetail,
  SeedEnrichment,
  SeedEnrichmentGuardrailFlag,
  SeedEnrichmentPayload,
} from "@gloss/shared/types";

import type { SeedEnrichmentRow } from "../db/schema";
import { normalizeWord } from "./seed-contracts";

export const seedEnrichmentPromptTemplateVersion = "seed-enrichment.v1" as const;

type EnrichmentPromptBody = {
  allowed_output_schema_version: typeof seedEnrichmentPayloadSchemaVersion;
  lexical_evidence: LexicalEvidenceSnapshot;
  omission_rules: {
    contrastiveWord: string;
    morphologyNote: string;
    registerNote: string;
    relatedWord: string;
  };
  seed_capture_context: {
    sentence: string | null;
    source:
      | {
          kind: LexicalEvidenceSnapshot["sourceSummary"]["kind"];
          title: LexicalEvidenceSnapshot["sourceSummary"]["title"];
        }
      | null;
    word: string;
  };
  task: {
    contrastiveWord: string;
    gloss: string;
    morphologyNote: string;
    registerNote: string;
    relatedWord: string;
  };
};

type DictionaryEvidence = {
  exampleSentences: string[];
  glosses: string[];
  lemma: string;
  morphologyHints: string[];
  partOfSpeech: string | null;
  registerLabels: string[];
};

type RelationEvidence = {
  contrastCandidates: string[];
  relatedCandidates: string[];
};

const normalizeNote = (value: string): string =>
  value.trim().replace(/\s+/g, " ");

const truncateForPreview = (value: string, limit: number): string =>
  value.length <= limit ? value : `${value.slice(0, limit - 1).trimEnd()}…`;

const uniqueNormalizedWords = (values: readonly string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizeWord(value);

    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(value.trim());
  }

  return result;
};

export const buildLexicalEvidenceSnapshot = (input: {
  dictionary: DictionaryEvidence;
  relations: RelationEvidence;
  seed: Pick<SeedDetail, "primarySentence" | "source" | "word">;
}): LexicalEvidenceSnapshot =>
  lexicalEvidenceSnapshotSchema.parse({
    capturedSentencePreview: input.seed.primarySentence
      ? truncateForPreview(input.seed.primarySentence, 180)
      : null,
    contrastCandidates: uniqueNormalizedWords(input.relations.contrastCandidates).slice(
      0,
      6,
    ),
    dictionaryGlosses: input.dictionary.glosses.map(normalizeNote).slice(0, 6),
    exampleSentences: input.dictionary.exampleSentences
      .map((value) => truncateForPreview(normalizeNote(value), 180))
      .slice(0, 4),
    lemma: normalizeNote(input.dictionary.lemma),
    morphologyHints: input.dictionary.morphologyHints
      .map(normalizeNote)
      .slice(0, 4),
    partOfSpeech: input.dictionary.partOfSpeech
      ? normalizeNote(input.dictionary.partOfSpeech)
      : null,
    registerLabels: input.dictionary.registerLabels.map(normalizeNote).slice(0, 4),
    relatedCandidates: uniqueNormalizedWords(input.relations.relatedCandidates).slice(
      0,
      6,
    ),
    sourceSummary: {
      kind: input.seed.source?.kind ?? null,
      title: input.seed.source?.title ?? null,
    },
  });

const omitRelation = (
  payload: SeedEnrichmentPayload,
  relationKey: "contrastiveWord" | "relatedWord",
): SeedEnrichmentPayload => {
  const nextPayload = { ...payload };

  delete nextPayload[relationKey];

  return nextPayload;
};

export const applyEnrichmentGuardrails = (input: {
  payload: SeedEnrichmentPayload;
  seedWord: string;
  snapshot: LexicalEvidenceSnapshot;
}): {
  guardrailFlags: SeedEnrichmentGuardrailFlag[];
  payload: SeedEnrichmentPayload;
} => {
  const guardrailFlags: SeedEnrichmentGuardrailFlag[] = [];
  let nextPayload: SeedEnrichmentPayload = seedEnrichmentPayloadSchema.parse(
    input.payload,
  );
  const normalizedSeed = normalizeWord(input.seedWord);

  if (input.snapshot.registerLabels.length === 0) {
    guardrailFlags.push("register_omitted_weak_evidence");

    if (nextPayload.registerNote) {
      const { registerNote: _registerNote, ...rest } = nextPayload;

      nextPayload = rest;
    }
  }

  if (input.snapshot.morphologyHints.length === 0) {
    guardrailFlags.push("morphology_omitted_weak_evidence");

    if (nextPayload.morphologyNote) {
      const { morphologyNote: _morphologyNote, ...rest } = nextPayload;

      nextPayload = rest;
    }
  }

  if (input.snapshot.relatedCandidates.length === 0) {
    guardrailFlags.push("related_omitted_weak_evidence");
    nextPayload = omitRelation(nextPayload, "relatedWord");
  }

  if (input.snapshot.contrastCandidates.length === 0) {
    guardrailFlags.push("contrast_omitted_weak_evidence");
    nextPayload = omitRelation(nextPayload, "contrastiveWord");
  }

  if (
    nextPayload.relatedWord &&
    normalizeWord(nextPayload.relatedWord.word) === normalizedSeed
  ) {
    nextPayload = omitRelation(nextPayload, "relatedWord");

    if (!guardrailFlags.includes("related_omitted_weak_evidence")) {
      guardrailFlags.push("related_omitted_weak_evidence");
    }
  }

  if (
    nextPayload.contrastiveWord &&
    normalizeWord(nextPayload.contrastiveWord.word) === normalizedSeed
  ) {
    nextPayload = omitRelation(nextPayload, "contrastiveWord");

    if (!guardrailFlags.includes("contrast_omitted_weak_evidence")) {
      guardrailFlags.push("contrast_omitted_weak_evidence");
    }
  }

  if (
    nextPayload.relatedWord &&
    nextPayload.contrastiveWord &&
    normalizeWord(nextPayload.relatedWord.word) ===
      normalizeWord(nextPayload.contrastiveWord.word)
  ) {
    nextPayload = omitRelation(nextPayload, "contrastiveWord");

    if (!guardrailFlags.includes("contrast_omitted_weak_evidence")) {
      guardrailFlags.push("contrast_omitted_weak_evidence");
    }
  }

  return {
    guardrailFlags,
    payload: seedEnrichmentPayloadSchema.parse(nextPayload),
  };
};

const buildEnrichmentPromptBody = (input: {
  snapshot: LexicalEvidenceSnapshot;
  seed: Pick<SeedDetail, "primarySentence" | "source" | "word">;
}): EnrichmentPromptBody => ({
  allowed_output_schema_version: seedEnrichmentPayloadSchemaVersion,
  lexical_evidence: input.snapshot,
  omission_rules: {
    contrastiveWord:
      "Omit when the evidence does not support one safe contrastive candidate.",
    morphologyNote:
      "Omit when morphology evidence is weak or absent.",
    registerNote:
      "Omit when register evidence is weak or absent.",
    relatedWord:
      "Omit when the evidence does not support one safe related candidate.",
  },
  seed_capture_context: {
    sentence: input.seed.primarySentence,
    source: input.seed.source
      ? {
          kind: input.seed.source.kind,
          title: input.seed.source.title,
        }
      : null,
    word: input.seed.word,
  },
  task: {
    contrastiveWord:
      "Provide one contrastive word and one short distinction note only if evidence supports it.",
    gloss:
      "Provide one plain-English gloss in the captured context.",
    morphologyNote:
      "Provide one concise structural or family clue only if evidence supports it.",
    registerNote:
      "Provide one concise register note only if evidence supports it.",
    relatedWord:
      "Provide one related word and one short why-this-is-related note only if evidence supports it.",
  },
});

export const buildEnrichmentPrompts = (input: {
  snapshot: LexicalEvidenceSnapshot;
  seed: Pick<SeedDetail, "primarySentence" | "source" | "word">;
}): {
  developerInstruction: string;
  seedWord: string;
  snapshot: LexicalEvidenceSnapshot;
  userInstruction: string;
} => ({
  developerInstruction:
    "Produce compact lexical scaffolding for one saved vocabulary seed. Return strict JSON matching the provided schema. Keep the output calm, concise, and pedagogically useful. Use lexical evidence first. Omit unsupported fields instead of guessing. Do not invent etymology, extra relations, or unsupported register claims.",
  seedWord: input.seed.word,
  snapshot: input.snapshot,
  userInstruction: JSON.stringify(
    buildEnrichmentPromptBody(input),
    null,
    2,
  ),
});

export const hasMinimumEvidenceForEnrichment = (
  snapshot: LexicalEvidenceSnapshot,
): boolean => snapshot.dictionaryGlosses.length > 0;

export const toSeedEnrichment = (
  row: SeedEnrichmentRow,
): SeedEnrichment =>
  seedEnrichmentSchema.parse({
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    errorCode: row.errorCode ?? null,
    failedAt: row.failedAt?.toISOString() ?? null,
    guardrailFlags: row.guardrailFlags,
    id: row.id,
    model: row.model ?? null,
    payload: row.payload ?? null,
    promptTemplateVersion: row.promptTemplateVersion,
    provider: row.provider ?? null,
    requestedAt: row.requestedAt.toISOString(),
    schemaVersion: row.schemaVersion,
    startedAt: row.startedAt?.toISOString() ?? null,
    status: row.status,
    updatedAt: row.updatedAt.toISOString(),
  });

export const redactTraceOutput = (input: {
  errorCode?: string;
  payload?: SeedEnrichmentPayload | null;
  refusal?: string;
}): Record<string, unknown> | null => {
  if (input.payload) {
    return input.payload;
  }

  if (input.refusal) {
    return {
      refusal: truncateForPreview(input.refusal, 180),
    };
  }

  if (input.errorCode) {
    return {
      errorCode: input.errorCode,
    };
  }

  return null;
};

export type LiveLexicalEvidence = DictionaryEvidence & RelationEvidence;

export type EnrichmentPromptInput = ReturnType<typeof buildEnrichmentPrompts>;
