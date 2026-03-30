import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createSeedResponseSchema,
  requestSeedEnrichmentResponseSchema,
  reviewQueueResponseSchema,
  reviewSessionResponseSchema,
  seedDetailResponseSchema,
  seedListResponseSchema,
  submitReviewCardResponseSchema,
} from "@gloss/shared/contracts";
import { apiErrorResponseSchema } from "@gloss/shared/schemas";
import type {
  CreateSeedInput,
  SeedStage,
  SourceKind,
} from "@gloss/shared/types";

import {
  buildEvalSummary,
  type EvalFailure,
} from "./lib/eval";
import {
  prepareLocalHarness,
  resolveScriptEnv,
  signUpHarnessUser,
} from "./lib/harness";

type CaptureJourneyCase = {
  expected: {
    normalized_source_type: SourceKind | null;
    persist_word: string;
    preserve_context: boolean;
    store_source_metadata: boolean;
  };
  id: string;
  input: {
    context_sentence: string | null;
    source_author: string | null;
    source_title: string | null;
    source_type: SourceKind | null;
    source_url: string | null;
    word: string;
  };
  journey: string;
};

type EnrichmentJourneyCase = {
  expected: {
    contrast_word?: string | null;
    error_code: string | null;
    gloss_includes_any: string[];
    minimum_optional_fields?: number;
    morphology_present?: boolean;
    register_present?: boolean;
    related_word?: string | null;
    status: "failed" | "ready";
  };
  id: string;
  input: {
    context_sentence: string | null;
    source_title: string | null;
    source_type: SourceKind | null;
    word: string;
  };
  journey: string;
};

type ReviewJourneyCase = {
  expected: {
    due_count_at_least: number;
    error_code: string | null;
    final_seed_stage_in?: SeedStage[];
    minimum_card_count?: number;
    status: "not_reviewable" | "reviewable";
  };
  id: string;
  input: {
    context_sentence: string | null;
    source_title: string | null;
    source_type: SourceKind | null;
    word: string;
  };
  journey: string;
};

type ReviewCardAnswerKeyRow = {
  answer_key: {
    correctChoiceId: string;
  };
  id: string;
};

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const captureDatasetPath = path.join(
  repoRoot,
  "docs",
  "evals",
  "datasets",
  "capture_journeys.jsonl",
);
const enrichmentDatasetPath = path.join(
  repoRoot,
  "docs",
  "evals",
  "datasets",
  "enrichment_journeys.jsonl",
);
const liveEnrichmentDatasetPath = path.join(
  repoRoot,
  "docs",
  "evals",
  "datasets",
  "enrichment_journeys_live.jsonl",
);
const reviewDatasetPath = path.join(
  repoRoot,
  "docs",
  "evals",
  "datasets",
  "review_journeys.jsonl",
);

const parseDatasetRow = <TRow>(value: unknown): TRow => {
  if (typeof value !== "object" || value === null) {
    throw new Error("Eval dataset row must be an object.");
  }

  return value as TRow;
};

const loadJsonlDataset = async <TRow>(filePath: string): Promise<TRow[]> => {
  const raw = await readFile(filePath, "utf8");

  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => parseDatasetRow<TRow>(JSON.parse(line) as unknown));
};

const buildCaptureRequestBody = (
  input:
    | CaptureJourneyCase["input"]
    | EnrichmentJourneyCase["input"],
): CreateSeedInput => ({
  ...(input.context_sentence
    ? {
        sentence: input.context_sentence,
      }
    : {}),
  ...(input.source_type
    ? {
        source: {
          ...("source_author" in input && input.source_author
            ? {
                author: input.source_author,
              }
            : {}),
          kind: input.source_type,
          ...(input.source_title
            ? {
                title: input.source_title,
              }
            : {}),
          ...("source_url" in input && input.source_url
            ? {
                url: input.source_url,
              }
            : {}),
        },
      }
    : {}),
  word: input.word,
});

