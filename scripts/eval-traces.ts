import { apiErrorResponseSchema } from "@gloss/shared/schemas";
import {
  createSeedResponseSchema,
  requestSeedEnrichmentResponseSchema,
  reviewQueueResponseSchema,
  reviewSessionResponseSchema,
  submitReviewCardResponseSchema,
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

type ReviewCardTraceRow = {
  generation_source: string;
  input_redacted: Record<string, unknown> | null;
  model: string | null;
  output_redacted: Record<string, unknown>;
  provider: string | null;
  prompt_template_version: string;
  review_card_id: string;
  schema_version: string;
  validation_result: {
    accepted?: boolean;
    issues?: string[];
  };
};

type PersistedReviewCardRow = {
  answer_key:
    | {
        correctChoiceId?: string;
        type: "choice";
      }
    | {
        acceptableAnswers?: string[];
        canonicalAnswer?: string;
        type: "text";
      };
  generation_source: string;
  id: string;
  primary_sentence_text: string | null;
  prompt_payload: {
    choices?: unknown[];
    question?: string;
    sentence?: string;
    type?: string;
  };
  prompt_template_version: string;
  schema_version: string;
  status: string;
};

type ReviewEventTraceRow = {
  outcome: string;
  response_latency_ms: number | null;
  state_delta: {
    nextDueAt?: string;
    nextScore?: number;
    previousDueAt?: string;
    previousScore?: number;
  };
};

const getHeader = (response: Response, name: string): string | null =>
  response.headers.get(name);

const normalizeEvalWord = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");

const normalizeSentenceForComparison = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

const createBlankedCapturedSentence = (input: {
  capturedSentence: string;
  word: string;
}): string =>
  input.capturedSentence.replace(
    new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRegExp(input.word)})(?=$|[^\\p{L}\\p{N}])`, "iu"),
    (_, prefix: string) => `${prefix}____`,
  );

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

const runReviewTraceChecks = async (): Promise<EvalFailure[]> => {
  const failures: EvalFailure[] = [];
  const { env, runtime } = prepareLocalHarness();

  try {
    const cookie = await signUpHarnessUser({
      app: runtime.app,
      apiOrigin: env.API_ORIGIN,
      email: "trace-review@gloss.local",
      name: "Trace Review User",
      webOrigin: env.WEB_ORIGIN,
    });
    const createResponse = await runtime.app.request(
      new URL("/capture/seeds", `${env.API_ORIGIN}/`).toString(),
      {
        body: JSON.stringify({
          sentence: "Her explanation was pellucid even under pressure.",
          source: {
            kind: "book",
            title: "On Style",
          },
          word: "pellucid",
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
    const startBody = reviewSessionResponseSchema.parse(
      (await startResponse.json()) as unknown,
    );
    const userResult = await runtime.database.pool.query<{ id: string }>(
      'SELECT id FROM "user" WHERE email = $1 LIMIT 1',
      ["trace-review@gloss.local"],
    );
    const userId = userResult.rows[0]?.id ?? "";
    const reviewCardResult = await runtime.database.pool.query<PersistedReviewCardRow>(
      `
        SELECT
          answer_key,
          generation_source,
          id,
          (
            SELECT context.text
            FROM seed_contexts context
            WHERE context.seed_id = review_cards.seed_id
              AND context.is_primary = true
            ORDER BY context.created_at ASC
            LIMIT 1
          ) AS primary_sentence_text,
          prompt_payload,
          prompt_template_version,
          schema_version,
          status
        FROM review_cards
        WHERE review_session_id = $1
        ORDER BY position ASC
      `,
      [startBody.data.session.id],
    );
    const reviewCardTraceResult = await runtime.database.pool.query<ReviewCardTraceRow>(
      `
        SELECT
          generation_source,
          input_redacted,
          model,
          output_redacted,
          prompt_template_version,
          provider,
          review_card_id,
          schema_version,
          validation_result
        FROM review_card_traces
        WHERE review_session_id = $1
        ORDER BY created_at ASC
      `,
      [startBody.data.session.id],
    );

    if (
      reviewCardResult.rows.length === 0 ||
      reviewCardResult.rows.some(
        (row) =>
          row.prompt_template_version !== "review-card.v2" ||
          row.schema_version !== "review-card-prompt.v2" ||
          row.status !== "pending" ||
          (typeof row.primary_sentence_text === "string" &&
            typeof row.prompt_payload.sentence === "string" &&
            ((row.prompt_payload.type === "recognition_in_fresh_sentence" &&
              normalizeSentenceForComparison(row.primary_sentence_text) ===
                normalizeSentenceForComparison(row.prompt_payload.sentence)) ||
              (row.prompt_payload.type === "cloze_recall" &&
                row.answer_key.type === "text" &&
                typeof row.answer_key.canonicalAnswer === "string" &&
                row.answer_key.canonicalAnswer.length > 0 &&
                normalizeSentenceForComparison(
                  createBlankedCapturedSentence({
                    capturedSentence: row.primary_sentence_text,
                    word: row.answer_key.canonicalAnswer,
                  }),
                ) ===
                  normalizeSentenceForComparison(row.prompt_payload.sentence)))) ||
          typeof row.prompt_payload.question !== "string" ||
          (row.answer_key.type === "choice"
            ? typeof row.answer_key.correctChoiceId !== "string" ||
              !Array.isArray(row.prompt_payload.choices) ||
              row.prompt_payload.choices.length < 2
            : typeof row.answer_key.canonicalAnswer !== "string" ||
              !Array.isArray(row.answer_key.acceptableAnswers) ||
              typeof row.prompt_payload.sentence !== "string" ||
              row.prompt_payload.type !== "cloze_recall" ||
              !row.prompt_payload.sentence.includes("____") ||
              normalizeEvalWord(row.prompt_payload.question ?? "").includes(
                normalizeEvalWord(row.answer_key.canonicalAnswer),
              ) ||
              normalizeEvalWord(row.prompt_payload.sentence).includes(
                normalizeEvalWord(row.answer_key.canonicalAnswer),
              )),
      )
    ) {
      failures.push({
        caseId: "review_card_trace",
        category: "review_card_persistence",
        journey: "review.session",
        message:
          "Expected persisted review cards to include prompt/schema versions, pending status, choices, and answer keys.",
        severity: "critical",
      });
    }

    if (
      reviewCardTraceResult.rows.length !== reviewCardResult.rows.length ||
      reviewCardTraceResult.rows.some((row) => {
        const matchingCard = reviewCardResult.rows.find(
          (card) => card.id === row.review_card_id,
        );

        return (
          !matchingCard ||
          row.generation_source !== matchingCard.generation_source ||
          row.prompt_template_version !== "review-card.v2" ||
          row.schema_version !== "review-card-prompt.v2" ||
          typeof row.output_redacted !== "object" ||
          row.output_redacted === null ||
          !Array.isArray(row.validation_result.issues) ||
          (!(
            row.validation_result.accepted === true ||
            (row.validation_result.accepted === false &&
              typeof row.output_redacted.fallbackFromModel === "boolean" &&
              row.output_redacted.fallbackFromModel === true &&
              typeof row.output_redacted.fallbackReason === "string" &&
              row.validation_result.issues.length > 0)
          )) ||
          (row.generation_source === "model" && row.input_redacted === null)
        );
      })
    ) {
      failures.push({
        caseId: "review_generation_trace",
        category: "review_trace_persistence",
        journey: "review.session",
        message:
          "Expected review card traces to persist generation metadata, accepted validation results, and redacted model inputs for model-backed cards.",
        severity: "critical",
      });
    }

    for (const [index, row] of reviewCardResult.rows.entries()) {
      const submitResponse = await runtime.app.request(
        new URL(
          `/review/sessions/${startBody.data.session.id}/cards/${row.id}/submit`,
          `${env.API_ORIGIN}/`,
        ).toString(),
        {
          body: JSON.stringify(
            row.answer_key.type === "choice"
              ? {
                  choiceId: row.answer_key.correctChoiceId,
                  latencyMs: 200 + index,
                  type: "choice",
                }
              : {
                  latencyMs: 200 + index,
                  text: row.answer_key.canonicalAnswer,
                  type: "text",
                },
          ),
          headers: {
            "content-type": "application/json",
            cookie,
            origin: env.WEB_ORIGIN,
          },
          method: "POST",
        },
      );

      submitReviewCardResponseSchema.parse((await submitResponse.json()) as unknown);

      if (index === 0) {
        const duplicateSubmitResponse = await runtime.app.request(
          new URL(
            `/review/sessions/${startBody.data.session.id}/cards/${row.id}/submit`,
            `${env.API_ORIGIN}/`,
          ).toString(),
          {
            body: JSON.stringify(
              row.answer_key.type === "choice"
                ? {
                    choiceId: row.answer_key.correctChoiceId,
                    latencyMs: 250,
                    type: "choice",
                  }
                : {
                    latencyMs: 250,
                    text: row.answer_key.canonicalAnswer,
                    type: "text",
                  },
            ),
            headers: {
              "content-type": "application/json",
              cookie,
              origin: env.WEB_ORIGIN,
            },
            method: "POST",
          },
        );
        const duplicateSubmitBody = apiErrorResponseSchema.parse(
          (await duplicateSubmitResponse.json()) as unknown,
        );

        if (
          duplicateSubmitResponse.status !== 409 ||
          duplicateSubmitBody.error.code !== "REVIEW_CONFLICT"
        ) {
          failures.push({
            caseId: "review_duplicate_submit_conflict",
            category: "review_conflict",
            journey: "review.submit",
            message:
              "Expected duplicate review-card submissions to return REVIEW_CONFLICT.",
            severity: "critical",
          });
        }
      }
    }

    const reviewEventResult = await runtime.database.pool.query<ReviewEventTraceRow>(
      `
        SELECT outcome, response_latency_ms, state_delta
        FROM review_events
        WHERE review_session_id = $1
        ORDER BY created_at ASC
      `,
      [startBody.data.session.id],
    );
    const reviewStateResult = await runtime.database.pool.query<{
      distinction_score: number;
      last_session_id: string | null;
      recognition_score: number;
      scheduler_version: string;
      usage_score: number;
    }>(
      `
        SELECT
          recognition_score,
          distinction_score,
          usage_score,
          last_session_id,
          scheduler_version
        FROM review_states
        WHERE seed_id = $1 AND user_id = $2
      `,
      [createBody.data.id, userId],
    );

    if (
      reviewEventResult.rows.length !== reviewCardResult.rows.length ||
      reviewEventResult.rows.some(
        (row) =>
          typeof row.response_latency_ms !== "number" ||
          row.response_latency_ms <= 0 ||
          typeof row.state_delta.nextScore !== "number" ||
          typeof row.state_delta.previousScore !== "number" ||
          typeof row.state_delta.nextDueAt !== "string" ||
          typeof row.state_delta.previousDueAt !== "string" ||
          (row.outcome !== "correct" &&
            row.outcome !== "incorrect" &&
            row.outcome !== "partial" &&
            row.outcome !== "skipped"),
      ) ||
      reviewStateResult.rows[0]?.scheduler_version !== "review-scheduler.v1" ||
      reviewStateResult.rows[0]?.last_session_id !== startBody.data.session.id ||
      ((reviewStateResult.rows[0]?.recognition_score ?? 0) <= 0 &&
        (reviewStateResult.rows[0]?.distinction_score ?? 0) <= 0 &&
        (reviewStateResult.rows[0]?.usage_score ?? 0) <= 0)
    ) {
      failures.push({
        caseId: "review_event_state_trace",
        category: "review_state_persistence",
        journey: "review.submit",
        message:
          "Expected review submissions to append durable events and update scheduler-versioned review state.",
        severity: "critical",
      });
    }

    const futureDueCookie = await signUpHarnessUser({
      app: runtime.app,
      apiOrigin: env.API_ORIGIN,
      email: "trace-review-future@gloss.local",
      name: "Trace Future Review User",
      webOrigin: env.WEB_ORIGIN,
    });
    const futureCreateResponse = await runtime.app.request(
      new URL("/capture/seeds", `${env.API_ORIGIN}/`).toString(),
      {
        body: JSON.stringify({
          sentence: "Her explanation was pellucid even under pressure.",
          source: {
            kind: "book",
            title: "On Style",
          },
          word: "pellucid",
        }),
        headers: {
          "content-type": "application/json",
          cookie: futureDueCookie,
          origin: env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const futureCreateBody = createSeedResponseSchema.parse(
      (await futureCreateResponse.json()) as unknown,
    );
    const futureEnrichResponse = await runtime.app.request(
      new URL(
        `/seeds/${futureCreateBody.data.id}/enrich`,
        `${env.API_ORIGIN}/`,
      ).toString(),
      {
        headers: {
          cookie: futureDueCookie,
          origin: env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );

    requestSeedEnrichmentResponseSchema.parse(
      (await futureEnrichResponse.json()) as unknown,
    );

    const futureUserResult = await runtime.database.pool.query<{ id: string }>(
      'SELECT id FROM "user" WHERE email = $1 LIMIT 1',
      ["trace-review-future@gloss.local"],
    );
    const futureUserId = futureUserResult.rows[0]?.id ?? "";

    await runtime.database.pool.query(
      `
        INSERT INTO review_states (
          id,
          seed_id,
          user_id,
          recognition_score,
          distinction_score,
          usage_score,
          recognition_due_at,
          distinction_due_at,
          usage_due_at,
          last_reviewed_at,
          last_session_id,
          scheduler_version
        )
        VALUES (
          $1, $2, $3,
          1, 1, 1,
          NOW() + INTERVAL '2 days',
          NOW() + INTERVAL '2 days',
          NOW() + INTERVAL '2 days',
          NOW(),
          NULL,
          'review-scheduler.v1'
        )
      `,
      ["trace_future_state", futureCreateBody.data.id, futureUserId],
    );

    const futureQueueResponse = await runtime.app.request(
      new URL("/review/queue", `${env.API_ORIGIN}/`).toString(),
      {
        headers: {
          cookie: futureDueCookie,
          origin: env.WEB_ORIGIN,
        },
      },
    );
    const futureQueueBody = reviewQueueResponseSchema.parse(
      (await futureQueueResponse.json()) as unknown,
    );
    const futureStartResponse = await runtime.app.request(
      new URL("/review/sessions", `${env.API_ORIGIN}/`).toString(),
      {
        body: JSON.stringify({}),
        headers: {
          "content-type": "application/json",
          cookie: futureDueCookie,
          origin: env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const futureStartBody = apiErrorResponseSchema.parse(
      (await futureStartResponse.json()) as unknown,
    );

    if (
      futureQueueBody.data.dueCount !== 0 ||
      futureStartResponse.status !== 409 ||
      futureStartBody.error.code !== "REVIEW_CONFLICT"
    ) {
      failures.push({
        caseId: "review_future_due_filter",
        category: "review_scheduler",
        journey: "review.queue",
        message:
          "Expected future-due review state to stay out of the queue and block session start.",
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

  const reviewFailures = await runReviewTraceChecks();

  logSummary({
    dataset: "review_trace_checks",
    failures: reviewFailures,
    total: 4,
  });

  if (
    httpFailures.length > 0 ||
    enrichmentFailures.length > 0 ||
    reviewFailures.length > 0
  ) {
    throw new Error("Trace evals failed.");
  }
};

if (import.meta.main) {
  await runTraceEvaluations();
}
