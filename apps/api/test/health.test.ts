import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { healthResponseSchema } from "@gloss/shared/contracts";

import { createTestContext } from "./helpers";

let context: Awaited<ReturnType<typeof createTestContext>>;

describe("health endpoint", () => {
  beforeAll(async () => {
    context = await createTestContext();
  });

  afterAll(async () => {
    await context?.database.pool.end();
  });

  it("returns the typed health response", async () => {
    const response = await context.app.request("http://127.0.0.1:8787/health");
    const body: unknown = await response.json();
    const parsed = healthResponseSchema.parse(body);

    expect(response.status).toBe(200);
    expect(parsed.ok).toBe(true);
    expect(parsed.data.service).toBe("api");
    expect(parsed.data.status).toBe("ok");
  });
});