const createAndEnrichSeedForEval = async (input: {
  apiOrigin: string;
  app: ReturnType<typeof prepareLocalHarness>["runtime"]["app"];
  email: string;
  env: ReturnType<typeof prepareLocalHarness>["env"];
  input: EnrichmentJourneyCase["input"] | ReviewJourneyCase["input"];
  name: string;
}): Promise<{
  cookie: string;
  enrichment: ReturnType<typeof requestSeedEnrichmentResponseSchema.parse>["data"];
  seedId: string;
}> => {
  const cookie = await signUpHarnessUser({
    app: input.app,
    apiOrigin: input.apiOrigin,
    email: input.email,
    name: input.name,
    webOrigin: input.env.WEB_ORIGIN,
  });
  const createResponse = await input.app.request(
    new URL("/capture/seeds", `${input.apiOrigin}/`).toString(),
    {
      body: JSON.stringify(buildCaptureRequestBody(input.input)),
      headers: {
        "content-type": "application/json",
        cookie,
        origin: input.env.WEB_ORIGIN,
      },
      method: "POST",
    },
  );

  if (createResponse.status !== 201) {
    throw new Error(`Expected seed create status 201, received ${createResponse.status}.`);
  }

  const createBody = createSeedResponseSchema.parse(
    (await createResponse.json()) as unknown,
  );
  const enrichResponse = await input.app.request(
    new URL(`/seeds/${createBody.data.id}/enrich`, `${input.apiOrigin}/`).toString(),
    {
      headers: {
        cookie,
        origin: input.env.WEB_ORIGIN,
      },
      method: "POST",
    },
  );

  if (enrichResponse.status !== 200) {
    throw new Error(
      `Expected seed enrich status 200, received ${enrichResponse.status}.`,
    );
  }

  const enrichBody = requestSeedEnrichmentResponseSchema.parse(
    (await enrichResponse.json()) as unknown,
  );

  return {
    cookie,
    enrichment: enrichBody.data,
    seedId: createBody.data.id,
  };
};

const logSummary = (input: {
  dataset: string;
  failures: EvalFailure[];
  total: number;
}): void => {
  console.log(
    JSON.stringify({
      dataset: input.dataset,
      ...buildEvalSummary({
        failures: input.failures,
        total: input.total,
      }),
    }),
  );
};

const runCaptureJourneyEvaluations = async (): Promise<EvalFailure[]> => {
  const testCases = await loadJsonlDataset<CaptureJourneyCase>(captureDatasetPath);
  const failures: EvalFailure[] = [];
  const { env, runtime } = prepareLocalHarness();

  try {
    for (const [index, testCase] of testCases.entries()) {
      const email = `eval+capture+${index + 1}@gloss.local`;
      const cookie = await signUpHarnessUser({
        app: runtime.app,
        apiOrigin: env.API_ORIGIN,
        email,
        name: `Capture Eval User ${index + 1}`,
        webOrigin: env.WEB_ORIGIN,
      });
      const createResponse = await runtime.app.request(
        new URL("/capture/seeds", `${env.API_ORIGIN}/`).toString(),
        {
          body: JSON.stringify(buildCaptureRequestBody(testCase.input)),
          headers: {
            "content-type": "application/json",
            cookie,
            origin: env.WEB_ORIGIN,
          },
          method: "POST",
        },
      );

      if (createResponse.status !== 201) {
        failures.push({
          caseId: testCase.id,
          category: "create_status",
          journey: testCase.journey,
          message: `Expected create status 201, received ${createResponse.status}.`,
          severity: "critical",
        });
        continue;
      }

      const createBody = createSeedResponseSchema.parse(
        (await createResponse.json()) as unknown,
      );
      const listResponse = await runtime.app.request(
        new URL("/seeds", `${env.API_ORIGIN}/`).toString(),
        {
          headers: {
            cookie,
            origin: env.WEB_ORIGIN,
          },
        },
      );
      const detailResponse = await runtime.app.request(
        new URL(`/seeds/${createBody.data.id}`, `${env.API_ORIGIN}/`).toString(),
        {
          headers: {
            cookie,
            origin: env.WEB_ORIGIN,
          },
        },
      );

      if (listResponse.status !== 200 || detailResponse.status !== 200) {
        failures.push({
          caseId: testCase.id,
          category: "read_status",
          journey: testCase.journey,
          message: `Expected read statuses 200/200, received ${listResponse.status}/${detailResponse.status}.`,
          severity: "critical",
        });
        continue;
      }

      const listBody = seedListResponseSchema.parse(
        (await listResponse.json()) as unknown,
      );
      const detailBody = seedDetailResponseSchema.parse(
        (await detailResponse.json()) as unknown,
      );
      const listSeed = listBody.data.items.find(
        (seed) => seed.id === createBody.data.id,
      );

      if (detailBody.data.word !== testCase.expected.persist_word) {
        failures.push({
          caseId: testCase.id,
          category: "persist_word",
          journey: testCase.journey,
          message: `Expected persisted word ${testCase.expected.persist_word}, received ${detailBody.data.word}.`,
          severity: "critical",
        });
      }

      if (
        testCase.expected.preserve_context &&
        detailBody.data.primarySentence !== testCase.input.context_sentence
      ) {
        failures.push({
          caseId: testCase.id,
          category: "preserve_context",
          journey: testCase.journey,
          message: "Expected primary sentence to match the captured context.",
          severity: "critical",
        });
      }

      if (
        !testCase.expected.preserve_context &&
        detailBody.data.primarySentence !== null
      ) {
        failures.push({
          caseId: testCase.id,
          category: "preserve_context",
          journey: testCase.journey,
          message: "Expected primary sentence to remain null for minimal capture.",
          severity: "critical",
        });
      }

      if (testCase.expected.store_source_metadata) {
        const source = detailBody.data.source;

        if (
          source?.kind !== testCase.expected.normalized_source_type ||
          source.title !== testCase.input.source_title ||
          source.author !== testCase.input.source_author ||
          source.url !== testCase.input.source_url
        ) {
          failures.push({
            caseId: testCase.id,
            category: "source_metadata",
            journey: testCase.journey,
            message: "Expected source metadata to survive create/detail reads.",
            severity: "critical",
          });
        }

        if (listSeed?.source?.title !== testCase.input.source_title) {
          failures.push({
            caseId: testCase.id,
            category: "source_metadata",
            journey: testCase.journey,
            message: "Expected library payload to include source metadata.",
            severity: "critical",
          });
        }
      }

      if (!testCase.expected.store_source_metadata && detailBody.data.source !== null) {
        failures.push({
          caseId: testCase.id,
          category: "source_metadata",
          journey: testCase.journey,
          message: "Expected minimal capture to omit source metadata.",
          severity: "critical",
        });
      }
    }
  } finally {
    await runtime.close();
  }

  return failures;
};

