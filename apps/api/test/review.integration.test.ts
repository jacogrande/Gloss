import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

import {
  createSeedResponseSchema,
  reviewQueueResponseSchema,
  reviewSessionResponseSchema,
  submitReviewCardResponseSchema,
} from "@gloss/shared/contracts";
import { apiErrorResponseSchema } from "@gloss/shared/schemas";

import {
  createTestContext,
  signUpTestUser,
  type TestContext,
} from "./helpers";
import { createReviewService } from "../src/services/review-service";

let context: TestContext;

type ReviewCardAnswerKeyRow = {
  answer_key:
    | {
        correctChoiceId: string;
        type: "choice";
      }
    | {
        acceptableAnswers: string[];
        canonicalAnswer: string;
        type: "text";
      };
  id: string;
};

const createAndEnrichSeed = async (input: {
  cookie: string;
  email: string;
  sentence?: string;
  source?: {
    kind: "book";
    title: string;
  };
  word: string;
}): Promise<string> => {
  const createResponse = await context.app.request(
    "http://127.0.0.1:8787/capture/seeds",
    {
      body: JSON.stringify({
        sentence: input.sentence ?? null,
        source: input.source,
        word: input.word,
      }),
      headers: {
        "content-type": "application/json",
        cookie: input.cookie,
        origin: context.env.WEB_ORIGIN,
      },
      method: "POST",
    },
  );
  const createBody = createSeedResponseSchema.parse(
    (await createResponse.json()) as unknown,
  );

  await context.app.request(
    `http://127.0.0.1:8787/seeds/${createBody.data.id}/enrich`,
    {
      headers: {
        cookie: input.cookie,
        origin: context.env.WEB_ORIGIN,
      },
      method: "POST",
    },
  );

  return createBody.data.id;
};

