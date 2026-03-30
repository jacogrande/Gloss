import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

import {
  createSeedResponseSchema,
  requestSeedEnrichmentResponseSchema,
  reviewSessionResponseSchema,
  submitReviewCardResponseSchema,
} from "@gloss/shared/contracts";
import { apiErrorResponseSchema } from "@gloss/shared/schemas";

import { defaultRequestRateLimitPolicies } from "../src/lib/request-rate-limit-contracts";
import {
  createTestContext,
  signUpTestUser,
  type TestContext,
} from "./helpers";

type ReviewCardAnswerKeyRow = {
  answer_key: {
    correctChoiceId: string;
  };
  id: string;
};

let context: TestContext;

const createSeed = async (input: {
  cookie: string;
  word: string;
}): Promise<string> => {
  const response = await context.app.request(
    "http://127.0.0.1:8787/capture/seeds",
    {
      body: JSON.stringify({
        sentence: `The sentence uses ${input.word} in context.`,
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

  const body = createSeedResponseSchema.parse((await response.json()) as unknown);

  expect(response.status).toBe(201);

  return body.data.id;
};

describe("request rate limits", () => {
  beforeAll(async () => {
    context = await createTestContext({
      requestRateLimitPolicies: {
        ...defaultRequestRateLimitPolicies,
        "capture.create": {
          key: "capture.create",
          limit: 2,
          windowSeconds: 60,
        },
        "review.session.start": {
          key: "review.session.start",
          limit: 1,
          windowSeconds: 60,
        },
        "review.session.submit": {
          key: "review.session.submit",
          limit: 1,
          windowSeconds: 60,
        },
        "seeds.enrich": {
          key: "seeds.enrich",
          limit: 1,
          windowSeconds: 60,
        },
      },
    });
  });

  afterAll(async () => {
    await context?.database.pool.end();
  });

  it("limits capture mutation bursts per user without affecting other users", async () => {
    const cookie = await signUpTestUser({
      app: context.app,
      email: "rate-capture@example.com",
      env: context.env,
      name: "Rate Capture",
    });

    await createSeed({ cookie, word: "lapidary" });
    await createSeed({ cookie, word: "pellucid" });

    const limitedResponse = await context.app.request(
      "http://127.0.0.1:8787/capture/seeds",
      {
        body: JSON.stringify({
          word: "numinous",
        }),
        headers: {
          "content-type": "application/json",
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const limitedBody = apiErrorResponseSchema.parse(
      (await limitedResponse.json()) as unknown,
    );

    expect(limitedResponse.status).toBe(429);
    expect(limitedBody.error.code).toBe("RATE_LIMITED");
    expect(limitedBody.error.requestId).toBeTruthy();

    const otherCookie = await signUpTestUser({
      app: context.app,
      email: "rate-capture-other@example.com",
      env: context.env,
      name: "Other Capture",
    });
    const otherResponse = await context.app.request(
      "http://127.0.0.1:8787/capture/seeds",
      {
        body: JSON.stringify({
          word: "fastidious",
        }),
        headers: {
          "content-type": "application/json",
          cookie: otherCookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );

    expect(otherResponse.status).toBe(201);
  });

  it("limits enrichment requests per user", async () => {
    const cookie = await signUpTestUser({
      app: context.app,
      email: "rate-enrich@example.com",
      env: context.env,
      name: "Rate Enrich",
    });
    const firstSeedId = await createSeed({
      cookie,
      word: "lapidary",
    });
    const secondSeedId = await createSeed({
      cookie,
      word: "fastidious",
    });

    const firstResponse = await context.app.request(
      `http://127.0.0.1:8787/seeds/${firstSeedId}/enrich`,
      {
        headers: {
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const secondResponse = await context.app.request(
      `http://127.0.0.1:8787/seeds/${secondSeedId}/enrich`,
      {
        headers: {
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const secondBody = apiErrorResponseSchema.parse(
      (await secondResponse.json()) as unknown,
    );

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(429);
    expect(secondBody.error.code).toBe("RATE_LIMITED");
  });

  it("allows harmless enrichment retries to reuse the existing enrichment", async () => {
    const cookie = await signUpTestUser({
      app: context.app,
      email: "rate-enrich-retry@example.com",
      env: context.env,
      name: "Rate Enrich Retry",
    });
    const seedId = await createSeed({
      cookie,
      word: "lapidary",
    });

    const firstResponse = await context.app.request(
      `http://127.0.0.1:8787/seeds/${seedId}/enrich`,
      {
        headers: {
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const secondResponse = await context.app.request(
      `http://127.0.0.1:8787/seeds/${seedId}/enrich`,
      {
        headers: {
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const firstBody = requestSeedEnrichmentResponseSchema.parse(
      (await firstResponse.json()) as unknown,
    );
    const secondBody = requestSeedEnrichmentResponseSchema.parse(
      (await secondResponse.json()) as unknown,
    );

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(secondBody.data.id).toBe(firstBody.data.id);
  });

  it("reuses the active review session without consuming additional start budget", async () => {
    const cookie = await signUpTestUser({
      app: context.app,
      email: "rate-review-start@example.com",
      env: context.env,
      name: "Rate Review Start",
    });
    const seedId = await createSeed({
      cookie,
      word: "pellucid",
    });

    const enrichResponse = await context.app.request(
      `http://127.0.0.1:8787/seeds/${seedId}/enrich`,
      {
        headers: {
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );

    expect(enrichResponse.status).toBe(200);

    const firstStart = await context.app.request(
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
    const secondStart = await context.app.request(
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
    const firstBody = reviewSessionResponseSchema.parse(
      (await firstStart.json()) as unknown,
    );
    const secondBody = reviewSessionResponseSchema.parse(
      (await secondStart.json()) as unknown,
    );

    expect(firstStart.status).toBe(200);
    expect(secondStart.status).toBe(200);
    expect(secondBody.data.session.id).toBe(firstBody.data.session.id);
  });

  it("limits creation of a new review session once the policy window is exhausted", async () => {
    const cookie = await signUpTestUser({
      app: context.app,
      email: "rate-review-create@example.com",
      env: context.env,
      name: "Rate Review Create",
    });
    const seedId = await createSeed({
      cookie,
      word: "pellucid",
    });

    const enrichResponse = await context.app.request(
      `http://127.0.0.1:8787/seeds/${seedId}/enrich`,
      {
        headers: {
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );

    expect(enrichResponse.status).toBe(200);

    const firstStart = await context.app.request(
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
    const firstBody = reviewSessionResponseSchema.parse(
      (await firstStart.json()) as unknown,
    );

    expect(firstStart.status).toBe(200);

    await context.database.pool.query(
      `
        DELETE FROM review_cards
        WHERE review_session_id = $1
      `,
      [firstBody.data.session.id],
    );
    await context.database.pool.query(
      `
        DELETE FROM review_sessions
        WHERE id = $1
      `,
      [firstBody.data.session.id],
    );

    const secondStart = await context.app.request(
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
    const secondBody = apiErrorResponseSchema.parse(
      (await secondStart.json()) as unknown,
    );

    expect(secondStart.status).toBe(429);
    expect(secondBody.error.code).toBe("RATE_LIMITED");
  });

  it("limits repeated review-card submissions", async () => {
    const cookie = await signUpTestUser({
      app: context.app,
      email: "rate-review-submit@example.com",
      env: context.env,
      name: "Rate Review Submit",
    });
    const seedId = await createSeed({
      cookie,
      word: "pellucid",
    });

    const enrichResponse = await context.app.request(
      `http://127.0.0.1:8787/seeds/${seedId}/enrich`,
      {
        headers: {
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );

    expect(enrichResponse.status).toBe(200);

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
    const secondCard = answerKeyRows.rows[1];

    expect(firstCard).toBeTruthy();
    expect(secondCard).toBeTruthy();

    const firstSubmit = await context.app.request(
      `http://127.0.0.1:8787/review/sessions/${startBody.data.session.id}/cards/${firstCard?.id}/submit`,
      {
        body: JSON.stringify({
          choiceId: firstCard?.answer_key.correctChoiceId,
          latencyMs: 180,
        }),
        headers: {
          "content-type": "application/json",
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const secondSubmit = await context.app.request(
      `http://127.0.0.1:8787/review/sessions/${startBody.data.session.id}/cards/${secondCard?.id}/submit`,
      {
        body: JSON.stringify({
          choiceId: secondCard?.answer_key.correctChoiceId,
          latencyMs: 160,
        }),
        headers: {
          "content-type": "application/json",
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const secondBody = apiErrorResponseSchema.parse(
      (await secondSubmit.json()) as unknown,
    );

    expect(firstSubmit.status).toBe(200);
    expect(
      submitReviewCardResponseSchema.parse((await firstSubmit.clone().json()) as unknown)
        .data.result.correct,
    ).toBe(true);
    expect(secondSubmit.status).toBe(429);
    expect(secondBody.error.code).toBe("RATE_LIMITED");
  });
});
