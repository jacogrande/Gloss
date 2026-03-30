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

let context: TestContext;

type ReviewCardAnswerKeyRow = {
  answer_key: {
    correctChoiceId: string;
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
          body: JSON.stringify({
            choiceId: row.answer_key.correctChoiceId,
            latencyMs: 250,
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
        body: JSON.stringify({
          choiceId: firstCard?.answer_key.correctChoiceId,
          latencyMs: 100,
        }),
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
        body: JSON.stringify({
          choiceId: firstCard?.answer_key.correctChoiceId,
          latencyMs: 120,
        }),
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
          choiceId: firstCard?.promptPayload.choices[0]?.id ?? "",
          latencyMs: 100,
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
