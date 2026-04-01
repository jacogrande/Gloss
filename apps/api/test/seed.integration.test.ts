import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createSeedResponseSchema,
  requestSeedEnrichmentResponseSchema,
  seedDetailResponseSchema,
  seedListResponseSchema,
  updateSeedResponseSchema,
} from "@gloss/shared/contracts";
import { apiErrorResponseSchema } from "@gloss/shared/schemas";

import {
  createTestContext,
  signUpTestUser,
  type TestContext,
} from "./helpers";
import type { EnrichmentProviders } from "../src/lib/enrichment-providers";

let context: TestContext;

const createDeferred = <TValue>(): {
  promise: Promise<TValue>;
  reject: (reason?: unknown) => void;
  resolve: (value: TValue | PromiseLike<TValue>) => void;
} => {
  let resolve!: (value: TValue | PromiseLike<TValue>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<TValue>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {
    promise,
    reject,
    resolve,
  };
};

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

  it("updates sentence and source metadata for the owner", async () => {
    const cookie = await signUpTestUser({
      app: context.app,
      email: "update-owner@example.com",
      env: context.env,
      name: "Update Owner",
    });
    const createResponse = await context.app.request(
      "http://127.0.0.1:8787/capture/seeds",
      {
        body: JSON.stringify({
          word: "laconic",
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
    const updateResponse = await context.app.request(
      `http://127.0.0.1:8787/seeds/${createBody.data.id}`,
      {
        body: JSON.stringify({
          sentence: "Her reply was laconic but precise.",
          source: {
            kind: "article",
            title: "On Style",
          },
        }),
        headers: {
          "content-type": "application/json",
          cookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "PATCH",
      },
    );
    const updateBody = updateSeedResponseSchema.parse(
      (await updateResponse.json()) as unknown,
    );

    expect(updateResponse.status).toBe(200);
    expect(updateBody.data.primarySentence).toBe("Her reply was laconic but precise.");
    expect(updateBody.data.source?.title).toBe("On Style");
    expect(updateBody.data.contexts[0]?.text).toBe("Her reply was laconic but precise.");
  });

  it("does not allow one user to update another user's seed", async () => {
    const ownerCookie = await signUpTestUser({
      app: context.app,
      email: "update-foreign-owner@example.com",
      env: context.env,
      name: "Update Foreign Owner",
    });
    const otherCookie = await signUpTestUser({
      app: context.app,
      email: "update-foreign-other@example.com",
      env: context.env,
      name: "Update Foreign Other",
    });
    const createResponse = await context.app.request(
      "http://127.0.0.1:8787/capture/seeds",
      {
        body: JSON.stringify({
          word: "reticent",
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
    const updateResponse = await context.app.request(
      `http://127.0.0.1:8787/seeds/${createBody.data.id}`,
      {
        body: JSON.stringify({
          sentence: "This should not be allowed.",
        }),
        headers: {
          "content-type": "application/json",
          cookie: otherCookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "PATCH",
      },
    );
    const updateBody = apiErrorResponseSchema.parse(
      (await updateResponse.json()) as unknown,
    );

    expect(updateResponse.status).toBe(404);
    expect(updateBody.error.code).toBe("NOT_FOUND");
  });

  it("does not allow one user to enrich another user's seed", async () => {
    const ownerEmail = `owner-enrich-${crypto.randomUUID()}@example.com`;
    const otherEmail = `other-enrich-${crypto.randomUUID()}@example.com`;
    const ownerCookie = await signUpTestUser({
      app: context.app,
      email: ownerEmail,
      env: context.env,
      name: "Owner Enrich",
    });
    const otherCookie = await signUpTestUser({
      app: context.app,
      email: otherEmail,
      env: context.env,
      name: "Other Enrich",
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
          cookie: ownerCookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const createBody = createSeedResponseSchema.parse(
      (await createResponse.json()) as unknown,
    );
    const response = await context.app.request(
      `http://127.0.0.1:8787/seeds/${createBody.data.id}/enrich`,
      {
        headers: {
          cookie: otherCookie,
          origin: context.env.WEB_ORIGIN,
        },
        method: "POST",
      },
    );
    const body = apiErrorResponseSchema.parse((await response.json()) as unknown);

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
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

  it("persists a failed enrichment state when a provider throws after pending is acquired", async () => {
    const failingProviders: EnrichmentProviders = {
      lexicalEvidenceProvider: {
        getDictionaryEntry: () =>
          Promise.reject(new Error("Dictionary unavailable.")),
        getRelationCandidates: () =>
          Promise.resolve({
            contrastCandidates: [],
            relatedCandidates: [],
          }),
      },
      modelProvider: {
        generate: () =>
          Promise.reject(new Error("Model should not be called.")),
        model: "fixture-model",
        provider: "fixture",
      },
    };
    const failingContext = await createTestContext({
      enrichmentProviders: failingProviders,
    });

    try {
      const cookie = await signUpTestUser({
        app: failingContext.app,
        email: "provider-failure@example.com",
        env: failingContext.env,
        name: "Provider Failure",
      });
      const createResponse = await failingContext.app.request(
        "http://127.0.0.1:8787/capture/seeds",
        {
          body: JSON.stringify({
            word: "pellucid",
          }),
          headers: {
            "content-type": "application/json",
            cookie,
            origin: failingContext.env.WEB_ORIGIN,
          },
          method: "POST",
        },
      );
      const createBody = createSeedResponseSchema.parse(
        (await createResponse.json()) as unknown,
      );
      const enrichResponse = await failingContext.app.request(
        `http://127.0.0.1:8787/seeds/${createBody.data.id}/enrich`,
        {
          headers: {
            cookie,
            origin: failingContext.env.WEB_ORIGIN,
          },
          method: "POST",
        },
      );
      const enrichBody = requestSeedEnrichmentResponseSchema.parse(
        (await enrichResponse.json()) as unknown,
      );
      const detailResponse = await failingContext.app.request(
        `http://127.0.0.1:8787/seeds/${createBody.data.id}`,
        {
          headers: {
            cookie,
            origin: failingContext.env.WEB_ORIGIN,
          },
        },
      );
      const detailBody = seedDetailResponseSchema.parse(
        (await detailResponse.json()) as unknown,
      );

      expect(enrichResponse.status).toBe(200);
      expect(enrichBody.data.status).toBe("failed");
      expect(enrichBody.data.errorCode).toBe("ENRICHMENT_PROVIDER_ERROR");
      expect(detailBody.data.enrichment?.status).toBe("failed");
      expect(detailBody.data.enrichment?.payload).toBeNull();
    } finally {
      await failingContext.database.pool.end();
    }
  });

  it("avoids duplicate provider work when two enrichment requests race", async () => {
    const dictionaryStarted = createDeferred<void>();
    const dictionaryRelease = createDeferred<{
      exampleSentences: string[];
      glosses: string[];
      lemma: string;
      morphologyHints: string[];
      partOfSpeech: string | null;
      registerLabels: string[];
    } | null>();
    let relationCalls = 0;
    let dictionaryCalls = 0;
    let modelCalls = 0;
    const concurrentProviders: EnrichmentProviders = {
      lexicalEvidenceProvider: {
        getDictionaryEntry: async () => {
          dictionaryCalls += 1;
          dictionaryStarted.resolve();

          return await dictionaryRelease.promise;
        },
        getRelationCandidates: () => {
          relationCalls += 1;

          return Promise.resolve({
            contrastCandidates: ["opaque"],
            relatedCandidates: ["lucid"],
          });
        },
      },
      modelProvider: {
        generate: () => {
          modelCalls += 1;

          return Promise.resolve({
            contrastiveWord: {
              note: "Opaque language hides what pellucid language makes clear.",
              word: "opaque",
            },
            gloss:
              "In this sentence, it means the explanation was especially clear and easy to follow.",
            registerNote: "It sounds more formal than everyday clear.",
            relatedWord: {
              note: "Both words praise clarity.",
              word: "lucid",
            },
          });
        },
        model: "fixture-model",
        provider: "fixture",
      },
    };
    const concurrentContext = await createTestContext({
      enrichmentProviders: concurrentProviders,
    });

    try {
      const cookie = await signUpTestUser({
        app: concurrentContext.app,
        email: "concurrency@example.com",
        env: concurrentContext.env,
        name: "Concurrency Reader",
      });
      const createResponse = await concurrentContext.app.request(
        "http://127.0.0.1:8787/capture/seeds",
        {
          body: JSON.stringify({
            word: "pellucid",
          }),
          headers: {
            "content-type": "application/json",
            cookie,
            origin: concurrentContext.env.WEB_ORIGIN,
          },
          method: "POST",
        },
      );
      const createBody = createSeedResponseSchema.parse(
        (await createResponse.json()) as unknown,
      );
      const firstEnrichPromise = concurrentContext.app.request(
        `http://127.0.0.1:8787/seeds/${createBody.data.id}/enrich`,
        {
          headers: {
            cookie,
            origin: concurrentContext.env.WEB_ORIGIN,
          },
          method: "POST",
        },
      );

      await dictionaryStarted.promise;

      const secondEnrichPromise = concurrentContext.app.request(
        `http://127.0.0.1:8787/seeds/${createBody.data.id}/enrich`,
        {
          headers: {
            cookie,
            origin: concurrentContext.env.WEB_ORIGIN,
          },
          method: "POST",
        },
      );

      dictionaryRelease.resolve({
        exampleSentences: [
          "Her explanation remained pellucid even as the discussion became technical.",
        ],
        glosses: ["clear and easy to understand"],
        lemma: "pellucid",
        morphologyHints: [
          "Merriam segments the headword as pel·lu·cid, which can help you notice the word's internal structure.",
        ],
        partOfSpeech: "adjective",
        registerLabels: ["formal"],
      });

      const [firstEnrichResponse, secondEnrichResponse] = await Promise.all([
        firstEnrichPromise,
        secondEnrichPromise,
      ]);
      const firstEnrichBody = requestSeedEnrichmentResponseSchema.parse(
        (await firstEnrichResponse.json()) as unknown,
      );
      const secondEnrichBody = requestSeedEnrichmentResponseSchema.parse(
        (await secondEnrichResponse.json()) as unknown,
      );

      expect(firstEnrichBody.data.status).toBe("ready");
      expect(["pending", "ready"]).toContain(secondEnrichBody.data.status);
      expect(dictionaryCalls).toBe(1);
      expect(relationCalls).toBe(1);
      expect(modelCalls).toBe(1);
    } finally {
      await concurrentContext.database.pool.end();
    }
  });
});
