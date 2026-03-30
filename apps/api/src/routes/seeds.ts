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
import type { RequestRateLimitService } from "../services/request-rate-limit-service";
import type { SeedService } from "../services/seed-service";

type SeedsRouteDependencies = {
  auth: GlossAuth;
  enrichmentService: EnrichmentService;
  requestRateLimitService: RequestRateLimitService;
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
    const dbStartedAt = performance.now();
    const seedList = await dependencies.seedService.listSeeds({
      query,
      userId: String(session.user.id),
    });
    context.set("dbTimeMs", Math.round(performance.now() - dbStartedAt));

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
    const seedId = context.req.param("seedId");
    context.set("seedId", seedId);
    const dbStartedAt = performance.now();
    const seedDetail = await dependencies.seedService.getSeedDetail({
      requestId: context.get("requestId"),
      seedId,
      userId: String(session.user.id),
    });
    context.set("dbTimeMs", Math.round(performance.now() - dbStartedAt));

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
    const seedId = context.req.param("seedId");
    context.set("seedId", seedId);
    await dependencies.requestRateLimitService.enforce({
      actorKey: String(session.user.id),
      policyKey: "seeds.enrich",
      requestId: context.get("requestId"),
    });

    const enrichment = await dependencies.enrichmentService.requestSeedEnrichment({
      requestId: context.get("requestId"),
      seedId,
      userId: String(session.user.id),
    });
    context.set("guardrailFlags", enrichment.guardrailFlags.join(",") || "none");
    context.set("model", enrichment.model ?? undefined);
    context.set("provider", enrichment.provider ?? undefined);
    context.set("schemaVersion", enrichment.schemaVersion);
    context.set(
      "toolCalls",
      enrichment.status === "failed" &&
        enrichment.errorCode === "ENRICHMENT_EVIDENCE_UNAVAILABLE"
        ? 2
        : 3,
    );
    context.set(
      "validationOutcome",
      enrichment.status === "ready" ? "accepted" : "rejected",
    );

    return jsonSuccess(
      context,
      requestSeedEnrichmentResponseSchema.parse({
        data: enrichment,
        ok: true,
      }).data,
    );
  });
};