const runEnrichmentJourneyEvaluations = async (): Promise<EvalFailure[]> => {
  const failures: EvalFailure[] = [];
  const { env, runtime } = prepareLocalHarness();
  const testCases = await loadJsonlDataset<EnrichmentJourneyCase>(
    env.ENRICHMENT_PROVIDER_MODE === "live"
      ? liveEnrichmentDatasetPath
      : enrichmentDatasetPath,
  );

  try {
    for (const [index, testCase] of testCases.entries()) {
      const cookie = await signUpHarnessUser({
        app: runtime.app,
        apiOrigin: env.API_ORIGIN,
        email: `eval+enrich+${index + 1}@gloss.local`,
        name: `Enrichment Eval User ${index + 1}`,
        webOrigin: env.WEB_ORIGIN,
      });
      const createResponse = await runtime.app.request(
        new URL("/capture/seeds", `${env.API_ORIGIN}/`).toString(),
        {
          body: JSON.stringify(buildCaptureRequestBody(testCase.input)),
          headers: {
            "content-type": "application/json",
            cookie,
            origin: env.WEB_ORIGIN,
          },
          method: "POST",
        },
      );

      if (createResponse.status !== 201) {
        failures.push({
          caseId: testCase.id,
          category: "create_status",
          journey: testCase.journey,
          message: `Expected seed create status 201, received ${createResponse.status}.`,
          severity: "critical",
        });
        continue;
      }

      const createBody = createSeedResponseSchema.parse(
        (await createResponse.json()) as unknown,
      );
      const enrichResponse = await runtime.app.request(
        new URL(`/seeds/${createBody.data.id}/enrich`, `${env.API_ORIGIN}/`).toString(),
        {
          headers: {
            cookie,
            origin: env.WEB_ORIGIN,
          },
          method: "POST",
        },
      );
      const detailResponse = await runtime.app.request(
        new URL(`/seeds/${createBody.data.id}`, `${env.API_ORIGIN}/`).toString(),
        {
          headers: {
            cookie,
            origin: env.WEB_ORIGIN,
          },
        },
      );

      if (enrichResponse.status !== 200 || detailResponse.status !== 200) {
        failures.push({
          caseId: testCase.id,
          category: "enrich_status",
          journey: testCase.journey,
          message: `Expected enrich/detail statuses 200/200, received ${enrichResponse.status}/${detailResponse.status}.`,
          severity: "critical",
        });
        continue;
      }

      const enrichBody = requestSeedEnrichmentResponseSchema.parse(
        (await enrichResponse.json()) as unknown,
      );
      const detailBody = seedDetailResponseSchema.parse(
        (await detailResponse.json()) as unknown,
      );
      const enrichment = enrichBody.data;
      const detailEnrichment = detailBody.data.enrichment;

      if (enrichment.status !== testCase.expected.status) {
        failures.push({
          caseId: testCase.id,
          category: "enrichment_status",
          journey: testCase.journey,
          message: `Expected enrichment status ${testCase.expected.status}, received ${enrichment.status}.`,
          severity: "critical",
        });
        continue;
      }

      if (detailEnrichment?.status !== enrichment.status) {
        failures.push({
          caseId: testCase.id,
          category: "detail_projection",
          journey: testCase.journey,
          message:
            "Expected seed detail to expose the same persisted enrichment state.",
          severity: "critical",
        });
      }

      if (testCase.expected.status === "failed") {
        if (enrichment.errorCode !== testCase.expected.error_code) {
          failures.push({
            caseId: testCase.id,
            category: "failure_code",
            journey: testCase.journey,
            message: `Expected failure code ${testCase.expected.error_code}, received ${enrichment.errorCode}.`,
            severity: "critical",
          });
        }

        continue;
      }

      const payload = enrichment.payload;

      if (!payload) {
        failures.push({
          caseId: testCase.id,
          category: "payload_missing",
          journey: testCase.journey,
          message: "Expected a ready enrichment payload to be present.",
          severity: "critical",
        });
        continue;
      }

      const normalizedGloss = payload.gloss.toLowerCase();
      const hasMatchingGlossFragment = testCase.expected.gloss_includes_any.some(
        (fragment) => normalizedGloss.includes(fragment),
      );

      if (!hasMatchingGlossFragment) {
        failures.push({
          caseId: testCase.id,
          category: "gloss",
          journey: testCase.journey,
          message: "Expected the gloss to include one approved meaning fragment.",
          severity: "critical",
        });
      }

      if (
        typeof testCase.expected.register_present === "boolean" &&
        (payload.registerNote !== undefined) !== testCase.expected.register_present
      ) {
        failures.push({
          caseId: testCase.id,
          category: "register",
          journey: testCase.journey,
          message: "Register presence did not match the expected guardrail outcome.",
          severity: "critical",
        });
      }

      if (
        typeof testCase.expected.morphology_present === "boolean" &&
        (payload.morphologyNote !== undefined) !==
          testCase.expected.morphology_present
      ) {
        failures.push({
          caseId: testCase.id,
          category: "morphology",
          journey: testCase.journey,
          message:
            "Morphology-note presence did not match the expected guardrail outcome.",
          severity: "critical",
        });
      }

      if (
        "related_word" in testCase.expected &&
        (payload.relatedWord?.word ?? null) !==
          (testCase.expected.related_word ?? null)
      ) {
        failures.push({
          caseId: testCase.id,
          category: "related_word",
          journey: testCase.journey,
          message: "Related-word selection did not match the expected result.",
          severity: "critical",
        });
      }

      if (
        "contrast_word" in testCase.expected &&
        (payload.contrastiveWord?.word ?? null) !==
          (testCase.expected.contrast_word ?? null)
      ) {
        failures.push({
          caseId: testCase.id,
          category: "contrast_word",
          journey: testCase.journey,
          message: "Contrastive-word selection did not match the expected result.",
          severity: "critical",
        });
      }

      if (typeof testCase.expected.minimum_optional_fields === "number") {
        const optionalFieldCount = [
          payload.registerNote,
          payload.relatedWord,
          payload.contrastiveWord,
          payload.morphologyNote,
        ].filter((value) => value !== undefined).length;

        if (optionalFieldCount < testCase.expected.minimum_optional_fields) {
          failures.push({
            caseId: testCase.id,
            category: "optional_field_count",
            journey: testCase.journey,
            message: `Expected at least ${testCase.expected.minimum_optional_fields} optional enrichment field(s), received ${optionalFieldCount}.`,
            severity: "critical",
          });
        }
      }
    }
  } finally {
    await runtime.close();
  }

  return failures;
};

