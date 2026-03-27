import { apiErrorResponseSchema } from "@gloss/shared/schemas";
import {
  createSeedResponseSchema,
  requestSeedEnrichmentResponseSchema,
} from "@gloss/shared/contracts";

import {
  buildEvalSummary,
  type EvalFailure,
} from "./lib/eval";
import {
  prepareLocalHarness,
  signUpHarnessUser,
} from "./lib/harness";

type TraceCheck = {
  id: string;
  run: () => Promise<EvalFailure | null>;
};

type EnrichmentTraceRow = {
  error_code: string | null;
  guardrail_flags: string[];
  lexical_evidence: {
    contrastCandidates?: string[];
    dictionaryGlosses?: string[];
    morphologyHints?: string[];
    registerLabels?: string[];
  };
  output_redacted: {
    contrastiveWord?: {
      note: string;
      word: string;
    };
    gloss?: string;
    morphologyNote?: {
      note: string;
    };
    registerNote?: string;
  } | null;
  prompt_template_version: string;
  schema_version: string;
  status: string;
  validation_result: {
    accepted?: boolean;
    issues?: string[];
  };
};

const getHeader = (response: Response, name: string): string | null =>
  response.headers.get(name);

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

const runHttpBoundaryChecks = async (): Promise<EvalFailure[]> => {
  const failures: EvalFailure[] = [];
  const { env, runtime } = prepareLocalHarness();

  try {
    const cookie = await signUpHarnessUser({
      app: runtime.app,
      apiOrigin: env.API_ORIGIN,
      email: "trace@gloss.local",
      name: "Trace User",
      webOrigin: env.WEB_ORIGIN,
    });

    const checks: TraceCheck[] = [
      {
        id: "auth_preflight_cors",
        run: async () => {
          const response = await runtime.app.request(
            new URL("/api/auth/sign-in/email", `${env.API_ORIGIN}/`).toString(),
            {
              headers: {
                "access-control-request-headers": "content-type",
                "access-control-request-method": "POST",
                origin: env.WEB_ORIGIN,
              },
              method: "OPTIONS",
            },
          );

          return getHeader(response, "access-control-allow-origin") === env.WEB_ORIGIN &&
            getHeader(response, "access-control-allow-credentials") === "true"
            ? null
            : {
                caseId: "auth_preflight_cors",
                category: "cors",
                journey: "auth.boundary",
                message:
                  "Expected Better Auth sign-in preflight to expose split-origin credentialed CORS headers.",
                severity: "critical",
              };
        },
      },
      {
        id: "capture_preflight_cors",
        run: async () => {
          const response = await runtime.app.request(
            new URL("/capture/seeds", `${env.API_ORIGIN}/`).toString(),
            {
              headers: {
                "access-control-request-headers": "content-type",
                "access-control-request-method": "POST",
                origin: env.WEB_ORIGIN,
              },
              method: "OPTIONS",
            },
          );

          return getHeader(response, "access-control-allow-origin") === env.WEB_ORIGIN &&
            getHeader(response, "access-control-allow-credentials") === "true"
            ? null
            : {
                caseId: "capture_preflight_cors",
                category: "cors",
                journey: "http.boundary",
                message:
                  "Expected product route preflight to expose split-origin credentialed CORS headers.",
                severity: "critical",
              };
        },
      },
      {
        id: "seed_list_response_headers",
        run: async () => {
          const response = await runtime.app.request(
            new URL("/seeds", `${env.API_ORIGIN}/`).toString(),
            {
              headers: {
                cookie,
                origin: env.WEB_ORIGIN,
              },
            },
          );

          return response.status === 200 &&
            getHeader(response, "access-control-allow-origin") === env.WEB_ORIGIN &&
            getHeader(response, "x-request-id")
            ? null
            : {
                caseId: "seed_list_response_headers",
                category: "http_headers",
                journey: "http.boundary",
                message:
                  "Expected authenticated seed list responses to expose CORS and request-id headers.",
                severity: "critical",
              };
        },
      },
      {
        id: "unauthorized_seed_error_code",
        run: async () => {
          const response = await runtime.app.request(
            new URL("/seeds", `${env.API_ORIGIN}/`).toString(),
            {
              headers: {
                origin: env.WEB_ORIGIN,
              },
            },
          );
          const body = apiErrorResponseSchema.parse((await response.json()) as unknown);

          return response.status === 401 &&
            body.error.code === "AUTH_UNAUTHORIZED" &&
            typeof body.error.requestId === "string"
            ? null
            : {
                caseId: "unauthorized_seed_error_code",
                category: "error_contract",
                journey: "auth.boundary",
                message:
                  "Expected unauthenticated seed list requests to return AUTH_UNAUTHORIZED with a request id.",
                severity: "critical",
              };
        },
      },
      {
        id: "capture_validation_error_code",
        run: async () => {
          const response = await runtime.app.request(
            new URL("/capture/seeds", `${env.API_ORIGIN}/`).toString(),
            {
              body: JSON.stringify({
                word: "",
              }),
              headers: {
                "content-type": "application/json",
                cookie,
                origin: env.WEB_ORIGIN,
              },
              method: "POST",
            },
          );
          const body = apiErrorResponseSchema.parse((await response.json()) as unknown);

          return response.status === 400 &&
            body.error.code === "VALIDATION_ERROR" &&
            typeof body.error.requestId === "string"
            ? null
            : {
                caseId: "capture_validation_error_code",
                category: "error_contract",
                journey: "capture.create",
                message:
                  "Expected invalid capture payloads to return VALIDATION_ERROR with a request id.",
                severity: "critical",
              };
        },
      },
    ];

    for (const check of checks) {
      const failure = await check.run();

      if (failure) {
        failures.push(failure);
      }
    }
  } finally {
    await runtime.close();
  }

  return failures;
};

