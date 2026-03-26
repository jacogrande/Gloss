import { Hono } from "hono";
import { cors } from "hono/cors";

import type { ServerEnv } from "@gloss/shared/env";

import type { GlossAuth } from "./lib/auth";
import { toErrorResponse } from "./lib/http";
import type { Logger } from "./lib/logger";
import { registerCaptureRoutes } from "./routes/capture";
import { registerHealthRoute } from "./routes/health";
import { registerMeRoute } from "./routes/me";
import { registerSeedRoutes } from "./routes/seeds";
import type { ProfileService } from "./services/profile-service";
import type { SeedService } from "./services/seed-service";

type AppDependencies = {
  auth: GlossAuth;
  env: ServerEnv;
  logger: Logger;
  profileService: ProfileService;
  seedService: SeedService;
};

type AppVariables = {
  requestId: string;
};

export const createApp = ({
  auth,
  env,
  logger,
  profileService,
  seedService,
}: AppDependencies): Hono<{ Variables: AppVariables }> => {
  const app = new Hono<{ Variables: AppVariables }>();

  app.use("*", async (context, next) => {
    const requestId = crypto.randomUUID();
    const startedAt = performance.now();

    context.set("requestId", requestId);
    context.header("x-request-id", requestId);

    await next();

    logger.info("request.complete", {
      latencyMs: Math.round(performance.now() - startedAt),
      method: context.req.method,
      requestId,
      route: context.req.path,
      status: context.res.status,
    });
  });

  app.use(
    "/api/*",
    cors({
      allowHeaders: ["Content-Type"],
      allowMethods: ["GET", "POST", "OPTIONS"],
      credentials: true,
      exposeHeaders: ["x-request-id"],
      origin: env.WEB_ORIGIN,
    }),
  );

  app.on(["GET", "POST"], "/api/auth/*", (context) => auth.handler(context.req.raw));

  registerHealthRoute(app, env);
  registerMeRoute(app, { auth, profileService });
  registerCaptureRoutes(app, { auth, seedService });
  registerSeedRoutes(app, { auth, seedService });

  app.notFound((context) =>
    context.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "The requested resource was not found.",
          ...(context.var.requestId ? { requestId: context.var.requestId } : {}),
        },
        ok: false,
      },
      404 as const,
    ),
  );

  app.onError((error, context) => {
    const requestId = context.var.requestId;
    const response = toErrorResponse(error, requestId);

    if (response.status >= 500) {
      logger.error("request.failed", {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected non-error thrown by route handler.",
        requestId,
        route: context.req.path,
      });
    }

    return context.json(
      response.body,
      response.status as 400 | 401 | 404 | 409 | 500,
    );
  });

  return app;
};
