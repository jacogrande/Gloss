import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createSeedResponseSchema,
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

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const captureDatasetPath = path.join(
  repoRoot,
  "docs",
  "evals",
  "datasets",
  "capture_journeys.jsonl",
);

const parseCaptureJourneyCase = (value: unknown): CaptureJourneyCase => {
  if (typeof value !== "object" || value === null) {
    throw new Error("Eval dataset row must be an object.");
  }

  const candidate = value as Partial<CaptureJourneyCase>;

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.journey !== "string" ||
    typeof candidate.input !== "object" ||
    candidate.input === null ||
    typeof candidate.expected !== "object" ||
    candidate.expected === null
  ) {
    throw new Error("Eval dataset row is missing required fields.");
  }

  return candidate as CaptureJourneyCase;
};

const loadCaptureJourneyCases = async (): Promise<CaptureJourneyCase[]> => {
  const raw = await readFile(captureDatasetPath, "utf8");

  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => parseCaptureJourneyCase(JSON.parse(line) as unknown));
};

const buildCaptureRequestBody = (
  testCase: CaptureJourneyCase,
): CreateSeedInput => ({
  ...(testCase.input.context_sentence
    ? {
        sentence: testCase.input.context_sentence,
      }
    : {}),
  ...(testCase.input.source_type
    ? {
        source: {
          ...(testCase.input.source_author
            ? {
                author: testCase.input.source_author,
              }
            : {}),
          kind: testCase.input.source_type,
          ...(testCase.input.source_title
            ? {
                title: testCase.input.source_title,
              }
            : {}),
          ...(testCase.input.source_url
            ? {
                url: testCase.input.source_url,
              }
            : {}),
        },
      }
    : {}),
  word: testCase.input.word,
});

export const runJourneyEvaluations = async (): Promise<void> => {
  const testCases = await loadCaptureJourneyCases();
  const failures: EvalFailure[] = [];
  const { env, runtime } = prepareLocalHarness();

  try {
    for (const [index, testCase] of testCases.entries()) {
      const email = `eval+${index + 1}@gloss.local`;
      const cookie = await signUpHarnessUser({
        app: runtime.app,
        apiOrigin: env.API_ORIGIN,
        email,
        name: `Eval User ${index + 1}`,
        webOrigin: env.WEB_ORIGIN,
      });
      const createResponse = await runtime.app.request(
        new URL("/capture/seeds", `${env.API_ORIGIN}/`).toString(),
        {
          body: JSON.stringify(buildCaptureRequestBody(testCase)),
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

  const summary = buildEvalSummary({
    failures,
    total: testCases.length,
  });

  console.log(
    JSON.stringify({
      dataset: "capture_journeys",
      ...summary,
    }),
  );

  if (summary.failed > 0) {
    throw new Error("Journey evals failed.");
  }
};

if (import.meta.main) {
  await runJourneyEvaluations();
}
