import type { Hono } from "hono";

import {
  createSeedInputSchema,
  createSeedResponseSchema,
} from "@gloss/shared/contracts";

import type { GlossAuth } from "../lib/auth";
import { jsonSuccess } from "../lib/http";
import { requireSession } from "../lib/session";
import type { SeedService } from "../services/seed-service";

type CaptureRouteDependencies = {
  auth: GlossAuth;
  seedService: SeedService;
};

export const registerCaptureRoutes = (
  app: Hono<{ Variables: { requestId: string } }>,
  dependencies: CaptureRouteDependencies,
): void => {
  app.post("/capture/seeds", async (context) => {
    const session = await requireSession({
      auth: dependencies.auth,
      headers: context.req.raw.headers,
      requestId: context.get("requestId"),
    });
    const body = createSeedInputSchema.parse(await context.req.json());
    const createdSeed = await dependencies.seedService.createSeed({
      capture: body,
      userId: String(session.user.id),
    });

    return jsonSuccess(
      context,
      createSeedResponseSchema.parse({
        data: createdSeed,
        ok: true,
      }).data,
      201,
    );
  });
};
