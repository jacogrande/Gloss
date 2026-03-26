import type { Hono } from "hono";
import type { ServerEnv } from "@gloss/shared/env";

import { healthDataSchema } from "@gloss/shared/contracts";

import { jsonSuccess } from "../lib/http";

export const registerHealthRoute = (
  app: Hono<{ Variables: { requestId: string } }>,
  _env: ServerEnv,
): void => {
  app.get("/health", (context) =>
    jsonSuccess(
      context,
      healthDataSchema.parse({
        service: "api",
        status: "ok",
        timestamp: new Date().toISOString(),
      }),
    ),
  );
};