const runEnrichmentTraceChecks = async (): Promise<EvalFailure[]> => {
  const failures: EvalFailure[] = [];
  const { env, runtime } = prepareLocalHarness();

  const createAndEnrichSeed = async (input: {
    email: string;
    sentence?: string;
    word: string;
  }): Promise<{
    seedId: string;
    userId: string;
  }> => {
    const cookie = await signUpHarnessUser({
      app: runtime.app,
      apiOrigin: env.API_ORIGIN,
      email: input.email,
      name: input.email,
      webOrigin: env.WEB_ORIGIN,
    });
    const createResponse = await runtime.app.request(
      new URL("/capture/seeds", `${env.API_ORIGIN}/`).toString(),
      {
        body: JSON.stringify({
          ...(input.sentence
            ? {
                sentence: input.sentence,
              }
            : {}),
          word: input.word,
        }),
        headers: {
          "content-type": "application/json",
          cookie,
          origin: env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
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

    requestSeedEnrichmentResponseSchema.parse(
      (await enrichResponse.json()) as unknown,
    );

    const userResult = await runtime.database.pool.query<{ id: string }>(
      'SELECT id FROM "user" WHERE email = $1 LIMIT 1',
      [input.email],
    );

    return {
      seedId: createBody.data.id,
      userId: userResult.rows[0]?.id ?? "",
    };
  };

  const getLatestTrace = async (input: {
    seedId: string;
    userId: string;
  }): Promise<EnrichmentTraceRow | null> => {
    const result = await runtime.database.pool.query<EnrichmentTraceRow>(
      `
        SELECT
          error_code,
          guardrail_flags,
          lexical_evidence,
          output_redacted,
          prompt_template_version,
          schema_version,
          status,
          validation_result
        FROM seed_enrichment_traces
        WHERE seed_id = $1 AND user_id = $2
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [input.seedId, input.userId],
    );

    return result.rows[0] ?? null;
  };

  try {
    const pellucid = await createAndEnrichSeed({
      email: "trace-enrich-ready@gloss.local",
      sentence: "Her explanation was pellucid even under pressure.",
      word: "pellucid",
    });
    const numinous = await createAndEnrichSeed({
      email: "trace-enrich-guardrails@gloss.local",
      sentence: "The chapel retained a numinous stillness after the visitors left.",
      word: "numinous",
    });
    const failed = await createAndEnrichSeed({
      email: "trace-enrich-failed@gloss.local",
      word: "obscurium",
    });

    const pellucidTrace = await getLatestTrace(pellucid);
    const numinousTrace = await getLatestTrace(numinous);
    const failedTrace = await getLatestTrace(failed);

    if (
      !pellucidTrace ||
      pellucidTrace.status !== "ready" ||
      pellucidTrace.prompt_template_version !== "seed-enrichment.v1" ||
      pellucidTrace.schema_version !== "seed-enrichment-payload.v1" ||
      pellucidTrace.validation_result.accepted !== true ||
      !pellucidTrace.lexical_evidence.dictionaryGlosses?.length ||
      typeof pellucidTrace.output_redacted?.gloss !== "string"
    ) {
      failures.push({
        caseId: "enrichment_ready_trace",
        category: "trace_persistence",
        journey: "seeds.enrich",
        message:
          "Expected a ready enrichment trace with schema versions, lexical evidence, and accepted output.",
        severity: "critical",
      });
    }

    const missingExpectedGuardrail = (
      trace: EnrichmentTraceRow,
      input: {
        flag: EnrichmentTraceRow["guardrail_flags"][number];
        outputKey: "contrastiveWord" | "morphologyNote" | "registerNote";
        shouldOmit: boolean;
      },
    ): boolean => {
      if (!input.shouldOmit) {
        return false;
      }

      return (
        !trace.guardrail_flags.includes(input.flag) ||
        typeof trace.output_redacted?.[input.outputKey] !== "undefined"
      );
    };

    if (
      !numinousTrace ||
      numinousTrace.status !== "ready" ||
      numinousTrace.validation_result.accepted !== true ||
      missingExpectedGuardrail(numinousTrace, {
        flag: "register_omitted_weak_evidence",
        outputKey: "registerNote",
        shouldOmit: numinousTrace?.lexical_evidence.registerLabels?.length === 0,
      }) ||
      missingExpectedGuardrail(numinousTrace, {
        flag: "contrast_omitted_weak_evidence",
        outputKey: "contrastiveWord",
        shouldOmit: numinousTrace?.lexical_evidence.contrastCandidates?.length === 0,
      }) ||
      missingExpectedGuardrail(numinousTrace, {
        flag: "morphology_omitted_weak_evidence",
        outputKey: "morphologyNote",
        shouldOmit: numinousTrace?.lexical_evidence.morphologyHints?.length === 0,
      })
    ) {
      failures.push({
        caseId: "enrichment_guardrail_trace",
        category: "guardrail_flags",
        journey: "seeds.enrich",
        message:
          "Expected a weak-evidence enrichment trace to record omission guardrails that match the lexical evidence snapshot.",
        severity: "critical",
      });
    }

    if (
      !failedTrace ||
      failedTrace.status !== "failed" ||
      failedTrace.error_code !== "ENRICHMENT_EVIDENCE_UNAVAILABLE" ||
      failedTrace.validation_result.accepted !== false
    ) {
      failures.push({
        caseId: "enrichment_failed_trace",
        category: "failure_trace",
        journey: "seeds.enrich",
        message:
          "Expected a failed enrichment trace to persist the stable evidence-unavailable code.",
        severity: "critical",
      });
    }
  } finally {
    await runtime.close();
  }

  return failures;
};

export const runTraceEvaluations = async (): Promise<void> => {
  const httpFailures = await runHttpBoundaryChecks();

  logSummary({
    dataset: "http_boundary_checks",
    failures: httpFailures,
    total: 5,
  });

  const enrichmentFailures = await runEnrichmentTraceChecks();

  logSummary({
    dataset: "enrichment_trace_checks",
    failures: enrichmentFailures,
    total: 3,
  });

  if (httpFailures.length > 0 || enrichmentFailures.length > 0) {
    throw new Error("Trace evals failed.");
  }
};

if (import.meta.main) {
  await runTraceEvaluations();
}