const runReviewJourneyEvaluations = async (): Promise<EvalFailure[]> => {
  const failures: EvalFailure[] = [];
  const testCases = await loadJsonlDataset<ReviewJourneyCase>(reviewDatasetPath);
  const { env, runtime } = prepareLocalHarness();

  try {
    for (const [index, testCase] of testCases.entries()) {
      const email = `eval+review+${index + 1}@gloss.local`;

      let cookie: string;
      let seedId: string;

      try {
        const created = await createAndEnrichSeedForEval({
          apiOrigin: env.API_ORIGIN,
          app: runtime.app,
          email,
          env,
          input: testCase.input,
          name: `Review Eval User ${index + 1}`,
        });

        cookie = created.cookie;
        seedId = created.seedId;
      } catch (error) {
        failures.push({
          caseId: testCase.id,
          category: "review_setup",
          journey: testCase.journey,
          message:
            error instanceof Error
              ? error.message
              : "Failed to create and enrich the review eval seed.",
          severity: "critical",
        });
        continue;
      }

      const userResult = await runtime.database.pool.query<{ id: string }>(
        'SELECT id FROM "user" WHERE email = $1 LIMIT 1',
        [email],
      );
      const userId = userResult.rows[0]?.id;

      if (!userId) {
        failures.push({
          caseId: testCase.id,
          category: "review_setup",
          journey: testCase.journey,
          message: "Expected the review eval user to exist after sign-up.",
          severity: "critical",
        });
        continue;
      }

      const queueResponse = await runtime.app.request(
        new URL("/review/queue", `${env.API_ORIGIN}/`).toString(),
        {
          headers: {
            cookie,
            origin: env.WEB_ORIGIN,
          },
        },
      );

      if (queueResponse.status !== 200) {
        failures.push({
          caseId: testCase.id,
          category: "queue_status",
          journey: testCase.journey,
          message: `Expected queue status 200, received ${queueResponse.status}.`,
          severity: "critical",
        });
        continue;
      }

      const queueBody = reviewQueueResponseSchema.parse(
        (await queueResponse.json()) as unknown,
      );

      if (queueBody.data.dueCount < testCase.expected.due_count_at_least) {
        failures.push({
          caseId: testCase.id,
          category: "queue_due_count",
          journey: testCase.journey,
          message: `Expected at least ${testCase.expected.due_count_at_least} due review seed(s), received ${queueBody.data.dueCount}.`,
          severity: "critical",
        });
      }

      const startResponse = await runtime.app.request(
        new URL("/review/sessions", `${env.API_ORIGIN}/`).toString(),
        {
          body: JSON.stringify({}),
          headers: {
            "content-type": "application/json",
            cookie,
            origin: env.WEB_ORIGIN,
          },
          method: "POST",
        },
      );

      if (testCase.expected.status === "not_reviewable") {
        const errorBody = apiErrorResponseSchema.parse(
          (await startResponse.json()) as unknown,
        );

        if (
          startResponse.status !== 409 ||
          errorBody.error.code !== testCase.expected.error_code
        ) {
          failures.push({
            caseId: testCase.id,
            category: "review_conflict",
            journey: testCase.journey,
            message: `Expected a 409 ${testCase.expected.error_code} response when no reviewable seeds exist.`,
            severity: "critical",
          });
        }

        continue;
      }

      if (startResponse.status !== 200) {
        failures.push({
          caseId: testCase.id,
          category: "session_start_status",
          journey: testCase.journey,
          message: `Expected session start status 200, received ${startResponse.status}.`,
          severity: "critical",
        });
        continue;
      }

      const startBody = reviewSessionResponseSchema.parse(
        (await startResponse.json()) as unknown,
      );

      if (
        typeof testCase.expected.minimum_card_count === "number" &&
        startBody.data.session.cardCount < testCase.expected.minimum_card_count
      ) {
        failures.push({
          caseId: testCase.id,
          category: "session_card_count",
          journey: testCase.journey,
          message: `Expected at least ${testCase.expected.minimum_card_count} review card(s), received ${startBody.data.session.cardCount}.`,
          severity: "critical",
        });
      }

      const answerKeyResult = await runtime.database.pool.query<ReviewCardAnswerKeyRow>(
        `
          SELECT id, answer_key
          FROM review_cards
          WHERE review_session_id = $1
          ORDER BY position ASC
        `,
        [startBody.data.session.id],
      );

      let latestSession = startBody.data;

      for (const row of answerKeyResult.rows) {
        const submitResponse = await runtime.app.request(
          new URL(
            `/review/sessions/${startBody.data.session.id}/cards/${row.id}/submit`,
            `${env.API_ORIGIN}/`,
          ).toString(),
          {
            body: JSON.stringify({
              choiceId: row.answer_key.correctChoiceId,
              latencyMs: 250,
            }),
            headers: {
              "content-type": "application/json",
              cookie,
              origin: env.WEB_ORIGIN,
            },
            method: "POST",
          },
        );

        if (submitResponse.status !== 200) {
          failures.push({
            caseId: testCase.id,
            category: "submission_status",
            journey: testCase.journey,
            message: `Expected review submission status 200, received ${submitResponse.status}.`,
            severity: "critical",
          });
          continue;
        }

        const submitBody = submitReviewCardResponseSchema.parse(
          (await submitResponse.json()) as unknown,
        );

        latestSession = submitBody.data.session;
      }

      if (latestSession.session.status !== "completed") {
        failures.push({
          caseId: testCase.id,
          category: "session_completion",
          journey: testCase.journey,
          message: "Expected the review session to complete after all answers.",
          severity: "critical",
        });
      }

      const eventResult = await runtime.database.pool.query<{ count: string }>(
        `
          SELECT COUNT(*)::text AS count
          FROM review_events
          WHERE review_session_id = $1
        `,
        [startBody.data.session.id],
      );
      const stageResult = await runtime.database.pool.query<{ stage: SeedStage }>(
        `
          SELECT stage
          FROM seeds
          WHERE id = $1
        `,
        [seedId],
      );

      if (Number(eventResult.rows[0]?.count ?? "0") !== answerKeyResult.rows.length) {
        failures.push({
          caseId: testCase.id,
          category: "event_count",
          journey: testCase.journey,
          message: "Expected one durable review event per answered review card.",
          severity: "critical",
        });
      }

      if (
        testCase.expected.final_seed_stage_in &&
        !testCase.expected.final_seed_stage_in.includes(
          stageResult.rows[0]?.stage ?? "new",
        )
      ) {
        failures.push({
          caseId: testCase.id,
          category: "seed_stage",
          journey: testCase.journey,
          message: "Expected review completion to advance the seed stage.",
          severity: "critical",
        });
      }
    }
  } finally {
    await runtime.close();
  }

  return failures;
};

