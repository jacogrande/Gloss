import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createSeedResponseSchema,
  requestSeedEnrichmentResponseSchema,
  seedDetailResponseSchema,
  seedListResponseSchema,
} from "@gloss/shared/contracts";
import type {
  CreateSeedInput,
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

  if (captureFailures.length > 0 || enrichmentFailures.length > 0) {
    throw new Error("Journey evals failed.");
  }
};

if (import.meta.main) {
  await runJourneyEvaluations();
}