describe("review integration", () => {
  beforeAll(async () => {
    context = await createTestContext();
  });

  afterAll(async () => {
    await context?.database.pool.end();
  });

  it("starts a review session and records durable review events", async () => {
    const cookie = await signUpTestUser({
      app: context.app,
      email: "reviewer@example.com",
      env: context.env,
      name: "Reviewer",
    });
    const seedId = await createAndEnrichSeed({
      cookie,
      email: "reviewer@example.com",
      sentence: "Her explanation was pellucid even under pressure.",
      source: {
        kind: "book",
        title: "On Style",
      },
      word: "pellucid",
    });

    const queueResponse = await context.app.request(
      "http://127.0.0.1:8787/review/queue",
      {
        headers: {
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
      },
    );
    const queueBody = reviewQueueResponseSchema.parse(
      (await queueResponse.json()) as unknown,
    );

    expect(queueResponse.status).toBe(200);
    expect(queueBody.data.availableCount).toBeGreaterThan(0);
    expect(queueBody.data.dueCount).toBeGreaterThan(0);

    const startResponse = await context.app.request(
      "http://127.0.0.1:8787/review/sessions",
      {
        body: JSON.stringify({}),
        headers: {
          "content-type": "application/json",
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const startBody = reviewSessionResponseSchema.parse(
      (await startResponse.json()) as unknown,
    );

    expect(startResponse.status).toBe(200);
    expect(startBody.data.session.status).toBe("active");
    expect(startBody.data.cards.length).toBeGreaterThan(0);
    expect(startBody.data.session.currentCardId).toBeTruthy();

    const answerKeyRows = await context.database.pool.query<ReviewCardAnswerKeyRow>(
      `
        SELECT id, answer_key
        FROM review_cards
        WHERE review_session_id = $1
        ORDER BY position ASC
      `,
      [startBody.data.session.id],
    );

    let latestResponse = startBody.data;

    for (const row of answerKeyRows.rows) {
      const submitResponse = await context.app.request(
        `http://127.0.0.1:8787/review/sessions/${startBody.data.session.id}/cards/${row.id}/submit`,
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
            origin: context.env.WEB_ORIGIN,
          },
          method: "POST",
        },
      );
      const submitBody = submitReviewCardResponseSchema.parse(
        (await submitResponse.json()) as unknown,
      );

      expect(submitResponse.status).toBe(200);
      expect(submitBody.data.result.correct).toBe(true);
      latestResponse = submitBody.data.session;
    }

    expect(latestResponse.session.status).toBe("completed");

    const reviewStateResult = await context.database.pool.query<{
      distinction_score: number;
      recognition_score: number;
      usage_score: number;
    }>(
      `
        SELECT recognition_score, distinction_score, usage_score
        FROM review_states
        WHERE seed_id = $1
      `,
      [seedId],
    );
    const reviewEventResult = await context.database.pool.query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
        FROM review_events
        WHERE review_session_id = $1
      `,
      [startBody.data.session.id],
    );

    expect(Number(reviewEventResult.rows[0]?.count ?? "0")).toBe(
      answerKeyRows.rows.length,
    );
    expect(reviewStateResult.rows[0]?.recognition_score ?? 0).toBeGreaterThan(0);
  });

  it("does not treat future-due seeds as reviewable", async () => {
    const email = "future-due@example.com";
    const cookie = await signUpTestUser({
      app: context.app,
      email,
      env: context.env,
      name: "Future Due",
    });
    const seedId = await createAndEnrichSeed({
      cookie,
      email,
      sentence: "Her explanation was pellucid even under pressure.",
      source: {
        kind: "book",
        title: "On Style",
      },
      word: "pellucid",
    });
    const userResult = await context.database.pool.query<{ id: string }>(
      'SELECT id FROM "user" WHERE email = $1 LIMIT 1',
      [email],
    );
    const userId = userResult.rows[0]?.id;

    expect(userId).toBeTruthy();

    await context.database.pool.query(
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
      ["future_state_1", seedId, userId],
    );

    const queueResponse = await context.app.request(
      "http://127.0.0.1:8787/review/queue",
      {
        headers: {
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
      },
    );
    const queueBody = reviewQueueResponseSchema.parse(
      (await queueResponse.json()) as unknown,
    );

    expect(queueBody.data.dueCount).toBe(0);
    expect(queueBody.data.dueByDimension).toEqual({
      distinction: 0,
      recognition: 0,
      usage: 0,
    });

    const startResponse = await context.app.request(
      "http://127.0.0.1:8787/review/sessions",
      {
        body: JSON.stringify({}),
        headers: {
          "content-type": "application/json",
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const errorBody = apiErrorResponseSchema.parse(
      (await startResponse.json()) as unknown,
    );

    expect(startResponse.status).toBe(409);
    expect(errorBody.error.code).toBe("REVIEW_CONFLICT");
  });

  it("reuses the same active session across concurrent starts", async () => {
    const cookie = await signUpTestUser({
      app: context.app,
      email: "concurrent-reviewer@example.com",
      env: context.env,
      name: "Concurrent Reviewer",
    });
    await createAndEnrichSeed({
      cookie,
      email: "concurrent-reviewer@example.com",
      sentence: "Her explanation was pellucid even under pressure.",
      source: {
        kind: "book",
        title: "On Style",
      },
      word: "pellucid",
    });

    const [firstResponse, secondResponse] = await Promise.all([
      context.app.request("http://127.0.0.1:8787/review/sessions", {
        body: JSON.stringify({}),
        headers: {
          "content-type": "application/json",
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      }),
      context.app.request("http://127.0.0.1:8787/review/sessions", {
        body: JSON.stringify({}),
        headers: {
          "content-type": "application/json",
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      }),
    ]);

    const firstBody = reviewSessionResponseSchema.parse(
      (await firstResponse.json()) as unknown,
    );
    const secondBody = reviewSessionResponseSchema.parse(
      (await secondResponse.json()) as unknown,
    );

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(firstBody.data.session.id).toBe(secondBody.data.session.id);
  });

  it("rejects duplicate card submissions with a stable review conflict", async () => {
    const cookie = await signUpTestUser({
      app: context.app,
      email: "duplicate-submit@example.com",
      env: context.env,
      name: "Duplicate Submit",
    });
    await createAndEnrichSeed({
      cookie,
      email: "duplicate-submit@example.com",
      sentence: "Her explanation was pellucid even under pressure.",
      source: {
        kind: "book",
        title: "On Style",
      },
      word: "pellucid",
    });

    const startResponse = await context.app.request(
      "http://127.0.0.1:8787/review/sessions",
      {
        body: JSON.stringify({}),
        headers: {
          "content-type": "application/json",
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const startBody = reviewSessionResponseSchema.parse(
      (await startResponse.json()) as unknown,
    );
    const answerKeyRows = await context.database.pool.query<ReviewCardAnswerKeyRow>(
      `
        SELECT id, answer_key
        FROM review_cards
        WHERE review_session_id = $1
        ORDER BY position ASC
      `,
      [startBody.data.session.id],
    );
    const firstCard = answerKeyRows.rows[0];

    expect(firstCard).toBeTruthy();

    const firstSubmitResponse = await context.app.request(
      `http://127.0.0.1:8787/review/sessions/${startBody.data.session.id}/cards/${firstCard?.id}/submit`,
      {
        body: JSON.stringify(
          firstCard?.answer_key.type === "choice"
            ? {
                choiceId: firstCard.answer_key.correctChoiceId,
                latencyMs: 100,
                type: "choice",
              }
            : {
                latencyMs: 100,
                text: firstCard?.answer_key.canonicalAnswer ?? "",
                type: "text",
              },
        ),
        headers: {
          "content-type": "application/json",
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );

    expect(firstSubmitResponse.status).toBe(200);

    const duplicateSubmitResponse = await context.app.request(
      `http://127.0.0.1:8787/review/sessions/${startBody.data.session.id}/cards/${firstCard?.id}/submit`,
      {
        body: JSON.stringify(
          firstCard?.answer_key.type === "choice"
            ? {
                choiceId: firstCard.answer_key.correctChoiceId,
                latencyMs: 120,
                type: "choice",
              }
            : {
                latencyMs: 120,
                text: firstCard?.answer_key.canonicalAnswer ?? "",
                type: "text",
              },
        ),
        headers: {
          "content-type": "application/json",
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const duplicateBody = apiErrorResponseSchema.parse(
      (await duplicateSubmitResponse.json()) as unknown,
    );

    expect(duplicateSubmitResponse.status).toBe(409);
    expect(duplicateBody.error.code).toBe("REVIEW_CONFLICT");
  });

  it("serves a cloze recall card once recognition is established", async () => {
    const email = "cloze-reviewer@example.com";
    const cookie = await signUpTestUser({
      app: context.app,
      email,
      env: context.env,
      name: "Cloze Reviewer",
    });
    const seedId = await createAndEnrichSeed({
      cookie,
      email,
      sentence: "Her explanation was pellucid even under pressure.",
      source: {
        kind: "book",
        title: "On Style",
      },
      word: "pellucid",
    });
    const userResult = await context.database.pool.query<{ id: string }>(
      'SELECT id FROM "user" WHERE email = $1 LIMIT 1',
      [email],
    );
    const userId = userResult.rows[0]?.id;

    expect(userId).toBeTruthy();

    await context.database.pool.query(
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
          2, 1, 1,
          NOW() - INTERVAL '2 hours',
          NOW() + INTERVAL '2 days',
          NOW() + INTERVAL '2 days',
          NOW(),
          NULL,
          'review-scheduler.v1'
        )
      `,
      ["cloze_state_1", seedId, userId],
    );

    const startResponse = await context.app.request(
      "http://127.0.0.1:8787/review/sessions",
      {
        body: JSON.stringify({}),
        headers: {
          "content-type": "application/json",
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const startBody = reviewSessionResponseSchema.parse(
      (await startResponse.json()) as unknown,
    );
    const firstCard = startBody.data.cards[0];

    expect(startResponse.status).toBe(200);
    expect(startBody.data.session.cardCount).toBe(1);
    expect(firstCard?.exerciseType).toBe("cloze_recall");
    expect(firstCard?.promptPayload.type).toBe("cloze_recall");

    const answerKeyResult = await context.database.pool.query<ReviewCardAnswerKeyRow>(
      `
        SELECT id, answer_key
        FROM review_cards
        WHERE review_session_id = $1
        ORDER BY position ASC
      `,
      [startBody.data.session.id],
    );
    const answerKey = answerKeyResult.rows[0];

    expect(answerKey?.answer_key.type).toBe("text");

    const submitResponse = await context.app.request(
      `http://127.0.0.1:8787/review/sessions/${startBody.data.session.id}/cards/${answerKey?.id}/submit`,
      {
        body: JSON.stringify({
          latencyMs: 150,
          text: "  PELLUCID ",
          type: "text",
        }),
        headers: {
          "content-type": "application/json",
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const submitBody = submitReviewCardResponseSchema.parse(
      (await submitResponse.json()) as unknown,
    );

    expect(submitResponse.status).toBe(200);
    expect(submitBody.data.result.correct).toBe(true);
    expect(submitBody.data.result.submissionType).toBe("text");
    if (submitBody.data.result.submissionType === "text") {
      expect(submitBody.data.result.expectedText).toBe("pellucid");
    }
    expect(submitBody.data.session.session.status).toBe("completed");
  });

  it("rejects stale clients that submit the wrong answer type for a card", async () => {
    const cookie = await signUpTestUser({
      app: context.app,
      email: "mismatch-submit@example.com",
      env: context.env,
      name: "Mismatch Submit",
    });
    await createAndEnrichSeed({
      cookie,
      email: "mismatch-submit@example.com",
      sentence: "Her explanation was pellucid even under pressure.",
      source: {
        kind: "book",
        title: "On Style",
      },
      word: "pellucid",
    });

    const startResponse = await context.app.request(
      "http://127.0.0.1:8787/review/sessions",
      {
        body: JSON.stringify({}),
        headers: {
          "content-type": "application/json",
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const startBody = reviewSessionResponseSchema.parse(
      (await startResponse.json()) as unknown,
    );
    const firstCard = startBody.data.cards[0];

    expect(firstCard).toBeTruthy();
    expect(firstCard?.promptPayload.type).not.toBe("cloze_recall");

    const submitResponse = await context.app.request(
      `http://127.0.0.1:8787/review/sessions/${startBody.data.session.id}/cards/${firstCard?.id}/submit`,
      {
        body: JSON.stringify({
          latencyMs: 120,
          text: "pellucid",
          type: "text",
        }),
        headers: {
          "content-type": "application/json",
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const errorBody = apiErrorResponseSchema.parse(
      (await submitResponse.json()) as unknown,
    );

    expect(submitResponse.status).toBe(409);
    expect(errorBody.error.code).toBe("REVIEW_CONFLICT");
  });

  it("returns a validation error for malformed review submissions", async () => {
    const cookie = await signUpTestUser({
      app: context.app,
      email: "malformed-review-submit@example.com",
      env: context.env,
      name: "Malformed Review Submit",
    });
    await createAndEnrichSeed({
      cookie,
      email: "malformed-review-submit@example.com",
      sentence: "Her explanation was pellucid even under pressure.",
      source: {
        kind: "book",
        title: "On Style",
      },
      word: "pellucid",
    });

    const startResponse = await context.app.request(
      "http://127.0.0.1:8787/review/sessions",
      {
        body: JSON.stringify({}),
        headers: {
          "content-type": "application/json",
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const startBody = reviewSessionResponseSchema.parse(
      (await startResponse.json()) as unknown,
    );
    const firstCard = startBody.data.cards[0];

    expect(firstCard).toBeTruthy();

    const submitResponse = await context.app.request(
      `http://127.0.0.1:8787/review/sessions/${startBody.data.session.id}/cards/${firstCard?.id}/submit`,
      {
        body: '{"type":',
        headers: {
          "content-type": "application/json",
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const submitBody = apiErrorResponseSchema.parse(
      (await submitResponse.json()) as unknown,
    );

    expect(submitResponse.status).toBe(400);
    expect(submitBody.error.code).toBe("VALIDATION_ERROR");
    expect(submitBody.error.message).toBe("Request body must be valid JSON.");
  });

  it("accepts legacy persisted choice answer keys without a discriminator", async () => {
    const email = `legacy-choice-${crypto.randomUUID()}@example.com`;
    const cookie = await signUpTestUser({
      app: context.app,
      email,
      env: context.env,
      name: "Legacy Choice",
    });
    await createAndEnrichSeed({
      cookie,
      email,
      sentence: "Her explanation was pellucid even under pressure.",
      source: {
        kind: "book",
        title: "On Style",
      },
      word: "pellucid",
    });

    const startResponse = await context.app.request(
      "http://127.0.0.1:8787/review/sessions",
      {
        body: JSON.stringify({}),
        headers: {
          "content-type": "application/json",
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const startBody = reviewSessionResponseSchema.parse(
      (await startResponse.json()) as unknown,
    );
    const firstCard = startBody.data.cards[0];

    expect(firstCard?.promptPayload.type).not.toBe("cloze_recall");

    const answerKeyResult = await context.database.pool.query<ReviewCardAnswerKeyRow>(
      `
        SELECT id, answer_key
        FROM review_cards
        WHERE review_session_id = $1
        ORDER BY position ASC
      `,
      [startBody.data.session.id],
    );
    const firstRow = answerKeyResult.rows[0];
    const correctChoiceId =
      firstRow?.answer_key.type === "choice"
        ? firstRow.answer_key.correctChoiceId
        : null;

    expect(firstRow?.answer_key.type).toBe("choice");
    expect(correctChoiceId).toBeTruthy();

    await context.database.pool.query(
      `
        UPDATE review_cards
        SET answer_key = jsonb_build_object('correctChoiceId', $2::text)
        WHERE id = $1
      `,
      [firstRow?.id, correctChoiceId],
    );

    const submitResponse = await context.app.request(
      `http://127.0.0.1:8787/review/sessions/${startBody.data.session.id}/cards/${firstRow?.id}/submit`,
      {
        body: JSON.stringify({
          choiceId: correctChoiceId ?? "",
          latencyMs: 120,
          type: "choice",
        }),
        headers: {
          "content-type": "application/json",
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const submitBody = submitReviewCardResponseSchema.parse(
      (await submitResponse.json()) as unknown,
    );

    expect(submitResponse.status).toBe(200);
    expect(submitBody.data.result.correct).toBe(true);
  });

  it("persists visible fallback traces when live review generation degrades to templates", async () => {
    const email = `review-fallback-${crypto.randomUUID()}@example.com`;
    const cookie = await signUpTestUser({
      app: context.app,
      email,
      env: context.env,
      name: "Fallback Reviewer",
    });
    const seedId = await createAndEnrichSeed({
      cookie,
      email,
      sentence: "Her explanation was pellucid even under pressure.",
      source: {
        kind: "book",
        title: "On Style",
      },
      word: "pellucid",
    });
    const userResult = await context.database.pool.query<{ id: string }>(
      `SELECT id FROM "user" WHERE email = $1 LIMIT 1`,
      [email],
    );
    const userId = userResult.rows[0]?.id ?? "";

    await context.database.pool.query(
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
          2, 1, 1,
          NOW() - INTERVAL '2 hours',
          NOW() + INTERVAL '2 days',
          NOW() + INTERVAL '2 days',
          NOW(),
          NULL,
          'review-scheduler.v1'
        )
      `,
      ["fallback_state_1", seedId, userId],
    );

    const fallbackReviewService = createReviewService({
      db: context.database.db,
      env: context.env,
      logger: context.runtime.logger,
      modelProvider: {
        generateClozeRecallCard: () =>
          Promise.reject(new Error("Forced cloze generation failure.")),
        generateRecognitionFreshSentenceCard: () =>
          Promise.reject(new Error("Forced recognition generation failure.")),
        model: "forced-review-failure",
        provider: "test-provider",
      },
      pool: context.database.pool,
      productEventService: context.runtime.productEventService,
      requestRateLimitService: context.runtime.requestRateLimitService,
    });

    const session = await fallbackReviewService.startOrResumeSession({
      requestId: "fallback-review",
      userId,
    });
    const firstCard = session.cards[0];
    const traceResult = await context.database.pool.query<{
      generation_source: string;
      output_redacted: {
        fallbackFromModel?: boolean;
        fallbackReason?: string;
      };
      validation_result: {
        accepted?: boolean;
        issues?: string[];
      };
    }>(
      `
        SELECT generation_source, output_redacted, validation_result
        FROM review_card_traces
        WHERE review_session_id = $1
        ORDER BY created_at ASC
        LIMIT 1
      `,
      [session.session.id],
    );
    const firstTrace = traceResult.rows[0];

    expect(firstCard?.generationSource).toBe("template");
    expect(firstTrace?.generation_source).toBe("template");
    expect(firstTrace?.output_redacted.fallbackFromModel).toBe(true);
    expect(firstTrace?.output_redacted.fallbackReason).toContain(
      "Forced cloze generation failure.",
    );
    expect(firstTrace?.validation_result.accepted).toBe(false);
    expect(firstTrace?.validation_result.issues?.[0]).toContain(
      "fallback_from_model",
    );
  });

  it("does not allow one user to read or submit another user's review session", async () => {
    const ownerEmail = `review-owner-${crypto.randomUUID()}@example.com`;
    const otherEmail = `review-other-${crypto.randomUUID()}@example.com`;
    const ownerCookie = await signUpTestUser({
      app: context.app,
      email: ownerEmail,
      env: context.env,
      name: "Review Owner",
    });
    const otherCookie = await signUpTestUser({
      app: context.app,
      email: otherEmail,
      env: context.env,
      name: "Review Other",
    });
    await createAndEnrichSeed({
      cookie: ownerCookie,
      email: ownerEmail,
      sentence: "Her explanation was pellucid even under pressure.",
      source: {
        kind: "book",
        title: "On Style",
      },
      word: "pellucid",
    });

    const startResponse = await context.app.request(
      "http://127.0.0.1:8787/review/sessions",
      {
        body: JSON.stringify({}),
        headers: {
          "content-type": "application/json",
          cookie: ownerCookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const startBody = reviewSessionResponseSchema.parse(
      (await startResponse.json()) as unknown,
    );
    const firstCard = startBody.data.cards.find((card) => card.status === "pending");

    expect(firstCard).toBeTruthy();

    const readResponse = await context.app.request(
      `http://127.0.0.1:8787/review/sessions/${startBody.data.session.id}`,
      {
        headers: {
          cookie: otherCookie,
          origin: context.env.WEB_ORIGIN,
        },
      },
    );
    const readBody = apiErrorResponseSchema.parse(
      (await readResponse.json()) as unknown,
    );
    const submitResponse = await context.app.request(
      `http://127.0.0.1:8787/review/sessions/${startBody.data.session.id}/cards/${firstCard?.id}/submit`,
      {
        body: JSON.stringify({
          choiceId: "choice_1",
          latencyMs: 100,
          type: "choice",
        }),
        headers: {
          "content-type": "application/json",
          cookie: otherCookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const submitBody = apiErrorResponseSchema.parse(
      (await submitResponse.json()) as unknown,
    );

    expect(readResponse.status).toBe(404);
    expect(readBody.error.code).toBe("NOT_FOUND");
    expect(submitResponse.status).toBe(404);
    expect(submitBody.error.code).toBe("NOT_FOUND");
  });
});
