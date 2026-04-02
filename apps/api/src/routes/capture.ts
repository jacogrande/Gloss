import {
  createSeedInputSchema,
  createSeedResponseSchema,
} from "@gloss/shared/contracts";

import type { GlossApp } from "../app";
import type { GlossAuth } from "../lib/auth";
import {
  jsonSuccess,
  parseJsonBody,
} from "../lib/http";
import { requireSession } from "../lib/session";
import type { RequestRateLimitService } from "../services/request-rate-limit-service";
import type { SeedService } from "../services/seed-service";

type CaptureRouteDependencies = {
  auth: GlossAuth;
  requestRateLimitService: RequestRateLimitService;
  seedService: SeedService;
};

export const registerCaptureRoutes = (
  app: GlossApp,
  dependencies: CaptureRouteDependencies,
): void => {
  app.post("/capture/seeds", async (context) => {
    context.set("journey", "capture.create");
    const session = await requireSession({
      auth: dependencies.auth,
      headers: context.req.raw.headers,
      requestId: context.get("requestId"),
    });
    context.set("actorTag", String(session.user.id));
    context.set("sessionId", String(session.session.id));
    await dependencies.requestRateLimitService.enforce({
      actorKey: String(session.user.id),
      policyKey: "capture.create",
      requestId: context.get("requestId"),
    });
    const body = createSeedInputSchema.parse(await parseJsonBody(context));
    const dbStartedAt = performance.now();
    const createdSeed = await dependencies.seedService.createSeed({
      capture: body,
      userId: String(session.user.id),
    });
    context.set("dbTimeMs", Math.round(performance.now() - dbStartedAt));
    context.set("seedId", createdSeed.id);

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
