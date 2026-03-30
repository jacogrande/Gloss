import {
  Hono,
} from "hono";
import { cors } from "hono/cors";

import { productEventSchemaVersion } from "@gloss/shared/contracts";
import type { ServerEnv } from "@gloss/shared/env";

import type { GlossAuth } from "./lib/auth";
import {
  extractEmailActorTag,
  resolveAuthFailureErrorCode,
  resolveAuthJourney,
} from "./lib/auth-observability";
import { toErrorResponse } from "./lib/http";
import type { Logger } from "./lib/logger";
import { registerCaptureRoutes } from "./routes/capture";
import { registerHealthRoute } from "./routes/health";
import { registerMeRoute } from "./routes/me";
import { registerReviewRoutes } from "./routes/review";
import { registerSeedRoutes } from "./routes/seeds";
import type { EnrichmentService } from "./services/enrichment-service";
import type { ProfileService } from "./services/profile-service";
import type { ProductEventService } from "./services/product-event-service";
import type { RequestRateLimitService } from "./services/request-rate-limit-service";
import type { ReviewService } from "./services/review-service";
import type { SeedService } from "./services/seed-service";

type AppDependencies = {
  auth: GlossAuth;
  enrichmentService: EnrichmentService;
  env: ServerEnv;
  logger: Logger;
  profileService: ProfileService;
  productEventService: ProductEventService;
  requestRateLimitService: RequestRateLimitService;
  reviewService: ReviewService;
  seedService: SeedService;
};

type AppVariables = {
  actorTag?: string;
  dbTimeMs?: number;
  errorCode?: string;
  guardrailFlags?: string;
  journey?: string;
  model?: string;
  provider?: string;
  requestId: string;
  schemaVersion?: string;
  seedId?: string;
  sessionId?: string;
  toolCalls?: number;
  validationOutcome?: string;
};

export type GlossApp = Hono<{ Variables: AppVariables }>;

export const createApp = ({
  auth,
  enrichmentService,
  env,
  logger,
  profileService,
  productEventService,
  requestRateLimitService,
  reviewService,
  seedService,
}: AppDependencies): GlossApp => {
  const app = new Hono<{ Variables: AppVariables }>();

  app.use("*", async (context, next) => {
    const requestId = crypto.randomUUID();
    const startedAt = performance.now();

    context.set("requestId", requestId);
    context.header("x-request-id", requestId);

    await next();

    logger.info("request.complete", {
      actorTag: context.var.actorTag ?? "anonymous",
      dbTimeMs: context.var.dbTimeMs ?? null,
      errorCode: context.var.errorCode ?? null,
      guardrailFlags: context.var.guardrailFlags ?? null,
      journey: context.var.journey ?? null,
      latencyMs: Math.round(performance.now() - startedAt),
      method: context.req.method,
      model: context.var.model ?? null,
      provider: context.var.provider ?? null,
      requestId,
      route: context.req.path,
      schemaVersion: context.var.schemaVersion ?? null,
      seedId: context.var.seedId ?? null,
      sessionId: context.var.sessionId ?? null,
      status: context.res.status,
      toolCalls: context.var.toolCalls ?? null,
      validationOutcome: context.var.validationOutcome ?? null,
    });
  });

  const corsOptions = {
    allowMethods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    exposeHeaders: ["x-request-id"],
    origin: env.WEB_ORIGIN,
  };

  app.use("/api/*", cors(corsOptions));
  app.use("/capture/*", cors(corsOptions));
  app.use("/review/*", cors(corsOptions));
  app.use("/seeds/*", cors(corsOptions));

  app.on(["GET", "POST"], "/api/auth/*", async (context) => {
    const journey = resolveAuthJourney(context.req.path);

    if (journey) {
      context.set("journey", journey);
    }

    const actorTag = await extractEmailActorTag(context.req.raw);

    if (actorTag) {
      context.set("actorTag", actorTag);
    }

    const response = await auth.handler(context.req.raw);
    const errorCode = resolveAuthFailureErrorCode({
      journey,
      status: response.status,
    });

    if (errorCode) {
      context.set("errorCode", errorCode);
    }

    if (journey === "auth.sign_in" && response.status >= 400) {
      const failureActorTag = actorTag ?? "anonymous";

      try {
        await productEventService.record({
          actorTag: failureActorTag,
          occurredAt: new Date().toISOString(),
          payload: {
            method: "email_password",
            status: response.status,
          },
          schemaVersion: productEventSchemaVersion,
          type: "auth.sign_in_failed",
        });
      } catch (error) {
        logger.warn("product_event.record_failed", {
          actorTag: failureActorTag,
          error:
            error instanceof Error
              ? error.message
              : "Unexpected non-error while recording product event.",
          eventType: "auth.sign_in_failed",
          journey,
        });
      }
    }

    return response;
  });

  registerHealthRoute(app, env);
  registerMeRoute(app, { auth, profileService });
  registerCaptureRoutes(app, { auth, requestRateLimitService, seedService });
  registerReviewRoutes(app, { auth, requestRateLimitService, reviewService });
  registerSeedRoutes(app, {
    auth,
    enrichmentService,
    seedService,
  });

  app.notFound((context) =>
    {
      context.set("errorCode", "NOT_FOUND");

      return context.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "The requested resource was not found.",
            ...(context.var.requestId ? { requestId: context.var.requestId } : {}),
          },
          ok: false,
        },
        404 as const,
      );
    },
  );

  app.onError((error, context) => {
    const requestId = context.var.requestId;
    const response = toErrorResponse(error, requestId);

    context.set("errorCode", response.body.error.code);

    if (response.status >= 500) {
      logger.error("request.failed", {
        actorTag: context.var.actorTag ?? "anonymous",
        dbTimeMs: context.var.dbTimeMs ?? null,
        errorCode: response.body.error.code,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected non-error thrown by route handler.",
        guardrailFlags: context.var.guardrailFlags ?? null,
        journey: context.var.journey ?? null,
        model: context.var.model ?? null,
        provider: context.var.provider ?? null,
        requestId,
        route: context.req.path,
        schemaVersion: context.var.schemaVersion ?? null,
        seedId: context.var.seedId ?? null,
        sessionId: context.var.sessionId ?? null,
        toolCalls: context.var.toolCalls ?? null,
        validationOutcome: context.var.validationOutcome ?? null,
      });
    }

    return context.json(
      response.body,
      response.status as 400 | 401 | 404 | 409 | 429 | 500,
    );
  });

  return app;
};
