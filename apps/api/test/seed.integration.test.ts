import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createSeedResponseSchema,
  requestSeedEnrichmentResponseSchema,
  seedDetailResponseSchema,
  seedListResponseSchema,
} from "@gloss/shared/contracts";
import { apiErrorResponseSchema } from "@gloss/shared/schemas";

import {
  createTestContext,
  signUpTestUser,
  type TestContext,
} from "./helpers";

let context: TestContext;

describe("seed integration", () => {
  beforeAll(async () => {
    context = await createTestContext();
  });

  afterAll(async () => {
    await context?.database.pool.end();
  });

  it("creates a seed, lists it, and fetches its detail for the owner", async () => {
    const cookie = await signUpTestUser({
      app: context.app,
      email: "reader@example.com",
      env: context.env,
      name: "Reader",
    });
    const createResponse = await context.app.request(
      "http://127.0.0.1:8787/capture/seeds",
      {
        body: JSON.stringify({
          sentence:
            "The prose became unexpectedly lapidary by the final chapter.",
          source: {
            kind: "book",
            title: "Collected Essays",
          },
          word: "lapidary",
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
    const listResponse = await context.app.request("http://127.0.0.1:8787/seeds", {
      headers: {
        cookie,
        origin: context.env.WEB_ORIGIN,
      },
    });
    const listBody = seedListResponseSchema.parse(
      (await listResponse.json()) as unknown,
    );
    const detailResponse = await context.app.request(
      `http://127.0.0.1:8787/seeds/${createBody.data.id}`,
      {
        headers: {
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
      },
    );
    const detailBody = seedDetailResponseSchema.parse(
      (await detailResponse.json()) as unknown,
    );

    expect(createResponse.status).toBe(201);
    expect(createBody.data.word).toBe("lapidary");
    expect(createBody.data.enrichment).toBeNull();
    expect(createBody.data.source?.title).toBe("Collected Essays");
    expect(listResponse.status).toBe(200);
    expect(listBody.data.total).toBe(1);
    expect(listBody.data.items[0]?.id).toBe(createBody.data.id);
    expect(listBody.data.items[0]?.source?.title).toBe("Collected Essays");
    expect(detailResponse.status).toBe(200);
    expect(detailBody.data.contexts[0]?.text).toContain("lapidary");
    expect(detailBody.data.source?.title).toBe("Collected Essays");
  });

  it("filters seeds by stage for the current user", async () => {
    const cookie = await signUpTestUser({
      app: context.app,
      email: "stage-reader@example.com",
      env: context.env,
      name: "Stage Reader",
    });

    await context.app.request("http://127.0.0.1:8787/capture/seeds", {
      body: JSON.stringify({
        word: "fastidious",
      }),
      headers: {
        "content-type": "application/json",
        cookie,
        origin: context.env.WEB_ORIGIN,
      },
      method: "POST",
    });

    const response = await context.app.request(
      "http://127.0.0.1:8787/seeds?stage=new",
      {
        headers: {
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
      },
    );
    const body = seedListResponseSchema.parse((await response.json()) as unknown);

    expect(response.status).toBe(200);
    expect(body.data.total).toBe(1);
    expect(body.data.items[0]?.stage).toBe("new");
  });

  it("does not allow one user to read another user's seed", async () => {
    const ownerCookie = await signUpTestUser({
      app: context.app,
      email: "owner@example.com",
      env: context.env,
      name: "Owner",
    });
    const otherCookie = await signUpTestUser({
      app: context.app,
      email: "other@example.com",
      env: context.env,
      name: "Other",
    });
    const createResponse = await context.app.request(
      "http://127.0.0.1:8787/capture/seeds",
      {
        body: JSON.stringify({
          word: "punctilious",
        }),
        headers: {
          "content-type": "application/json",
          cookie: ownerCookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const createBody = createSeedResponseSchema.parse(
      (await createResponse.json()) as unknown,
    );
    const listResponse = await context.app.request("http://127.0.0.1:8787/seeds", {
      headers: {
        cookie: otherCookie,
        origin: context.env.WEB_ORIGIN,
      },
    });
    const listBody = seedListResponseSchema.parse(
      (await listResponse.json()) as unknown,
    );
    const detailResponse = await context.app.request(
      `http://127.0.0.1:8787/seeds/${createBody.data.id}`,
      {
        headers: {
          cookie: otherCookie,
          origin: context.env.WEB_ORIGIN,
        },
      },
    );
    const detailBody = apiErrorResponseSchema.parse(
      (await detailResponse.json()) as unknown,
    );

    expect(listBody.data.total).toBe(0);
    expect(detailResponse.status).toBe(404);
    expect(detailBody.error.code).toBe("NOT_FOUND");
  });

  it("exposes split-origin CORS headers on product routes", async () => {
    const preflightResponse = await context.app.request(
      "http://127.0.0.1:8787/capture/seeds",
      {
        headers: {
          "access-control-request-headers": "content-type",
          "access-control-request-method": "POST",
          origin: context.env.WEB_ORIGIN,
        },
        method: "OPTIONS",
      },
    );
    const cookie = await signUpTestUser({
      app: context.app,
      email: "cors-reader@example.com",
      env: context.env,
      name: "CORS Reader",
    });
    const listResponse = await context.app.request("http://127.0.0.1:8787/seeds", {
      headers: {
        cookie,
        origin: context.env.WEB_ORIGIN,
      },
    });

    expect(preflightResponse.headers.get("access-control-allow-origin")).toBe(
      context.env.WEB_ORIGIN,
    );
    expect(
      preflightResponse.headers.get("access-control-allow-credentials"),
    ).toBe("true");
    expect(listResponse.headers.get("access-control-allow-origin")).toBe(
      context.env.WEB_ORIGIN,
    );
    expect(listResponse.headers.get("x-request-id")).toBeTruthy();
  });

  it("rejects unauthenticated seed creation", async () => {
    const response = await context.app.request(
      "http://127.0.0.1:8787/capture/seeds",
      {
        body: JSON.stringify({
          word: "lapidary",
        }),
        headers: {
          "content-type": "application/json",
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const body = apiErrorResponseSchema.parse((await response.json()) as unknown);

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("AUTH_UNAUTHORIZED");
    expect(body.error.requestId).toBeTruthy();
    expect(response.headers.get("x-request-id")).toBeTruthy();
  });

  it("enriches a seed for the owner and exposes the enrichment on seed detail", async () => {
    const cookie = await signUpTestUser({
      app: context.app,
      email: "enrichment@example.com",
      env: context.env,
      name: "Enrichment Reader",
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
    const enrichResponse = await context.app.request(
      `http://127.0.0.1:8787/seeds/${createBody.data.id}/enrich`,
      {
        headers: {
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const enrichBody = requestSeedEnrichmentResponseSchema.parse(
      (await enrichResponse.json()) as unknown,
    );
    const detailResponse = await context.app.request(
      `http://127.0.0.1:8787/seeds/${createBody.data.id}`,
      {
        headers: {
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
      },
    );
    const detailBody = seedDetailResponseSchema.parse(
      (await detailResponse.json()) as unknown,
    );

    expect(enrichResponse.status).toBe(200);
    expect(enrichBody.data.status).toBe("ready");
    expect(enrichBody.data.payload?.gloss).toContain("clear");
    expect(enrichBody.data.payload?.relatedWord?.word).toBe("lucid");
    expect(detailBody.data.enrichment?.status).toBe("ready");
    expect(detailBody.data.enrichment?.payload?.contrastiveWord?.word).toBe(
      "opaque",
    );
  });

  it("returns a failed enrichment state when evidence is unavailable", async () => {
    const cookie = await signUpTestUser({
      app: context.app,
      email: "thin-evidence@example.com",
      env: context.env,
      name: "Thin Evidence",
    });
    const createResponse = await context.app.request(
      "http://127.0.0.1:8787/capture/seeds",
      {
        body: JSON.stringify({
          word: "obscurium",
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
    const enrichResponse = await context.app.request(
      `http://127.0.0.1:8787/seeds/${createBody.data.id}/enrich`,
      {
        headers: {
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const enrichBody = requestSeedEnrichmentResponseSchema.parse(
      (await enrichResponse.json()) as unknown,
    );

    expect(enrichResponse.status).toBe(200);
    expect(enrichBody.data.status).toBe("failed");
    expect(enrichBody.data.errorCode).toBe("ENRICHMENT_EVIDENCE_UNAVAILABLE");
    expect(enrichBody.data.payload).toBeNull();
  });

  it("does not allow one user to enrich another user's seed", async () => {
    const ownerCookie = await signUpTestUser({
      app: context.app,
      email: "owner-enrich@example.com",
      env: context.env,
      name: "Owner Enrich",
    });
    const otherCookie = await signUpTestUser({
      app: context.app,
      email: "other-enrich@example.com",
      env: context.env,
      name: "Other Enrich",
    });
    const createResponse = await context.app.request(
      "http://127.0.0.1:8787/capture/seeds",
      {
        body: JSON.stringify({
          word: "pellucid",
        }),
        headers: {
          "content-type": "application/json",
          cookie: ownerCookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const createBody = createSeedResponseSchema.parse(
      (await createResponse.json()) as unknown,
    );
    const enrichResponse = await context.app.request(
      `http://127.0.0.1:8787/seeds/${createBody.data.id}/enrich`,
      {
        headers: {
          cookie: otherCookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const enrichBody = apiErrorResponseSchema.parse(
      (await enrichResponse.json()) as unknown,
    );

    expect(enrichResponse.status).toBe(404);
    expect(enrichBody.error.code).toBe("NOT_FOUND");
  });
});
