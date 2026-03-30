import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

import {
  createSeedResponseSchema,
  reviewSessionResponseSchema,
  submitReviewCardResponseSchema,
} from "@gloss/shared/contracts";

import {
  createTestContext,
  signInTestUser,
  signOutTestUser,
  signUpTestUser,
  type TestContext,
} from "./helpers";

type ProductEventRow = {
  actor_tag: string;
  payload: Record<string, unknown>;
  review_session_id: string | null;
  seed_id: string | null;
  session_id: string | null;
  type: string;
  user_id: string | null;
};

type ReviewCardAnswerKeyRow = {
  answer_key: {
    correctChoiceId: string;
  };
  id: string;
};

let context: TestContext;

describe("product event integration", () => {
  beforeAll(async () => {
    context = await createTestContext();
  });

  afterAll(async () => {
    await context?.database.pool.end();
  });

  it("records auth success and failure events without storing raw email addresses", async () => {
    const email = "events-reader@example.com";
    const cookie = await signUpTestUser({
      app: context.app,
      email,
      env: context.env,
      name: "Events Reader",
    });

    await signOutTestUser({
      app: context.app,
      cookie,
      env: context.env,
    });

    await signInTestUser({
      app: context.app,
      email,
      env: context.env,
    });

    await context.app.request("http://127.0.0.1:8787/api/auth/sign-in/email", {
      body: JSON.stringify({
        email: "missing-reader@example.com",
        password: "password1234",
      }),
      headers: {
        "content-type": "application/json",
        origin: context.env.WEB_ORIGIN,
      },
      method: "POST",
    });
    await context.app.request("http://127.0.0.1:8787/api/auth/sign-in/email", {
      body: "email=missing-reader@example.com",
      headers: {
        "content-type": "text/plain",
        origin: context.env.WEB_ORIGIN,
      },
      method: "POST",
    });

    const result = await context.database.pool.query<ProductEventRow>(
      `
        SELECT type, actor_tag, user_id, session_id, payload, seed_id, review_session_id
        FROM product_events
        WHERE type IN ('auth.sign_in', 'auth.sign_in_failed', 'auth.sign_up')
        ORDER BY occurred_at ASC
      `,
    );
    const eventTypes = result.rows.map((row) => row.type);
    const authSignInEvents = result.rows.filter((row) => row.type === "auth.sign_in");

    expect(eventTypes).toContain("auth.sign_up");
    expect(eventTypes).toContain("auth.sign_in");
    expect(eventTypes).toContain("auth.sign_in_failed");
    expect(authSignInEvents).toHaveLength(1);
    expect(
      result.rows.filter((row) => row.type === "auth.sign_in_failed"),
    ).toHaveLength(2);

    const failureEvent = result.rows.find((row) => row.type === "auth.sign_in_failed");
    const anonymousFailureEvent = result.rows.find(
      (row) =>
        row.type === "auth.sign_in_failed" && row.actor_tag === "anonymous",
    );

    expect(failureEvent?.actor_tag).toMatch(/^email:/);
    expect(failureEvent?.actor_tag).not.toContain("missing-reader@example.com");
    expect(failureEvent?.payload.status).toBe(401);
    expect(anonymousFailureEvent?.payload.status).toBeGreaterThanOrEqual(400);
  });

  it("records capture and enrichment lifecycle events", async () => {
    const cookie = await signUpTestUser({
      app: context.app,
      email: "capture-events@example.com",
      env: context.env,
      name: "Capture Events",
    });
    const createResponse = await context.app.request(
      "http://127.0.0.1:8787/capture/seeds",
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
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );

    const result = await context.database.pool.query<ProductEventRow>(
      `
        SELECT type, payload
        FROM product_events
        WHERE seed_id = $1
        ORDER BY occurred_at ASC
      `,
      [createBody.data.id],
    );

    expect(result.rows.map((row) => row.type)).toEqual([
      "seed.capture",
      "seed.enrichment.requested",
      "seed.enrichment.ready",
    ]);
    expect(result.rows[0]?.payload.hasSentence).toBe(true);
    expect(result.rows[2]?.payload.guardrailFlagCount).toBeGreaterThanOrEqual(0);
  });

  it("records review lifecycle events through session completion", async () => {
    const cookie = await signUpTestUser({
      app: context.app,
      email: "review-events@example.com",
      env: context.env,
      name: "Review Events",
    });
    const createResponse = await context.app.request(
      "http://127.0.0.1:8787/capture/seeds",
      {
        body: JSON.stringify({
          sentence: "Her explanation was pellucid even under pressure.",
          word: "pellucid",
        }),
        headers: {
          "content-type": "application/json",
          cookie,
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
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
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
    const answerKeys = await context.database.pool.query<ReviewCardAnswerKeyRow>(
      `
        SELECT id, answer_key
        FROM review_cards
        WHERE review_session_id = $1
        ORDER BY position ASC
      `,
      [startBody.data.session.id],
    );

    for (const row of answerKeys.rows) {
      const submitResponse = await context.app.request(
        `http://127.0.0.1:8787/review/sessions/${startBody.data.session.id}/cards/${row.id}/submit`,
        {
          body: JSON.stringify({
            choiceId: row.answer_key.correctChoiceId,
            latencyMs: 150,
          }),
          headers: {
            "content-type": "application/json",
            cookie,
            origin: context.env.WEB_ORIGIN,
          },
          method: "POST",
        },
      );

      submitReviewCardResponseSchema.parse((await submitResponse.json()) as unknown);
    }

    const result = await context.database.pool.query<ProductEventRow>(
      `
        SELECT type, payload
        FROM product_events
        WHERE review_session_id = $1
        ORDER BY occurred_at ASC
      `,
      [startBody.data.session.id],
    );
    const submissionCount = result.rows.filter(
      (row) => row.type === "review.card.submitted",
    ).length;

    expect(result.rows[0]?.type).toBe("review.session.started");
    expect(result.rows[0]?.payload.seedIds).toEqual(
      expect.arrayContaining([createBody.data.id]),
    );
    expect(submissionCount).toBe(answerKeys.rows.length);
    expect(result.rows.some((row) => row.type === "review.session.completed")).toBe(
      true,
    );
  });
});
