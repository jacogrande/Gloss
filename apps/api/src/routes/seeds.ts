import type { Hono } from "hono";

import {
  listSeedsQuerySchema,
  seedDetailResponseSchema,
  seedListResponseSchema,
} from "@gloss/shared/contracts";

import type { GlossAuth } from "../lib/auth";
import { jsonSuccess } from "../lib/http";
import { requireSession } from "../lib/session";
import type { SeedService } from "../services/seed-service";

type SeedsRouteDependencies = {
  auth: GlossAuth;
  seedService: SeedService;
};

export const registerSeedRoutes = (
  app: Hono<{ Variables: { requestId: string } }>,
  dependencies: SeedsRouteDependencies,
): void => {
  app.get("/seeds", async (context) => {
    const session = await requireSession({
      auth: dependencies.auth,
      headers: context.req.raw.headers,
      requestId: context.get("requestId"),
    });
    const query = listSeedsQuerySchema.parse({
      stage: context.req.query("stage") ?? undefined,
    });
    const seedList = await dependencies.seedService.listSeeds({
      query,
      userId: String(session.user.id),
    });

    return jsonSuccess(
      context,
      seedListResponseSchema.parse({
        data: seedList,
        ok: true,
      }).data,
    );
  });

  app.get("/seeds/:seedId", async (context) => {
    const session = await requireSession({
      auth: dependencies.auth,
      headers: context.req.raw.headers,
      requestId: context.get("requestId"),
    });
    const seedDetail = await dependencies.seedService.getSeedDetail({
      requestId: context.get("requestId"),
      seedId: context.req.param("seedId"),
      userId: String(session.user.id),
    });

    return jsonSuccess(
      context,
      seedDetailResponseSchema.parse({
        data: seedDetail,
        ok: true,
      }).data,
    );
  });
};
