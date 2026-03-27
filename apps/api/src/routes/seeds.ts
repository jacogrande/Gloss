import {
  listSeedsQuerySchema,
  requestSeedEnrichmentResponseSchema,
  seedDetailResponseSchema,
  seedListResponseSchema,
} from "@gloss/shared/contracts";

import type { GlossApp } from "../app";
import type { GlossAuth } from "../lib/auth";
import { jsonSuccess } from "../lib/http";
import { requireSession } from "../lib/session";
import type { EnrichmentService } from "../services/enrichment-service";
import type { SeedService } from "../services/seed-service";

type SeedsRouteDependencies = {
  auth: GlossAuth;
  enrichmentService: EnrichmentService;
  seedService: SeedService;
};

export const registerSeedRoutes = (
  app: GlossApp,
  dependencies: SeedsRouteDependencies,
): void => {
  app.get("/seeds", async (context) => {
    context.set("journey", "seeds.list");
    const session = await requireSession({
      auth: dependencies.auth,
      headers: context.req.raw.headers,
      requestId: context.get("requestId"),
    });
    context.set("actorTag", String(session.user.id));
    context.set("sessionId", String(session.session.id));
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
    context.set("journey", "seeds.detail");
    const session = await requireSession({
      auth: dependencies.auth,
      headers: context.req.raw.headers,
      requestId: context.get("requestId"),
    });
    context.set("actorTag", String(session.user.id));
    context.set("sessionId", String(session.session.id));
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

  app.post("/seeds/:seedId/enrich", async (context) => {
    context.set("journey", "seeds.enrich");
    const session = await requireSession({
      auth: dependencies.auth,
      headers: context.req.raw.headers,
      requestId: context.get("requestId"),
    });
    context.set("actorTag", String(session.user.id));
    context.set("sessionId", String(session.session.id));

    const enrichment = await dependencies.enrichmentService.requestSeedEnrichment({
      requestId: context.get("requestId"),
      seedId: context.req.param("seedId"),
      userId: String(session.user.id),
    });

    return jsonSuccess(
      context,
      requestSeedEnrichmentResponseSchema.parse({
        data: enrichment,
        ok: true,
      }).data,
    );
  });
};