export const runJourneyEvaluations = async (): Promise<void> => {
  const isLiveEnrichment = resolveScriptEnv().ENRICHMENT_PROVIDER_MODE === "live";
  const captureFailures = await runCaptureJourneyEvaluations();
  const captureCases =
    await loadJsonlDataset<CaptureJourneyCase>(captureDatasetPath);

  logSummary({
    dataset: "capture_journeys",
    failures: captureFailures,
    total: captureCases.length,
  });

  const enrichmentFailures = await runEnrichmentJourneyEvaluations();
  const enrichmentCases = await loadJsonlDataset<EnrichmentJourneyCase>(
    isLiveEnrichment ? liveEnrichmentDatasetPath : enrichmentDatasetPath,
  );

  logSummary({
    dataset: isLiveEnrichment
      ? "enrichment_journeys_live"
      : "enrichment_journeys",
    failures: enrichmentFailures,
    total: enrichmentCases.length,
  });

  const reviewFailures = await runReviewJourneyEvaluations();
  const reviewCases = await loadJsonlDataset<ReviewJourneyCase>(reviewDatasetPath);

  logSummary({
    dataset: "review_journeys",
    failures: reviewFailures,
    total: reviewCases.length,
  });

  if (
    captureFailures.length > 0 ||
    enrichmentFailures.length > 0 ||
    reviewFailures.length > 0
  ) {
    throw new Error("Journey evals failed.");
  }
};

if (import.meta.main) {
  await runJourneyEvaluations();
}
