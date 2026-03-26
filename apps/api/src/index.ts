import { serve } from "@hono/node-server";

import { createAppRuntime } from "./lib/app-runtime";
import { loadServerEnvFromDotenv } from "./lib/env";

const env = loadServerEnvFromDotenv();
const runtime = createAppRuntime({ env });

const server = serve({
  fetch: runtime.app.fetch,
  hostname: "0.0.0.0",
  port: env.PORT,
});

runtime.logger.info("server.started", {
  apiOrigin: env.API_ORIGIN,
  port: env.PORT,
});

let shutdownPromise: Promise<void> | null = null;

const shutdown = async (): Promise<void> => {
  if (shutdownPromise) {
    return shutdownPromise;
  }

  shutdownPromise = (async () => {
    server.close();
    await runtime.close();
  })();

  await shutdownPromise;
};

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});
